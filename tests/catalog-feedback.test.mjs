import {test} from 'node:test';import assert from 'node:assert/strict';import {puzzles} from '../src/data.mjs';import {explainSolution,puzzleHint} from '../src/coach-feedback.mjs';import {courses} from '../src/opening-courses.mjs';import {lessons} from '../src/lessons.mjs';
test('all catalog solutions and every player-ply hint render from legal board states with no engine prose',()=>{
 for(const p of puzzles){const text=explainSolution(p);assert.ok(text.length>10&&text.length<1600,p.id);assert.doesNotMatch(text,/движ|по расч[её]ту|[а-я] на (дэ|це|эф|жэ) (один|два|три|четыре)/i,p.id);
  for(let i=0;i<p.line.length;i+=2){const hints=[0,1,2].map(level=>puzzleHint(p,i,level));assert.equal(new Set(hints).size,3,p.id);assert.ok(hints.every(t=>t.length<600),p.id);}
 }
 for(const l of lessons){assert.ok(explainSolution(l));for(let level=0;level<3;level++)assert.ok(puzzleHint(l,0,level));}
 assert.equal(courses.reduce((n,c)=>n+c.units.length,0),40);
});
