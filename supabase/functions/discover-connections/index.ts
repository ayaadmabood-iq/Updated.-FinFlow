import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiscoverConnectionsRequest {
  projectId: string;
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

    const { projectId }: DiscoverConnectionsRequest = await req.json();

    // Get all nodes and edges for the project
    const { data: nodes, error: nodesError } = await supabase
      .from("knowledge_graph_nodes")
      .select("id, name, entity_type, normalized_name, properties, source_document_ids")
      .eq("project_id", projectId)
      .limit(200);

    if (nodesError) throw nodesError;

    const { data: edges, error: edgesError } = await supabase
      .from("knowledge_graph_edges")
      .select("*")
      .eq("project_id", projectId);

    if (edgesError) throw edgesError;

    if (!nodes || nodes.length < 2) {
      return new Response(JSON.stringify({ 
        success: true, 
        insights: [],
        message: "Not enough entities to discover connections" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get relevant documents for context
    const { data: documents } = await supabase
      .from("documents")
      .select("id, name, summary")
      .eq("project_id", projectId)
      .eq("status", "ready")
      .is("deleted_at", null)
      .limit(20);

    // Use AI to discover hidden connections
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const entitySummary = nodes.map(n => `- ${n.name} (${n.entity_type})`).join("\n");
    const edgeSummary = (edges || []).slice(0, 50).map(e => {
      const source = nodes.find(n => n.id === e.source_node_id);
      const target = nodes.find(n => n.id === e.target_node_id);
      return `- ${source?.name || "?"} --[${e.relationship_type}]--> ${target?.name || "?"}`;
    }).join("\n");
    const docSummary = (documents || []).map(d => `- ${d.name}: ${d.summary?.slice(0, 100) || "No summary"}`).join("\n");

    const aiResponse = await fetch("https://api.lovable.dev/api/v1/chat/completion", {
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
            content: `You are a knowledge analyst expert at finding hidden connections and patterns across documents.

Analyze the entities and relationships extracted from a document collection and identify:
1. Hidden connections - entities that appear related but aren't explicitly linked
2. Contradictions - entities or documents that present conflicting information
3. Patterns - recurring themes, relationships, or structures
4. Important clusters - groups of highly interconnected entities

Return a JSON array of insights:
[
  {
    "type": "hidden_connection" | "contradiction" | "pattern" | "cluster",
    "title": "Brief descriptive title",
    "description": "Detailed explanation of the insight",
    "confidence": 0.85,
    "involvedEntities": ["Entity Name 1", "Entity Name 2"],
    "involvedDocuments": ["Doc Name 1"]
  }
]

Focus on insights that would be valuable for understanding the "big picture" across documents.`,
          },
          {
            role: "user",
            content: `Analyze this knowledge graph and discover hidden connections:

ENTITIES:
${entitySummary}

KNOWN RELATIONSHIPS:
${edgeSummary || "No relationships yet"}

DOCUMENT SUMMARIES:
${docSummary || "No summaries available"}

Find hidden connections, contradictions, and patterns.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error("AI discovery failed: " + await aiResponse.text());
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse insights
    let insights: any[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("Failed to parse insights");
    }

    // Store insights in database
    const storedInsights: any[] = [];
    for (const insight of insights) {
      // Map entity names to IDs
      const involvedNodeIds = (insight.involvedEntities || [])
        .map((name: string) => {
          const node = nodes.find(n => n.name.toLowerCase() === name.toLowerCase());
          return node?.id;
        })
        .filter(Boolean);

      const involvedDocIds = (insight.involvedDocuments || [])
        .map((name: string) => {
          const doc = documents?.find(d => d.name.toLowerCase() === name.toLowerCase());
          return doc?.id;
        })
        .filter(Boolean);

      const { data: storedInsight, error: insertError } = await supabase
        .from("knowledge_graph_insights")
        .insert({
          project_id: projectId,
          user_id: user.id,
          insight_type: insight.type || "hidden_connection",
          title: insight.title,
          description: insight.description,
          confidence_score: insight.confidence || 0.8,
          involved_node_ids: involvedNodeIds,
          involved_document_ids: involvedDocIds,
        })
        .select()
        .single();

      if (!insertError && storedInsight) {
        storedInsights.push(storedInsight);
      }

      // If it's a hidden connection, create an edge for it
      if (insight.type === "hidden_connection" && involvedNodeIds.length >= 2) {
        await supabase
          .from("knowledge_graph_edges")
          .upsert({
            project_id: projectId,
            source_node_id: involvedNodeIds[0],
            target_node_id: involvedNodeIds[1],
            relationship_type: "related_to",
            weight: insight.confidence || 0.8,
            is_ai_discovered: true,
            evidence_snippets: [insight.description],
          }, { onConflict: "project_id,source_node_id,target_node_id,relationship_type" });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        insightsDiscovered: storedInsights.length,
        insights: storedInsights,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Discover connections error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
