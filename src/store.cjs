const fs=require('node:fs'),path=require('node:path');
function valid(data){return data?.version===1&&Number.isFinite(data.rating)&&['games','attempts','mistakes'].every(k=>Array.isArray(data[k]))&&data.skills&&['mate','tactics','opening','endgame'].every(k=>Number.isFinite(data.skills[k]?.ok)&&data.skills[k]?.total>0);}
class ProgressStore{
 constructor(file){this.file=file;this.readError=false;}
 load(){try{const data=JSON.parse(fs.readFileSync(this.file,'utf8'));if(!valid(data))throw Error('Неизвестный формат прогресса');return data;}catch(e){if(e.code==='ENOENT')return null;this.readError=true;throw Error('Не удалось прочитать прогресс. Исходный файл сохранён; автоматическая запись остановлена.');}}
 save(data){if(this.readError)throw Error('Запись остановлена, чтобы не заменить повреждённый файл прогресса.');if(!valid(data))throw Error('Некорректный формат прогресса');fs.mkdirSync(path.dirname(this.file),{recursive:true});fs.writeFileSync(this.file+'.tmp',JSON.stringify(data));if(fs.existsSync(this.file))fs.copyFileSync(this.file,this.file+'.bak');fs.renameSync(this.file+'.tmp',this.file);}
}
module.exports={ProgressStore};
