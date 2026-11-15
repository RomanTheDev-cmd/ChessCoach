import {test} from 'node:test';import assert from 'node:assert/strict';import {animateBoardMove,MOVE_DURATION} from '../src/motion.mjs';
test('board motion starts at source, lasts a readable interval and awaits both castling pieces',async()=>{
 const animations=[],releases=[];const rects={e1:{left:320,top:400,width:80},g1:{left:480,top:400,width:80},h1:{left:560,top:400,width:80},f1:{left:400,top:400,width:80}};
 const board={querySelector:selector=>{const sq=selector.match(/data-square="([a-h][1-8])"/)[1];return{getBoundingClientRect:()=>rects[sq],querySelector:()=>({style:{},animate:(keys,options)=>{animations.push({sq,keys,options});return{finished:new Promise(r=>releases.push(r))};}})};}};
 const document={querySelector:()=>board};let done=false;const pending=animateBoardMove(document,{from:'e1',to:'g1',castle:{from:'h1',to:'f1'}}).then(()=>done=true);
 assert.equal(animations.length,2);assert.ok(MOVE_DURATION>=600);assert.equal(animations[0].keys[0].transform,'translate(-160px,0px)');assert.equal(animations[1].keys[0].transform,'translate(160px,0px)');assert.equal(done,false);
 releases[0]();await Promise.resolve();assert.equal(done,false);releases[1]();await pending;assert.equal(done,true);
});
test('reduced motion completes without animated travel',async()=>{let calls=0;const document={querySelector:()=>({querySelector:()=>({querySelector:()=>({animate:()=>calls++})})})};await animateBoardMove(document,{from:'a1',to:'a8'},{reduced:true});assert.equal(calls,0);});
