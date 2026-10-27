import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../web-worker.js', import.meta.url), 'utf8');
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const originalFetch = globalThis.fetch;
let calls = [];
let reply;
globalThis.fetch = async (url, options) => { calls.push({ url, options }); return reply(url, options); };
test.after(() => { globalThis.fetch = originalFetch; });
const run = (path, method = 'GET') => worker.fetch(new Request('https://test.example' + path, { method, headers: { Cookie: 'visitor=example', Authorization: 'visitor-only' } }), { ASSETS: { fetch: () => new Response('local-page') } });
const setup = fn => { calls = []; reply = fn; };

test('공개 상품 조회: 고정 원본, 인증 미전달, 절대 이미지 경로 변환', async () => {
 setup(() => Response.json({ products: [{ id: 'one', name: '상품', images: ['https://layover-cube.progen-web.workers.dev/images/products/one/a.jpg'] }] }));
 const response = await run('/products.json?source=https://untrusted.example');
 assert.equal(response.status, 200);
 assert.equal((await response.json()).products[0].images[0], '/images/products/one/a.jpg');
 assert.equal(calls[0].url, 'https://layover-cube.progen-web.workers.dev/products.json');
 assert.deepEqual(calls[0].options.headers, { Accept: 'application/json' });
 assert.equal(calls[0].options.redirect, 'manual');
 assert.equal(calls[0].options.method, 'GET');
});
test('포트폴리오 본문과 이미지 유지', async () => {
 setup(() => Response.json({ body: '<p>기존 본문</p><img src="images/portfolio/a.png">' }));
 assert.equal((await (await run('/portfolio.json')).json()).body, '<p>기존 본문</p><img src="images/portfolio/a.png">');
});
test('이미지 GET·HEAD만 전달', async () => {
 setup(() => new Response(new Uint8Array([1, 2]), { headers: { 'Content-Type': 'image/png' } }));
 assert.equal((await (await run('/images/products/one/a.png')).arrayBuffer()).byteLength, 2);
 assert.equal((await run('/images/portfolio/a.png', 'HEAD')).body, null);
 assert.equal(calls[1].options.method, 'HEAD');
});
test('관리자 API와 쓰기 요청 차단, 관리자 링크만 이동', async () => {
 setup(() => { throw new Error('외부 호출 금지'); });
 for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'DELETE']) assert.equal((await run('/api/admin/catalog', method)).status, 403);
 assert.equal((await run('/products.json', 'POST')).status, 405);
 assert.equal((await run('/admin')).headers.get('Location'), 'https://layover-admin.progen-web.workers.dev/admin');
 assert.equal((await run('/admin-config.json')).status, 404);
 assert.equal(calls.length, 0);
});
test('리다이렉트·HTML·잘못된 JSON·원본 오류·예외 시 502, 로컬 상품 대체 없음', async () => {
 for (const fn of [() => new Response(null, { status: 302, headers: { Location: 'https://untrusted.example' } }), () => new Response('<html>login</html>', { headers: { 'Content-Type': 'text/html' } }), () => Response.json({ products: {} }), () => Response.json({ products: [null] }), () => new Response('{', { headers: { 'Content-Type': 'application/json' } }), () => new Response(null, { status: 404 }), () => { throw new Error('offline'); }]) {
  setup(fn); assert.equal((await run('/products.json')).status, 502); assert.equal(calls.length, 1);
 }
});
test('제한 크기 초과 및 위장 이미지 거부', async () => {
 setup(() => new Response('{}', { headers: { 'Content-Type': 'application/json', 'Content-Length': '3000000' } }));
 assert.equal((await run('/products.json')).status, 502);
 setup(() => new Response('<svg/>', { headers: { 'Content-Type': 'image/svg+xml' } }));
 assert.equal((await run('/images/products/a.png')).status, 502);
});
test('디자인 자산 유지, 허용 밖 이미지 주소에 외부 조회 없음', async () => {
 setup(() => { throw new Error('외부 호출 금지'); });
 assert.equal(await (await run('/index.html')).text(), 'local-page');
 assert.equal(await (await run('/images/lumino-world-hero.webp')).text(), 'local-page');
 assert.equal((await run('/images/products/a.svg')).status, 404);
 assert.equal((await run('/images/portfolio/%2foutside.png')).status, 404);
 assert.equal(calls.length, 0);
});
