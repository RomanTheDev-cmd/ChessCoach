import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {createRequire} from 'node:module';const {build}=createRequire(process.cwd()+'/package.json')('esbuild');import {createHash} from 'node:crypto';
const root=process.cwd(),source=fs.readFileSync('src/app.mjs','utf8'),main=fs.readFileSync('main.cjs','utf8');
const line=p=>source.split('\n').find(l=>l.startsWith(p));
const {moveOffset,shouldRecordInterrupt}=await import(root+'/src/ui.mjs');
const {OpeningSession}=await import(root+'/src/opening-session.mjs');const {courses}=await import(root+'/src/opening-courses.mjs');const {fresh}=await import(root+'/src/core.mjs');const {recordCourseSession}=await import(root+'/src/opening-progress.mjs');
const closeBody=source.match(/window\.coach\?\.onCloseRequest\(async\(\)=>\{(.+)\}\);/)[1];
const result={offset:moveOffset({left:100,top:500},{left:100,top:340})};
for(const delayed of [false,true]){
 let rejectSave,closed=false,timer,cancelled=false;
 const ctx=vm.createContext({state:{},ready:true,closeFlushed:false,leaveStudy:async()=>{},toast:()=>{},window:{coach:{save:()=>delayed?new Promise((_,r)=>rejectSave=r):Promise.reject(Error('ENOSPC')),log:()=>{},confirmClose:()=>closed=true,cancelClose:()=>{cancelled=true;timer=null;}}},console});
 // Execute the real main-process close handler with a virtual clock.
 const handler=main.match(/win\.on\('close',e=>\{(.+?)\}\);win\.webContents/)[1];
 const mc=vm.createContext({allowClose:false,closeTimer:null,clearTimeout:()=>{},setTimeout:(fn,ms)=>{timer=fn;assert.equal(ms,2500);return 1;},win:{webContents:{send:()=>{}},close:()=>closed=true}});
 vm.runInContext('function closeWindow(e){'+handler+'};closeWindow({preventDefault(){}})',mc);
 const pending=vm.runInContext(line('async function save()')+';async function closeNow(){'+closeBody+'};closeNow();',ctx);
 if(delayed){while(!rejectSave)await new Promise(r=>setImmediate(r));timer();rejectSave(Error('ENOSPC'));}
 await pending;result[delayed?'slowSaveFailure':'fastSaveFailure']={closed,cancelled};
}
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/opening-practice.json','utf8'));
async function lastMove(interrupt){
 const course=courses[0],unit=course.units.at(-1),s=new OpeningSession(course,unit);s.practice();
 for(const move of fixture.moves.slice(0,-1)){if(s.game.turn()===course.side)s.attempt(move);else s.reply(move);}
 const state=fresh();state.openingCourses={[course.id]:{completed:course.units.slice(0,7).map(u=>u.id),history:[]}};
 let release,calls=0,assessments=0;const u=fixture.moves.at(-1);
 const ctx=vm.createContext({study:s,course,state,ready:true,closeFlushed:false,selected:u.slice(0,2),pendingPromotion:null,last:null,engine:{search:async()=>{if(++calls===2)return await new Promise(r=>release=r);return{score:0};}},assessDecision:()=>{assessments++;return{loss:500,reason:'Injected last-move blunder'};},shouldRecordInterrupt,recordCourseSession,stopNarration:()=>{},save:async()=>true,queueMove:()=>{},render:()=>{},say:()=>{},narrateCurrent:()=>{},toast:()=>{},console,window:{coach:{confirmClose:()=>{},cancelClose:()=>{}}}});
 const square=source.slice(source.indexOf('async function courseSquare('),source.indexOf('async function courseComputer('));
 vm.runInContext(line('async function leaveStudy()')+'\n'+line('async function finishStudy(')+'\n'+square+'\nasync function closeNow(){'+closeBody+'}',ctx);
 const pending=vm.runInContext(`courseSquare('${u.slice(2,4)}')`,ctx);while(!release)await new Promise(r=>setImmediate(r));
 if(interrupt)await vm.runInContext('closeNow()',ctx);release({score:-500});await pending;
 const h=state.openingCourses[course.id].history[0];return{assessments,historyCount:state.openingCourses[course.id].history.length,passed:h.passed,score:h.score,errors:h.errors.length};
}
result.lastMoveNormal=await lastMove(false);result.lastMoveClose=await lastMove(true);
await build({entryPoints:['src/app.mjs'],bundle:true,outfile:'/tmp/chess-review-141/app.js',format:'esm',target:'chrome140'});
const hash=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');result.freshBuildMatches=hash('/tmp/chess-review-141/app.js')===hash('dist/app.js');
const installed='/Applications/Шахматный тренер.app/Contents/Resources/app/';result.installMatches={};for(const f of ['main.cjs','preload.cjs','src/store.cjs','dist/app.js','dist/style.css','package.json'])result.installMatches[f]=hash(root+'/'+f)===hash(installed+f);
fs.writeFileSync('/tmp/chess-review-141/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
