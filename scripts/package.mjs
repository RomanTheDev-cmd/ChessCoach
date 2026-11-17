import {packager} from '@electron/packager';import fs from 'node:fs';import path from 'node:path';import {execSync} from 'node:child_process';
const stage=path.resolve('package-stage');fs.mkdirSync(stage,{recursive:true});
for(const f of ['main.cjs','preload.cjs','dist','audio'])fs.cpSync(f,path.join(stage,f),{recursive:true});
fs.mkdirSync(path.join(stage,'src'),{recursive:true});fs.copyFileSync('src/store.cjs',path.join(stage,'src/store.cjs'));
fs.mkdirSync(path.join(stage,'scripts'),{recursive:true});fs.copyFileSync('scripts/voice.py',path.join(stage,'scripts/voice.py'));
fs.writeFileSync(path.join(stage,'package.json'),JSON.stringify({name:'chess-coach',productName:'Шахматный тренер',version:'1.5.1',main:'main.cjs',description:'Личный шахматный тренер',author:'Roman',license:'GPL-3.0'}));
const out=await packager({dir:stage,out:path.resolve('release','1.5.1'),name:'Шахматный тренер',executableName:'ChessCoach',appBundleId:'com.roman.chess-coach',platform:'darwin',arch:'arm64',electronVersion:'45.3.2',overwrite:true,asar:false,prune:false,icon:path.resolve('assets/AppIcon.icns'),appCopyright:'Roman · 2026'});
const appBundle=path.join(out[0],'Шахматный тренер.app');
if(fs.existsSync(appBundle)){execSync(`/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Шахматный тренер" ${JSON.stringify(path.join(appBundle,'Contents','Info.plist'))}`);console.log('CFBundleDisplayName → Шахматный тренер');}
console.log(out.join('\n'));
