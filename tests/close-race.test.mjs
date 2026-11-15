import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as ui from '../src/ui.mjs';
import {OpeningSession} from '../src/opening-session.mjs';
import {courses} from '../src/opening-courses.mjs';
import {fresh} from '../src/core.mjs';
import {recordCourseSession} from '../src/opening-progress.mjs';
import {assessDecision} from '../src/decision.mjs';
const source=fs.readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../main.cjs',import.meta.url),'utf8');
const line=p=>source.split('\n').find(l=>l.startsWith(p));
const closeBody=source.match(/window\.coach\?\.onCloseRequest\(async\(\)=>\{(.+)\}\);/)[1];
const tick=()=>new Promise(r=>setImmediate(r));
// Execute actual handlers; only IPC, clock and engine I/O are controlled.
test('closing waits beyond 2.5 seconds for save; failure allows a successful retry',async()=>{
 let rejectSave,timer,closed=0,fail=true;const handlers={};
 const mc=vm.createContext({ipcMain:{on:(name,fn)=>handlers[name]=fn},allowClose:false,closeTimer:null,clearTimeout:()=>{timer=null;},setTimeout:fn=>{timer=fn;return 1;},win:{webContents:{send:()=>{}},close:()=>closed++}});
 const handler=main.match(/win\.on\('close',e=>\{(.+?)\}\);win\.webContents/)[1];
 vm.runInContext('function closeWindow(e){'+handler+'};'+main.split('\n').find(l=>l.startsWith("ipcMain.on('close-cancel'")),mc);
 const ctx=vm.createContext({state:{},taskOperation:Promise.resolve(),ready:true,closeFlushed:false,leaveStudy:async()=>{},toast:()=>{},console,window:{coach:{save:()=>fail?new Promise((_,r)=>rejectSave=r):Promise.resolve(true),log:()=>{},confirmClose:()=>closed++,cancelClose:()=>handlers['close-cancel']()}}});
 vm.runInContext(line('async function save()')+';async function closeNow(){'+closeBody+'}',ctx);
 vm.runInContext('closeWindow({preventDefault(){}})',mc);
 const pending=vm.runInContext('closeNow()',ctx);while(!rejectSave)await tick();
 if(timer)timer(); // virtual clock passes the former 2500 ms deadline
 const prematurelyClosed=closed;rejectSave(Error('ENOSPC'));await pending;
 assert.equal(prematurelyClosed,0,'must not close while save has no result');
 assert.equal(closed,0,'failed save must keep the window open');
 fail=false;await vm.runInContext('closeNow()',ctx);assert.equal(closed,1,'retry closes after successful persistence');
});
async function finalMove(interrupt){
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/opening-practice.json',import.meta.url)));
 const course=courses[0],unit=course.units.at(-1),s=new OpeningSession(course,unit);s.practice();
 for(const move of fixture.moves.slice(0,-1)){if(s.game.turn()===course.side)s.attempt(move);else s.reply(move);}
 const u=fixture.moves.at(-1),best=s.game.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion||'')).find(m=>m!==u);
 const state=fresh();state.openingCourses={[course.id]:{completed:course.units.slice(0,7).map(u=>u.id),history:[]}};
 let release,calls=0,closed=0;
 const ctx=vm.createContext({...ui,moving:false,pendingMove:null,waitForMove:async()=>{},pause:async()=>{},REPLY_PAUSE:0,study:s,course,state,taskOperation:Promise.resolve(),ready:true,closeFlushed:false,selected:u.slice(0,2),pendingPromotion:null,last:null,engine:{search:async()=>++calls===2?await new Promise(r=>release=r):{move:best,score:0,pv:[best]}},assessDecision,recordCourseSession,stopNarration:()=>{},save:async()=>true,queueMove:()=>{},render:()=>{},say:()=>{},narrateCurrent:()=>{},toast:()=>{},console,window:{coach:{confirmClose:()=>closed++,cancelClose:()=>{}}}});
 const start=source.search(/^(?:async )?function courseSquare\(/m);
 vm.runInContext(line('async function leaveStudy()')+'\n'+line('async function finishStudy(')+'\n'+source.slice(start,source.indexOf('let closeFlushed='))+'\nasync function closeNow(){'+closeBody+'}',ctx);
 const pending=vm.runInContext(`courseSquare('${u.slice(2,4)}')`,ctx);for(let i=0;!release&&i<100;i++)await tick();assert.equal(typeof release,'function','the last-move analysis must start');
 const closing=interrupt?vm.runInContext('closeNow()',ctx):Promise.resolve();await tick();
 const earlyHistory=state.openingCourses[course.id].history.length,earlyClosed=closed;
 release({score:500,pv:[]});await Promise.all([pending,closing]);
 return{state,history:state.openingCourses[course.id].history,earlyHistory,earlyClosed};
}
test('closing on the last move preserves the same assessment, score and personal task as normal completion',async()=>{
 const normal=await finalMove(false),closing=await finalMove(true);
 assert.equal(closing.earlyHistory,0,'do not grade before the last engine answer');
 assert.equal(closing.earlyClosed,0,'do not close before the last engine answer');
 for(const r of [normal,closing]){
  assert.equal(r.history.length,1);assert.equal(r.history[0].passed,true);
  assert.equal(r.history[0].score,83);assert.equal(r.history[0].errors.length,1);
  assert.equal(r.state.mistakes.length,1);assert.equal(r.state.mistakes[0].line.length,1);
 }
 assert.equal(closing.history[0].errors[0].bestUci,normal.history[0].errors[0].bestUci);
});
test('closing also waits for the current puzzle grading before saving progress',async()=>{
 let release,closed=false,savedComplete=false;const state={complete:false};
 const taskOperation=new Promise(r=>release=r).then(()=>{state.complete=true;});
 const ctx=vm.createContext({state,taskOperation,ready:true,closeFlushed:false,leaveStudy:async()=>{},save:async()=>{savedComplete=state.complete;return true;},console,toast(){},window:{coach:{confirmClose:()=>closed=true,cancelClose(){}}}});
 vm.runInContext('async function closeNow(){'+closeBody+'}',ctx);const pending=vm.runInContext('closeNow()',ctx);await tick();const early=closed;release();await pending;
 assert.equal(early,false);assert.equal(closed,true);assert.equal(savedComplete,true);
});
