import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const db=createClient('https://acckrmanpgycunpvmfrl.supabase.co','sb_publishable_2nDjJmqL9oNdWGcpm3MgnQ_KXg5WuBI');
const KEY='locadores:idle:last:v2', ALLOWED=[5,10,15,20,30,60];
let limit=30*60000, last=Date.now(), closing=false, active=false, notice=null;
function read(){try{return Number(localStorage.getItem(KEY))||last}catch{return last}}
function touch(){if(!active||closing)return;const now=Date.now();last=now;try{localStorage.setItem(KEY,String(now))}catch{};hide()}
function hide(){if(notice){notice.remove();notice=null}}
async function settings(){const {data,error}=await db.from('configuracion_seguridad').select('inactividad_minutos').eq('id',1).single();if(!error&&ALLOWED.includes(data?.inactividad_minutos)){limit=data.inactividad_minutos*60000;document.dispatchEvent(new CustomEvent('locadores:idle-settings',{detail:{minutes:data.inactividad_minutos}}))}}
async function close(){if(closing)return;closing=true;hide();try{await db.auth.signOut({scope:'local'})}catch(e){console.warn(e)}try{localStorage.removeItem(KEY)}catch{};location.replace('index.html?sesion=expirada')}
function warning(seconds){
 if(!notice){
  notice=document.createElement('div');
  notice.id='idleNotice';
  notice.setAttribute('role','alertdialog');
  notice.setAttribute('aria-modal','true');
  notice.setAttribute('aria-labelledby','idleWarningTitle');
  notice.setAttribute('aria-describedby','idleWarningDescription');
  notice.style.cssText='position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(13,31,55,.65);box-sizing:border-box';
  notice.innerHTML='<section style="box-sizing:border-box;width:min(440px,100%);padding:30px 26px;background:#fff;color:#17365d;border-radius:18px;text-align:center;box-shadow:0 24px 75px #001b3b66;font:15px system-ui,sans-serif"><div aria-hidden="true" style="font-size:38px;margin-bottom:12px">⏳</div><h2 id="idleWarningTitle" style="font-size:22px;margin:0 0 12px">Tu sesión está por finalizar</h2><p id="idleWarningDescription" style="line-height:1.5;margin:0 0 12px">Por seguridad, la sesión se cerrará automáticamente si no continúas trabajando.</p><div id="idleCountdown" aria-live="off" style="font-size:64px;line-height:1.2;font-weight:800;font-variant-numeric:tabular-nums;color:#b45309;margin:12px 0">60</div><p style="font-size:13px;color:#52647a;margin:0 0 22px">segundos restantes</p><button type="button" style="background:#1967d2;color:white;border:0;border-radius:10px;padding:13px 22px;font-size:15px;font-weight:700;cursor:pointer;width:100%">Continuar sesión</button></section>';
  notice.querySelector('button').addEventListener('click',touch);
  document.body.append(notice);
  notice.querySelector('button').focus();
 }
 notice.querySelector('#idleCountdown').textContent=String(seconds);
}
async function check(){if(!active||closing)return;const remaining=limit-(Date.now()-Math.max(last,read()));if(remaining<=0)return close();if(remaining<=60000)warning(Math.ceil(remaining/1000));else hide()}
for(const event of ['pointerdown','keydown','touchstart','scroll'])window.addEventListener(event,touch,{passive:true});
window.addEventListener('storage',e=>{if(e.key===KEY){last=Math.max(last,Number(e.newValue)||0);hide()}});
db.auth.onAuthStateChange((event,session)=>{if(session?.user){if(!active){active=true;touch();settings()}}else{active=false;hide()}});
db.auth.getSession().then(({data})=>{if(data?.session?.user){active=true;last=Math.max(last,read());settings();check()}});
setInterval(check,1000);setInterval(()=>{if(active)settings()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
