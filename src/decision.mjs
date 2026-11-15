import {Chess} from 'chess.js';import {uciMove,describeMove,spokenMove,loadPosition} from './engine.mjs';import {classify} from './core.mjs';
export function assessDecision(fen,uci,before,after,ply=0){
 if(!Number.isFinite(before.score)||!Number.isFinite(after.score))throw Error('Движок не завершил оценку позиции. Повторите анализ.');
 const g=loadPosition(fen),move=uciMove(g,uci);let loss=Math.max(0,Math.min(1000,before.score+after.score));
 if(uci===before.move||before.score>9000&&after.score< -9000||before.score< -9000&&after.score>9000)loss=0;
 let reply=null;try{if(after.pv?.[0])reply=uciMove(loadPosition(g.fen()),after.pv[0]);}catch{}
 let theme=classify(fen,before,ply),reason='Хороший ход. Существенной потери преимущества не обнаружено.';
 if(loss>=60){
 if(after.score>9000){theme='mate';reason='После этого хода движок нашёл принудительный мат за соперника. Посмотрите его расчётное продолжение и способ избежать угрозы.';}
 else if(before.score>9000){theme='mate';reason='В исходной позиции движок находил матовый вариант. Этот ход упустил его. Сравните решение с матовым продолжением.';}
 else if(reply?.captured){theme='tactics';const piece={p:'пешку',n:'коня',b:'слона',r:'ладью',q:'ферзя'}[reply.captured]||'фигуру';reason='После вашего хода соперник может взять '+piece+': '+spokenMove(loadPosition(g.fen()),after.pv[0])+'. По расчёту движка это продолжение ухудшает вашу позицию.';}
 else if(reply?.san.includes('+'))reason='После вашего хода соперник может дать шах: '+spokenMove(loadPosition(g.fen()),after.pv[0])+'. Проверьте защиту короля и сравните продолжения.';
 else reason='Этот ход уступает более точному продолжению по короткому анализу движка. Сравните работу фигур и расчётные линии после обоих решений.';
 }
 const line=(start,moves)=>{const copy=loadPosition(start),out=[];for(const u of (moves||[]).slice(0,5)){try{out.push(uciMove(copy,u).san);}catch{break;}}return out;};
 const bestCheck=loadPosition(fen);uciMove(bestCheck,before.move);
 return{fen,uci,san:move.san,best:before.move,bestSan:describeMove(loadPosition(fen),before.move),variation:line(fen,before.pv),replyVariation:line(g.fen(),after.pv),loss,theme,reason};
}
