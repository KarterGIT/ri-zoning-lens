'use strict';
const $ = (selector) => document.querySelector(selector);
const districts = [
 ['R12','Residential R12'],['R8','Residential R8'],['RL','Limited Household'],['RG','General or Multi Household'],['IS','Institutional'],['CP','Commercial Professional Office'],['CV','Commercial Village'],['CG','Commercial General'],['ML','Manufacturing Limited'],['MG','Manufacturing General'],['OS','Open Space']
];
const pageMeta = {
 overview:['Overview','Zoning, brought into focus.','One place to explore the rules, see what changed, and follow the evidence.'],
 rules:['District rules','Find the rule. Follow the source.','Explore the verified amendment by district, with its evidence always one click away.'],
 changes:['Ordinance changes','See exactly what changed.','A clear comparison between the base ordinance and an adopted amendment.'],
 sources:['Source library','The documents behind the rules.','Official records, collected in one place and connected to the changes they support.'],
 review:['Needs review','A clear view of what is missing.','Keep unresolved changes visible before they become assumptions in an application.']
};
const sourceTitles = {
 planning:['Town planning & zoning','Official source index'],base:['Base zoning ordinance','Town PDF · labeled December 2014'],clerk:['Town Clerk','Official records entry point'],clerkbase:['North Providence ClerkBase','Searchable town records'], 'ordinance-index':['2025 ordinance index','Links to adopted ordinance attachments'],cannabis:['Signed cannabis amendment · 25-022Z','2-page signed ordinance · adoption verified'],adoption:['Council minutes · February 3, 2026','Item 5 · adoption of the cannabis amendment'],'alternative-base':['ClerkBase Chapter 35 · Zoning','Alternative section numbering · crosswalk needed'],'august-minutes':['Council minutes · August 18, 2026','Flood-hazard adoption + overlay discussion'],'october-agenda':['Council agenda · October 6, 2026','Proposals and introductions · adoption unverified'],maps:['Town zoning map library','Individual plat and zoning maps'],'townwide-map':['Townwide zoning map','October 2025 · reference map']
};
const esc = (s) => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let selectedDistrict='MG';
let verified, sources, evidencePage=1, toastTimer;
try { if (districts.some(d=>d[0]===localStorage.getItem('zoning-lens-district'))) selectedDistrict=localStorage.getItem('zoning-lens-district'); } catch {}
function toast(message) {
 $('#toast').textContent=message; $('#toast').classList.add('visible');
 clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);
}
function route() {
 const page=location.hash.slice(1) in pageMeta ? location.hash.slice(1) : 'overview';
 document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el.id==='page-'+page));
 document.querySelectorAll('nav a').forEach(el=>{el.classList.toggle('active',el.dataset.page===page); if(el.dataset.page===page)el.setAttribute('aria-current','page'); else el.removeAttribute('aria-current');});
 const [crumb,title,description]=pageMeta[page];
 $('#breadcrumb').textContent=crumb; $('#page-title').textContent=title; $('#page-description').textContent=description;
 document.title=`${crumb} · Zoning Lens`;
 window.scrollTo({top:0,behavior:'instant'});
}
function ruleCard(code) {
 const permit=code==='S';
 return `<div class="rule-card ${permit?'':'prohibited'}"><div class="rule-kicker">VERIFIED USE-TABLE UPDATE <span>↗</span></div><h3>Cannabis retail</h3><div class="rule-status"><span class="rule-badge">${code}</span><strong>${permit?'Special-use permit required':'Prohibited in this district'}</strong></div><p class="rule-note">Ordinance 25-022Z · adopted Feb 3, 2026<br>Verified amendment; later history unverified.</p></div>`;
}
function selectDistrict(code) {
 if (!districts.some(d=>d[0]===code)) return;
 selectedDistrict=code;
 try {localStorage.setItem('zoning-lens-district',code);} catch {}
 const name=districts.find(d=>d[0]===code)[1];
 $('#selected-code').textContent=code; $('#selected-name').textContent=name;
 $('#rules-heading').textContent=`${code} · ${name}`; $('#district-select').value=code;
 document.querySelectorAll('.district-pill').forEach(el=>{const active=el.dataset.district===code;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});
 if (verified) {
  const status=verified.changes[0].district_values[code];
  $('#overview-rule').innerHTML=ruleCard(status);
  renderRules(); renderTable();
 }
}
function renderRules() {
 const term=$('#rule-search').value.toLowerCase().trim();
 const code=verified.changes[0].district_values[selectedDistrict];
 const name=districts.find(d=>d[0]===selectedDistrict)[1];
 const searchable=`cannabis retail medical recreational ${selectedDistrict} ${name} ${code==='S'?'special use permit':'prohibited'}`.toLowerCase();
 if (term&&!searchable.includes(term)) {
  $('#rules-result').innerHTML='<div class="empty-state">No verified use matches this search. Housing rules remain in the review queue.</div>';return;
 }
 $('#rules-result').innerHTML=`<div class="rule-summary"><span class="rule-badge">${code}</span><div><h3>Cannabis retailer</h3><p>${code==='S'?'Special-use permit required; associated standards also apply.':'Prohibited in this district under the verified amendment row.'}</p></div><button class="button secondary" id="rule-evidence">View evidence ↗</button></div>`;
 $('#rule-evidence').addEventListener('click',openEvidence);
}
function renderTable() {
 const values=verified.changes[0].district_values;
 $('#district-table-body').innerHTML=`<tr><td>Cannabis retailer <span class="addition-label">+ added</span></td>${districts.map(([code])=>`<td class="${code===selectedDistrict?'selected-col':''}"><button data-table-district="${code}" aria-label="Select ${code}: ${values[code]==='S'?'special-use permit required':'prohibited'}">${values[code]}</button></td>`).join('')}</tr>`;
 document.querySelectorAll('[data-table-district]').forEach(el=>el.addEventListener('click',()=>selectDistrict(el.dataset.tableDistrict)));
}
function renderSources() {
 const query=$('#source-search').value.toLowerCase().trim();
 const list=sources.filter(source=>`${sourceTitles[source.id].join(' ')} ${source.role}`.toLowerCase().includes(query));
 $('#source-empty').hidden=list.length>0;
 $('#source-list').innerHTML=list.map(source=>{
  const [title,subtitle]=sourceTitles[source.id];
  const local=source.id==='base'?'assets/base-ordinance.pdf':source.id==='cannabis'?'assets/cannabis-amendment.pdf':null;
  return `<article class="panel source-card"><span class="document-icon">${source.id.includes('map')?'▦':'▱'}</span><div><h3>${esc(title)}</h3><p>${esc(subtitle)}</p><span class="source-domain">${esc(new URL(source.url).hostname)}</span></div>${source.id==='cannabis'?'<span class="status green">Verified adoption</span>':''}<div class="source-card-actions">${local?`<a href="${local}" target="_blank" class="button secondary">Collected PDF ↗</a>`:''}<a href="${esc(source.url)}" target="_blank" rel="noopener" class="button secondary">Original source ↗</a></div></article>`;
 }).join('');
}
function updateEvidencePage() {
 $('#evidence-image').src=`assets/amendment-page-${evidencePage}.png`;
 $('#evidence-image').alt=`Scanned page ${evidencePage} of signed North Providence ordinance 25-022Z`;
 $('#evidence-page-label').textContent=`Page ${evidencePage} of 2`;
 $('#evidence-prev').disabled=evidencePage===1; $('#evidence-next').disabled=evidencePage===2;
 $('.evidence-image-wrap').scrollTop=0;
}
function openEvidence() {evidencePage=1;updateEvidencePage();$('#evidence-dialog').showModal();}
function compareWords(before,after) {
 const a=before.match(/\s+|[^\s]+/g)||[],b=after.match(/\s+|[^\s]+/g)||[];
 if(a.length>1600||b.length>1600)throw new Error('Please compare one section at a time (about 800 words per version).');
 const grid=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)grid[i][j]=a[i]===b[j]?grid[i+1][j+1]+1:Math.max(grid[i+1][j],grid[i][j+1]);
 const chunks=[];
 const push=(type,text)=>{if(chunks.length&&chunks[chunks.length-1].type===type)chunks[chunks.length-1].text+=text;else chunks.push({type,text});};
 let i=0,j=0;
 while(i<a.length||j<b.length){
  if(i<a.length&&j<b.length&&a[i]===b[j]){push('same',a[i]);i++;j++;}
  else if(i<a.length&&(j===b.length||grid[i+1][j]>=grid[i][j+1])){push('removed',a[i++]);}
  else push('added',b[j++]);
 }
 return chunks;
}
function runComparison() {
 const before=$('#old-text').value,after=$('#new-text').value;
 if(!before.trim()&&!after.trim()){toast('Paste text into at least one version to compare.');return;}
 try {
  const chunks=compareWords(before,after);
  const output=$('#custom-output');output.replaceChildren();output.hidden=false;
  const label=document.createElement('span');label.className='output-label';
  const changed=chunks.some(c=>c.type!=='same');
  label.textContent=changed?'TEXT COMPARISON · GREEN = ADDED · RED = REMOVED':'TEXT COMPARISON · NO CHANGES FOUND';output.append(label);
  chunks.forEach(chunk=>{if(chunk.type==='same')output.append(document.createTextNode(chunk.text));else{const mark=document.createElement(chunk.type==='added'?'ins':'del');mark.textContent=chunk.text;output.append(mark);}});
 }catch(error){toast(error.message);}
}
function downloadData() {
 if(!verified){toast('The verified dataset is still loading.');return;}
 const blob=new Blob([JSON.stringify(verified,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='north-providence-verified-amendment.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 toast('Verified amendment data exported with source references.');
}
async function init() {
 route();window.addEventListener('hashchange',route);
 $('#overview-districts').innerHTML=districts.map(([code,name])=>`<button class="district-pill" data-district="${code}" aria-label="${code}: ${name}" aria-pressed="false">${code}</button>`).join('');
 $('#district-select').innerHTML=districts.map(([code,name])=>`<option value="${code}">${code} · ${name}</option>`).join('');
 document.querySelectorAll('[data-district]').forEach(el=>el.addEventListener('click',()=>selectDistrict(el.dataset.district)));
 $('#district-select').addEventListener('change',event=>selectDistrict(event.target.value));
 $('#rule-search').addEventListener('input',()=>verified&&renderRules());
 $('#source-search').addEventListener('input',()=>sources&&renderSources());
 ['#overview-evidence','#change-evidence'].forEach(selector=>$(selector).addEventListener('click',openEvidence));
 $('.close-dialog').addEventListener('click',()=>$('#evidence-dialog').close());
 $('#evidence-dialog').addEventListener('click',event=>{if(event.target===$('#evidence-dialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
 $('#evidence-prev').addEventListener('click',()=>{evidencePage=1;updateEvidencePage();});
 $('#evidence-next').addEventListener('click',()=>{evidencePage=2;updateEvidencePage();});
 $('#print-button').addEventListener('click',()=>window.print());
 $('#export-button').addEventListener('click',downloadData);
 document.querySelectorAll('[data-compare]').forEach(el=>el.addEventListener('click',()=>{
  const custom=el.dataset.compare==='custom';
  $('#verified-comparison').hidden=custom;$('#custom-comparison').hidden=!custom;
  document.querySelectorAll('[data-compare]').forEach(button=>{const active=el===button;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
 }));
 $('#compare-button').addEventListener('click',runComparison);
 $('#sample-button').addEventListener('click',()=>{
  $('#old-text').value='A minimum of 2 parking spaces per dwelling unit is required. Applications must include a site plan.';
  $('#new-text').value='A minimum of 1 parking space per dwelling unit is required. Applications must include a site plan and a drainage report.';
  $('#custom-status').textContent='Fictional example — these are not North Providence rules.';runComparison();
 });
 [$('#old-text'),$('#new-text')].forEach(el=>el.addEventListener('input',()=>{$('#custom-status').textContent='Runs in your browser. Text is not uploaded.';}));
 try {
  const responses=await Promise.all([fetch('data/verified-change.json'),fetch('data/sources.json')]);
  if(responses.some(r=>!r.ok))throw new Error('Data files could not be loaded.');
  const data=await Promise.all(responses.map(r=>r.json()));verified=data[0];sources=data[1].sources;
  selectDistrict(selectedDistrict);renderSources();
 } catch(error) {
  $('#overview-rule').innerHTML='<div class="notice amber">The dataset could not load. Please refresh the page or open the source library links.</div>';
  toast(error.message);
 }
}
init();
