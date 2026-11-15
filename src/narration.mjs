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

const files={a:'а',b:'бэ',c:'цэ',d:'дэ',e:'е',f:'эф',g:'жэ',h:'аш'};
const numbers=['','один','два','три','четыре','пять','шесть','семь','восемь'];
export function speechText(text){return String(text).replace(/\b([a-h])([1-8])\b/gi,(_,file,rank)=>files[file.toLowerCase()]+' '+numbers[Number(rank)]);}
export function displayText(text){
 const aliases={'а':'A','бэ':'B','це':'C','цэ':'C','дэ':'D','е':'E','эф':'F','же':'G','жэ':'G','аш':'H'};
 return String(text??'').replace(/(?<![а-яё])(?:а|бэ|це|цэ|дэ|е|эф|же|жэ|аш)\s+(?:один|два|три|четыре|пять|шесть|семь|восемь)(?![а-яё])/gi,m=>{const [f,n]=m.toLowerCase().split(/\s+/);return aliases[f]+numbers.indexOf(n);}).replace(/\b([a-h])([1-8])\b/gi,m=>m.toUpperCase());
}
