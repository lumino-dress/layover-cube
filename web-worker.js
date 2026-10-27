// 개인 홈페이지 전용입니다. 관리자 인증·GitHub 쓰기 기능을 포함하지 않습니다.
const SOURCE = 'https://layover-cube.progen-web.workers.dev';
const ADMIN = 'https://layover-admin.progen-web.workers.dev/admin';
const JSON_LIMIT = 2 * 1024 * 1024;
const IMAGE_LIMIT = 8 * 1024 * 1024;
const imagePath = path => /^\/images\/(products|portfolio)\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif|avif)$/i.test(path);
const jsonResponse = (body, status) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});

async function boundedBody(response, limit) {
  if (Number(response.headers.get('Content-Length')) > limit) throw new Error('size');
  if (!response.body) throw new Error('empty');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('size');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

// 공개 원본의 절대 이미지 주소도 개인 사이트 경유로 통일합니다.
function localImages(value) {
  if (typeof value === 'string') return value.replace(
    /https:\/\/layover-cube\.progen-web\.workers\.dev(\/images\/(?:products|portfolio)\/[a-zA-Z0-9_./-]+\.(?:jpg|jpeg|png|webp|gif|avif))(?=["'\s<>]|$)/gi,
    (whole, path) => imagePath(path) ? path : whole
  );
  if (Array.isArray(value)) return value.map(localImages);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localImages(item)]));
  return value;
}

async function publicContent(request, path) {
  const isJson = path === '/products.json' || path === '/portfolio.json';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    // 방문자 쿠키·인증 헤더를 전달하지 않고 리다이렉트도 따라가지 않습니다.
    const upstream = await fetch(SOURCE + path, {
      method: request.method, redirect: 'manual', signal: controller.signal,
      headers: { Accept: isJson ? 'application/json' : 'image/*' }, cache: 'no-store'
    });
    if (!upstream.ok) throw new Error('upstream');
    const type = (upstream.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
    if (isJson ? type !== 'application/json' : !/^image\/(jpeg|png|webp|gif|avif)$/.test(type)) throw new Error('type');
    const headers = { 'Content-Type': type + (isJson ? '; charset=utf-8' : ''),
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    if (request.method === 'HEAD') return new Response(null, { headers });
    const bytes = await boundedBody(upstream, isJson ? JSON_LIMIT : IMAGE_LIMIT);
    if (!isJson) return new Response(bytes, { headers });
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (path === '/products.json') {
      if (!data || !Array.isArray(data.products) || data.products.length > 500 ||
          !data.products.every(p => p && typeof p.id === 'string' && typeof p.name === 'string' &&
            (p.images === undefined || (Array.isArray(p.images) && p.images.every(i => typeof i === 'string'))) &&
            (p.sections === undefined || (Array.isArray(p.sections) && p.sections.every(s => s && typeof s.type === 'string'))))) throw new Error('catalog');
    } else if (!data || typeof data.body !== 'string') throw new Error('portfolio');
    return new Response(JSON.stringify(localImages(data)), { headers });
  } catch (_) {
    // 오래된 상품으로 대체하지 않고 기존 페이지의 오류 안내를 사용합니다.
    return request.method === 'HEAD'
      ? new Response(null, { status: 502, headers: { 'Cache-Control': 'no-store' } })
      : jsonResponse({ error: '공개 콘텐츠를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' }, 502);
  } finally { clearTimeout(timeout); }
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/admin')) return jsonResponse({ error: '이 홈페이지의 관리자 API는 비활성화되어 있습니다.' }, 403);
    if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
    if (path === '/admin' || path === '/admin/' || path === '/admin.html') return Response.redirect(ADMIN, 302);
    if (path === '/admin.js' || path === '/admin.css' || path === '/admin-config.json') return new Response(null, { status: 404 });
    if (path === '/products.json' || path === '/portfolio.json' || imagePath(path)) return publicContent(request, path);
    // 잘못된 이미지 경로는 동봉 파일로 대체하지 않습니다.
    if (path.startsWith('/images/products/') || path.startsWith('/images/portfolio/')) return new Response(null, { status: 404 });
    return env.ASSETS.fetch(request);
  }
};
