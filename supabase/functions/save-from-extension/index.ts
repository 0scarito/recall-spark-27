import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation
function validateInput(data: any): { valid: boolean; error?: string } {
  if (!data.sourceUrl || typeof data.sourceUrl !== 'string') {
    return { valid: false, error: 'Missing or invalid URL' };
  }
  
  try {
    new URL(data.sourceUrl);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
  
  if (data.sourceUrl.length > 2048) {
    return { valid: false, error: 'URL too long' };
  }
  
  return { valid: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('Auth error:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - please sign in' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await req.json();
    
    // Validate input
    const validation = validateInput(data);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received data from extension:', {
      isYouTube: data.isYouTube,
      hasTranscript: !!data.transcript,
      transcriptLength: data.transcript?.length,
      url: data.sourceUrl,
      userId: user.id
    });

    const { isYouTube, metadata, transcript, transcriptSource, sourceUrl, content } = data;

    // Prepare content (with size limits)
    let textContent = '';
    const maxContentLength = 50000;
    
    if (isYouTube && transcript) {
      textContent = transcript.substring(0, maxContentLength);
    } else if (content) {
      textContent = content.substring(0, maxContentLength);
    }

    // Generate summary using Lovable AI
    let summary = '';
    let tags: string[] = [];

    if (textContent && lovableApiKey) {
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Tu es un assistant qui résume du contenu en français. Génère un résumé concis et des tags pertinents.
                
Réponds UNIQUEMENT avec un JSON valide dans ce format:
{
  "summary": "Résumé du contenu en 2-3 paragraphes",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

Les tags doivent être des mots-clés pertinents, sans le symbole #.`
              },
              {
                role: 'user',
                content: `Résume ce contenu et génère 5 tags:\n\nTitre: ${metadata?.title || 'Sans titre'}\n\nContenu:\n${textContent.substring(0, 15000)}`
              }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const responseText = aiData.choices?.[0]?.message?.content || '';
          
          try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              summary = parsed.summary || '';
              tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : [];
            }
          } catch (e) {
            console.error('Failed to parse AI response:', e);
            summary = responseText.substring(0, 2000);
          }
        } else {
          console.error('AI API error:', aiResponse.status, await aiResponse.text());
        }
      } catch (e) {
        console.error('AI summarization error:', e);
      }
    }

    // Prepare card metadata
    const cardMetadata: Record<string, any> = {
      ...metadata,
      text: textContent,
      transcriptSource: transcriptSource || 'extension',
      hasFullTranscript: isYouTube ? (transcript?.length > 100) : true,
      savedFromExtension: true,
      savedAt: new Date().toISOString()
    };

    if (isYouTube) {
      cardMetadata.videoId = metadata?.videoId;
      cardMetadata.author = metadata?.author;
      cardMetadata.duration = metadata?.lengthSeconds;
    }

    // Save to database
    const { data: card, error: insertError } = await supabase
      .from('knowledge_cards')
      .insert({
        user_id: user.id,
        title: (metadata?.title || 'Untitled').substring(0, 500),
        url: sourceUrl.substring(0, 2048),
        summary: summary || null,
        tags: tags.length > 0 ? tags : null,
        content_type: isYouTube ? 'video' : 'article',
        metadata: cardMetadata
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save card', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Card saved successfully:', card.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        cardId: card.id,
        hasSummary: !!summary,
        tagsCount: tags.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in save-from-extension:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
