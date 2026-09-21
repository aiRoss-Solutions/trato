// Trato · arranque: login por canal, tema, consola de integración
import { envLabel, $, $$, h, esc, toast, fmtN } from './ui.js';
import { CHANNEL } from './glossary.js';
import * as C from './core.js';
import * as PX from './prices.js';
import { S } from './state.js';
import { BRAND, USERS } from './data.js';
import { mountDesk, mountPanel } from './ui-desk.js';
import * as SYNC from './sync.js';
import { mountBroker } from './ui-broker.js';

const root = $('#root');
// v0.3: tema claro equilibrado por defecto (navy · blanco · celeste); 'sala' = todo navy, opcional.
// Clave nueva (v3b) para no heredar lo que guardaron versiones anteriores; ?theme=light|sala fuerza uno; solo se guarda cuando el usuario elige.
const THEME_KEY = 'trato.theme.v3b';
const themeParam = new URLSearchParams(location.search).get('theme');
S.theme = (themeParam==='sala'||themeParam==='light') ? themeParam : (localStorage.getItem(THEME_KEY) || 'light');
applyTheme(S.theme, {persist:false});
PX.start();

function applyTheme(t, {persist=true}={}){ S.theme=t; if(persist){ try{ localStorage.setItem(THEME_KEY,t); }catch{} } document.documentElement.dataset.theme = t==='sala'?'sala':''; SYNC.send('theme', t); }

function login(){
  document.documentElement.dataset.theme='';
  root.innerHTML = `<div id="login">
    <div class="brand-side"><div><div class="kicker">${BRAND.tagline}</div><h1 style="margin-top:14px">${BRAND.name}<span>.</span><br>La distribución de divisa, en tus pantallas.</h1>
      <p style="margin-top:22px">Prototipo navegable de una plataforma de distribución de divisa: precios en streaming, ejecución, forwards y flexibles, órdenes y alertas, anticipos, cancelaciones, posición y actividad en tiempo real. Multiventana para repartirlo en varias pantallas. Sin conexión real a ningún sistema.</p></div>
      <div class="tiny" style="color:var(--on-navy-2);font-family:var(--mono)">v${BRAND.version} · <b>${envLabel()}</b> · ${new Date().toLocaleDateString('es-ES')} · datos simulados</div></div>
    <div class="form-side"><div><div class="kicker">Acceso</div><h2 style="font-size:24px;margin:8px 0 4px">Elija el canal</h2><p class="muted" style="margin:0 0 6px">Cada canal entra con un perfil y permisos distintos, como en el sistema real.</p>
      <div class="channel-grid">
        ${Object.entries(USERS).map(([k,u])=>`<button class="channel" data-ch="${k}"><span class="ch-code">${CHANNEL[k]?.short||k}</span><span><div class="ch-name">${esc(u.desc)}</div><div class="ch-desc">${k==='SALA'?'Modifica el margen, opera con cliente por asignar y da de alta órdenes y alertas.':k==='TEL'?'Ve los márgenes pero no los modifica. Órdenes limitadas y alertas.':'Vista estándar y profesional. Sesión operativa con firma única. Solo precio final, sin desglose.'}</div></span></button>`).join('')}
      </div>
      <div class="field"><label>Usuario</label><input value="" data-user placeholder="se rellena al elegir canal" readonly></div>
      <button class="btn btn-primary" data-enter disabled style="width:100%;height:40px;justify-content:center">Entrar</button>
      <p class="tiny muted" style="margin-top:14px">La mesa y la banca telefónica entran desde el puesto del banco. El portal de empresas abre una sesión operativa con firma única. Trato nace de la experiencia en varias plataformas de distribución de divisa; no reproduce ninguna.</p>
    </div></div></div>`;
  let ch=null;
  $$('[data-ch]',root).forEach(b=>b.onclick=()=>{ ch=b.dataset.ch; $$('[data-ch]',root).forEach(x=>x.classList.toggle('on',x===b)); $('[data-user]',root).value = USERS[ch].user+' · '+USERS[ch].nombre; $('[data-enter]',root).disabled=false; });
  $('[data-enter]',root).onclick=()=>enter(ch);
}
function enter(ch){
  applyTheme(S.theme, {persist:false}); const user = USERS[ch]; C.log('core',`login ${ch}`,{usuario:user.user});
  root.innerHTML = `<div id="app"></div><div class="console" data-console><div class="c-head"><b>Consola de integración</b><span class="tiny" style="opacity:.7;margin-left:6px">lo que viaja por los canales</span><span style="flex:1"></span><button class="btn btn-ghost btn-sm" data-clear style="color:#fff;border-color:#22408C">Limpiar</button><button class="icon-btn" data-x style="color:#fff">✕</button></div><div class="c-body" data-cbody></div></div>`;
  const app = $('#app'), con = $('[data-console]');
  const cbs = { onLogout(){ if(confirm('¿Cerrar la sesión?')) login(); }, onToggleConsole(){ con.classList.toggle('open'); }, onTheme:applyTheme };
  $('[data-x]',con).onclick=()=>con.classList.remove('open'); $('[data-clear]',con).onclick=()=>{ C.events.length=0; paintConsole(); };
  C.onLog(()=>paintConsole()); paintConsole();
  if(ch==='WEB'){ document.documentElement.dataset.theme=''; /* el tema Sala es de la mesa, el cliente web siempre ve el tema claro */ mountBroker(app, user, cbs); } else mountDesk(app, user, cbs);
}
function paintConsole(){
  const b=$('[data-cbody]'); if(!b) return;
  b.innerHTML = C.events.slice(0,120).map(e=>`<div class="ev"><span class="t">${e.t.toLocaleTimeString('es-ES')}</span> <span class="k ${e.kind}">${e.kind.toUpperCase()}</span> ${esc(e.title)}${e.payload&&Object.keys(e.payload).length?`<pre>${esc(JSON.stringify(e.payload,null,1).slice(0,600))}</pre>`:''}</div>`).join('') || '<div class="ev" style="opacity:.6">Sin eventos todavía. Conecte un cliente o solicite un precio.</div>';
}
const PARAMS = new URLSearchParams(location.search);
if(PARAMS.get('panel')) panelWindow(PARAMS); else login();

// Ventana hija: un solo panel sincronizado con la mesa (BroadcastChannel). Se abre con ⧉ desde la mesa.
function panelWindow(P){
  const panel = P.get('panel'); const ch = USERS[P.get('ch')] ? P.get('ch') : 'SALA'; const user = USERS[ch];
  document.title = `${BRAND.name} · ${panel}`;
  document.documentElement.classList.add('is-panel');
  root.innerHTML = `<div id="app"></div>`;
  if(panel==='consola'){
    root.innerHTML = `<div class="pwin"><div class="pw-head"><div class="brand"><div class="mark">T</div><b>${BRAND.name}</b></div><span class="pw-title">Consola de integración</span><span class="grow"></span><span class="envchip ${envLabel().toLowerCase()}">${envLabel()}</span></div><div class="pw-body console open static" data-console><div class="c-body" data-cbody></div></div></div>`;
    C.onLog(()=>paintConsole()); paintConsole();
    SYNC.on('log', e=>{ C.events.unshift({...e, t:new Date(e.t), _remote:true}); if(C.events.length>300) C.events.pop(); paintConsole(); });
    return;
  }
  mountPanel($('#app'), user, panel);
}
SYNC.on('theme', t=>{ S.theme=t; document.documentElement.dataset.theme = t==='sala'?'sala':''; });
