import {test} from 'node:test';import assert from 'node:assert/strict';import {Chess} from 'chess.js';
import {explainIllegal,puzzleHint,explainSolution,explainWrong,readableMove} from '../src/coach-feedback.mjs';
const task={fen:'6k1/5ppp/8/8/3q4/8/3R1PPP/6K1 w - - 0 1',line:['d2d4'],explanation:'После вашего хода соперник может взять пешку: пешка на дэ четыре. По расчёту движка это ухудшает позицию.'};
test('solution describes actual queen capture, ignoring stale comment about nonexistent pawn',()=>{const text=explainSolution(task);assert.match(text,/ферз/);assert.match(text,/D4/);assert.doesNotMatch(text,/дэ|движ|пешк/);});
test('progressive hints differ and never reveal the destination of the answer',()=>{const hints=[0,1,2,3].map(n=>puzzleHint(task,0,n));assert.equal(new Set(hints.slice(0,3)).size,3);for(const h of hints)assert.doesNotMatch(h,/D4|дэ четыре/);assert.match(hints[2],/D2/);});
test('illegal pawn backwards and blocked bishop have specific explanations',()=>{const c=new Chess();assert.match(explainIllegal(c,'e2','e1'),/назад|свои/);assert.match(explainIllegal(c,'c1','h6'),/перекры|мешает/);});
test('pinned rook cannot expose its king',()=>{const c=new Chess('4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1');assert.match(explainIllegal(c,'e2','f2'),/корол.*шах/);});
test('readable moves use coordinates rather than phonetic spelling',()=>assert.equal(readableMove(new Chess(task.fen),'d2d4'),'Ладья D2 берёт ферзя на D4'));
test('wrong move explains legal enemy recapture instead of praising permissibility',()=>{const t={fen:'4k3/8/8/8/8/4n3/2PQ4/4K3 b - - 0 1',line:['e3g4']};const s=explainWrong(t,'e3c2');assert.doesNotMatch(s,/допустим|движ/);assert.match(s,/Ферзь D2 берёт коня на C2/);});
