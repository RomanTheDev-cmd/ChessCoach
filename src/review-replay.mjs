import {loadPosition,uciMove} from './engine.mjs';
export function reviewReplay(row,{best=true,ply=0}={}){
 const c=loadPosition(row.fen),tokens=best?(row.variation?.length?row.variation:[row.best]):[row.uci,...(row.replyVariation||[])],moves=[];
 for(const token of tokens){try{const m=/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(token)?uciMove(c,token):c.move(token);moves.push(m.from+m.to+(m.promotion||''));}catch{break;}}
 const game=loadPosition(row.fen),count=Math.max(0,Math.min(ply,moves.length));let last=null;
 for(const u of moves.slice(0,count)){const m=uciMove(game,u);last=[m.from,m.to];}
 return{game,last,total:moves.length,ply:count};
}
