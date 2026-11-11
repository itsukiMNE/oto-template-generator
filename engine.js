// UTAU OTO Template Generator v0.06 — calculation engine. No audio analysis.
// Source definitions are copied unchanged from UTAU Reclist Generator v0.44.
(function(root){
'use strict';
const GROUP_OFFSET_CV = {VOWEL:10,N:70,MORAIC_N:10,K:100,S:180,T:85,H:105,M:70,Y:60,R:65,W:50,G:75,Z:100,D:40,B:45,P:90,KY:100,SH:160,CH:125,NY:50,HY:115,MY:50,RY:65,GY:60,J:95,BY:35,PY:90,TS:125,F:120,V:70,TY:85,DY:40};
const GROUP_OFFSET_SHORT = {VOWEL:10,N:60,MORAIC_N:10,K:55,S:95,T:40,H:60,M:70,Y:60,R:50,W:50,G:50,Z:65,D:30,B:45,P:50,KY:60,SH:95,CH:85,NY:60,HY:75,MY:65,RY:45,GY:45,J:65,BY:35,PY:50,TS:80,F:75,V:55,TY:40,DY:30};
const HIGH=['k','t','p','s','sh','hy','n','m'];
// v0.02: TY/DY are not selectable VC groups. Kana parsing stays unchanged.
const LOW=['ky','gy','by','py','ry','ny','my','h'];
const ALL=['k','t','p','s','sh','hy','n','m','g','d','b','z','j','ch','ts','f','r','v','y','w','ky','gy','by','py','ry','ny','my','h'];
const NASAL_COMMON=['k','g','s','z','sh','t','d','ch','ts','j','m','r','y','w','b','p','f','v','hy'];
const NASAL_LOW=['ky','gy','by','py','ry','ny','my','h'];
const VOWELS = {あ:'a',い:'i',う:'u',え:'e',お:'o',ん:'n'};
const VOWEL_SET = new Set(['あ','い','う','え','お','を']);
const SHORT_U = new Set(['ふゅ','てゅ','でゅ']);
// Explicit group mapping avoids guessing from kana prefixes. Include all Reclist source groups.
const groupMap = new Map();
for(const [id,g] of Object.entries(GROUPS)) for(const sound of [...(g.cv||[]),...(g.sequence||[])]) {
  if(!groupMap.has(sound)) groupMap.set(sound,id==='N_ROW'?'N':id==='V_CONS'?'V':id);
}
for(const [sound,id] of Object.entries({'ん':'N','し':'SH','ち':'CH','じ':'J','つ':'TS','ふ':'H','てぃ':'T','でぃ':'D','とぅ':'T','どぅ':'D','すぃ':'S','ずぃ':'Z','ふゅ':'F','てゅ':'TY','でゅ':'DY','を':'W'})) groupMap.set(sound,id);
for(const [sound,id] of Object.entries({'ヴ':'V'})) groupMap.set(sound,id);
// v0.01: common foreign-vowel extension handled explicitly if present in a reclist.
if(!SOUNDS['ふぅ'])SOUNDS['ふぅ']={vowel:'u'};
groupMap.set('ふぅ','F');
const soundKeys = Object.keys(SOUNDS).sort((a,b)=>b.length-a.length);
// v0.06: Keep な行 (N) separate from the moraic nasal ん.
function groupOf(s){return s==='ん'?'MORAIC_N':groupMap.get(s)|| (VOWEL_SET.has(s)?'VOWEL':null);}
function consonantOf(s){const g=groupOf(s);return g==='MORAIC_N'?'n':g==='VOWEL'?null:g?.toLowerCase()||null;}
function vowelOf(s){return s==='ん'?'n':SOUNDS[s]?.vowel?.toLowerCase()||null;}
function parseTokens(s){let v=s.replace(/^_+/,''),out=[];while(v){const found=soundKeys.find(k=>v.startsWith(k));if(!found)throw Error(`未知假名：${v.slice(0,12)}（来源 ${s}）`);out.push(found);v=v.slice(found.length);}return out;}
function normalizeNumberedName(s){return s.replace(/^\d+(?=_)/,'');}
// v0.05: Filename fallback is intentionally narrow; metadata remains authoritative.
function typeFromFilename(filename=''){
 const stem=filename.replace(/\.[^.]*$/,'');
 if(/cvvc/i.test(stem))return 'CVVC';
 if(/vcv/i.test(stem))return 'VCV';
 if(/(?:^|[^a-z0-9])cv(?=$|[^a-z0-9])/i.test(stem))return 'CV';
 if(/rentanjutsu/i.test(stem))return 'RENTAN_JUTSU';
 return null;
}
function parseReclist(input, overrideType, filename=''){
 const metaLine=input.split(/\r?\n/).find(x=>/^#RECLIST_META\s*:/.test(x.trim()));
 let meta=null;if(metaLine){try{meta=JSON.parse(metaLine.slice(metaLine.indexOf(':')+1).trim());}catch(e){throw Error('Reclist Metadata JSON 无法解析');}if(meta.v!==1)throw Error('不支持的 Metadata 版本：'+meta.v);}
 const type=overrideType||meta?.type||typeFromFilename(filename); if(!['CV','RENTAN_FU','RENTAN_JUTSU','VCV','CVVC'].includes(type))throw Error('请选择录音表类型，或导入包含 Metadata 的 TXT');
 const rows=[];const issues=[];
 for(const raw of input.split(/\r?\n/)){
  const line=raw.trim();if(!line||line.startsWith('#')||line.includes('録音終了')||line.includes('録音終わり')||line.includes('お疲れ様'))continue;
  const words=type==='CV'?line.split(/\s+/):[line];
  for(const word of words){
   if(!word||!/[ぁ-ゖァ-ヺ]/u.test(word))continue;
   const filename=word+'.wav',body=normalizeNumberedName(word);
   try{
    // v0.05: The three short-u CVs also support a separated RenTanJutsu recording row.
    const separatedShortTrio=type==='RENTAN_JUTSU' && /^_(?:ふゅ|てゅ|でゅ)_(?:ふゅ|てゅ|でゅ)_(?:ふゅ|てゅ|でゅ)$/.test(body);
    const spaced=type==='RENTAN_FU'||(type==='CVVC'&&/^_(?:[^_]+_){1,}/.test(body))||separatedShortTrio;
    const sounds=spaced?body.split('_').filter(Boolean).flatMap(parseTokens):parseTokens(body);
    if(!sounds.length)continue;
    rows.push({raw:word,filename,sounds,spaced,independent:sounds.length===1,order:rows.length});
   }catch(e){issues.push(e.message);}
  }
 }
 if(!rows.length)throw Error('没有识别到录音项目。请检查 TXT 内容或录音表类型。');
 return {meta,type,rows,issues};
}
// v0.03: Parse OREMO event numbers (2 = recording, 3 = vocal), not localized labels.
// Supports second/millisecond files and BPM in exported comments or the BGM filename.
// v0.06: Share BPM detection with the instant file feedback.
function detectBpm(txt,filename=''){
 const bpmComment=txt.match(/\bBPM\s*[:=]\s*(\d+(?:\.\d+)?)/i);
 if(bpmComment)return Number(bpmComment[1]);
 const stem=filename.replace(/\.[^.]*$/,'');
 const bpmTag=stem.match(/(?:^|[^a-z0-9])bpm[-_ ]*(\d+(?:\.\d+)?)(?=$|[^a-z0-9])/i);
 const tempoTokens=[...stem.matchAll(/(?<!\d)(1\d{2})(?!\d)/g)].map(m=>Number(m[1]));
 return bpmTag?Number(bpmTag[1]):(tempoTokens.length===1?tempoTokens[0]:null);
}
function parseBgm(txt, filename='', manualBpm=null){
 const lines=txt.replace(/^\uFEFF/,'').split(/\r?\n/);
 const unit=lines.find(l=>l.trim() && !l.trim().startsWith('#'))?.trim().toLowerCase();
 if(unit!=='sec' && unit!=='msec')throw Error('无法识别 BGM 时间单位：需要 sec 或 msec');
 const events=new Map();
 for(const line of lines){
  const m=line.match(/^\s*(\d+)\s*,\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*,/);
  if(m && !events.has(Number(m[1])))events.set(Number(m[1]),Number(m[2]));
 }
 const factor=unit==='msec'?0.001:1;
 const record=events.has(2)?events.get(2)*factor:null;
 const vocal=events.has(3)?events.get(3)*factor:null;
 const moraComment=txt.match(/\bMora\s*[:=]\s*(\d+)/i);
 const detectedBpm=detectBpm(txt,filename);
 // v0.06: Explicitly entered BPM takes precedence over automatic values.
 const manual=Number(manualBpm);
 const bpm=manual>0?manual:detectedBpm;
 const mora=moraComment?Number(moraComment[1]):null;
 if(!(bpm>0))throw Error('无法识别 BPM：请在 BGM TXT 注释、文件名中提供 BPM，或手动填写');
 if(record===null||vocal===null||!(vocal>record))throw Error('BGM TXT 需要编号 2（Recording Start）与 3（Vocal Start）的有效时间');
 return {bpm,mora,record,vocal,beat:60000/bpm,p0:(vocal-record)*1000};
}
function round(x){return Math.round((x+Number.EPSILON)*10)/10;}
function fmt(x){const v=round(x);return Object.is(v,-0)?'0':String(v);}
// UTC-style signed Cutoff: negative values mean an absolute blank end measured from Offset.
function overlap(pre,alias,kind,sound){
 if(kind==='vc'||kind==='r')return pre*.4;
 if(kind==='bx'||kind==='vcv'||kind==='start')return pre/3;
 const s=sound||alias;
 if(/^(?:ちゃ|ちゅ|ちぇ|ちょ|ち|つぁ|つぃ|つぇ|つぉ|つ)/.test(s))return pre/5;
 if(/^(?:か|き|く|け|こ|た|て|と|ぱ|ぴ|ぷ|ぺ|ぽ|きゃ|きゅ|きぇ|きょ|ぴゃ|ぴゅ|ぴぇ|ぴょ)/.test(s))return -5;
 if(/^(?:わ|うぃ|うぇ|うぉ|や|ゆ|よ|いぇ)/.test(s))return pre*.4;
 if(['あ','い','う','え','お','を','ん'].includes(s))return pre*2;
 return pre/3;
}
function makeEntry(wav,alias,kind,sound,p,pre,afterCon,afterRight,opts,source){
 const off=p-pre, c=pre+afterCon, right=p+afterRight, cut=-(right-off);
 if(![off,c,cut,pre].every(Number.isFinite))return null;
 const ov=opts.overlap==='start'?-off:opts.overlap==='offset'?0:overlap(pre,alias,kind,sound);
 return {wav,alias,originAlias:alias,kind,sound,source,offset:round(off),consonant:round(c),cutoff:round(cut),pre:round(pre),overlap:round(ov),p:round(p),right:round(right)};
}
function tokenizeAlias(s){return s.replace(/\s+/g,' ').trim();}
function deriveBx(entry){const off=600,delta=entry.offset-off;return {...entry,alias:'b'+entry.sound,originAlias:'b'+entry.sound,kind:'bx',offset:off,consonant:round(entry.consonant+delta),cutoff:round(entry.cutoff-delta),pre:round(entry.pre+delta),overlap:round((entry.pre+delta)/3)};}
function suffixDuplicate(entries,max,issues){
 const used=new Set(),counts=new Map(),res=[];
 // v0.01: Reserve deliberately named R2 aliases before automatic duplicate numbering.
 const reserved=new Set(entries.filter(e=>e.kind==='r'&&/ R2$/.test(e.originAlias)).map(e=>e.originAlias));
 for(const e of entries){if(e.kind==='vc'){
    if(used.has(e.alias))continue;used.add(e.alias);res.push(e);continue;
   }
   let n=counts.get(e.originAlias)||0;counts.set(e.originAlias,n+1);
   if(n>=max)continue;
   if(n){const base=e.alias;let suffix=n+1;while(used.has(base+suffix)||reserved.has(base+suffix))suffix++;e.alias=base+suffix;}
   if(used.has(e.alias)){issues.push(`重复别名冲突：${e.alias}`);continue;}
   used.add(e.alias);res.push(e);
 }
 return res;
}
function generate(reclist,bgm,options={}){
 const opts={duplicate:1,vcGroups:[],nasalGroups:[...NASAL_COMMON],generateBx:false,generateR:true,generateU2:true,overlap:'auto',...options};
 // v0.02: Keep VC candidates separate; append once all regular OTO entries are generated.
 const lines=[],vcLines=[];const issues=[...reclist.issues];const B=bgm.beat,base=bgm.p0;
 const isShort=(t)=>t==='RENTAN_JUTSU'||t==='CVVC';
 const vcEnabled = reclist.type==='CVVC'?new Set(ALL):new Set(opts.vcGroups);
 const nasalEnabled=new Set(opts.nasalGroups);
 const seenVC=new Set();
 const push=(e)=>{if(e)lines.push(e);};
 for(const row of reclist.rows){
  const ss=row.sounds,t=reclist.type,wav=row.filename,shortRow=ss.some(s=>SHORT_U.has(s));
  // v0.05: The exact ふゅ/てゅ/でゅ trio is ordinary CV, never sentence-initial - CV.
  // This applies to both _ふゅ_てゅ_でゅ and _ふゅてゅでゅ, in any of the trio's orders.
  const shortTrio=(t==='RENTAN_JUTSU'||t==='CVVC') && ss.length===3 && ss.every(s=>SHORT_U.has(s)) && new Set(ss).size===3;
  let mode=t;
  if((t==='CVVC'&&row.spaced)||(t==='RENTAN_JUTSU'&&row.spaced&&shortTrio))mode='RENTAN_FU';
  if(t==='CVVC'&&row.independent)mode='CV';
  if(t==='RENTAN_FU'&&row.independent)mode='CV';
  if(t==='RENTAN_JUTSU'&&row.independent)mode='CV';
  const stride=mode==='RENTAN_FU'?2:1;
  for(let i=0;i<ss.length;i++){
   const s=ss[i],group=groupOf(s),v=vowelOf(s);
   if(!group||!v){issues.push(`未知音素：${s} (${row.raw})`);continue;}
   // Some recordings have vowels merely as carriers for ふゅ/てゅ/でゅ.
   if(shortRow&&VOWEL_SET.has(s))continue;
   const p=base+i*stride*B;
   // v0.04: Standalone vowel/ん uses one sustained WAV for both - CV and CV.
   // Keep both aliases even when a CV reclist filename has no leading underscore.
   if(row.independent && (VOWEL_SET.has(s) || s==='ん') && ['CV','RENTAN_FU','RENTAN_JUTSU','CVVC'].includes(t)){
     const shortMode=t==='RENTAN_JUTSU'||t==='CVVC'; // v0.06: CVVC standalone nasal uses its short-CV presets.
     const startCon=(shortMode?.2:mode==='RENTAN_FU'?.25:.5)*B;
     const startRight=(shortMode?.6:mode==='RENTAN_FU'?.9:1.5)*B;
     push(makeEntry(wav,'- '+s,'start',s,p,140,startCon,startRight,opts,row.raw));
     const cvP=p+300; // v0.04: Fixed 300ms gap; does not scale with BPM.
     const pre=(shortMode?GROUP_OFFSET_SHORT:GROUP_OFFSET_CV)[group]??10;
     push(makeEntry(wav,s,'cv',s,cvP,pre,(shortMode?.2:.5)*B,(shortMode?.6:1.5)*B,opts,row.raw));
     continue;
   }
   if(mode==='CV'||mode==='RENTAN_FU'){
     const isStart=t==='CVVC' && row.spaced && !shortTrio;
     const pre=isStart?140:(GROUP_OFFSET_CV[group]??100),kind=isStart?'start':'cv';
     push(makeEntry(wav,isStart?'- '+s:s,kind,s,p,pre,(isStart?.25:mode==='CV'?.5:.25)*B,(isStart?.9:mode==='CV'?1.5:.9)*B,opts,row.raw));
   }else if(mode==='RENTAN_JUTSU'||t==='CVVC'){
     const first=i===0 && !shortTrio;
     const pre=first?140:(GROUP_OFFSET_SHORT[group]??60);
     // 連単術: first sound is -CV; final repeated sound is regular CV.
     const alias=first?'- '+s:s;
     push(makeEntry(wav,alias,first?'start':'cv',s,p,pre,.2*B,.6*B,opts,row.raw));
   }else if(t==='VCV'){
     if(i===0){push(makeEntry(wav,'- '+s,'start',s,p,140,.25*B,.65*B,opts,row.raw));}
     else if(s==='ん'){
       const prev=vowelOf(ss[i-1]);const next=ss[i+1];const following=next?consonantOf(next):null;
       let marker=following===null?'2':following==='n'?'':following;
       if(!next)marker='';
       if(marker&&!['2'].includes(marker)&&!nasalEnabled.has(marker))continue;
       push(makeEntry(wav,`${prev} ん${marker}`,'vcv',s,p,.5*B,.25*B,.65*B,opts,row.raw));
     }else{
       const prev=vowelOf(ss[i-1]);push(makeEntry(wav,`${prev} ${s}`,'vcv',s,p,.5*B,.25*B,.65*B,opts,row.raw));
     }
   }
  }
  // VC: one candidate per alias, in original reclist order. Do not apply duplicate count.
  if(['VCV','CVVC','RENTAN_JUTSU'].includes(t)&&!row.spaced){
   for(let i=1;i<ss.length;i++){
    const prev=vowelOf(ss[i-1]),next=ss[i],c=consonantOf(next);
    // v0.04: ん can generate VCV 'n ん', but never VC 'n n'.
    if(next==='ん'||!prev||!c||!vcEnabled.has(c))continue;
    const alias=`${prev} ${c}`;
    if(seenVC.has(alias))continue;
    const nextP=base+i*B,vcP=nextP-.2*B,plosive=['k','t','p','g','d','b'].includes(c);
    const e=makeEntry(wav,alias,'vc',next,vcP,160,30,plosive?50:75,opts,row.raw);
    if(e){seenVC.add(alias);vcLines.push(e);}
   }
  }
  if(opts.generateR){
   const final=ss.at(-1),v=vowelOf(final);
   // Basic R from standalone vowels and from vowel-ending continuous VCV lines.
   // v0.06: Standalone ん also provides the ordinary n R tail.
   const isVowel=VOWEL_SET.has(final),eligible=(row.independent&&(isVowel||final==='ん'))||(t==='VCV'&&isVowel&&!shortRow);
   if(eligible&&v){const n=row.independent?2:ss.length,pr=base+(n-.1)*B;push(makeEntry(wav,`${v} R`,'r',final,pr,.4*B,.4*B,.7*B,opts,row.raw));}
   if(opts.generateU2&&final==='つ'){
     const pr=base+((row.independent?2:ss.length)-.1)*B;push(makeEntry(wav,'u R2','r',final,pr,.4*B,.4*B,.7*B,opts,row.raw));
   }
  }
 }
 // v0.02: The initial template contains no derived bX; create bX only after - X has been adjusted.
 // VC candidates are appended last, independently of the normal duplicate limit.
 const canonical=suffixDuplicate([...lines,...vcLines],opts.duplicate==='all'?Infinity:Number(opts.duplicate)||1,issues);
 for(const e of canonical){if(e.offset<0)issues.push(`${e.alias}: Offset 位于 WAV 开始之前 (${fmt(e.offset)}ms)`);if(e.pre<0)issues.push(`${e.alias}: Preutterance 为负数`);}
 return {entries:canonical,issues,counts:Object.fromEntries(['cv','start','vcv','vc','r','bx'].map(k=>[k,canonical.filter(e=>e.kind===k).length]))};
}
function parseOto(text){const rows=[],other=[],lineSequence=[];for(const line of text.split(/\r?\n/)){
 const m=line.match(/^(.*?)\.wav=(.*?),(-?[\d.]+),(-?[\d.]+),(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)(.*)$/i);
 if(!m){other.push({line,index:rows.length});lineSequence.push({raw:line});continue;}
 lineSequence.push({entryIndex:rows.length});rows.push({wav:m[1]+'.wav',alias:m[2],offset:+m[3],consonant:+m[4],cutoff:+m[5],pre:+m[6],overlap:+m[7],tail:m[8]||'',original:line});
 }return {rows,other,lineSequence};}
function existingAdjust(parsed,options){
 const B=60000/options.bpm,mode=options.type,opts={overlap:'auto',changeOffset:true,changeConsonant:true,changeCutoff:true,changeOverlap:false,...options};
 const result=[],issues=[];
 for(const e of parsed.rows){const s=e.alias.replace(/^[-*]\s*/,'').replace(/^[aiueonN]\s+/,'').replace(/[0-9]+$/,'');const group=groupOf(s);const kind=/^b[ぁ-ゖァ-ヺ]/.test(e.alias)?'bx':/^[-]\s+/.test(e.alias)?'start':/^[aiueonN]\s+R/.test(e.alias)?'r':/^[aiueonN]\s+[a-z]+$/i.test(e.alias)?'vc':/^[aiueonN]\s+/.test(e.alias)?'vcv':'cv';
 const p=e.offset+e.pre;
 let pre=e.pre,con=e.consonant-e.pre,right=-e.cutoff-e.pre;
 if(kind==='bx'){issues.push(`跳过 bX：${e.alias}（请使用 bX 派生功能）`);result.push({...e});continue;}
 if(kind==='r'){pre=.4*B;con=.4*B;right=.7*B;}
 else if(kind==='vc'){pre=160;con=30;right=['k','t','p','g','d','b'].includes(e.alias.split(' ').at(-1))?50:75;}
 else if(kind==='start'){pre=140;con=(mode==='VCV'?.25:mode==='RENTAN_FU'?.25:.2)*B;right=(mode==='VCV'?.65:mode==='RENTAN_FU'?.9:.6)*B;}
 else if(kind==='vcv'){pre=.5*B;con=.25*B;right=.65*B;}
 else if(group){pre=((mode==='RENTAN_JUTSU'||mode==='CVVC')?GROUP_OFFSET_SHORT:GROUP_OFFSET_CV)[group]||60;con=(mode==='CV'?.5:mode==='RENTAN_FU'?.25:.2)*B;right=(mode==='CV'?1.5:mode==='RENTAN_FU'?.9:.6)*B;}
 else{issues.push(`无法判断 ${e.alias}，保持原参数`);result.push({...e});continue;}
 let offset=opts.changeOffset?p-pre:e.offset;
 let finalPre=p-offset; // Preserve absolute preutterance even when Offset stays unchanged.
 let consonant=opts.changeConsonant?finalPre+con:e.consonant;
 let cutoff=opts.changeCutoff?-(finalPre+right):e.cutoff;
 let ov=opts.changeOverlap? (opts.overlap==='start'?-offset:opts.overlap==='offset'?0:overlap(finalPre,e.alias,kind,s)):e.overlap;
 result.push({...e,offset:round(offset),pre:round(finalPre),consonant:round(consonant),cutoff:round(cutoff),overlap:round(ov),kind,p});
 }
 return {entries:result,issues,lineSequence:parsed.lineSequence};
}
function otoText(entries,lineSequence=null){if(lineSequence){return lineSequence.map(part=>part.raw!==undefined?part.raw:(()=>{const e=entries[part.entryIndex];return `${e.wav}=${e.alias},${fmt(e.offset)},${fmt(e.consonant)},${fmt(e.cutoff)},${fmt(e.pre)},${fmt(e.overlap)}${e.tail||''}`;})()).join('\r\n');}return entries.map(e=>`${e.wav}=${e.alias},${fmt(e.offset)},${fmt(e.consonant)},${fmt(e.cutoff)},${fmt(e.pre)},${fmt(e.overlap)}${e.tail||''}`).join('\r\n')+'\r\n';}
root.OTOEngine={parseReclist,parseBgm,typeFromFilename,detectBpm,generate,parseOto,existingAdjust,otoText,ALL,HIGH,LOW,NASAL_COMMON,NASAL_LOW,groupOf,parseTokens,fmt,overlap};
})(typeof globalThis!=='undefined'?globalThis:window);
