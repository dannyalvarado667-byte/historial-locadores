import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const db=createClient('https://acckrmanpgycunpvmfrl.supabase.co','sb_publishable_2nDjJmqL9oNdWGcpm3MgnQ_KXg5WuBI');
const KEY='locadores:idle:last:v2', ALLOWED=[5,10,15,20,30,60];
let limit=30*60000, last=Date.now(), closing=false, active=false, notice=null;
function read(){try{return Number(localStorage.getItem(KEY))||last}catch{return last}}
function touch(){if(!active||closing)return;const now=Date.now();last=now;try{localStorage.setItem(KEY,String(now))}catch{};hide()}
function hide(){if(notice){notice.remove();notice=null}}
async function settings(){const {data,error}=await db.from('configuracion_seguridad').select('inactividad_minutos').eq('id',1).single();if(!error&&ALLOWED.includes(data?.inactividad_minutos)){limit=data.inactividad_minutos*60000;document.dispatchEvent(new CustomEvent('locadores:idle-settings',{detail:{minutes:data.inactividad_minutos}}))}}
async function close(){if(closing)return;closing=true;hide();try{await db.auth.signOut({scope:'local'})}catch(e){console.warn(e)}try{localStorage.removeItem(KEY)}catch{};location.replace('index.html?sesion=expirada')}
function warning(seconds){if(!notice){notice=document.createElement('div');notice.id='idleNotice';notice.setAttribute('role','alertdialog');notice.setAttribute('aria-label','Aviso de cierre por inactividad');notice.style.cssText='position:fixed;z-index:99999;right:20px;bottom:20px;background:white;border:2px solid #087f8c;border-radius:14px;box-shadow:0 12px 38px #1236;padding:18px;color:#17365d;max-width:330px;font:14px system-ui';notice.innerHTML='<strong>La sesión está por finalizar</strong><p id="idleCountdown"></p><button type="button" style="background:#1967d2;color:white;border:0;border-radius:9px;padding:9px 15px;cursor:pointer">Continuar sesión</button>';notice.querySelector('button').addEventListener('click',touch);document.body.append(notice)}notice.querySelector('#idleCountdown').textContent='Se cerrará en '+seconds+' segundos por inactividad.'}
async function check(){if(!active||closing)return;const remaining=limit-(Date.now()-Math.max(last,read()));if(remaining<=0)return close();if(remaining<=60000)warning(Math.ceil(remaining/1000));else hide()}
for(const event of ['pointerdown','keydown','touchstart','scroll'])window.addEventListener(event,touch,{passive:true});
window.addEventListener('storage',e=>{if(e.key===KEY){last=Math.max(last,Number(e.newValue)||0);hide()}});
db.auth.onAuthStateChange((event,session)=>{if(session?.user){if(!active){active=true;touch();settings()}}else{active=false;hide()}});
db.auth.getSession().then(({data})=>{if(data?.session?.user){active=true;last=Math.max(last,read());settings();check()}});
setInterval(check,1000);setInterval(()=>{if(active)settings()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
