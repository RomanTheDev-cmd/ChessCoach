import {uciMove} from './engine.mjs';
export function advancePuzzle(game,line,index,{alternative=false,mateAllowed=false}={}){
 const m=game.history({verbose:true}).at(-1),uci=m.from+m.to+(m.promotion||'');
 if(uci!==line[index]&&!alternative&&!(mateAllowed&&game.isCheckmate())){game.undo();return {correct:false,index,done:false};}
 if(alternative||game.isCheckmate())return{correct:true,index:line.length,done:true};
 let next=index+1,reply=null;
 if(next<line.length){reply=uciMove(game,line[next]);next++;}
 return {correct:true,index:next,done:next>=line.length,reply};
}
