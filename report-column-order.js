/* Reordenamiento local de columnas para tablas de reportes. No modifica datos. */
(function(){
'use strict';
const page=location.pathname;
const managed=new WeakMap();
const styles=document.createElement('style');
styles.textContent='table[data-reorder-ready] thead th[data-reorder-col]{cursor:grab}table[data-reorder-ready] thead th[data-reorder-col]:active{cursor:grabbing}table[data-reorder-ready] thead th[data-reorder-col].reorder-over{outline:2px dashed #1967d2;outline-offset:-3px}';
document.head.appendChild(styles);
const norm=s=>String(s||'').replace(/\\s+/g,' ').trim().toLowerCase();
function eligible(table){
 const head=table.tHead,body=table.tBodies[0];if(!head||!body||head.rows.length!==1)return false;
 const headers=[...head.rows[0].cells];
 if(headers.length<4||headers.some(h=>h.colSpan!==1||h.rowSpan!==1||!norm(h.textContent)))return false;
 const rows=[...body.rows].filter(r=>r.cells.length);
 if(rows.some(r=>r.cells.length!==headers.length||[...r.cells].some(c=>c.colSpan!==1||c.rowSpan!==1)))return false;
 return true;
}
function init(table){
 if(managed.has(table)||table.closest('#ocFloatingHeader')||!eligible(table))return;
 const headers=[...table.tHead.rows[0].cells];
 const signature=headers.map(h=>norm(h.textContent)).join('|');
 const siblings=[...document.querySelectorAll('table')].filter(t=>t!==table&&t.tHead&&[...t.tHead.rows[0]?.cells||[]].map(h=>norm(h.textContent)).join('|')===signature);
 const ordinal=siblings.filter(t=>t.compareDocumentPosition(table)&Node.DOCUMENT_POSITION_FOLLOWING).length;
 const key='locadores:reportColumnOrder:'+page+':'+signature+':'+ordinal;
 const original=headers.map((h,i)=>({h,i}));original.forEach(({h,i})=>h.dataset.reorderCol=String(i));
 const state={key,headers,signature,order:headers.map((_,i)=>i),originalCount:headers.length};
 managed.set(table,state);table.dataset.reorderReady='1';
 function reorder(order){
  if(!eligible(table))return;
  const hr=table.tHead.rows[0],body=table.tBodies[0];
  const hh=[...hr.cells];const mapped=hh.map(h=>Number(h.dataset.reorderCol));
  if(mapped.length!==order.length||mapped.some(i=>!Number.isInteger(i)))return;
  if(mapped.some((v,i)=>v!==order[i])){const byId=new Map(hh.map(h=>[Number(h.dataset.reorderCol),h]));order.forEach(id=>hr.appendChild(byId.get(id)))}
  [...body.rows].forEach(row=>{
   if(row.cells.length!==order.length||[...row.cells].some(c=>c.colSpan!==1))return;
   const cells=[...row.cells];
   if(!cells.every(c=>c.hasAttribute('data-reorder-col'))){
     cells.forEach((c,i)=>c.dataset.reorderCol=String(i));
   }
   const byId=new Map([...row.cells].map(c=>[Number(c.dataset.reorderCol),c]));
   if(order.every(id=>byId.has(id))){order.forEach(id=>row.appendChild(byId.get(id)))}
  });
 }
 let stored=[];try{stored=JSON.parse(localStorage.getItem(key)||'[]')}catch(_){}
 if(Array.isArray(stored)&&stored.length===headers.length&&new Set(stored).size===headers.length&&stored.every(x=>Number.isInteger(x)&&x>=0&&x<headers.length)){state.order=stored;reorder(stored)}
 let from=null;
 table.tHead.addEventListener('dragstart',e=>{
   const th=e.target.closest('th[data-reorder-col]');if(!th||!table.tHead.contains(th))return;
   from=Number(th.dataset.reorderCol);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(from));
 });
 table.tHead.addEventListener('dragover',e=>{
   const th=e.target.closest('th[data-reorder-col]');if(from===null||!th)return;
   e.preventDefault();e.dataTransfer.dropEffect='move';th.classList.add('reorder-over');
 });
 table.tHead.addEventListener('dragleave',e=>{const th=e.target.closest('th[data-reorder-col]');if(th)th.classList.remove('reorder-over')});
 table.tHead.addEventListener('drop',e=>{
   const th=e.target.closest('th[data-reorder-col]');if(from===null||!th)return;
   e.preventDefault();table.tHead.querySelectorAll('.reorder-over').forEach(x=>x.classList.remove('reorder-over'));
   const target=Number(th.dataset.reorderCol),a=state.order.indexOf(from),b=state.order.indexOf(target);
   if(a>=0&&b>=0&&a!==b){const next=[...state.order];next.splice(a,1);next.splice(b,0,from);state.order=next;reorder(next);localStorage.setItem(key,JSON.stringify(next))}
   from=null;
 });
 table.tHead.addEventListener('dragend',()=>{from=null;table.tHead.querySelectorAll('.reorder-over').forEach(x=>x.classList.remove('reorder-over'))});
 headers.forEach(h=>{h.draggable=true;h.title=(h.title?h.title+' · ':'')+'Arrastra para reordenar columnas'});
 const observer=new MutationObserver(()=>{
   if(!table.isConnected){observer.disconnect();return}
   if(!eligible(table))return;
   const current=[...table.tHead.rows[0].cells].map(h=>Number(h.dataset.reorderCol));
   const needsHead=current.some((id,i)=>id!==state.order[i]);
   const needsBody=[...table.tBodies[0].rows].some(row=>row.cells.length===state.order.length&&[...row.cells].some((cell,i)=>!cell.hasAttribute('data-reorder-col')||Number(cell.dataset.reorderCol)!==state.order[i]));
   if(needsHead||needsBody)reorder(state.order);
 });
 observer.observe(table,{childList:true,subtree:true});
}
let scheduled=false;
function scan(){scheduled=false;document.querySelectorAll('table').forEach(init)}
const globalObserver=new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(scan)}});
function start(){scan();globalObserver.observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();