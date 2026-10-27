import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { prepareStoryPortfolio, loadStoryPortfolio } from '../story-portfolio.js';
let parseHTML;
try {
 const { JSDOM } = await import(process.env.LUMINO_DOM_MODULE || 'jsdom');
 parseHTML = html => { const { window } = new JSDOM(html); return { window, document: window.document }; };
} catch {}
const html = await readFile(new URL('../about.html', import.meta.url), 'utf8');
test('포트폴리오 → YOUR JOURNEY 구성, 기존 소개·리본·미션 제거', () => {
 assert.ok(html.indexOf('id="story-portfolio-content"') < html.indexOf('id="story-journey-link"'));
 assert.match(html, /id="story-journey-link"[^>]*href="journey.html"/);
 assert.match(html, /data-shared-header/);
 assert.match(html, /data-shared-footer/);
 for (const removed of ['color-closet', 'story-end', 'data-action="ribbon"', 'story-copy', 'story-photo', 'philosophy', 'audience-section', 'data-mission']) assert.ok(!html.includes(removed));
});
const catalogSource = await readFile(new URL('../catalog.js', import.meta.url), 'utf8');
function setup() {
 const { window, document } = parseHTML('<html><body><article id="content"></article></body></html>');
 vm.runInNewContext(catalogSource, { window, document, Node: window.Node, URL });
 return { document, catalog: window.ProductCatalog, root: document.getElementById('content') };
}
const domTest = (name, fn) => test(name, { skip: !parseHTML && 'DOM 검사에는 jsdom 또는 LUMINO_DOM_MODULE 지정 필요' }, fn);
domTest('HTML·마크다운 이미지와 본문 순서 유지, 빈 문단 제거', () => {
 const { document, catalog } = setup();
 const result = prepareStoryPortfolio('<p>첫 소개</p><p><img src="/images/portfolio/first.png"><br></p><p><br></p><p>![두 번째](images/portfolio/second.jpg)</p><p>마지막 소개</p>', document, catalog);
 const box = document.createElement('div'); box.innerHTML = result;
 assert.deepEqual([...box.querySelectorAll('img')].map(i => i.getAttribute('src')), ['/images/portfolio/first.png', 'images/portfolio/second.jpg']);
 assert.ok(result.indexOf('첫 소개') < result.indexOf('first.png'));
 assert.ok(result.indexOf('second.jpg') < result.indexOf('마지막 소개'));
 assert.ok(!result.includes('!['));
 assert.equal(box.querySelectorAll('p').length, 4);
 assert.equal(box.querySelectorAll('br').length, 0);
});
domTest('위험 주소·이벤트 차단, CODE의 예시는 그대로 유지', () => {
 const { document, catalog } = setup();
 const result = prepareStoryPortfolio('<p>![금지](javascript:alert)</p><img src="images/portfolio/a.png" onerror="alert(1)"><code>![예시](images/portfolio/a.png)</code>', document, catalog);
 assert.ok(!result.includes('javascript:'));
 assert.ok(!result.includes('onerror'));
 assert.match(result, /<code>!\[예시\]/);
});
domTest('공개 JSON 본문 표시 및 조회 실패·빈 본문 구분', async () => {
 const { document, catalog, root } = setup();
 await loadStoryPortfolio(root, { document, catalog, fetcher: async (url, options) => {
  assert.equal(url, 'portfolio.json'); assert.equal(options.cache, 'no-store');
  return Response.json({ body: '<p>공개 원본</p>' });
 } });
 assert.equal(root.textContent, '공개 원본');
 assert.equal(root.getAttribute('aria-busy'), 'false');
 await loadStoryPortfolio(root, { document, catalog, fetcher: async () => Response.json({ body: '<p><br></p>' }) });
 assert.match(root.textContent, /등록된 포트폴리오 내용이 없습니다/);
 await loadStoryPortfolio(root, { document, catalog, fetcher: async () => new Response(null, { status: 502 }) });
 assert.match(root.textContent, /불러오지 못했습니다/);
 assert.equal(root.querySelectorAll('button').length, 1);
 assert.equal(root.getAttribute('aria-busy'), 'false');
});
test('긴 이미지 원본 비율·좁은 화면을 위한 전용 스타일', async () => {
 const css = await readFile(new URL('../story-portfolio.css', import.meta.url), 'utf8');
 for (const rule of ['max-width: 100%', 'height: auto', 'max-height: none', 'aspect-ratio: auto', 'object-fit: contain']) assert.ok(css.includes(rule));
});
