/**
 * Cloudflare Worker: HTMLフェッチプロキシ
 * Cloud FunctionsのIPがブロックされるサイトに対して、
 * CloudflareのIPからHTMLを取得して返すリレー
 */
export default {
  async fetch(request, env) {
    // CORSプリフライト
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Proxy-Secret',
        },
      });
    }

    // POSTのみ許可
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // シークレットキーで認証（不正利用防止）
    const secret = request.headers.get('X-Proxy-Secret');
    if (!secret || secret !== env.PROXY_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      const { url } = await request.json();
      if (!url || !url.startsWith('http')) {
        return new Response(JSON.stringify({ error: 'Invalid URL' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 対象サイトにfetch（CloudflareのIPから）
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
      });

      const html = await response.text();

      return new Response(JSON.stringify({
        status: response.status,
        html: html,
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
