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

// Method 1: Direct YouTube timedtext API
async function fetchYouTubeTimedText(videoId: string): Promise<{ text: string; withTimestamps: string } | null> {
  try {
    console.log('Trying YouTube timedtext API...');
    
    // First, get the video page to extract caption track info
    const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!videoPageResponse.ok) {
      console.log('Failed to fetch video page');
      return null;
    }

    const html = await videoPageResponse.text();
    
    // Extract caption track URL from the page
    const captionMatch = html.match(/"captionTracks":\[{"baseUrl":"([^"]+)"/);
    if (!captionMatch) {
      console.log('No caption tracks found in video page');
      return null;
    }

    const captionUrl = captionMatch[1].replace(/\\u0026/g, '&');
    console.log('Found caption URL');

    const captionResponse = await fetch(captionUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!captionResponse.ok) {
      console.log('Failed to fetch captions');
      return null;
    }

    const captionXml = await captionResponse.text();
    const textMatches = captionXml.match(/<text start="([^"]+)"[^>]*>([^<]*)<\/text>/g);
    
    if (!textMatches || textMatches.length === 0) {
      console.log('No text segments found');
      return null;
    }

    const segments: { start: number; text: string }[] = [];
    for (const match of textMatches) {
      const startMatch = match.match(/start="([^"]+)"/);
      const textMatch = match.match(/>([^<]*)</);
      if (startMatch && textMatch) {
        segments.push({
          start: parseFloat(startMatch[1]),
          text: textMatch[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\n/g, ' ')
            .trim(),
        });
      }
    }

    if (segments.length === 0) return null;

    const text = segments.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim();
    const withTimestamps = segments
      .map(s => {
        const mins = Math.floor(s.start / 60);
        const secs = Math.floor(s.start % 60);
        return `[${mins}:${secs.toString().padStart(2, '0')}] ${s.text}`;
      })
      .join('\n');

    console.log('YouTube timedtext API success, got', segments.length, 'segments');
    return { text, withTimestamps };
  } catch (e) {
    console.log('YouTube timedtext API failed:', e);
    return null;
  }
}

// Method 2: youtubetranscript.com
async function fetchYouTubeTranscriptCom(videoId: string): Promise<{ text: string; withTimestamps: string } | null> {
  try {
    console.log('Trying youtubetranscript.com...');
    const response = await fetch(`https://youtubetranscript.com/?server_vid2=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      console.log('youtubetranscript.com returned', response.status);
      return null;
    }

    const html = await response.text();
    const matches = html.match(/<text start="([^"]+)"[^>]*>([^<]+)<\/text>/g);
    
    if (!matches || matches.length === 0) {
      console.log('No transcript data from youtubetranscript.com');
      return null;
    }

    const segments: { start: number; text: string }[] = [];
    for (const match of matches) {
      const startMatch = match.match(/start="([^"]+)"/);
      const textMatch = match.match(/>([^<]+)</);
      if (startMatch && textMatch) {
        segments.push({
          start: parseFloat(startMatch[1]),
          text: textMatch[1]
            .replace(/&#\d+;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim(),
        });
      }
    }

    if (segments.length === 0) return null;

    const text = segments.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim();
    const withTimestamps = segments
      .map(s => {
        const mins = Math.floor(s.start / 60);
        const secs = Math.floor(s.start % 60);
        return `[${mins}:${secs.toString().padStart(2, '0')}] ${s.text}`;
      })
      .join('\n');

    if (text.length < 100) {
      console.log('Transcript too short');
      return null;
    }

    console.log('youtubetranscript.com success');
    return { text, withTimestamps };
  } catch (e) {
    console.log('youtubetranscript.com failed:', e);
    return null;
  }
}

// Method 3: Try youtube-transcript-api proxy
async function fetchTranscriptProxy(videoId: string): Promise<{ text: string; withTimestamps: string } | null> {
  try {
    console.log('Trying transcript proxy...');
    // Try a public transcript API
    const response = await fetch(`https://yt.lemnoslife.com/noKey/captions?part=snippet&videoId=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.log('Transcript proxy returned', response.status);
      return null;
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      console.log('No captions found via proxy');
      return null;
    }

    // Find English or auto-generated captions
    const caption = data.items.find((item: any) => 
      item.snippet?.language === 'en' || 
      item.snippet?.trackKind === 'asr'
    ) || data.items[0];

    if (!caption?.snippet?.baseUrl) {
      console.log('No caption URL in proxy response');
      return null;
    }

    // Fetch the actual caption content
    const captionResponse = await fetch(caption.snippet.baseUrl);
    if (!captionResponse.ok) return null;

    const captionXml = await captionResponse.text();
    const textMatches = captionXml.match(/<text start="([^"]+)"[^>]*>([^<]*)<\/text>/g);
    
    if (!textMatches) return null;

    const segments: { start: number; text: string }[] = [];
    for (const match of textMatches) {
      const startMatch = match.match(/start="([^"]+)"/);
      const textMatch = match.match(/>([^<]*)</);
      if (startMatch && textMatch) {
        segments.push({
          start: parseFloat(startMatch[1]),
          text: textMatch[1].replace(/&amp;/g, '&').trim(),
        });
      }
    }

    if (segments.length === 0) return null;

    const text = segments.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim();
    const withTimestamps = segments
      .map(s => {
        const mins = Math.floor(s.start / 60);
        const secs = Math.floor(s.start % 60);
        return `[${mins}:${secs.toString().padStart(2, '0')}] ${s.text}`;
      })
      .join('\n');

    console.log('Transcript proxy success');
    return { text, withTimestamps };
  } catch (e) {
    console.log('Transcript proxy failed:', e);
    return null;
  }
}

