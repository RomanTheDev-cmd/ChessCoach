import {Chess} from 'chess.js';import {uciMove,describeMove,loadPosition} from './engine.mjs';import {classify} from './core.mjs';import {readableMove} from './coach-feedback.mjs';
export function assessDecision(fen,uci,before,after,ply=0){
 if(!Number.isFinite(before.score)||!Number.isFinite(after.score))throw Error('Движок не завершил оценку позиции. Повторите анализ.');
 const g=loadPosition(fen),move=uciMove(g,uci);let loss=Math.max(0,Math.min(1000,before.score+after.score));
 if(uci===before.move||before.score>9000&&after.score< -9000||before.score< -9000&&after.score>9000)loss=0;
 let reply=null;try{if(after.pv?.[0])reply=uciMove(loadPosition(g.fen()),after.pv[0]);}catch{}
 let theme=classify(fen,before,ply);
 if(loss>=60&&(after.score>9000||before.score>9000))theme='mate';
 else if(loss>=60&&reply?.captured)theme='tactics';
 const reason=reviewExplanation({fen,uci,best:before.move,loss,replyUci:after.pv?.[0],mateLost:before.score>9000&&loss>=60,mateThreat:after.score>9000&&loss>=60});
 const line=(start,moves)=>{const copy=loadPosition(start),out=[];for(const u of (moves||[]).slice(0,5)){try{out.push(uciMove(copy,u).san);}catch{break;}}return out;};
 const bestCheck=loadPosition(fen);uciMove(bestCheck,before.move);
 return{fen,uci,san:move.san,best:before.move,bestSan:describeMove(loadPosition(fen),before.move),variation:line(fen,before.pv),replyVariation:line(g.fen(),after.pv),replyUci:after.pv?.[0],loss,theme,reason};
}

// Rebuild old saved reviews from their moves; never reuse stale prose in a different position.
export function reviewExplanation(row){
 try{
  const c=loadPosition(row.fen);let played=row.uci;
  if(!played&&row.attempted){const m=c.move(row.attempted);played=m.from+m.to+(m.promotion||'');c.undo();}
  const description=readableMove(c,played),m=uciMove(c,played);
  if(c.isCheckmate())return description+'. Это мат: у соперника нет защиты.';
  if(row.loss<60)return description+'. '+(c.isCheck()?'Шах заставляет соперника защитить короля.':'Ход сохраняет возможности вашей позиции.');
  let reply;
  if(row.replyUci){try{reply=uciMove(new Chess(c.fen()),row.replyUci);}catch{}}
  if(!reply&&row.replyVariation?.[0]){try{reply=new Chess(c.fen()).move(row.replyVariation[0]);}catch{}}
  let reason=description+'. ';
  if(reply){const u=reply.from+reply.to+(reply.promotion||'');reason+='Соперник может ответить: '+readableMove(c,u)+'. ';}
  if(row.mateThreat)reason+='После этого продолжения вашему королю угрожает мат. ';
  else if(row.mateLost)reason+='В исходной позиции можно было поставить мат. ';
  const best=row.bestUci||row.best;
  if(best&&/^[a-h][1-8][a-h][1-8]/.test(best))reason+='Сравните с продолжением: '+readableMove(loadPosition(row.fen),best)+'.';
  else reason+='Проверьте угрозы после ответа соперника и сравните продолжения на доске.';
  return reason.trim();
 }catch{return 'Откройте исходную позицию и сравните свой ход с показанным продолжением.';}
}
