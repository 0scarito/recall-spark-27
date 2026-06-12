import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, question, cardId, context: providedContext, history } = await req.json();
    const userMessage = message || question; // Support both parameter names
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    let context = '';

    // If cardId provided, use that specific card's content
    if (cardId) {
      const { data: card, error: cardError } = await supabase
        .from('knowledge_cards')
        .select('*')
        .eq('id', cardId)
        .eq('user_id', user.id)
        .single();

      if (cardError) throw cardError;
      
      context = providedContext || card?.metadata?.text || card?.summary || 'No content available.';
    } else {
      // Get all user's knowledge cards for general queries
      const { data: cards, error: cardsError } = await supabase
        .from('knowledge_cards')
        .select('*')
        .eq('user_id', user.id);

      if (cardsError) throw cardsError;

      context = cards?.map(card => 
        `Title: ${card.title}\nSummary: ${card.summary}\nTags: ${(card.tags || []).join(', ')}`
      ).join('\n\n') || 'No knowledge cards found.';
    }

    // Build messages array with history
    const messages: Array<{ role: string; content: string }> = [
      {
        role: 'system',
        content: `You are a helpful assistant that answers questions based on the following content. Be concise and accurate.

CONTENT:
${context.substring(0, 12000)}

Answer based on this content. If something isn't covered, say so politely.`
      }
    ];

    // Add history if provided
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: 'user', content: userMessage });

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content || 'No answer generated.';

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in chat-knowledge:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