// Main transcript fetcher with multiple fallbacks
async function fetchYouTubeTranscript(videoId: string): Promise<{ text: string; withTimestamps: string; source: string } | null> {
  // Try Method 1: Direct YouTube timedtext
  let result = await fetchYouTubeTimedText(videoId);
  if (result) return { ...result, source: 'youtube-api' };

  // Try Method 2: youtubetranscript.com
  result = await fetchYouTubeTranscriptCom(videoId);
  if (result) return { ...result, source: 'youtubetranscript.com' };

  // Try Method 3: Proxy API
  result = await fetchTranscriptProxy(videoId);
  if (result) return { ...result, source: 'proxy-api' };

  console.log('All transcript methods failed');
  return null;
}

// Perplexity-powered video information search
async function searchVideoInfo(title: string, url: string, apiKey: string): Promise<{ summary: string; tags: string[] } | null> {
  try {
    console.log('Using Perplexity to search for video information...');
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: `You are a research assistant. Search the web for information about this YouTube video and provide a comprehensive summary based on available sources (reviews, descriptions, discussions, etc.).
            
Return ONLY valid JSON:
{"summary": "detailed summary of what this video is about (200-300 words)", "tags": ["tag1", "tag2", ...], "sources": ["source1", "source2"]}`,
          },
          {
            role: 'user',
            content: `Search for information about this YouTube video and summarize what it's about:
Title: "${title}"
URL: ${url}

Find reviews, discussions, or descriptions of this video content.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.log('Perplexity search failed:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
      else if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);

      const parsed = JSON.parse(cleanContent.trim());
      console.log('Perplexity search successful');
      return {
        summary: parsed.summary || '',
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [],
      };
    } catch {
      return { summary: content, tags: [] };
    }
  } catch (e) {
    console.error('Perplexity search error:', e);
    return null;
  }
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
    let transcriptData: { text: string; withTimestamps: string; source: string } | null = null;
    let isYouTube = false;
    let transcriptSource = 'none';
    
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
      
      // Try to fetch transcript with multiple fallbacks
      transcriptData = await fetchYouTubeTranscript(youtubeId);
      
      if (transcriptData) {
        textContent = transcriptData.withTimestamps;
        transcriptSource = transcriptData.source;
        console.log('Got transcript from:', transcriptSource, 'Length:', transcriptData.text.length);
      } else {
        // All transcript methods failed - will use Perplexity search
        textContent = `YouTube video: ${title}. Channel: ${siteName}`;
        transcriptSource = 'none';
        console.log('No transcript available - will use web search for summary');
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

    console.log('Content extraction complete. Title:', title, 'Content length:', textContent.length, 'Transcript source:', transcriptSource);

    let summary = '';
    let tags: string[] = [];
    let citations: string[] = [];

    // If YouTube without transcript, use Perplexity to search for video info
    if (isYouTube && transcriptSource === 'none' && PERPLEXITY_API_KEY) {
      const searchResult = await searchVideoInfo(title, url, PERPLEXITY_API_KEY);
      if (searchResult) {
        summary = searchResult.summary;
        tags = searchResult.tags;
        transcriptSource = 'perplexity-search';
        console.log('Got summary from Perplexity search');
      }
    }

    // Generate AI summary if not already done via search
    if (!summary) {
      const systemPrompt = `You are a knowledge assistant creating comprehensive summaries.
Your task:
1. Summarize the main content and key insights (200-300 words)
2. ${isYouTube && transcriptData ? 'This is a YouTube video transcript - focus on key topics, main arguments, and takeaways' : 'Extract important information and context'}
3. Propose 4-8 relevant tags for categorization

Return ONLY valid JSON:
{"summary": "detailed summary here", "tags": ["tag1", "tag2", ...]}`;

      const userPrompt = `Summarize this content:
Title: ${title}
URL: ${url}
${isYouTube ? 'Type: YouTube Video' : 'Type: Article/Webpage'}
${transcriptData ? `Transcript: ${transcriptData.text.slice(0, 8000)}` : `Content: ${(metaDescription || textContent).slice(0, 8000)}`}`;

      // Try Perplexity first
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

    console.log('Summarization complete. Transcript source:', transcriptSource);

    return new Response(
      JSON.stringify({ 
        summary, 
        title: title || 'Untitled', 
        tags, 
        meta: { 
          ogImage, 
          favicon, 
          siteName,
          transcriptSource,
          hasFullTranscript: transcriptSource !== 'none' && transcriptSource !== 'perplexity-search',
        }, 
        text: textContent,
        citations,
        isYouTube,
        hasTranscript: transcriptSource !== 'none',
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
