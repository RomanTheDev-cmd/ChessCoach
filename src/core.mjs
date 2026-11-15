import {explainSolution,puzzleHint} from './coach-feedback.mjs';
export const themes={tactics:'Тактика',mate:'Матовые угрозы',opening:'Дебют',endgame:'Эндшпиль'};
export const fresh=()=>({version:1,calibration:{id:"initial",startedAt:0},rating:900,games:[],attempts:[],mistakes:[],skills:Object.fromEntries(Object.keys(themes).map(t=>[t,{ok:1,total:2}])),puzzleRatings:{tactics:900,mate:900,opening:900,endgame:900},openingProgress:{},seen:{},presentations:[],appearance:{pieces:"minimal",board:"graphite"},active:null,voice:true});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function recordAttempt(s,t,r){
 const recent=s.attempts.filter(a=>a.id===t.id&&currentEvidence(s,a));const topicEvidence=s.attempts.filter(a=>a.theme===t.theme&&currentEvidence(s,a)&&(!a.skipped||a.tries>1)); const score=r.correct?clamp(1-.25*r.hints-.15*Math.max(0,r.tries-1),.15,1):0;
 s.attempts.push({id:t.id,theme:t.theme,rating:t.rating,score,...r,calibrationId:s.calibration?.id??'initial',date:Date.now()});
 // Repetition is useful for memory, but only the first attempt is level evidence.
 if(!recent.length&&(!r.skipped||r.tries>1)){s.skills[t.theme].ok+=score;s.skills[t.theme].total++;
  s.puzzleRatings??={};const current=topicEvidence.length?(s.puzzleRatings[t.theme]??s.rating):s.rating,expected=1/(1+10**((t.rating-current)/400));
  s.puzzleRatings[t.theme]=Math.round(clamp(current+60*(score-expected),400,2500));
 }
 return s;
}
export function opponentRating(s){
 const unique=[...new Map(s.attempts.filter(a=>currentEvidence(s,a)&&(!a.skipped||a.tries>1)).map(a=>[a.id,a])).values()].slice(-20);
 const shift=unique.length?clamp((unique.reduce((v,a)=>v+a.score,0)/unique.length-.5)*160,-80,80):0;
 return Math.round(clamp(s.rating+shift,400,2400)/25)*25;
}
// Ignore FEN counters and compare occupied squares: adjacent game positions are one exercise family.
function placement(fen){
 const board=[];for(const ch of (fen||'').split(' ')[0]){if(/[1-8]/.test(ch))board.push(...Array(Number(ch)).fill(''));else if(/[prnbqkPRNBQK]/.test(ch))board.push(ch);}
 return board.length===64?board:null;
}
function similarPosition(a,b){
 const x=placement(a.fen),y=placement(b.fen);if(!x||!y)return false;
 let same=0,total=0;for(let i=0;i<64;i++){if(x[i]||y[i])total++;if(x[i]&&x[i]===y[i])same++;}
 return total>0&&same/total>=.8;
}
const generalTags=new Set(['crushing','advantage','equality','short','long','veryLong','oneMove','middlegame','opening','endgame','master','masterVsMaster','superGM']);
const motif=t=>(t.tags||[]).filter(tag=>!generalTags.has(tag)).sort().join(',')||t.theme;
export function chooseTask(s,tasks){
 const all=[...s.mistakes.filter(m=>currentEvidence(s,m)),...tasks],target=opponentRating(s),now=Date.now(),recent=new Set([...(s.presentations||[]).slice(-60),...s.attempts.slice(-20).map(a=>a.id)]),lastAttempt=new Map();
 for(const a of s.attempts)lastAttempt.set(a.id,a);
 const lastSeen=t=>Math.max(s.seen?.[t.id]||0,lastAttempt.get(t.id)?.date||0);
 const eligible=t=>{let a=lastAttempt.get(t.id),seen=lastSeen(t);return !seen||!recent.has(t.id)&&now-seen>=(a?.correct?7:2)*86400000;};
 const targetFor=t=>{const n=s.attempts.filter(a=>a.theme===t.theme&&!a.skipped&&currentEvidence(s,a)).length,w=Math.min(.75,n/12);return target*(1-w)+(s.puzzleRatings?.[t.theme]??target)*w;};
 let pool=all.filter(t=>eligible(t)&&Math.abs(t.rating-targetFor(t))<=250);
 if(!pool.length)pool=all.filter(t=>eligible(t)&&Math.abs(t.rating-targetFor(t))<=450);
 if(!pool.length)pool=all.filter(t=>eligible(t));
 if(!pool.length)pool=all.filter(t=>!recent.has(t.id));
 if(!pool.length)pool=all;
 // Apply diversity only inside the already selected skill band; never trade it for excessive difficulty.
 const catalog=new Map(all.map(t=>[t.id,t]));
 const ownIds=new Set(s.mistakes.filter(m=>currentEvidence(s,m)).map(t=>t.id));
 const details=new Map((s.presentationDetails||[]).map(t=>[t.id,t]));
 const shown=(s.presentations||[]).slice(-8).map(id=>details.get(id)||catalog.get(id)).filter(Boolean);
 const narrow=predicate=>{const alternatives=pool.filter(predicate);if(alternatives.length)pool=alternatives;};
 narrow(t=>!shown.some(previous=>similarPosition(t,previous)));
 if(shown.slice(-2).some(t=>t.own||ownIds.has(t.id)))narrow(t=>!ownIds.has(t.id));
 const lastTwo=shown.slice(-2);
 if(lastTwo.length===2&&motif(lastTwo[0])===motif(lastTwo[1]))narrow(t=>motif(t)!==motif(lastTwo[0]));
 if(lastTwo.length===2&&lastTwo.every(t=>t.theme===lastTwo[0].theme))narrow(t=>t.theme!==lastTwo[0].theme);
 function priority(t){const a=lastAttempt.get(t.id),skill=s.skills[t.theme],own=s.mistakes.some(m=>m.id===t.id);return (own&&!a?.correct?4:0)+(1-skill.ok/skill.total)*2-Math.abs(t.rating-targetFor(t))/250+(a&&!a.correct?.5:0)+(lastSeen(t)?Math.min(1,(now-lastSeen(t))/86400000/30)-.6:0);}
 return pool.toSorted((a,b)=>priority(b)-priority(a)||a.id.localeCompare(b.id))[0];
}
export function presentTask(s,t){s.seen??={};s.presentations??=[];s.seen[t.id]=Date.now();s.presentations.push(t.id);s.presentations=s.presentations.slice(-1000);s.presentationDetails??=[];s.presentationDetails.push({id:t.id,fen:t.fen,theme:t.theme,tags:t.tags,own:s.mistakes.some(m=>m.id===t.id),date:Date.now()});s.presentationDetails=s.presentationDetails.slice(-1000);}
export function classify(fen,best,ply){if(Math.abs(best.score)>9000)return'mate';if(fen.split(' ')[0].replace(/[^prnbqPRNBQ]/g,'').length<=6)return'endgame';return ply<16?'opening':'tactics';}
export function commitGame(s,g,review){
 if(s.games.some(x=>x.id===g.id))return;
 const rows=review.filter(x=>x.color===g.color),loss=rows.reduce((v,x)=>v+x.loss,0)/Math.max(1,rows.length);
 const counted=rows.length>=8||g.terminal;
 const old=s.rating;
 if(counted){const quality=clamp(2100-loss*7,400,2200),expected=1/(1+10**((g.opponent-old)/400));s.rating=Math.round(clamp(old+(g.result-expected)*55+(quality-old)*.17,400,2400));}
 for(const row of rows){const sk=s.skills[row.theme];sk.ok+=row.loss<60?1:row.loss<160?.4:0;sk.total++;
 if(row.loss>=90&&row.best&&row.best!==row.uci&&!s.mistakes.some(t=>t.fen===row.fen&&currentEvidence(s,t)))s.mistakes.unshift({id:g.id+'-'+row.ply,calibrationId:g.calibrationId??'initial',fen:row.fen,line:[row.best],theme:row.theme,rating:Math.round(clamp(old,400,2200)),title:'Позиция из вашей партии',text:'Найдите сильнейший ход. В партии здесь было упущено лучшее продолжение.',hint:puzzleHint({fen:row.fen,line:[row.best]}),explanation:explainSolution({fen:row.fen,line:[row.best]}),source:'Ваша партия'});}
 s.mistakes=s.mistakes.slice(0,300);s.games.unshift({...g,review,loss:Math.round(loss),counted,ratingBefore:old,ratingAfter:s.rating});s.active=null;
}

export function currentEvidence(s,entry){return (entry.calibrationId??'initial')===(s.calibration?.id??'initial');}
export function calibrationGames(s){return s.games.filter(g=>g.counted&&currentEvidence(s,g));}
export function resetCalibration(s){
 if(s.active)throw Error('Сначала завершите текущую партию, затем начните новую оценку.');
 s.calibration={id:crypto.randomUUID(),startedAt:Date.now()};s.rating=900;
 s.skills=Object.fromEntries(Object.keys(themes).map(t=>[t,{ok:1,total:2}]));
 s.puzzleRatings=Object.fromEntries(Object.keys(themes).map(t=>[t,900]));
}
