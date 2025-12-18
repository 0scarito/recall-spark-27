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
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    console.log('Fetching and summarizing content from:', url);

    let title = '';
    let metaDescription = '';
    let ogImage = '';
    let siteName = '';
    let favicon = '';
    let textContent = '';
    
    // Special handling for YouTube - use oEmbed API
    const isYouTube = /(?:youtube\.com|youtu\.be)\//i.test(url);
    
    if (isYouTube) {
      try {
        const videoMatch = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        if (videoMatch) {
          const videoId = videoMatch[1];
          const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
          const oEmbedResponse = await fetch(oEmbedUrl);
          
          if (oEmbedResponse.ok) {
            const oEmbedData = await oEmbedResponse.json();
            title = oEmbedData.title || 'YouTube Video';
            siteName = 'YouTube';
            ogImage = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
            textContent = `YouTube video: ${title}. Channel: ${oEmbedData.author_name || 'Unknown'}`;
            
            console.log('Successfully fetched YouTube video info via oEmbed');
          }
        }
      } catch (e) {
        console.log('YouTube oEmbed failed, will try standard fetch:', e);
      }
    }
    
    // If we don't have content yet, try standard fetch
    if (!title) {
      try {
        const contentResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!contentResponse.ok) {
          console.warn(`Failed to fetch URL: ${contentResponse.status} ${contentResponse.statusText}`);
          
          if (contentResponse.status === 429 || contentResponse.status === 403) {
            console.log('Rate limited or blocked, using URL-only analysis');
            title = new URL(url).hostname.replace('www.', '');
            textContent = `Content from: ${url}. Unable to fetch full content due to access restrictions.`;
          } else {
            throw new Error(`Unable to access the URL (${contentResponse.status})`);
          }
        } else {
          const html = await contentResponse.text();
          
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;
          
          const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
          metaDescription = descMatch ? descMatch[1] : '';

          const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
          ogImage = ogImageMatch ? ogImageMatch[1] : '';
          const siteNameMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
          siteName = siteNameMatch ? siteNameMatch[1] : '';
          const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut icon|icon)["'][^>]*href=["']([^"']+)["']/i);
          favicon = faviconMatch ? new URL(faviconMatch[1], url).toString() : '';
          
          textContent = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 5000);
        }
      } catch (fetchError) {
        console.warn('Fetch failed, using URL-only analysis:', fetchError);
        title = new URL(url).hostname.replace('www.', '');
        textContent = `Content from: ${url}`;
      }
    }

    console.log('Extracted title:', title);
    console.log('Content length:', textContent.length);

    // Generate AI summary using Perplexity with web search for enhanced context
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: `You are a knowledge assistant that creates comprehensive, well-researched summaries. 
Your task is to:
1. Summarize the main content and key insights
2. Add relevant context from your web search to enrich the summary
3. Extract the most important takeaways
4. Propose 4-8 topical tags

Return a JSON object with:
- "summary": A detailed recap (200-300 words) that captures the essence and adds valuable context
- "tags": An array of 4-8 relevant tags (single or two-word phrases)

IMPORTANT: Return ONLY valid JSON, no markdown formatting.`
          },
          {
            role: 'user',
            content: `Analyze and summarize this content. Search the web for additional context to enrich the summary.

Title: ${title}
URL: ${url}

Content excerpt:
${metaDescription || textContent.slice(0, 3000)}

Provide a comprehensive recap with additional insights from your research.`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('Failed to generate summary');
    }

    const data = await response.json();
    const aiContent = data.choices[0].message.content;
    const citations = data.citations || [];
    
    console.log('Perplexity response received, citations:', citations.length);
    
    let summary = '';
    let tags: string[] = [];
    
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = aiContent.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      const parsed = JSON.parse(cleanContent);
      summary = parsed.summary || '';
      if (Array.isArray(parsed.tags)) {
        tags = parsed.tags.slice(0, 8).map((t: unknown) => String(t)).filter(Boolean);
      }
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON:', parseError);
      summary = aiContent;
    }

    // Fallback tag extraction if AI did not provide any
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

    console.log('Summary generated successfully with Perplexity');

    return new Response(
      JSON.stringify({ 
        summary, 
        title, 
        tags, 
        meta: { ogImage, favicon, siteName }, 
        text: textContent,
        citations // Include Perplexity's source citations
      }),
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
