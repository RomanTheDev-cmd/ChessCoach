import {Chess} from 'chess.js';
import {uciMove} from './engine.mjs';
const name={p:'Пешка',n:'Конь',b:'Слон',r:'Ладья',q:'Ферзь',k:'Король'};
const take={p:'пешку',n:'коня',b:'слона',r:'ладью',q:'ферзя',k:'короля'};
const square=s=>s.toUpperCase();
const yours={p:'ваша пешка',n:'ваш конь',b:'ваш слон',r:'ваша ладья',q:'ваш ферзь',k:'ваш король'};
function position(task,index=0){const c=new Chess(task.fen);for(const u of task.line.slice(0,index))uciMove(c,u);return c;}
export function readableMove(game,uci){const c=new Chess(game.fen()),m=uciMove(c,uci);if(m.isKingsideCastle())return 'Короткая рокировка';if(m.isQueensideCastle())return 'Длинная рокировка';return name[m.piece]+' '+square(m.from)+(m.captured?' берёт '+take[m.captured]+' на ':' идёт на ')+square(m.to)+(m.promotion?' и превращается в '+take[m.promotion]:'');}
export function explainIllegal(game,from,to,promotion){
 const p=game.get(from);if(!p)return 'На '+square(from)+' нет фигуры. Сначала выберите свою фигуру.';
 if(p.color!==game.turn())return 'Сейчас ход другой стороны. Выберите свою фигуру.';
 if(from===to)return 'Выберите другое поле: фигура должна переместиться.';
 if(game.get(to)?.color===p.color)return 'На '+square(to)+' стоит ваша фигура. Брать свои фигуры нельзя.';
 const dx=to.charCodeAt(0)-from.charCodeAt(0),dy=Number(to[1])-Number(from[1]),ax=Math.abs(dx),ay=Math.abs(dy);
 if(p.type==='p'){
  const step=p.color==='w'?1:-1;
  if(dy*step<=0)return 'Пешка не ходит назад. Она движется только вперёд, а берёт по диагонали.';
  if(dx&&(!game.get(to)&&to!==game.fen().split(' ')[3]))return 'Пешка ходит по диагонали только со взятием. На '+square(to)+' нет фигуры, которую можно взять.';
  if(!dx&&game.get(to))return 'Пешка не берёт прямо перед собой. Взятие возможно только по диагонали.';
  if(ax>1||dy*step>2||ax&&dy*step!==1)return 'Пешка ходит на одно поле вперёд, а берёт на одно поле по диагонали. Двойной ход возможен только с начального поля.';
  if(dy*step===2&&Number(from[1])!==(p.color==='w'?2:7))return 'На два поля пешка может пойти только со своей начальной позиции.';
  if(dy*step===2&&game.get(from[0]+(Number(from[1])+step)))return 'Путь пешки перекрыт другой фигурой. Перепрыгивать через неё нельзя.';
 }else if(p.type==='n'&&!((ax===1&&ay===2)||(ax===2&&ay===1)))return 'Конь ходит буквой «Г»: два поля по одной линии и одно в сторону.';
 else if(p.type==='b'&&ax!==ay)return 'Слон ходит только по диагонали.';
 else if(p.type==='r'&&dx&&dy)return 'Ладья ходит по вертикали или горизонтали.';
 else if(p.type==='q'&&dx&&dy&&ax!==ay)return 'Ферзь ходит по диагонали, вертикали или горизонтали.';
 else if(p.type==='k'&&Math.max(ax,ay)>1){
  if(ay||ax!==2)return 'Король ходит на одно соседнее поле. Исключение — рокировка.';
  const rights=game.fen().split(' ')[2],right=p.color==='w'?(dx>0?'K':'Q'):(dx>0?'k':'q');
  if(!rights.includes(right))return 'Рокировка недоступна: право на неё утрачено после хода короля или соответствующей ладьи.';
  if(dx<0&&game.get('b'+from[1]))return 'Рокировке мешает фигура на B'+from[1]+'. Между королём и ладьёй не должно быть фигур.';
  if(game.isCheck())return 'Нельзя рокироваться из-под шаха. Сначала защитите короля.';
  if(dx<0&&game.get('b'+from[1]))return 'Рокировке мешает фигура на '+square('b'+from[1])+'. Между королём и ладьёй не должно быть фигур.';
  const enemy=p.color==='w'?'b':'w';for(let x=from.charCodeAt(0)+Math.sign(dx);x!==to.charCodeAt(0)+Math.sign(dx);x+=Math.sign(dx)){const sq=String.fromCharCode(x)+from[1];if(game.get(sq))return 'Рокировке мешает фигура на '+square(sq)+'. Между королём и ладьёй не должно быть фигур.';if(game.isAttacked(sq,enemy))return 'При рокировке король не может проходить через атакованное поле '+square(sq)+'.';}
 }
 if(['b','r','q'].includes(p.type)){const sx=Math.sign(dx),sy=Math.sign(dy);for(let i=1;i<Math.max(ax,ay);i++){const sq=String.fromCharCode(from.charCodeAt(0)+i*sx)+(Number(from[1])+i*sy);if(game.get(sq))return 'Путь перекрыт фигурой на '+square(sq)+'. '+name[p.type]+' не может перепрыгнуть через неё.';}}
 if(p.type==='p'&&(to[1]==='8'||to[1]==='1')&&!promotion)return 'На последней горизонтали пешка должна превратиться в ферзя, ладью, слона или коня.';
 const copy=new Chess(game.fen());copy.remove(from);copy.remove(to);if(p.type==='p'&&dx&&!game.get(to))copy.remove(to[0]+from[1]);copy.put(p,to);if(copy.isCheck())return 'После этого хода ваш король останется под шахом. Нужно устранить нападение на короля.';
 return 'Этот ход нарушает правила перемещения фигуры или особые условия позиции. Выберите подсвеченное поле.';
}
function attackedTargets(c,m){return c.board().flat().filter(p=>p&&p.color!==m.color&&c.attackers(p.square,m.color).includes(m.to));}
function facts(task,index=0){const c=position(task,index),u=task.line[index],before=c.fen(),m=uciMove(c,u);return{c,m,u,before};}
export function puzzleHint(task,index=0,level=0){
 const {c,m,before}=facts(task,index);const mate=c.isCheckmate(),check=c.isCheck(),targets=attackedTargets(c,m).filter(p=>p.type!=='k'),king=new Chess(before).board().flat().find(p=>p?.type==='k'&&p.color!==m.color);const location=king?' на '+square(king.square):'';
 const hints=mate?['Посмотрите, какие выходы остались у короля соперника'+location+'.','Ищите шах, после которого король не сможет уйти, закрыться или взять атакующую фигуру.', 'Рассмотрите возможности фигуры на '+square(m.from)+'. Проверьте защиту полей вокруг короля.']:
 m.captured?['Проверьте, можно ли забрать '+take[m.captured]+' соперника и что он сможет взять в ответ.','Сравните ценность '+take[m.captured]+' и своей фигуры. Посчитайте, чем закончится размен.','Проверьте, что может взять ваша фигура с поля '+square(m.from)+'. Сначала просчитайте возможные размены.']:
 check?['Обратите внимание на положение короля соперника'+location+'.','Ищите ход с шахом: он заставит соперника сначала защитить короля.','Проверьте шахи фигурой на '+square(m.from)+'. Подумайте, что она сможет атаковать следующим ходом.']:
 m.promotion?['Проверьте, насколько далеко продвинулись ваши пешки.','Подумайте, можно ли превратить пешку и как соперник сможет этому помешать.','Рассмотрите продвижение пешки на '+square(m.from)+'. Сравните варианты превращения.']:
 ['Подумайте, как '+yours[m.piece]+' может занять более активное положение. Сопоставьте её возможности с расположением соперника.','Сравните активные поля: где ваша фигура сможет контролировать больше важных полей или создать нападение?','Начните расчёт с фигуры на '+square(m.from)+'. Проверьте её ходы и возможный ответ соперника.'];
 if(level<3)return hints[Math.max(0,level)];return 'Сохраните внимание на фигуре '+square(m.from)+'. Перед ходом проверьте, что соперник сможет взять в ответ. Готовый ход остаётся за вами.';
}
export function explainSolution(task){
 const c=position(task),side=c.turn(),parts=[];
 for(const [i,u] of task.line.entries()){const desc=readableMove(c,u),m=uciMove(c,u);const targets=attackedTargets(c,m).filter(p=>p.type!=='k');if(m.color===side)parts.push(desc+'.'+(c.isCheckmate()?' Это мат: у короля нет законной защиты.':c.isCheck()?' Это шах: соперник обязан защитить короля.':m.captured?' Вы забираете '+take[m.captured]+'.':targets.length?' Ваша фигура нападает на '+take[targets[0].type]+' на '+square(targets[0].square)+'.':''));else parts.push('Ответ соперника: '+desc.toLowerCase()+'.');if(i>=5)break;}
 return parts.join(' ');
}
export function explainWrong(task,uci,index=0,assessment={}){
 const c=position(task,index),desc=readableMove(c,uci),m=uciMove(c,uci);let reply;
 if(assessment.reply){try{reply=uciMove(new Chess(c.fen()),assessment.reply);}catch{}}
 if(!reply)reply=c.moves({verbose:true}).find(r=>r.to===m.to&&r.captured);
 if(reply&&reply.to===m.to&&reply.captured)return desc+'. Соперник может ответить: '+readableMove(c,reply.from+reply.to+(reply.promotion||''))+'. Проверьте, сможете ли вы вернуть материал после этого взятия.';
 if(reply)return desc+'. Возможный ответ соперника: '+readableMove(c,reply.from+reply.to+(reply.promotion||''))+'. Сравните последствия этого продолжения с другими ходами.';
 return desc+'. Этот ход не решает задачу. '+puzzleHint(task,index,Math.min(2,assessment.hintLevel??1));
}
