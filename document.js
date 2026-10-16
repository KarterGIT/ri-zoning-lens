'use strict';
// Document patches are built from source anchors, not guessed from OCR at runtime.
(async function ordinanceDocument(){
 const root=document.querySelector('#document-app');
 let doc,mode='split',selection='413',query='';
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 try {const response=await fetch('data/document.json');if(!response.ok)throw Error('Document data could not load.');doc=await response.json();}catch(error){root.textContent=error.message;return;}
 const patchMap=new Map(doc.patches.map(p=>[p.id,p]));
 const sourceURL=p=>`assets/ordinances/${({'23-030Z':'o23_30','24-006Z':'o24_06','24-008Z':'o24_08','24-009Z':'o24_09','24-012Z':'o24_12','24-015Z':'o24_15','25-022Z':'o25_022','26-001Z':'o26_01'})[p.ordinance]}.pdf#page=${p.page}`;
 const mark=(text,kind)=>text?`<${kind==='added'?'ins':'del'}>${safe(text)}</${kind==='added'?'ins':'del'}>`:'';
 function body(unit,version){
   return unit.parts.map(part=>{
    if(!part.patch)return safe(part.before);
    const p=patchMap.get(part.patch);
    if(version==='redline')return `<span class="patch-run" data-patch-id="${p.id}">${p.diff.map(c=>c.kind==='same'?safe(c.text):mark(c.text,c.kind)).join('')}</span>`;
    if(version==='original')return mark(part.before,'removed');
    if(version==='updated')return mark(part.after,'added');
    return safe(part.after);
   }).join('');
 }
 function unitHTML(unit){
   const changed=unit.patches.length>0, inserted=!unit.before&&changed;
   const sources=unit.patches.map(id=>patchMap.get(id));
   const sourceLinks=Array.from(new Map(sources.map(p=>[p.ordinance,p])).values()).map(p=>`<a href="${sourceURL(p)}" target="_blank" rel="noopener">${p.ordinance} ↗</a>`).join('');
   const heading=`<div class="document-unit-heading"><div><small>${safe(unit.article)}</small><h2>${inserted&&mode!=='original'?`<ins>${safe(unit.title)}</ins>`:safe(unit.title)}</h2></div><span class="document-badge ${changed?'patched':'historical'}">${changed?(inserted?'Added passage':'Checked changes'):'Baseline carried forward'}</span></div>`;
   const old=unit.before?body(unit,'original'):'<span class="document-absent">No corresponding passage in the December 2014 baseline.</span>';
   let text;
   if(unit.images?.length){text=`<p class="document-review">Exhibit A is shown as original page images to preserve the tables. Referenced dimensional-chart changes in 23-002Z have not been merged.</p>${unit.images.map((im,i)=>`<img class="document-facsimile" loading="lazy" src="${im}" alt="Original Exhibit A, PDF page ${99+i}">`).join('')}`;}
   else if(mode==='split'){text=`<div class="document-columns"><div class="document-column original"><h3>ORIGINAL · DECEMBER 2014</h3><div class="ordinance-text">${old}</div></div><div class="document-column updated"><h3>UPDATED DRAFT · CHECKED PATCHES</h3><div class="ordinance-text">${unit.after?body(unit,'updated'):'<span class="document-absent">Passage removed.</span>'}</div></div></div>`;}
   else text=`<div class="ordinance-text single-text">${mode==='original'?(unit.before?safe(unit.before):'<span class="document-absent">Not present in the baseline.</span>'):body(unit,mode)}</div>`;
   return `<article class="document-unit" id="doc-${unit.id}">${heading}${unit.review?`<p class="document-review">${safe(unit.review)}</p>`:''}${text}<footer class="document-unit-sources">${unit.page?`<a href="assets/base-ordinance.pdf#page=${unit.page}" target="_blank">Original PDF · page ${unit.page} ↗</a>`:''}${sourceLinks}</footer>${sources.length?`<details class="document-evidence"><summary>${sources.length} applied change${sources.length===1?'':'s'} · wording and source notes</summary>${sources.map(p=>`<div><strong>${safe(p.label)}</strong><p>${safe(p.note)||'Operative wording transcribed from the signed amendment.'}</p><a href="${sourceURL(p)}" target="_blank">${p.ordinance} · source page ${p.page} ↗</a><button class="text-button" data-record="${p.ordinance}">Inspect scan</button></div>`).join('')}</details>`:''}</article>`;
 }
 function selectedUnits(){return doc.units.filter(u=>(selection==='all'||selection==='changed'&&u.patches.length||selection===u.id)&&(!query||`${u.title} ${u.before} ${u.after}`.toLowerCase().includes(query)));}
 function render(){
  const list=selectedUnits();
  document.querySelector('#document-result-count').textContent=`${list.length} document section${list.length===1?'':'s'} shown · ${mode==='split'?'original beside updated draft':mode==='redline'?'combined redline':mode==='clean'?'clean draft, change marks hidden':'original text'}`;
  document.querySelector('#document-pages').innerHTML=list.map(unitHTML).join('')||'<div class="empty-state">No document section matches your search.</div>';
  root.querySelectorAll('[data-document-mode]').forEach(b=>{const active=b.dataset.documentMode===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 }
 root.innerHTML=`<article class="panel document-intro"><div class="eyebrow">DOCUMENT COMPARISON</div><h2>Original and updated draft</h2><p><del>Removed</del> · <ins>Added</ins> · Unmarked text comes from the original.</p><div class="document-coverage"><strong>${doc.patches.length}</strong> checked text changes <span>from ${doc.merged_ordinances.length} ordinances</span><button class="text-button" data-document-coverage>View merge coverage ↓</button></div><div class="document-review"><strong>Partial draft.</strong> ${doc.unmerged_ordinances.length} adopted records are not merged yet. 24-009Z is partly merged. This is not the complete current ordinance.</div></article>
 <div class="panel document-controls"><label>Read a section<select id="document-section"><option value="all">Entire ordinance · original body + Exhibit A</option><option value="changed">All sections with checked changes</option>${doc.units.map(u=>`<option value="${u.id}" ${u.id===selection?'selected':''}>${u.patches.length?'● ':''}${safe(u.title)}</option>`).join('')}</select></label><label>Find wording<input id="document-search" type="search" placeholder="Search original and updated text…"></label><div class="document-modes" aria-label="Document view"><button data-document-mode="split" class="active" aria-pressed="true">Side by side</button><button data-document-mode="redline" aria-pressed="false">Redline</button><button data-document-mode="clean" aria-pressed="false">Clean draft</button><button data-document-mode="original" aria-pressed="false">Original</button></div><div class="document-file-actions"><a class="button secondary" href="documents/north-providence-redline.html" target="_blank">Open full redline ↗</a><a class="button secondary" href="documents/north-providence-redline.html" download>Download document ↓</a><a class="text-link" href="assets/base-ordinance.pdf" target="_blank">Original 102-page PDF ↗</a></div></div>
 <div id="document-result-count" class="document-result-count" role="status"></div><div id="document-pages"></div>
 <article id="document-coverage" class="panel content-panel document-coverage-panel"><div class="eyebrow">MERGE STATUS</div><h2>Included changes</h2><p>Checked changes are listed below. The original PDF includes the cover and contents; Exhibit A is shown as images.</p><ul>${doc.merged_ordinances.map(id=>`<li><strong>${id}${doc.partial_ordinances.includes(id)?' · partial':''}</strong> — ${doc.patches.filter(p=>p.ordinance===id).map(p=>safe(p.label)).join('; ')}</li>`).join('')}</ul><details><summary>${doc.unmerged_ordinances.length} other adopted zoning records not yet merged</summary>${doc.unmerged_ordinances.map(r=>`<p><button class="text-button" data-record="${r.id}">${r.id} ↗</button> ${safe(r.title)}<br><small>${safe(r.category)} · ${safe(r.sections.join(' · '))}</small></p>`).join('')}</details><p>${safe(doc.notice)}</p><p class="muted">${safe(doc.transcription_note)}</p></article>`;
 document.querySelector('#document-section').addEventListener('change',e=>{selection=e.target.value;render();});
 document.querySelector('#document-search').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();render();});
 root.addEventListener('click',event=>{if(event.target.closest('[data-document-coverage]'))document.querySelector('#document-coverage').scrollIntoView({behavior:'smooth'});const b=event.target.closest('[data-document-mode]');if(b){mode=b.dataset.documentMode;render();}});
 render();
})();
