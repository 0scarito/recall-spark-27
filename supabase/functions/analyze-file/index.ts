import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const { fileName, fileType, fileData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Analyzing file:', fileName, fileType);

    // Prepare the message content based on file type
    const isImage = fileType.startsWith('image/');
    const isPdf = fileType === 'application/pdf';

    let messageContent;
    if (isImage) {
      messageContent = [
        {
          type: 'text',
          text: 'Analyze this image in detail. Extract key information, concepts, and insights. Create a comprehensive summary (120-180 words) and suggest 3-6 relevant tags. Respond STRICTLY in JSON format: {"title": "descriptive title", "summary": "detailed summary", "tags": ["tag1", "tag2", ...], "description": "what the image shows"}'
        },
        {
          type: 'image_url',
          image_url: {
            url: fileData
          }
        }
      ];
    } else if (isPdf) {
      // For PDFs, extract base64 data and use document analysis
      const base64Data = fileData.split(',')[1];
      messageContent = [
        {
          type: 'text',
          text: `Analyze this PDF document titled "${fileName}". Extract key information, main concepts, and important insights. Create a comprehensive summary (120-180 words) and suggest 3-6 relevant tags. Respond STRICTLY in JSON format: {"title": "document title", "summary": "detailed summary", "tags": ["tag1", "tag2", ...], "keyPoints": ["point1", "point2", ...]}`
        }
      ];
    } else {
      throw new Error('Unsupported file type');
    }

    // Call AI for analysis
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: messageContent
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to analyze file');
    }

    const data = await response.json();
    const aiContent = data.choices[0].message.content;
    
    let result;
    try {
      result = JSON.parse(aiContent);
    } catch {
      // Fallback if AI doesn't return JSON
      result = {
        title: fileName.replace(/\.[^/.]+$/, ""),
        summary: aiContent,
        tags: ['document'],
        text: aiContent
      };
    }

    // For images, include the image data itself
    if (isImage) {
      result.image = fileData;
    }

    console.log('Analysis completed successfully');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-file function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
