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

    const { audio, fileName } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('Lovable API key not configured');
    }

    console.log('Transcribing audio file:', fileName);

    // Decode base64 audio to binary
    const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    
    // Create form data for Whisper API via Lovable AI gateway
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, fileName || 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');

    // Use Lovable AI's transcription endpoint
    const response = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Transcription API error:', response.status, errorText);
      throw new Error(`Transcription failed: ${response.status}`);
    }

    const result = await response.json();
    const transcript = result.text || '';
    
    console.log('Transcription successful, length:', transcript.length);

    // Now generate a summary using Lovable AI
    let summary = transcript.slice(0, 300);
    let title = fileName?.replace(/\.[^/.]+$/, "") || 'Audio Recording';

    if (transcript.length > 100) {
      try {
        const summaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                content: `You are a helpful assistant that summarizes audio transcripts. 
Return ONLY valid JSON: {"title": "descriptive title", "summary": "200-300 word summary"}`,
              },
              {
                role: 'user',
                content: `Summarize this audio transcript and generate a descriptive title:\n\n${transcript.slice(0, 8000)}`,
              },
            ],
          }),
        });

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          const content = summaryData.choices?.[0]?.message?.content || '';
          
          try {
            let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleanContent);
            title = parsed.title || title;
            summary = parsed.summary || summary;
          } catch {
            summary = content.slice(0, 300);
          }
        }
      } catch (e) {
        console.error('Summary generation failed:', e);
      }
    }

    return new Response(
      JSON.stringify({ 
        transcript,
        title,
        summary,
        duration: result.duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in transcribe-audio:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Transcription failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
