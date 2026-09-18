// Trato · estado de la sesión (en memoria) y bus de eventos
import { G10 } from './data.js';
export const S = {
  user:null, client:null,
  ctx:{ cargo:null, abono:null, linea:null, ordenante:null },
  workspaces:[ {name:'G10', pairs:[...G10], fav:true} ], activeWs:0,
  tiles:[], mode:'SPOTFWD',            // SPOTFWD | FLEX
  dock:{ tab:'cliente', sub:'ejecutadas', filtersOn:false, filters:{}, hidden:{} },
  theme: localStorage.getItem('trato.theme') || 'light',
  consoleOpen:false, lang:'es'
};
const handlers = {};
export const bus = {
  on(evt, fn){ (handlers[evt] ??= new Set()).add(fn); return ()=>handlers[evt].delete(fn); },
  emit(evt, data){ for(const f of handlers[evt]||[]) f(data); }
};
export function resetTilesFromWorkspace(){
  const ws = S.workspaces[S.activeWs];
  S.tiles = ws.pairs.map(p => ({ pair:p, tipo:'OTROS', obs:'', divOp:p.split('/')[1], amount:0, tenor:'SPOT', valueDate:null }));
}
