import {moveOffset} from './ui.mjs';
export const MOVE_DURATION=650;
export const REPLY_PAUSE=300;
export const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function animateBoardMove(document,move,{duration=MOVE_DURATION,reduced=false}={}){
 const board=document.querySelector('.board');if(!board||!move)return;
 const slides=[move,...(move.castle?[move.castle]:[])].map(({from,to})=>{
  const src=board.querySelector(`.square[data-square="${from}"]`),dst=board.querySelector(`.square[data-square="${to}"]`),img=dst?.querySelector('img');
  if(!src||!dst||!img||reduced)return Promise.resolve();
  const s=src.getBoundingClientRect(),d=dst.getBoundingClientRect();if(!s.width||!d.width)return Promise.resolve();
  const {dx,dy}=moveOffset(s,d);img.style.zIndex='3';
  const animation=img.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],{duration,easing:'cubic-bezier(.25,.1,.25,1)',fill:'backwards'});
  return animation.finished.catch(()=>{}).finally(()=>{img.style.zIndex='';});
 });
 await Promise.all(slides);
}
