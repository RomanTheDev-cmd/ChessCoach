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
 function priority(t){const a=lastAttempt.get(t.id),skill=s.skills[t.theme],own=s.mistakes.some(m=>m.id===t.id);return (own&&!a?.correct?4:0)+(1-skill.ok/skill.total)*2-Math.abs(t.rating-targetFor(t))/250+(a&&!a.correct?.5:0)+(lastSeen(t)?Math.min(1,(now-lastSeen(t))/86400000/30)-.6:0);}
 return pool.toSorted((a,b)=>priority(b)-priority(a)||a.id.localeCompare(b.id))[0];
}
export function presentTask(s,t){s.seen??={};s.presentations??=[];s.seen[t.id]=Date.now();s.presentations.push(t.id);s.presentations=s.presentations.slice(-1000);}
export function classify(fen,best,ply){if(Math.abs(best.score)>9000)return'mate';if(fen.split(' ')[0].replace(/[^prnbqPRNBQ]/g,'').length<=6)return'endgame';return ply<16?'opening':'tactics';}
export function commitGame(s,g,review){
 if(s.games.some(x=>x.id===g.id))return;
 const rows=review.filter(x=>x.color===g.color),loss=rows.reduce((v,x)=>v+x.loss,0)/Math.max(1,rows.length);
 const counted=rows.length>=8||g.terminal;
 const old=s.rating;
 if(counted){const quality=clamp(2100-loss*7,400,2200),expected=1/(1+10**((g.opponent-old)/400));s.rating=Math.round(clamp(old+(g.result-expected)*55+(quality-old)*.17,400,2400));}
 for(const row of rows){const sk=s.skills[row.theme];sk.ok+=row.loss<60?1:row.loss<160?.4:0;sk.total++;
 if(row.loss>=90&&row.best&&row.best!==row.uci&&!s.mistakes.some(t=>t.fen===row.fen&&currentEvidence(s,t)))s.mistakes.unshift({id:g.id+'-'+row.ply,calibrationId:g.calibrationId??'initial',fen:row.fen,line:[row.best],theme:row.theme,rating:Math.round(clamp(old,400,2200)),title:'Позиция из вашей партии',text:'Найдите сильнейший ход. В партии здесь было упущено лучшее продолжение.',hint:'Сначала проверьте шахи, взятия и угрозы.',explanation:row.reason,source:'Ваша партия'});}
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
