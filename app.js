// v0.02: defer bX and collect VC entries at the end; preserve other generation rules.
(()=>{'use strict';
const E=OTOEngine,$=id=>document.getElementById(id);
let mode='new',files={reclist:'',bgm:'',oto:''},bgmFilename='',results=null,inputEncoding='cp932';
function readFile(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{const b=r.result;let s;try{s=new TextDecoder('utf-8',{fatal:true}).decode(b);return resolve({text:s,encoding:'utf8'});}catch(_){}try{s=new TextDecoder('shift_jis').decode(b);resolve({text:s,encoding:'cp932'});}catch(e){reject(e);}};r.onerror=()=>reject(r.error);r.readAsArrayBuffer(file);});}
for(const [id,key] of [['reclistFile','reclist'],['bgmFile','bgm'],['otoFile','oto']])$(id).addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const v=await readFile(f);files[key]=v.text;if(key==='bgm')bgmFilename=f.name;inputEncoding=v.encoding;$(key+'Name').textContent=f.name; if(key==='oto')$('encoding').value=v.encoding;inspect();}catch(err){$('fileInfo').textContent='读取失败：'+err.message;}});
function inspect(){try{
 if(mode==='new'){
  if(!files.reclist||!files.bgm)return;
  const r=E.parseReclist(files.reclist,$('type').value||null),b=E.parseBgm(files.bgm,bgmFilename,$('newManualBpm').value);
  $('fileInfo').textContent=`${r.type} · ${r.rows.length} 个 WAV 项目 · BGM ${b.bpm} BPM / ${b.mora||'?'} mora\nRecording Start ${b.record}s · Vocal Start ${b.vocal}s · WAV 内首音 ${Math.round(b.p0)}ms`;
  const vc=['RENTAN_JUTSU','VCV'].includes(r.type),n=r.type==='VCV';$('vcOptions').classList.toggle('hidden',!vc);$('nasalOptions').classList.toggle('hidden',!n);
  // v0.01: VCV default leaves N/M unselected; users can enable either manually.
  if(vc && $('vcOptions').dataset.activeType!==r.type){for(const x of document.querySelectorAll('input[name="vc"]'))x.checked=E.HIGH.includes(x.value)&&!(n&&['n','m'].includes(x.value));$('vcOptions').dataset.activeType=r.type;}
 }else{if(files.oto)$('fileInfo').textContent=`已有 OTO · ${E.parseOto(files.oto).rows.length} 条 · 保留每条先行线绝对位置。`;}
 }catch(e){$('fileInfo').textContent='请检查输入：'+e.message;}}
