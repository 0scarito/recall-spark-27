export const config = { runtime: 'edge' } as const;

const cors: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const { url } = await req.json();
    if (!url) return new Response(JSON.stringify({ error: 'Missing url' }), { status: 400, headers: cors });

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/123 Safari/537.36',
      },
    });
    if (!resp.ok) throw new Error(`Failed to fetch URL: ${resp.status} ${resp.statusText}`);
    const html = await resp.text();

    const pick = (re: RegExp) => (html.match(re)?.[1] || '').trim();
    const title = pick(/<title[^>]*>([^<]+)<\/title>/i) || new URL(url).hostname;
    const metaDescription = pick(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const rawOg = pick(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    const ogImage = rawOg ? new URL(rawOg, url).toString() : '';
    const siteName = pick(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
    const faviconRel = pick(/<link[^>]*rel=["'](?:shortcut icon|icon)["'][^>]*href=["']([^"']+)["']/i);
    const favicon = faviconRel ? new URL(faviconRel, url).toString() : '';

    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\\/style>)<[^<]*)*<\\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);

    const apiKey = (globalThis as any).process?.env?.LOVABLE_API_KEY || (globalThis as any).Deno?.env?.get?.('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

    const ai = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un assistant de lecture. Résume en français clair (120-180 mots) + 3-6 tags courts. Réponds STRICTEMENT en JSON {"summary":"...","tags":["..."]}.' },
          { role: 'user', content: `Titre: ${title}\nURL: ${url}\nContenu: ${metaDescription || textContent}` },
        ],
      }),
    });

    if (!ai.ok) {
      if (ai.status === 429) return new Response(JSON.stringify({ error: 'Rate limited' }), { status: 429, headers: cors });
      if (ai.status === 402) return new Response(JSON.stringify({ error: 'Payment required' }), { status: 402, headers: cors });
      throw new Error(`AI error: ${ai.status} ${ai.statusText}`);
    }

    const data = await ai.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    let summary = '';
    let tags: string[] = [];
    try {
      const parsed = JSON.parse(content);
      summary = String(parsed.summary || '');
      tags = Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 8) : [];
    } catch {
      summary = content;
    }

    return new Response(
      JSON.stringify({ title, summary, tags, meta: { ogImage, favicon, siteName }, text: textContent }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
}


