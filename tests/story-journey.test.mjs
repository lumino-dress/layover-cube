import test from 'node:test';
import assert from 'node:assert/strict';
import { bindStoryJourney } from '../lumino/story-journey.js';
import { createStore, freshState, earnedIds, STORAGE_KEY } from '../lumino/state.js';
let JSDOM;
try { ({ JSDOM } = await import(process.env.LUMINO_DOM_MODULE || 'jsdom')); } catch {}
const domTest = (name, fn) => test(name, { skip: !JSDOM && 'DOM 검사에는 jsdom 또는 LUMINO_DOM_MODULE 지정 필요' }, fn);
function setup(saved = null) {
 const { window } = new JSDOM('<article id="root" data-portfolio-status="ready"><p>공개 내용</p></article><span id="end"></span><a id="link">YOUR JOURNEY</a>', { pretendToBeVisual: true });
 const root = window.document.getElementById('root'), end = window.document.getElementById('end'), link = window.document.getElementById('link');
 let rect = { top: 2000, bottom: 2001 };
 end.getBoundingClientRect = () => rect;
 const data = new Map(saved ? [[STORAGE_KEY, JSON.stringify(saved)]] : []);
 const storage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
 const store = createStore(storage);
 const dispose = bindStoryJourney({ root, end, link, store, view: window });
 return { root, end, link, store, storage, window, dispose,
  scroll: () => window.dispatchEvent(new window.Event('scroll')),
  bottom: () => { rect = { top: 500, bottom: 501 }; },
  click: () => { const event = new window.MouseEvent('click', { bubbles: true, cancelable: true }); link.dispatchEvent(event); return event; } };
}
domTest('스크롤·끝 확인·버튼 클릭 순서로만 CUTE 지급, 이동 방해와 중복 지급 없음', () => {
 const c = setup();
 c.click(); assert.deepEqual(earnedIds(c.store.get()), []);
 c.scroll(); c.click(); assert.deepEqual(earnedIds(c.store.get()), []);
 c.bottom(); c.click(); assert.deepEqual(earnedIds(c.store.get()), []);
 c.scroll(); assert.deepEqual(earnedIds(c.store.get()), []);
 assert.equal(c.click().defaultPrevented, false);
 assert.deepEqual(earnedIds(c.store.get()), ['cute']);
 const date = c.store.get().earnedAt.cute;
 c.click(); assert.equal(c.store.get().earnedAt.cute, date);
 assert.deepEqual(earnedIds(createStore(c.storage).get()), ['cute']);
});
domTest('로딩·실패·빈 내용에서 버튼 이동 유지, 스탬프 미지급', () => {
 for (const status of ['loading', 'error', 'empty']) {
  const c = setup(); c.root.dataset.portfolioStatus = status; c.bottom(); c.scroll();
  assert.equal(c.click().defaultPrevented, false); assert.deepEqual(earnedIds(c.store.get()), []);
 }
});
domTest('긴 이미지 로딩 전의 가짜 끝과 깨진 이미지로는 지급하지 않음', () => {
 const c = setup(); const img = c.window.document.createElement('img'); c.root.append(img);
 let loaded = false;
 Object.defineProperty(img, 'complete', { get: () => loaded });
 Object.defineProperty(img, 'naturalWidth', { get: () => loaded ? 1000 : 0 });
 c.bottom(); c.scroll(); c.click(); assert.deepEqual(earnedIds(c.store.get()), []);
 loaded = true; img.dispatchEvent(new c.window.Event('load'));
 c.click(); assert.deepEqual(earnedIds(c.store.get()), ['cute']);
 const broken = setup(); const bad = broken.window.document.createElement('img'); broken.root.append(bad);
 broken.bottom(); broken.scroll(); broken.click(); assert.deepEqual(earnedIds(broken.store.get()), []);
});
domTest('재조회 시 이전 끝 확인을 초기화', () => {
 const c = setup(); c.bottom(); c.scroll();
 c.root.dispatchEvent(new c.window.CustomEvent('story-portfolio-state'));
 c.click(); assert.deepEqual(earnedIds(c.store.get()), []);
 c.scroll(); c.click(); assert.deepEqual(earnedIds(c.store.get()), ['cute']);
});
domTest('기존 CUTE 기록 보존 및 다섯 스탬프·완료 복원', () => {
 const saved = { ...freshState(), storyRead: true, ribbonFound: true, earnedAt: { cute: '2026-10-01T00:00:00.000Z' } };
 const c = setup(saved); assert.equal(c.store.get().earnedAt.cute, saved.earnedAt.cute);
 c.store.update({ started: true, favoriteId: 'pink-daydream', photoId: 'castle-dream', answers: { destination: 'paris', mood: 'romantic', item: 'ribbon' }, tasteComplete: true });
 assert.equal(earnedIds(c.store.get()).length, 5);
 c.store.update({ completionSeen: true });
 assert.equal(createStore(c.storage).get().completionSeen, true);
});
domTest('다른 네 스탬프를 모은 뒤 새 CUTE 획득으로 5/5 완성', () => {
 const c = setup();
 c.store.update({ started: true, favoriteId: 'pink-daydream', photoId: 'castle-dream', answers: { destination: 'paris', mood: 'romantic', item: 'ribbon' }, tasteComplete: true });
 assert.equal(earnedIds(c.store.get()).length, 4);
 c.bottom(); c.scroll(); c.click(); assert.equal(earnedIds(c.store.get()).length, 5);
});
