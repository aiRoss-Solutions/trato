// Trato · arranque: login por canal, tema, consola de integración
import { $, $$, h, esc, toast, fmtN } from './ui.js';
import * as C from './core.js';
import * as PX from './prices.js';
import { S } from './state.js';
import { BRAND, USERS } from './data.js';
import { mountDesk } from './ui-desk.js';
import { mountBroker } from './ui-broker.js';

const root = $('#root');
applyTheme(S.theme);
PX.start();

function applyTheme(t){ S.theme=t; localStorage.setItem('trato.theme',t); document.documentElement.dataset.theme = t==='sala'?'sala':''; }

function login(){
  document.documentElement.dataset.theme='';
  root.innerHTML = `<div id="login">
    <div class="brand-side"><div><div class="kicker">${BRAND.tagline}</div><h1 style="margin-top:14px">${BRAND.name}<span>.</span><br>La mesa, en una sola pantalla.</h1>
      <p style="margin-top:22px">Prototipo navegable. Simula la operativa completa de distribución de divisa para sala, banca telefónica y cliente final: precios en streaming, ejecución, seguros de cambio, órdenes, anticipos, cancelaciones y blotters. Sin conexión real a ningún sistema.</p></div>
      <div class="tiny" style="color:var(--on-navy-2);font-family:var(--mono)">v${BRAND.version} · ${new Date().toLocaleDateString('es-ES')} · datos simulados</div></div>
    <div class="form-side"><div><div class="kicker">Acceso</div><h2 style="font-size:24px;margin:8px 0 4px">Elija el canal</h2><p class="muted" style="margin:0 0 6px">Cada canal entra con un perfil y permisos distintos, como en el sistema real.</p>
      <div class="channel-grid">
        ${Object.entries(USERS).map(([k,u])=>`<button class="channel" data-ch="${k}"><span class="ch-code">${k}</span><span><div class="ch-name">${esc(u.desc)}</div><div class="ch-desc">${k==='SALA'?'Puede modificar el mark-up, usar cliente genérico y dar de alta órdenes.':k==='TEL'?'Ve los márgenes pero no los modifica. Órdenes limitadas, call orders y avisos.':'Vista estándar y profesional. Firma ágil. Solo precio final, sin desglose.'}</div></span></button>`).join('')}
      </div>
      <div class="field"><label>Usuario</label><input value="" data-user placeholder="se rellena al elegir canal" readonly></div>
      <button class="btn btn-primary" data-enter disabled style="width:100%;height:40px;justify-content:center">Entrar</button>
      <p class="tiny muted" style="margin-top:14px">Los canales de sala y banca telefónica entran a la plataforma desde el host del banco. El canal web se abre desde la web de empresas con firma ágil.</p>
    </div></div></div>`;
  let ch=null;
  $$('[data-ch]',root).forEach(b=>b.onclick=()=>{ ch=b.dataset.ch; $$('[data-ch]',root).forEach(x=>x.classList.toggle('on',x===b)); $('[data-user]',root).value = USERS[ch].user+' · '+USERS[ch].nombre; $('[data-enter]',root).disabled=false; });
  $('[data-enter]',root).onclick=()=>enter(ch);
}
function enter(ch){
  applyTheme(S.theme); const user = USERS[ch]; C.log('core',`login ${ch}`,{usuario:user.user});
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
login();
