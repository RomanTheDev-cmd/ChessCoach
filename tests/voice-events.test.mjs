import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import * as narration from '../src/narration.mjs';
const source=fs.readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
const body=source.slice(source.indexOf('async function say('),source.indexOf('function narrateCurrent('));
test('a repeated result and requested hint speak every time; only section introductions use cooldown',async()=>{
 let played=0,requested=[];const state={voice:true,voiceHistory:{}};
 const context=vm.createContext({...narration,state,transcript:'',voiceStatus:'',voiceSerial:0,audio:null,renderTranscript(){},lessonIsOpen:()=>true,stopNarration(){context.voiceSerial++;},window:{coach:{speak:async text=>{requested.push(text);return'data:audio/mpeg;base64,AA';},log(){}}},save(){},Audio:class{async play(){played++;}pause(){}}});
 vm.runInContext(body,context);
 await vm.runInContext("say('Верно. Задача решена.',{key:'result'});",context);
 await vm.runInContext("say('Верно. Задача решена.',{key:'result'});",context);
 assert.equal(played,2,'another action must speak, even with the same wording');
 await vm.runInContext("say('Посмотрите на D4.',{key:'hint',manual:true});",context);
 assert.equal(context.transcript,'Посмотрите на D4.');
 assert.equal(requested.at(-1),'Посмотрите на дэ четыре.');
 await vm.runInContext("say('Вступление',{key:'intro',intro:true});",context);await new Promise(r=>setImmediate(r));
 // Run introductions sequentially to test completed playback, not concurrent cancellation.
 const old=played;await vm.runInContext("say('Вступление',{key:'intro',intro:true});",context);assert.equal(played,old);
 context.lessonIsOpen=()=>false;await vm.runInContext("say('Меню');",context);assert.equal(played,old);
 state.voice=false;context.lessonIsOpen=()=>true;await vm.runInContext("say('Нет звука');",context);assert.equal(played,old);
});
