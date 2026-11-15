import fs from 'node:fs';
import {test} from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {createInterface} from 'node:readline';import {Chess} from 'chess.js';import {Engine,uciMove} from '../src/engine.mjs';import {analyzeGame} from '../src/review.mjs';import {fresh,commitGame,chooseTask,recordAttempt} from '../src/core.mjs';import {puzzles} from '../src/data.mjs';
class NativeWorker{
 constructor(){this.process=spawn(process.execPath,['dist/engine/stockfish-19-lite-single.js']);createInterface({input:this.process.stdout}).on('line',line=>this.onmessage?.({data:line}));this.process.stderr.on('data',b=>process.stderr.write(b));this.process.on('error',e=>this.onerror?.(e));}
 postMessage(command){this.process.stdin.write(command+'\n');}
}
const fixtures=[
 ['white','w','1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#'],
 ['black','b','1. f3 e5 2. g4 Qh4#'],
 ['opera','b','1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#']
];
test('three complete games are reviewed by actual Stockfish and update the isolated profile',async t=>{
 const worker=new NativeWorker(),engine=new Engine(worker),s=fresh();t.after(()=>worker.process.kill());
 for(const [id,color,pgn] of fixtures){const c=new Chess();c.loadPgn(pgn);assert.equal(c.isCheckmate(),true,id);const moves=c.history({verbose:true}).map(m=>m.from+m.to+(m.promotion||''));const g={id,color,moves,date:Date.now(),opponent:900,terminal:true,finished:true,result:c.turn()!==color?1:0};
 const rows=await analyzeGame(g,engine);assert.equal(rows.length,c.history({verbose:true}).filter(m=>m.color===color).length);assert.ok(rows.every(r=>Number.isFinite(r.loss)&&r.best));for(const r of rows){const before=new Chess(r.fen);assert.ok(uciMove(before,r.best));}
 commitGame(s,g,rows);assert.ok(s.games[0].counted);console.log('FULL_GAME',id,'plies',moves.length,'reviewed',rows.length,'mistakes',s.mistakes.length,'rating',s.rating);
 }
 assert.equal(s.games.filter(g=>g.counted).length,3);assert.ok(s.mistakes.length>0);const task=chooseTask(s,puzzles);assert.ok(task);assert.ok(Math.abs(task.rating-s.rating)<=450);let before=s.attempts.length;recordAttempt(s,task,{correct:true,hints:0,tries:1});assert.equal(s.attempts.length,before+1);s.voice=false;if(process.env.CHESS_TEST_ARTIFACT_DIR){fs.mkdirSync(process.env.CHESS_TEST_ARTIFACT_DIR,{recursive:true});fs.writeFileSync(process.env.CHESS_TEST_ARTIFACT_DIR+'/Интеграционный профиль.json',JSON.stringify(s,null,2));}
});
