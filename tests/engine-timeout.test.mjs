import {test} from 'node:test';import assert from 'node:assert/strict';import {Engine} from '../src/engine.mjs';
const tick=()=>new Promise(r=>setImmediate(r));
class FakeWorker{
 constructor(){this.commands=[];}
 postMessage(command){this.commands.push(command);if(command==='uci')queueMicrotask(()=>this.emit('uciok'));}
 emit(data){this.onmessage({data});}
}
test('a timeout drains the old bestmove and ready barrier before retry uses a new position',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const worker=new FakeWorker(),engine=new Engine(worker);await engine.ready;
 const first=engine.search('old-position').catch(e=>e.message);const second=engine.search('new-position');await tick();
 t.mock.timers.tick(15000);await tick();
 assert.equal(worker.commands.includes('position fen new-position'),false,'new request must wait for old search cleanup');
 worker.emit('bestmove e2e4');await tick();
 assert.equal(worker.commands.at(-1),'isready');assert.equal(worker.commands.includes('position fen new-position'),false);
 worker.emit('readyok');await tick();assert.match(await first,/Повторите/);
 assert.equal(worker.commands.includes('position fen new-position'),true);
 worker.emit('info depth 4 score cp 12 pv d7d5');worker.emit('bestmove d7d5');
 assert.equal((await second).move,'d7d5');
});
test('an unresponsive worker is quarantined permanently rather than reused after a timeout',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const worker=new FakeWorker(),engine=new Engine(worker);await engine.ready;
 const first=engine.search('old').catch(e=>e.message);await tick();t.mock.timers.tick(15000);await tick();t.mock.timers.tick(5000);await tick();
 assert.match(await first,/Перезапустите/);
 await assert.rejects(engine.search('new'),/Перезапустите/);
 assert.equal(worker.commands.includes('position fen new'),false);
});
