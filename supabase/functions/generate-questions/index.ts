import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { cardId } = await req.json();

    if (!cardId) {
      throw new Error('cardId is required');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    // Get the card
    const { data: card, error: cardError } = await supabase
      .from('knowledge_cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', user.id)
      .single();

    if (cardError || !card) {
      throw new Error('Card not found');
    }

    console.log('Generating questions for card:', card.title);

    // Extract content for question generation
    const metadata = card.metadata as { text?: string } | null;
    const content = metadata?.text || card.summary || '';

    if (!content || content.length < 50) {
      throw new Error('Card does not have enough content to generate questions');
    }

    // Call Lovable AI to generate questions
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
        messages: [
          {
            role: 'system',
            content: `You are an expert educator creating review questions. Generate 3-5 questions that test understanding of the provided content.

Create a mix of:
- Factual recall questions (easy)
- Comprehension questions (medium)
- Application/analysis questions (hard)

Respond ONLY with valid JSON in this exact format:
{
  "questions": [
    {"question": "Question text here?", "answer": "Complete answer here", "difficulty": "easy"},
    {"question": "Question text here?", "answer": "Complete answer here", "difficulty": "medium"},
    {"question": "Question text here?", "answer": "Complete answer here", "difficulty": "hard"}
  ]
}`
          },
          {
            role: 'user',
            content: `Generate review questions for this content:

Title: ${card.title}
Summary: ${card.summary || 'No summary'}
Content: ${content.slice(0, 6000)}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('AI API error');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    let questions: Array<{ question: string; answer: string; difficulty: string }> = [];
    try {
      const cleanedContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanedContent);
      questions = parsed.questions || [];
    } catch {
      console.error('Failed to parse AI response:', aiContent);
      throw new Error('Failed to parse generated questions');
    }

    if (questions.length === 0) {
      throw new Error('No questions were generated');
    }

    // Insert questions into database
    const questionsToInsert = questions.map(q => ({
      card_id: cardId,
      user_id: user.id,
      question: q.question,
      answer: q.answer,
      difficulty: q.difficulty || 'medium',
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting questions:', insertError);
      throw new Error('Failed to save questions');
    }

    console.log('Generated and saved', insertedQuestions?.length, 'questions');

    return new Response(
      JSON.stringify({ questions: insertedQuestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in generate-questions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
