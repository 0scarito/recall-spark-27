import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Fetch YouTube transcript using youtubetranscript.com
async function fetchYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    const response = await fetch(`https://youtubetranscript.com/?server_vid2=${videoId}`);
    if (response.ok) {
      const text = await response.text();
      const matches = text.match(/<text[^>]*>([^<]+)<\/text>/g);
      if (matches && matches.length > 0) {
        const transcript = matches
          .map(m => m.replace(/<[^>]+>/g, '').replace(/&#\d+;/g, ' '))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (transcript.length > 100) {
          return transcript;
        }
      }
    }
  } catch (e) {
    console.log('Transcript fetch failed:', e);
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!PERPLEXITY_API_KEY && !LOVABLE_API_KEY) {
      throw new Error('No AI API key configured');
    }

    console.log('Fetching and summarizing content from:', url);

    let title = '';
    let metaDescription = '';
    let ogImage = '';
    let siteName = '';
    let favicon = '';
    let textContent = '';
    let transcript = '';
    let isYouTube = false;
    
    // Check for YouTube URL
    const youtubeId = extractYouTubeId(url);
    
    if (youtubeId) {
      isYouTube = true;
      console.log('Detected YouTube video:', youtubeId);
      
      // Fetch YouTube metadata via oEmbed
      try {
        const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`;
        const oEmbedResponse = await fetch(oEmbedUrl);
        
        if (oEmbedResponse.ok) {
          const oEmbedData = await oEmbedResponse.json();
          title = oEmbedData.title || 'YouTube Video';
          siteName = 'YouTube';
          ogImage = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
          favicon = 'https://www.youtube.com/favicon.ico';
          
          console.log('YouTube metadata fetched:', title);
        }
      } catch (e) {
        console.log('YouTube oEmbed failed:', e);
        title = 'YouTube Video';
        siteName = 'YouTube';
        ogImage = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
      }
      
      // Try to fetch transcript
      transcript = await fetchYouTubeTranscript(youtubeId) || '';
      if (transcript) {
        textContent = transcript;
        console.log('Got transcript, length:', transcript.length);
      } else {
        textContent = `YouTube video: ${title}`;
        console.log('No transcript available');
      }
    } else {
      // Standard webpage fetch
      try {
        const contentResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          }
        });
        
        if (!contentResponse.ok) {
          console.warn(`Failed to fetch URL: ${contentResponse.status}`);
          if (contentResponse.status === 429 || contentResponse.status === 403) {
            title = new URL(url).hostname.replace('www.', '');
            textContent = `Content from: ${url}. Unable to fetch due to access restrictions.`;
          } else {
            throw new Error(`Unable to access the URL (${contentResponse.status})`);
          }
        } else {
          const html = await contentResponse.text();
          
          // Extract metadata
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;
          
          const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
          metaDescription = descMatch ? descMatch[1] : '';

          const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
          ogImage = ogImageMatch ? ogImageMatch[1] : '';
          
          const siteNameMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
          siteName = siteNameMatch ? siteNameMatch[1] : new URL(url).hostname;
          
          const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut icon|icon)["'][^>]*href=["']([^"']+)["']/i);
          favicon = faviconMatch ? new URL(faviconMatch[1], url).toString() : '';
          
          // Extract text content
          textContent = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<nav[\s\S]*?<\/nav>/gi, '')
            .replace(/<footer[\s\S]*?<\/footer>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 10000);
        }
      } catch (fetchError) {
        console.warn('Fetch failed:', fetchError);
        title = new URL(url).hostname.replace('www.', '');
        textContent = `Content from: ${url}`;
      }
    }

    console.log('Content extraction complete. Title:', title, 'Content length:', textContent.length);

    // Generate AI summary
    const systemPrompt = `You are a knowledge assistant creating comprehensive summaries.
Your task:
1. Summarize the main content and key insights (200-300 words)
2. ${isYouTube && transcript ? 'This is a YouTube video transcript - focus on key topics, main arguments, and takeaways' : 'Extract important information and context'}
3. Propose 4-8 relevant tags for categorization

Return ONLY valid JSON:
{"summary": "detailed summary here", "tags": ["tag1", "tag2", ...]}`;

    const userPrompt = `Summarize this content:
Title: ${title}
URL: ${url}
${isYouTube ? 'Type: YouTube Video' : 'Type: Article/Webpage'}
${transcript ? `Transcript: ${transcript.slice(0, 8000)}` : `Content: ${(metaDescription || textContent).slice(0, 8000)}`}`;

    let summary = '';
    let tags: string[] = [];
    let citations: string[] = [];

    // Try Perplexity first (has web search)
    if (PERPLEXITY_API_KEY) {
      try {
        console.log('Using Perplexity for summarization');
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const aiContent = data.choices[0].message.content;
          citations = data.citations || [];
          
          try {
            let cleanContent = aiContent.trim();
            if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
            else if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
            if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);
            
            const parsed = JSON.parse(cleanContent.trim());
            summary = parsed.summary || '';
            tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [];
          } catch {
            summary = aiContent;
          }
          console.log('Perplexity summarization successful');
        } else if (response.status === 429) {
          console.log('Perplexity rate limited, falling back to Lovable AI');
        }
      } catch (e) {
        console.error('Perplexity error:', e);
      }
    }

    // Fallback to Lovable AI
    if (!summary && LOVABLE_API_KEY) {
      try {
        console.log('Using Lovable AI for summarization');
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const aiContent = data.choices?.[0]?.message?.content || '';
          
          try {
            let cleanContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleanContent);
            summary = parsed.summary || '';
            tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [];
          } catch {
            summary = aiContent;
          }
          console.log('Lovable AI summarization successful');
        } else {
          if (response.status === 429) {
            return new Response(
              JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          if (response.status === 402) {
            return new Response(
              JSON.stringify({ error: 'Payment required. Please add credits.' }),
              { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (e) {
        console.error('Lovable AI error:', e);
      }
    }

    // Fallback tag extraction
    if (!tags.length) {
      const source = `${title} ${metaDescription} ${textContent.slice(0, 1000)}`.toLowerCase();
      const words = source.match(/[a-zA-Z][a-zA-Z-]{2,}/g) || [];
      const stop = new Set(["the","and","for","with","that","this","from","your","you","are","was","have","has","into","about","will","what","when","how","why","can","use","using","over","more","less","those","their","them","its","our","out","not","but","all","any","one","two","new","made","make"]);
      const counts = new Map<string, number>();
      for (const w of words) {
        if (stop.has(w)) continue;
        counts.set(w, (counts.get(w) || 0) + 1);
      }
      tags = Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([w])=>w);
      if (isYouTube && !tags.includes('video')) tags.unshift('video');
    }

    if (!summary) {
      summary = metaDescription || textContent.slice(0, 300) || 'No summary available';
    }

    console.log('Summarization complete');

    return new Response(
      JSON.stringify({ 
        summary, 
        title: title || 'Untitled', 
        tags, 
        meta: { ogImage, favicon, siteName }, 
        text: textContent,
        citations,
        isYouTube,
        hasTranscript: !!transcript
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in summarize-content:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
