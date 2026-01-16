import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EntityExtractionRequest {
  projectId: string;
  documentId?: string; // Optional: if not provided, process all documents in project
}

interface ExtractedEntity {
  type: string;
  name: string;
  normalizedName: string;
  confidence: number;
  context?: string;
}

interface ExtractedRelationship {
  sourceEntity: string;
  targetEntity: string;
  relationshipType: string;
  confidence: number;
  evidence: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { projectId, documentId }: EntityExtractionRequest = await req.json();

    // Create extraction job
    const { data: job, error: jobError } = await supabase
      .from("entity_extraction_jobs")
      .insert({
        project_id: projectId,
        document_id: documentId || null,
        user_id: user.id,
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Get documents to process
    let documentsQuery = supabase
      .from("documents")
      .select("id, name, extracted_text, summary")
      .eq("project_id", projectId)
      .eq("status", "ready")
      .is("deleted_at", null);

    if (documentId) {
      documentsQuery = documentsQuery.eq("id", documentId);
    }

    const { data: documents, error: docsError } = await documentsQuery;
    if (docsError) throw docsError;

    if (!documents || documents.length === 0) {
      await supabase
        .from("entity_extraction_jobs")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", job.id);

      return new Response(JSON.stringify({ success: true, message: "No documents to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalEntitiesExtracted = 0;
    let totalRelationshipsCreated = 0;

    // Process each document
    for (const doc of documents) {
      const textToAnalyze = doc.extracted_text || doc.summary || "";
      if (!textToAnalyze) continue;

      // Use Lovable AI to extract entities and relationships
      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

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
              content: `You are an entity extraction expert. Extract entities and their relationships from documents.
              
Return a JSON object with this structure:
{
  "entities": [
    { "type": "person|organization|location|date|concept|event|product|money|law|other", "name": "Entity Name", "confidence": 0.9 }
  ],
  "relationships": [
    { "source": "Entity Name 1", "target": "Entity Name 2", "type": "mentioned_in|related_to|contradicts|supports|references|authored_by|owned_by|located_in|occurred_on|involves|similar_to|part_of", "confidence": 0.85, "evidence": "brief quote or context" }
  ]
}

Focus on extracting:
- People (names, roles)
- Organizations (companies, institutions)
- Locations (cities, countries, addresses)
- Dates (specific dates, time periods)
- Concepts (key topics, themes)
- Events (meetings, incidents)
- Money (amounts, currencies)
- Laws (regulations, legal references)

Be conservative - only extract entities and relationships you are confident about.`,
            },
            {
              role: "user",
              content: `Extract entities and relationships from this document titled "${doc.name}":\n\n${textToAnalyze.slice(0, 8000)}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 4000,
        }),
      });

      if (!aiResponse.ok) {
        console.error("AI extraction failed:", await aiResponse.text());
        continue;
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";

      // Parse JSON from response
      let extractedData: { entities: ExtractedEntity[]; relationships: ExtractedRelationship[] };
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        } else {
          continue;
        }
      } catch {
        console.error("Failed to parse entity extraction response");
        continue;
      }

      // Store entities
      const entityIdMap: Record<string, string> = {};

      for (const entity of extractedData.entities || []) {
        const normalizedName = entity.name.toLowerCase().trim();
        const entityType = entity.type as any;

        // Upsert entity
        const { data: existingNode } = await supabase
          .from("knowledge_graph_nodes")
          .select("id, mention_count, source_document_ids")
          .eq("project_id", projectId)
          .eq("entity_type", entityType)
          .eq("normalized_name", normalizedName)
          .single();

        if (existingNode) {
          // Update existing entity
          const sourceDocIds = existingNode.source_document_ids || [];
          if (!sourceDocIds.includes(doc.id)) {
            sourceDocIds.push(doc.id);
          }

          await supabase
            .from("knowledge_graph_nodes")
            .update({
              mention_count: (existingNode.mention_count || 1) + 1,
              source_document_ids: sourceDocIds,
              last_seen_at: new Date().toISOString(),
              confidence_score: Math.max(entity.confidence, 0.5),
            })
            .eq("id", existingNode.id);

          entityIdMap[normalizedName] = existingNode.id;
        } else {
          // Insert new entity
          const { data: newNode, error: insertError } = await supabase
            .from("knowledge_graph_nodes")
            .insert({
              project_id: projectId,
              entity_type: entityType,
              name: entity.name,
              normalized_name: normalizedName,
              confidence_score: entity.confidence,
              source_document_ids: [doc.id],
            })
            .select("id")
            .single();

          if (!insertError && newNode) {
            entityIdMap[normalizedName] = newNode.id;
            totalEntitiesExtracted++;
          }
        }
      }

      // Also create a document node
      const docNormalizedName = doc.name.toLowerCase().trim();
      const { data: docNode } = await supabase
        .from("knowledge_graph_nodes")
        .upsert({
          project_id: projectId,
          entity_type: "document",
          name: doc.name,
          normalized_name: docNormalizedName,
          source_document_ids: [doc.id],
        }, { onConflict: "project_id,entity_type,normalized_name" })
        .select("id")
        .single();

      if (docNode) {
        entityIdMap[docNormalizedName] = docNode.id;
      }

      // Create "mentioned_in" relationships between entities and document
      for (const entity of extractedData.entities || []) {
        const normalizedName = entity.name.toLowerCase().trim();
        const entityId = entityIdMap[normalizedName];
        const docNodeId = entityIdMap[docNormalizedName];

        if (entityId && docNodeId && entityId !== docNodeId) {
          await supabase
            .from("knowledge_graph_edges")
            .upsert({
              project_id: projectId,
              source_node_id: entityId,
              target_node_id: docNodeId,
              relationship_type: "mentioned_in",
              weight: entity.confidence,
              source_document_ids: [doc.id],
            }, { onConflict: "project_id,source_node_id,target_node_id,relationship_type" });
          totalRelationshipsCreated++;
        }
      }

      // Store relationships between entities
      for (const rel of extractedData.relationships || []) {
        const sourceNormalized = rel.sourceEntity?.toLowerCase().trim();
        const targetNormalized = rel.targetEntity?.toLowerCase().trim();
        const sourceId = entityIdMap[sourceNormalized];
        const targetId = entityIdMap[targetNormalized];

        if (sourceId && targetId && sourceId !== targetId) {
          const relationshipType = rel.relationshipType as any;

          const { data: existingEdge } = await supabase
            .from("knowledge_graph_edges")
            .select("id, evidence_snippets, source_document_ids")
            .eq("project_id", projectId)
            .eq("source_node_id", sourceId)
            .eq("target_node_id", targetId)
            .eq("relationship_type", relationshipType)
            .single();

          if (existingEdge) {
            const evidenceSnippets = existingEdge.evidence_snippets || [];
            if (rel.evidence && !evidenceSnippets.includes(rel.evidence)) {
              evidenceSnippets.push(rel.evidence);
            }
            const sourceDocIds = existingEdge.source_document_ids || [];
            if (!sourceDocIds.includes(doc.id)) {
              sourceDocIds.push(doc.id);
            }

            await supabase
              .from("knowledge_graph_edges")
              .update({
                evidence_snippets: evidenceSnippets,
                source_document_ids: sourceDocIds,
                weight: Math.min(1, (existingEdge as any).weight + 0.1),
              })
              .eq("id", existingEdge.id);
          } else {
            const { error: edgeError } = await supabase
              .from("knowledge_graph_edges")
              .insert({
                project_id: projectId,
                source_node_id: sourceId,
                target_node_id: targetId,
                relationship_type: relationshipType,
                weight: rel.confidence,
                evidence_snippets: rel.evidence ? [rel.evidence] : [],
                source_document_ids: [doc.id],
              });

            if (!edgeError) {
              totalRelationshipsCreated++;
            }
          }
        }
      }
    }

    // Update job as completed
    await supabase
      .from("entity_extraction_jobs")
      .update({
        status: "completed",
        entities_extracted: totalEntitiesExtracted,
        relationships_created: totalRelationshipsCreated,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        entitiesExtracted: totalEntitiesExtracted,
        relationshipsCreated: totalRelationshipsCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Entity extraction error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
