// Trato · sincronización entre ventanas de la misma sesión (BroadcastChannel, con fallback al evento `storage`).
// Cada ventana tiene un id; los mensajes propios se ignoran. Nada sale del navegador.
export const winId = Math.random().toString(36).slice(2, 10);
let ch = null; try { ch = new BroadcastChannel('trato-v3'); } catch { ch = null; }
const handlers = {};
export function on(type, f){ (handlers[type] ??= []).push(f); return ()=>{ handlers[type] = handlers[type].filter(x=>x!==f); }; }
export function send(type, payload){
  const msg = { type, payload, from: winId, t: Date.now() };
  if(ch) ch.postMessage(msg);
  else { try { localStorage.setItem('trato.sync', JSON.stringify(msg)); } catch {} }
}
function dispatch(msg){ if(!msg || msg.from===winId) return; (handlers[msg.type]||[]).forEach(f=>{ try{ f(msg.payload, msg); }catch(e){ console.error('sync', e); } }); }
if(ch) ch.addEventListener('message', e=>dispatch(e.data));
else window.addEventListener('storage', e=>{ if(e.key==='trato.sync' && e.newValue){ try{ dispatch(JSON.parse(e.newValue)); }catch{} } });
export const isPanelWindow = () => new URLSearchParams(location.search).has('panel');
