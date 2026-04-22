export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname;

    // 如果请求 .wasm，尝试返回 .br 版本
    if (path.endsWith('.wasm') && !path.endsWith('.wasm.br')) {
      const brPath = path + '.br';
      const brResponse = await env.ASSETS.fetch(brPath);  // 或 R2
      if (brResponse.ok) {
        const headers = new Headers(brResponse.headers);
        headers.set('Content-Type', 'application/wasm');
        headers.set('Content-Encoding', 'br');
        headers.set('Vary', 'Accept-Encoding');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        return new Response(brResponse.body, { headers });
      }
    }

    // 其他文件正常返回
    return env.ASSETS.fetch(request);
  }
};