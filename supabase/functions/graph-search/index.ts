import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GraphSearchRequest {
  projectId: string;
  query: string;
  useGraphContext?: boolean;
  maxNeighborDepth?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { 
      projectId, 
      query, 
      useGraphContext = true,
      maxNeighborDepth = 2 
    }: GraphSearchRequest = await req.json();

    // First, use AI to identify relevant entities in the query
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Get available entities for context
    const { data: nodes } = await supabase
      .from("knowledge_graph_nodes")
      .select("id, name, entity_type, normalized_name")
      .eq("project_id", projectId)
      .limit(100);

    const entityNames = (nodes || []).map(n => n.name).join(", ");

    // Use AI to identify relevant entities in the query
    const entityIdentifyResponse = await fetch("https://api.lovable.dev/api/v1/chat/completion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Identify which entities from the provided list are mentioned or relevant to the user's question.
Return a JSON array of entity names that are relevant. Be inclusive - include entities that might be indirectly related.
Example: ["Entity A", "Entity B"]`,
          },
          {
            role: "user",
            content: `Question: "${query}"

Available entities: ${entityNames}

Which entities are relevant to this question?`,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    let relevantEntityNames: string[] = [];
    if (entityIdentifyResponse.ok) {
      const identifyData = await entityIdentifyResponse.json();
      const content = identifyData.choices?.[0]?.message?.content || "";
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          relevantEntityNames = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Continue without entity identification
      }
    }

    // Find matching nodes
    const relevantNodes = (nodes || []).filter(n => 
      relevantEntityNames.some(name => 
        n.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(n.name.toLowerCase())
      )
    );

    // Get graph neighbors for context expansion
    const graphContext: any = {
      directEntities: relevantNodes,
      neighbors: [],
      paths: [],
      relatedDocumentIds: new Set<string>(),
    };

    if (useGraphContext && relevantNodes.length > 0) {
      // Get neighbors for each relevant node
      for (const node of relevantNodes.slice(0, 5)) {
        const { data: neighbors } = await supabase.rpc("get_graph_neighbors", {
          p_node_id: node.id,
          p_depth: maxNeighborDepth,
        });

        if (neighbors) {
          graphContext.neighbors.push(...neighbors);
        }

        // Collect document IDs from source_document_ids
        const { data: nodeWithDocs } = await supabase
          .from("knowledge_graph_nodes")
          .select("source_document_ids")
          .eq("id", node.id)
          .single();

        if (nodeWithDocs?.source_document_ids) {
          nodeWithDocs.source_document_ids.forEach((id: string) => 
            graphContext.relatedDocumentIds.add(id)
          );
        }
      }

      // If we have 2+ entities, try to find paths between them
      if (relevantNodes.length >= 2) {
        const { data: path } = await supabase.rpc("find_graph_path", {
          p_project_id: projectId,
          p_start_node_id: relevantNodes[0].id,
          p_end_node_id: relevantNodes[1].id,
          p_max_depth: 5,
        });

        if (path && path.length > 0) {
          graphContext.paths.push(path[0]);
        }
      }
    }

    // Get related documents based on graph context
    const relatedDocIds = Array.from(graphContext.relatedDocumentIds);
    let relatedDocuments: any[] = [];

    if (relatedDocIds.length > 0) {
      const { data: docs } = await supabase
        .from("documents")
        .select("id, name, summary, extracted_text")
        .in("id", relatedDocIds.slice(0, 10))
        .eq("status", "ready")
        .is("deleted_at", null);

      relatedDocuments = docs || [];
    }

    // Also do a text-based search for additional context
    const { data: searchDocs } = await supabase
      .from("documents")
      .select("id, name, summary, extracted_text")
      .eq("project_id", projectId)
      .eq("status", "ready")
      .is("deleted_at", null)
      .textSearch("search_vector", query.split(" ").join(" & "), { type: "websearch" })
      .limit(5);

    if (searchDocs) {
      const existingIds = new Set(relatedDocuments.map(d => d.id));
      for (const doc of searchDocs) {
        if (!existingIds.has(doc.id)) {
          relatedDocuments.push(doc);
        }
      }
    }

    // Build context for AI response
    const entityContext = graphContext.directEntities.map((e: any) => 
      `- ${e.name} (${e.entity_type})`
    ).join("\n");

    const neighborContext = graphContext.neighbors.slice(0, 10).map((n: any) => 
      `- ${n.node_name} (${n.node_type}) - ${n.relationship} - distance: ${n.distance}`
    ).join("\n");

    const docContext = relatedDocuments.slice(0, 5).map(d => 
      `Document: ${d.name}\nSummary: ${d.summary || "No summary"}\n`
    ).join("\n---\n");

    // Generate answer using graph-augmented context
    const answerResponse = await fetch("https://api.lovable.dev/api/v1/chat/completion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant answering questions about a document collection.
You have access to a knowledge graph that shows entities and their relationships across documents.

Use the provided graph context and document summaries to give comprehensive answers.
When mentioning entities or documents, be specific and cite your sources.
If the graph shows connections between entities, explain those relationships.`,
          },
          {
            role: "user",
            content: `Question: ${query}

KNOWLEDGE GRAPH CONTEXT:
Relevant Entities:
${entityContext || "No directly relevant entities found"}

Connected Entities (neighbors):
${neighborContext || "No connected entities"}

DOCUMENT CONTEXT:
${docContext || "No relevant documents found"}

Please answer the question using the knowledge graph and document context.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    let answer = "Unable to generate answer";
    if (answerResponse.ok) {
      const answerData = await answerResponse.json();
      answer = answerData.choices?.[0]?.message?.content || answer;
    }

    return new Response(
      JSON.stringify({
        success: true,
        answer,
        graphContext: {
          entities: graphContext.directEntities,
          neighbors: graphContext.neighbors.slice(0, 20),
          paths: graphContext.paths,
        },
        sources: relatedDocuments.map(d => ({
          id: d.id,
          name: d.name,
          summary: d.summary,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Graph search error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
