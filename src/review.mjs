import {Chess} from 'chess.js';
import {uciMove} from './engine.mjs';
import {assessDecision} from './decision.mjs';
export async function analyzeGame(g,engine,progress=()=>{}){
 const c=new Chess(),rows=[];
 for(let ply=0;ply<g.moves.length;ply++){
  const fen=c.fen(),color=c.turn();
  if(color!==g.color){uciMove(c,g.moves[ply]);continue;}
  progress(rows.length+1,Math.ceil(g.moves.length/2));
  const before=await engine.search(fen,{time:200});uciMove(c,g.moves[ply]);
  const after=c.isCheckmate()?{score:-100000}:c.isDraw()?{score:0}:await engine.search(c.fen(),{time:180});
  rows.push({ply,color,...assessDecision(fen,g.moves[ply],before,after,ply)});
 }
 return rows;
}
