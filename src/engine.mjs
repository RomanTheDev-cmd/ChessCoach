import {Chess} from 'chess.js';
export class Engine{
 constructor(worker){this.chain=Promise.resolve();this.worker=worker??new Worker('./engine/stockfish-19-lite-single.js');this.ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Движок не загрузился за 30 секунд. Перезапустите приложение.')),30000);this.worker.onerror=()=>{clearTimeout(timer);this.failure=Error('Не удалось загрузить шахматный движок. Перезапустите приложение.');this.fail?.(this.failure);reject(this.failure);};this.worker.onmessage=e=>{const line=String(e.data);if(line==='uciok'){clearTimeout(timer);this.worker.postMessage('setoption name Hash value 32');resolve();}this.receive?.(line);};this.worker.postMessage('uci');});}
 search(fen,{time=180,skill=20,multi=1}={}){
  const job=async()=>{
   await this.ready;if(this.failure)throw this.failure;
   return new Promise((resolve,reject)=>{
    const rows={};let draining=false,awaitingReady=false,drainTimer;
    const finish=(error,result)=>{clearTimeout(timer);clearTimeout(drainTimer);this.receive=null;this.fail=null;error?reject(error):resolve(result);};
    this.fail=error=>finish(error);
    const timer=setTimeout(()=>{
     // STOP still produces a bestmove for the old position. Consume it and the
     // ready barrier before allowing any queued position to use this worker.
     draining=true;
     drainTimer=setTimeout(()=>{this.failure=Error('Движок перестал отвечать. Перезапустите приложение.');finish(this.failure);},5000);
     this.worker.postMessage('stop');
    },15000);
    this.receive=line=>{
     if(draining){
      if(line.startsWith('bestmove ')&&!awaitingReady){awaitingReady=true;this.worker.postMessage('isready');}
      else if(line==='readyok'&&awaitingReady)finish(Error('Движок не ответил вовремя. Повторите действие.'));
      return;
     }
     const m=line.match(/info depth (\d+).*?(?:multipv (\d+) )?score (cp|mate) (-?\d+).*? pv (.+)/);
     if(m){const idx=Number(m[2]||1),score=m[3]==='mate'?Math.sign(Number(m[4]))*(100000-Math.abs(Number(m[4]))*100):Number(m[4]);rows[idx]={depth:Number(m[1]),score,pv:m[5].trim().split(' ')};}
     if(line.startsWith('bestmove '))finish(null,{...rows[1],move:line.split(' ')[1],rows:Object.values(rows)});
    };
    this.worker.postMessage('setoption name Skill Level value '+skill);this.worker.postMessage('setoption name MultiPV value '+multi);this.worker.postMessage('position fen '+fen);this.worker.postMessage('go movetime '+time);
   });
  };
  const out=this.chain.then(job);this.chain=out.catch(()=>{});return out;
 }
}
export function uciMove(game,uci){
 if(typeof uci!=='string'||!/^([a-h][1-8]){2}[qrbn]?$/.test(uci))throw Error('Некорректная запись хода.');
 if(game.isGameOver())throw Error('Партия уже завершена.');
 const from=uci.slice(0,2),to=uci.slice(2,4),promotion=uci[4];
 if(promotion&&!game.moves({square:from,verbose:true}).some(m=>m.to===to&&m.promotion===promotion))throw Error('Такое превращение невозможно.');
 return game.move({from,to,...(promotion?{promotion}:{})});
}
export function loadPosition(fen){
 const game=new Chess(fen),opposite=game.fen().split(' ');opposite[1]=game.turn()==='w'?'b':'w';opposite[3]='-';
 if(new Chess(opposite.join(' ')).isCheck())throw Error('Некорректная позиция: король завершившей ход стороны находится под шахом.');
 return game;
}
export function describeMove(game,uci){try{const copy=new game.constructor(game.fen());return uciMove(copy,uci).san;}catch{return uci;}}

export function spokenMove(c,u){const m=uciMove(new Chess(c.fen()),u),files={a:'а',b:'бэ',c:'цэ',d:'дэ',e:'е',f:'эф',g:'жэ',h:'аш'},nums=['','один','два','три','четыре','пять','шесть','семь','восемь'];return({p:'пешка',n:'конь',b:'слон',r:'ладья',q:'ферзь',k:'король'}[m.piece])+' на '+files[m.to[0]]+' '+nums[Number(m.to[1])];}
export function replayMoves(moves){if(!Array.isArray(moves))throw Error('Некорректная история ходов.');const restored=new Chess();for(const move of moves)uciMove(restored,move);return restored;}