$('type').addEventListener('change',inspect);
$('newManualBpm').addEventListener('input',inspect);
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>{mode=b.dataset.mode;for(const x of document.querySelectorAll('[data-mode]'))x.classList.toggle('active',x===b);$('newInputs').classList.toggle('hidden',mode!=='new');$('existingInputs').classList.toggle('hidden',mode!=='existing');$('newOptions').classList.toggle('hidden',mode!=='new');$('existingOptions').classList.toggle('hidden',mode!=='existing');$('fileInfo').textContent='等待导入文件。';if(mode==='existing'&&$('type').value==='')$('type').value='CV';results=null;render();inspect();});
function renderGroups(container,defs){container.innerHTML='';for(const def of defs){const div=document.createElement('div');div.className='optiongroup';const header=document.createElement('div'),label=document.createElement('strong');label.textContent=def.title;const btn=document.createElement('button');btn.type='button';btn.textContent='全选 / 取消';header.append(label,btn);div.append(header);const chips=document.createElement('div');chips.className='chips';for(const name of def.items){const l=document.createElement('label'),c=document.createElement('input');c.type='checkbox';c.value=name;c.name=def.name;c.checked=def.checked.includes(name);l.append(c,document.createTextNode(' '+name));chips.append(l);}btn.addEventListener('click',()=>{const cs=[...chips.querySelectorAll('input')],all=cs.every(x=>x.checked);cs.forEach(x=>x.checked=!all);});div.append(chips);container.append(div);}}
const medium=E.ALL.filter(x=>!E.HIGH.includes(x)&&!E.LOW.includes(x));
renderGroups($('vcGroups'),[{name:'vc',title:'高优先度',items:E.HIGH,checked:E.HIGH},{name:'vc',title:'其他子音',items:medium,checked:[]},{name:'vc',title:'低优先度',items:E.LOW,checked:[]}]);
renderGroups($('nasalGroups'),[{name:'nasal',title:'常用拨音',items:E.NASAL_COMMON,checked:E.NASAL_COMMON},{name:'nasal',title:'低优先度拨音',items:E.NASAL_LOW,checked:[]}]);
function chosen(name){return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(x=>x.value);}
function render(){const tbody=$('previewRows');tbody.innerHTML='';const entries=results?.entries||[],kind=$('filter').value,search=$('search').value.trim().toLowerCase();const shown=entries.filter(e=>(kind==='all'||kind===e.kind)&&(!search||e.alias.toLowerCase().includes(search)));for(const e of shown.slice(0,500)){const tr=document.createElement('tr');for(const val of [e.alias,e.wav,e.offset,e.consonant,e.cutoff,e.pre,e.overlap]){const td=document.createElement('td');td.textContent=String(val);tr.append(td);}tbody.append(tr);}if(!shown.length)tbody.innerHTML='<tr><td colspan="7">暂无对应条目。</td></tr>';
 $('shownCount').textContent=results?`显示 ${Math.min(500,shown.length)} / ${shown.length} 条筛选结果（完整导出 ${entries.length} 条）`:'';
 $('stats').innerHTML='';if(results){for(const [name,n] of Object.entries(results.counts||{'total':entries.length})){if(!n)continue;const stat=document.createElement('div');stat.className='stat';stat.innerHTML=`<strong>${n}</strong>${name}`;$('stats').append(stat);}}
 const warnings=results?.issues||[];$('warnings').classList.toggle('hidden',!warnings.length);$('warnings').textContent=warnings.length?`发现 ${warnings.length} 条提示：\n`+warnings.slice(0,40).join('\n')+(warnings.length>40?'\n…':''):'';
 $('download').disabled=$('copy').disabled=!results||!entries.length;
}
$('filter').addEventListener('change',render);$('search').addEventListener('input',render);
$('generate').addEventListener('click',()=>{try{
 if(mode==='new'){
  if(!files.reclist||!files.bgm)throw Error('请先导入 Reclist TXT 和 BGM TXT');
  const reclist=E.parseReclist(files.reclist,$('type').value||null),bgm=E.parseBgm(files.bgm,bgmFilename,$('newManualBpm').value);
  results=E.generate(reclist,bgm,{duplicate:$('duplicates').value,vcGroups:chosen('vc'),nasalGroups:chosen('nasal'),generateR:$('r').checked,generateU2:$('u2').checked,overlap:$('overlap').value});
 }else{
  if(!files.oto)throw Error('请先导入已有 oto.ini');const type=$('type').value||'CV',bpm=Number($('manualBpm').value);if(!(bpm>0))throw Error('BPM 必须大于零');
  const original=E.parseOto(files.oto);results=E.existingAdjust(original,{type,bpm,changeOffset:$('changeOffset').checked,changeConsonant:$('changeConsonant').checked,changeCutoff:$('changeCutoff').checked,changeOverlap:$('changeOverlap').checked,overlap:$('existingOverlap').value});results.counts={total:results.entries.length};
 }
 render();$('previewRows').scrollTop=0;
 }catch(e){results=null;render();$('fileInfo').textContent='无法生成：'+e.message;}});
$('reset').addEventListener('click',()=>{for(const x of document.querySelectorAll('input[name="vc"]'))x.checked=E.HIGH.includes(x.value);for(const x of document.querySelectorAll('input[name="nasal"]'))x.checked=E.NASAL_COMMON.includes(x.value);$('duplicates').value='1';$('overlap').value='auto';$('r').checked=$('u2').checked=true;results=null;render();});
function currentText(){return E.otoText(results.entries,results.lineSequence);}
$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(currentText());$('copy').textContent='已复制';setTimeout(()=>$('copy').textContent='复制完整 OTO',1300);}catch(e){alert('复制失败，请使用下载功能。');}});
$('download').addEventListener('click',()=>{if(!results)return;const txt=currentText();let bytes;if($('encoding').value==='cp932'){
  const encoded=encodeCp932(txt);if(encoded.unsupported?.length){alert('存在 CP932 不支持的字符，请检查别名或改用 UTF-8。');return;}bytes=encoded.bytes;
 }else bytes=new TextEncoder().encode(txt);
 const blob=new Blob([bytes],{type:'application/octet-stream'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='oto.ini';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
})();
