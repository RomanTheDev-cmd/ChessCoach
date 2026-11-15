export const REPEAT_AFTER=30*60*1000;
export function canNarrate(history,key,now=Date.now()){
 const last=history[key];return !Number.isFinite(last)||now-last>=REPEAT_AFTER;
}
export function rememberNarration(history,key,now=Date.now()){
 history[key]=now;
 const entries=Object.entries(history).filter(([,time])=>Number.isFinite(time)&&now-time<7*86400000).sort((a,b)=>b[1]-a[1]);
 for(const [old] of entries.slice(600))delete history[old];
 for(const old of Object.keys(history))if(!Number.isFinite(history[old])||now-history[old]>=7*86400000)delete history[old];
}
