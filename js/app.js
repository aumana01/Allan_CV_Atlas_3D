(() => {
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch(e){return '';}};
const str=(s,lang)=>typeof s==='object'&&s ? (s[lang]||s.es||'') : (s||'');
const normalize=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const State={data:[],filtered:[],lang:'es',selected:null,globe:null,tour:false};
const dict=()=>window.ATLAS_I18N[State.lang];const tr=key=>dict()[key]||window.ATLAS_I18N.es[key]||key;
let toastTimer;
function toast(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3000);}
function translateUI(){
 document.documentElement.lang=State.lang;
 document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=tr(el.dataset.i18n);});
 document.querySelectorAll('[data-i18n-html]').forEach(el=>{el.innerHTML=tr(el.dataset.i18nHtml);});
 document.querySelectorAll('[data-lang]').forEach(el=>el.classList.toggle('active',el.dataset.lang===State.lang));
 $('search').placeholder=State.lang==='en'?'Project, city, company…':State.lang==='it'?'Progetto, città, azienda…':'Proyecto, ciudad, empresa…';
}
function isProject(p){return normalize(p.tipo)==='proyecto';}
function groupClass(p){if(!isProject(p))return 'company';const blob=normalize([p.categoria,p.tecnologias,str(p.nombre,'es')].join(' '));return /digital|scada|python|power bi|datos|software|visor|automatiz|gis|telemetr|instrumentaci/.test(blob)?'digital':'water';}
function paintFilters(){
 const choose=(id,values,allLabel,render)=>{
  const node=$(id),prev=node.value;node.innerHTML=`<option value="">${esc(allLabel)}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(render?render(v):v)}</option>`).join('');
  node.value=values.includes(prev)?prev:'';
 };
 choose('filterCountry',[...new Set(State.data.map(x=>x.pais))].sort(),tr('countryAll'));
 choose('filterType',['Proyecto','Empresa'],tr('typeAll'),v=>v==='Proyecto'?tr('projects'):tr('orgs'));
 choose('filterYear',[2010,2013,2016,2018,2020,2022,2024,2025,2026].map(String),tr('yearAll'));
 const allTech=new Set();State.data.forEach(p=>String(p.tecnologias||'').split(',').forEach(x=>{let s=x.trim();if(s)allTech.add(s);}));
 choose('filterTech',[...allTech].sort((a,b)=>a.localeCompare(b)),tr('techAll'));
 choose('filterEvidence',[...new Set(State.data.map(x=>x.evidencia).filter(Boolean))].sort(),tr('evidenceAll'));
}
function filtersChanged(){
 const country=$('filterCountry').value,type=$('filterType').value,year=Number($('filterYear').value)||0,tech=$('filterTech').value,evidence=$('filterEvidence').value,query=normalize($('search').value.trim());
 State.filtered=State.data.filter(p=>{
  if(country&&p.pais!==country)return false;
  if(type&&p.tipo!==type)return false;
  if(year&&(!p.anio_inicio||Number(p.anio_inicio)<year))return false;
  if(tech&&!String(p.tecnologias||'').split(',').map(s=>s.trim()).includes(tech))return false;
  if(evidence&&p.evidencia!==evidence)return false;
  if(query){const haystack=normalize([str(p.nombre,State.lang),str(p.nombre,'es'),p.ciudad,p.region,p.organizacion,p.pais,p.tecnologias,p.categoria,p.participacion_detalle,str(p.descripcion,State.lang)].join(' '));if(!haystack.includes(query))return false;}
  return true;
 });
 $('visibleCount').textContent=`${String(State.filtered.length).padStart(2,'0')} / ${State.data.length}`;
 renderList();if(State.globe)State.globe.setItems(State.filtered,State.lang,$('toggleLabels').checked);
}
function renderList(){
 const list=$('explorerList');if(!State.filtered.length){list.innerHTML=`<p style="padding:17px;color:#a8c2cf;font-size:12px">${esc(tr('noMatches'))}</p>`;return;}
 list.innerHTML=State.filtered.map(p=>{
  const active=String(p.id)===String(State.selected)?' active':'';
  const cls=groupClass(p),emoji=cls==='company'?'▣':cls==='digital'?'⌘':'◈';
  const label=esc(str(p.nombre,State.lang));
  return `<button class="result-card${active}" data-project-id="${esc(p.id)}"><span class="result-icon ${cls}">${emoji}</span><span class="result-body"><strong>${label}</strong><small>${esc(p.ciudad||p.region||p.pais)} · ${esc(p.anio_inicio||'')} <em>${p.indicador?` · ${esc(p.indicador)}`:''}</em></small></span></button>`;
 }).join('');
}
function period(p){const first=p.anio_inicio||'—';const last=p.anio_fin||tr('present');return `${first} – ${last}`;}
function infoRow(label, value){if(!value)return '';return `<div class="detail-row"><small>${esc(label)}</small><div>${esc(value)}</div></div>`;}
function renderDetails(){
 const p=State.data.find(x=>String(x.id)===String(State.selected));const content=$('detailContent');
 if(!p){content.innerHTML=`<div class="empty-detail"><div class="empty-orbit">◎</div><strong>${esc(tr('selectProject'))}</strong><p>${esc(tr('selectProjectHint'))}</p></div>`;$('detailsPanel').classList.remove('open');return;}
 const approx = /aproxim|referencia|regional|multisitio|localidad|municipio|pendiente/i.test([p.precision,p.nota_geografica,p.validacion].join(' '));
 const mapurl=safeUrl(p.url_google_maps)||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(str(p.nombre,'es')+' '+(p.ciudad||'')+' '+p.pais)}`;
 const sourceurl=safeUrl(p.url_fuente);const photoUrl=safeUrl(p.imagen_url);
 const desc=str(p.descripcion,State.lang); const overview=String(p.participacion_detalle||'').trim();
 content.innerHTML=`<div class="detail-kicker">${esc(p.tipo||'')} · ${esc(p.pais)}</div>
 <h3>${esc(str(p.nombre,State.lang))}</h3><span class="detail-company">${esc(p.organizacion||'')} · ${esc(p.ciudad||p.region||'')}</span>
 <div class="detail-meta"><span>${esc(period(p))}</span><span>${esc(p.categoria||'')}</span>${p.indicador?`<span>${esc(p.indicador)}</span>`:''}</div>
 ${photoUrl?`<figure class="detail-photo"><img src="${esc(photoUrl)}" loading="lazy" alt="${esc(str(p.nombre,State.lang))}" referrerpolicy="no-referrer" /></figure>`:''}
 <p class="detail-description">${esc(desc)}</p>
 ${infoRow(tr('role'),str(p.rol,State.lang))}
 ${infoRow(tr('participation'),overview)}
 ${infoRow(tr('status'),p.estado)}
 ${infoRow(tr('technology'),p.tecnologias)}
 ${infoRow(tr('location'),`${p.ciudad||p.region||p.pais} · ${Number(p.lat).toFixed(4)}°, ${Number(p.lon).toFixed(4)}°`)}
 ${p.evidencia?infoRow('EVIDENCIA',p.evidencia):''}
 ${approx?`<div class="precision-flag">⚠ ${esc(tr('locationCaution'))}<div style="margin-top:4px">${esc(p.precision||'')} · ${esc(p.nota_geografica||'')}</div></div>`:''}
 <div class="detail-actions"><button id="detailFly">◎ ${esc(tr('flyAgain'))}</button><a target="_blank" rel="noopener" href="${esc(mapurl)}">${esc(tr('mapsLink'))}</a>${sourceurl?`<a style="grid-column:span 2" target="_blank" rel="noopener" href="${esc(sourceurl)}">${esc(tr('sourceLink'))}</a>`:''}</div>`;
 $('detailFly').addEventListener('click',()=>State.globe?.flyToProject(p));
 $('detailsPanel').classList.add('open');
}
function selectProject(id, fly=true){
 const p=State.data.find(x=>String(x.id)===String(id));if(!p)return;
 State.selected=String(p.id);
 renderList();renderDetails();
 if(fly&&State.globe)State.globe.flyToProject(p);
 if(window.innerWidth<=800){$('explorerPanel').classList.remove('open');}
 const listButton=$('explorerList').querySelector(`[data-project-id="${CSS.escape(String(id))}"]`);
 if(listButton)listButton.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function renderFeatured(){
 const ids=['8','9','10','7','15','16'];
 const selected=ids.map(id=>State.data.find(x=>String(x.id)===id)).filter(Boolean);
 $('featuredProjects').innerHTML=selected.map(p=>{
  const desc=str(p.descripcion,State.lang);
  return `<button class="project-card" data-featured-id="${esc(p.id)}"><span class="pc-tag">${esc(p.pais.toUpperCase())} / ${esc(p.anio_inicio||'')}</span><h3>${esc(str(p.nombre,State.lang))}</h3><p>${esc(desc.length>135?desc.slice(0,132)+'…':desc)}</p><div class="pc-foot">${esc(tr('viewInAtlas'))} &nbsp;→</div></button>`;
 }).join('');
}
function setLanguage(lang){if(!window.ATLAS_I18N[lang])return;State.lang=lang;translateUI();paintFilters();filtersChanged();renderDetails();renderFeatured();}
function bind(){
 document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setLanguage(b.dataset.lang)));
 for(const id of ['filterCountry','filterType','filterYear','filterTech','filterEvidence','search'])$(id).addEventListener(id==='search'?'input':'change',filtersChanged);
 $('toggleLabels').addEventListener('change',()=>State.globe?.setLabels($('toggleLabels').checked));
 $('clearFilters').addEventListener('click',()=>{for(const id of ['filterCountry','filterType','filterYear','filterTech','filterEvidence','search'])$(id).value='';filtersChanged();});
 $('explorerList').addEventListener('click',e=>{const b=e.target.closest('[data-project-id]');if(b)selectProject(b.dataset.projectId);});
 $('featuredProjects').addEventListener('click',e=>{const b=e.target.closest('[data-featured-id]');if(!b)return;const p=State.data.find(x=>String(x.id)===b.dataset.featuredId);if(!p)return;document.getElementById('atlas').scrollIntoView({behavior:'smooth'});setTimeout(()=>selectProject(p.id),450);});
 $('allProjectsBtn').addEventListener('click',()=>{document.getElementById('atlas').scrollIntoView({behavior:'smooth'});if(window.innerWidth<=800)$('explorerPanel').classList.add('open');});
 $('closeDetail').addEventListener('click',()=>{State.selected=null;renderDetails();renderList();});
 $('openExplorer').addEventListener('click',()=>{$('explorerPanel').classList.toggle('open');$('detailsPanel').classList.remove('open');});
 $('btnWorld').addEventListener('click',()=>State.globe?.flyToWorld());
 $('btnCostaRica').addEventListener('click',()=>State.globe?.flyToCostaRica());
 $('btnTour').addEventListener('click',()=>{
  if(!State.globe)return;
  const ids=['15','16','17','9','8','7','10'];
  const list=ids.map(id=>State.data.find(p=>String(p.id)===id)).filter(Boolean);
  toast(tr('tourStart'));State.globe.tour(list,p=>selectProject(p.id,false),()=>toast(tr('tourEnd')));
 });
 $('zoomIn').addEventListener('click',()=>State.globe?.zoom(1));
 $('zoomOut').addEventListener('click',()=>State.globe?.zoom(-1));
 $('resetNorth').addEventListener('click',()=>State.globe?.north());
 document.querySelectorAll('[data-layer]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-layer]').forEach(n=>n.classList.toggle('active',n===b));State.globe?.setLayer(b.dataset.layer);}));
 $('btnFullscreen').addEventListener('click',()=>{const shell=$('atlasShell');shell.classList.toggle('fullscreen');document.body.style.overflow=shell.classList.contains('fullscreen')?'hidden':'';setTimeout(()=>State.globe?.resize(),250);});
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('atlasShell').classList.contains('fullscreen'))$('btnFullscreen').click();});
}
async function launch(){
 bind();translateUI();
 try{
  const response=await fetch('data/portafolio.json',{cache:'no-store'});if(!response.ok)throw new Error('HTTP '+response.status);
  const obj=await response.json();
  State.data=obj.items.filter(p=>['yes','si','sí','true','1'].includes(String(p.visible||'yes').toLowerCase()) && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)));
  $('allCount').textContent=State.data.length;
  $('heroProjects').textContent=State.data.filter(isProject).length;
  paintFilters();filtersChanged();renderFeatured();renderDetails();
  if(!window.Cesium)throw new Error(tr('globeUnavailable'));
  State.globe=new window.AtlasGlobe($('cesiumContainer'),id=>selectProject(id));
  State.globe.onMove=c=>{$('coordinateReadout').textContent=`LAT ${c.lat}° / LON ${c.lon}° · ALT ${c.alt}`;};
  State.globe.init();State.globe.setItems(State.filtered,State.lang,$('toggleLabels').checked);
  $('mapStatus').textContent='● '+tr('ready');
 }catch(error){console.error('Atlas startup error',error);$('globeError').hidden=false;$('mapStatus').textContent='● ERROR';toast(error.message);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',launch);else launch();
})();
