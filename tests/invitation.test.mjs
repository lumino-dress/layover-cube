import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { invitation } from '../data/invitation.js';
import { invitationMotion } from '../lumino/invitation-motion.js';
import { createInvitation } from '../lumino/invitation.js';
let JSDOM;
try { ({ JSDOM } = await import(process.env.LUMINO_DOM_MODULE || 'jsdom')); } catch {}
const domTest = (name, fn) => test(name, {skip:!JSDOM && 'DOM 검사에는 jsdom 필요'},fn);
test('신규 전용 자산과 5.2초 타임라인',async()=>{
 assert.equal(invitation.duration,5200);
 for(const [key,path] of Object.entries(invitation)) {
  if(key==='duration')continue;
  assert.ok(path.startsWith('images/invitation-photographic/'));
  const source=await readFile(new URL('../'+path,import.meta.url));
  assert.equal(source[0],255); assert.equal(source[1],216);
 }
 for(const motion of invitationMotion) {
  assert.equal(motion.frames[0].offset,0);
  assert.equal(motion.frames.at(-1).offset,1);
 }
});
function setup(still=false) {
 const {window}=new JSDOM('<dialog id="intro-dialog"></dialog>');
 const dialog=window.document.querySelector('dialog');
 let count=0;const runs=[];
 Object.defineProperty(window.document,'timeline',{value:{currentTime:100}});
 window.Element.prototype.animate=function(frames,options){
  let resolve,reject;const finished=new Promise((a,b)=>{resolve=a;reject=b});
  const animation={finished,cancel:()=>reject(new Error('cancel')),resolve,frames,options};
  runs.push(animation);return animation;
 };
 dialog.close=()=>{dialog.open=false;};
 const old=globalThis.document;globalThis.document=window.document;
 const invitationUI=createInvitation(dialog,{openDialog:()=>{dialog.open=true;},onFinish:()=>count++,reducedMotion:{matches:still},lowPower:false});
 return {dialog,runs,invitationUI,get count(){return count;},cleanup(){globalThis.document=old;}};
}
domTest('열기 중복 방지·동일 타임라인·완료 1회',async()=>{
 const c=setup();try{
 c.invitationUI.show();
 assert.equal(c.dialog.querySelectorAll('.invitation-photo-stage img').length,2);
 assert.equal(c.dialog.querySelectorAll('h2,.invitation-letter-copy,svg').length,0);
 assert.match(c.dialog.querySelector('.invitation-photo-open').alt,/A Sparkling Little Journey/);
 const opening=c.invitationUI.open();await Promise.resolve();await Promise.resolve();
 await c.invitationUI.open();assert.ok(c.runs.length>0);
 assert.ok(c.runs.every(a=>a.options.duration===5200 && a.startTime===100));
 c.runs.forEach(a=>a.resolve());await opening;
 assert.equal(c.count,1);assert.equal(c.dialog.open,false);
 c.invitationUI.finish();assert.equal(c.count,1);
 }finally{c.cleanup();}
});
domTest('모션 감소와 SKIP·다시 보기 취소 안전성',async()=>{
 const c=setup(true);try{
 c.invitationUI.show();const first=c.invitationUI.open();await Promise.resolve();await Promise.resolve();
 assert.equal(c.runs.length,1);assert.equal(c.runs[0].options.duration,1400);
 c.invitationUI.finish();await first;assert.equal(c.count,1);
 c.invitationUI.show();const second=c.invitationUI.open();await Promise.resolve();await Promise.resolve();
 c.invitationUI.show();await second;assert.equal(c.count,1);assert.equal(c.dialog.open,true);
 c.invitationUI.finish();assert.equal(c.count,2);
 }finally{c.cleanup();}
});

domTest('이미지 디코딩 실패 시 임의의 대체 디자인 없이 SKIP 가능',async()=>{
 const c=setup();try{
 c.dialog.ownerDocument.defaultView.HTMLImageElement.prototype.decode=()=>Promise.reject(new Error('image unavailable'));
 c.invitationUI.show();await c.invitationUI.open();
 assert.equal(c.runs.length,0);
 assert.equal(c.count,0);
 assert.match(c.dialog.querySelector('#invitation-status').textContent,/불러오지 못했습니다/);
 c.invitationUI.finish();assert.equal(c.count,1);
 }finally{c.cleanup();}
});
