import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Fetching and summarizing content from:', url);

    // Fetch the actual content from the URL (server-side, no CORS issues)
    const contentResponse = await fetch(url);
    if (!contentResponse.ok) {
      throw new Error(`Failed to fetch URL: ${contentResponse.statusText}`);
    }
    
    const html = await contentResponse.text();
    
    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;
    
    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const metaDescription = descMatch ? descMatch[1] : '';

    // Extract OG image / site name / favicon
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    const ogImage = ogImageMatch ? ogImageMatch[1] : '';
    const siteNameMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
    const siteName = siteNameMatch ? siteNameMatch[1] : '';
    const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut icon|icon)["'][^>]*href=["']([^"']+)["']/i);
    const favicon = faviconMatch ? new URL(faviconMatch[1], url).toString() : '';
    
    // Extract text content (simple approach - remove HTML tags)
    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000); // First 5000 chars

    console.log('Extracted title:', title);
    console.log('Content length:', textContent.length);

    // Generate AI summary
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
            role: 'system',
            content: 'You are a knowledge assistant. Create concise, informative summaries of web content. Extract key insights and main points. Keep summaries under 200 words. Additionally, propose 3-6 topical tags (single or two-word phrases). Return JSON with keys: summary (string), tags (string[]).'
          },
          {
            role: 'user',
            content: `Summarize and tag this content. Respond ONLY with JSON.\n\nTitle: ${title}\n\nURL: ${url}\n\nContent: ${metaDescription || textContent}`
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
      throw new Error('Failed to generate summary');
    }

    const data = await response.json();
    const aiContent = data.choices[0].message.content;
    let summary = '';
    let tags: string[] = [];
    try {
      const parsed = JSON.parse(aiContent);
      summary = parsed.summary || '';
      if (Array.isArray(parsed.tags)) tags = parsed.tags.slice(0, 8).map((t: unknown) => String(t)).filter(Boolean);
    } catch {
      summary = aiContent;
    }

    // Fallback lightweight tag extraction if AI did not provide any
    if (!tags.length) {
      const source = `${title} ${metaDescription} ${textContent.slice(0, 1000)}`.toLowerCase();
      const words = source.match(/[a-zA-Z][a-zA-Z-]{2,}/g) || [];
      const stop = new Set(["the","and","for","with","that","this","from","your","you","are","was","have","has","into","about","will","what","when","how","why","can","use","using","into","over","more","less","those","their","them","its","our","out","not","but","all","any","one","two","new","into","made","make"]);
      const counts = new Map<string, number>();
      for (const w of words) {
        if (stop.has(w)) continue;
        counts.set(w, (counts.get(w) || 0) + 1);
      }
      tags = Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([w])=>w);
    }

    console.log('Summary generated successfully');

    return new Response(
      JSON.stringify({ summary, title, tags, meta: { ogImage, favicon, siteName }, text: textContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in summarize-content function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});