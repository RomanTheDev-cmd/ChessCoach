"""2026-11-15 (Codex): local cached TeraTTS ru_m1; no modification to video skills."""
import sys,json,hashlib,re,os,subprocess,contextlib,traceback
from pathlib import Path
import numpy as np
import soundfile as sf
ROOT=Path.home()/'.cache/freelearn-video/teratts-v2'
sys.path.insert(0,str(ROOT))
import teratts
CACHE=Path(sys.argv[1]);CACHE.mkdir(parents=True,exist_ok=True)
model=None
accent=None
SETTINGS={'voice':'ru_m1','model':'teacher','seed':42,'guidance':3.0,'duration_scale':1.0,'sample_rate':44100,'fx':'hp75-shelf220-1-shelf4500+.8-comp2.2-lufs20-v1'}
def key(text):return hashlib.sha256(json.dumps([text,SETTINGS],ensure_ascii=False,sort_keys=True).encode()).hexdigest()
def speak(text):
 global model,accent
 if not isinstance(text,str) or not 0<len(text)<=1600:raise ValueError('Недопустимая длина текста')
 file=CACHE/(key(text)+'.mp3')
 if file.exists():return str(file)
 with contextlib.redirect_stdout(sys.stderr):
  if model is None or accent is None:
   model=teratts.load_model(ROOT,model='teacher',threads=4,russian_stress=False)
   accent=teratts.load_ruaccent(workdir=ROOT/'ruaccent',model_size='turbo3.1',device='CPU',mode='full')
  # Dynamic text is accentuated at the application boundary; explicit corrections win.
  import importlib.util
  check_path=Path.home()/'.codex/skills/sozdanie-video/scripts/check_tts.py'
  spec=importlib.util.spec_from_file_location('coach_tts_checker',check_path)
  checker=importlib.util.module_from_spec(spec);spec.loader.exec_module(checker)
  lexicon=checker.load_lexicon()
  prepared=text.replace('—',',').replace('–',',').replace('…','.')
  files={'a':'а','b':'бэ','c':'цэ','d':'дэ','e':'е','f':'эф','g':'же','h':'аш'}
  numbers=['','один','два','три','четыре','пять','шесть','семь','восемь']
  prepared=re.sub(r'\b([a-h])([1-8])\b',lambda m:files[m[1]]+' '+numbers[int(m[2])],prepared)
  for entry in lexicon:
   if entry['kind']!='замена слова' and entry['group'] in checker.STRICT|checker.SUGGESTED:
    written=checker.key_of(entry['written'])
    if written:
     say=re.sub(r'([АЕЁИОУЫЭЮЯаеёиоуыэюя])\u0301',r'+\1',entry['say'])
     prepared=checker.pattern(written).sub(lambda m:say,prepared)
  canonical=accent.process_all(prepared)
  canonical=re.sub(r'\b([а-яё+]+)\b',lambda m:m[0].replace('+','') if len(re.findall('[аеёиоуыэюя]',m[0],re.I))<=1 else m[0],canonical,flags=re.I)
  canonical=canonical.replace('По+сле','П+осле')
  import importlib.util
  check_path=Path.home()/'.codex/skills/sozdanie-video/scripts/check_tts.py'
  spec=importlib.util.spec_from_file_location('coach_tts_checker',check_path)
  checker=importlib.util.module_from_spec(spec);spec.loader.exec_module(checker)
  acute=re.sub(r'\+([АЕЁИОУЫЭЮЯаеёиоуыэюя])',r'\1́',canonical)
  errors,warnings=checker.check_text('Шахматный тренер',text,acute,checker.load_lexicon())
  if errors:raise ValueError('; '.join(errors))
  chunks=[]
  for sentence in re.split(r'(?<=[.!?])\s+',canonical):
   if not sentence.strip():continue
   if len(sentence)>260:raise ValueError('Слишком длинное предложение для озвучки')
   audio=np.asarray(teratts.generate_speech(model,'<ru>'+sentence+'</ru>','ru_m1',seed=42,duration_scale=1.0,guidance=3.0),dtype=np.float32).reshape(-1)
   if len(audio)<4410 or len(audio)>44100*25 or not np.isfinite(audio).all():raise ValueError('Некорректный результат синтеза')
   chunks.extend([audio,np.zeros(6615,dtype=np.float32)])
  wave=np.concatenate([np.zeros(5292,dtype=np.float32),*chunks,np.zeros(7938,dtype=np.float32)])
  tmp=file.with_suffix('.wav');sf.write(tmp,wave,44100,subtype='FLOAT')
  # Float source prevents clipping before normalization; same voice/EQ as selected video profile.
  fx='loudnorm=I=-22:TP=-3:LRA=9,highpass=f=75,equalizer=f=220:t=q:w=0.7:g=-1,equalizer=f=4500:t=q:w=0.7:g=0.8,acompressor=threshold=0.0631:ratio=2.2:attack=12:release=100,loudnorm=I=-20:TP=-2:LRA=9'
  temp=file.with_suffix('.tmp.mp3')
  subprocess.run(['/opt/homebrew/bin/ffmpeg','-nostdin','-y','-v','error','-i',str(tmp),'-af',fx,'-c:a','libmp3lame','-b:a','128k',str(temp)],check=True)
  os.replace(temp,file);tmp.unlink()
  file.with_suffix('.json').write_text(json.dumps({'text':text,'spoken':canonical,'settings':SETTINGS,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'hearing_reviewed':False},ensure_ascii=False,indent=2))
 return str(file)
for line in sys.stdin:
 try:
  req=json.loads(line);path=speak(req['text']);print(json.dumps({'id':req['id'],'file':path}),flush=True)
 except Exception as e:
  traceback.print_exc(file=sys.stderr);print(json.dumps({'id':req.get('id'),'error':str(e)}),flush=True)
