/* ============================================================
 * app.js — Interfaz del simulador (sin frameworks).
 * Lee/escribe las tablas, valida en vivo y dibuja resultados.
 * Usa la lógica pura de banker.js: calcNeed, safetyCheck,
 * validateSystem, requestCheck, fmtSeq.
 * ============================================================ */
'use strict';

const $ = (id) => document.getElementById(id);
const state = { N: 5, M: 3, names: ['A', 'B', 'C'], pendingGrant: null, lastResult: null, stepIdx: 0, showAllSteps: false };
let staleRow = null; // fila resaltada por el paso a paso interactivo

const clampInt = (v, lo, hi, fb) => {
  v = parseInt(v, 10);
  return Number.isInteger(v) ? Math.min(hi, Math.max(lo, v)) : fb;
};
const resNames = () => {
  const raw = $('inNames').value.split(',').map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (let j = 0; j < state.M; j++) out.push(raw[j] || String.fromCharCode(65 + j));
  return out;
};
const numVal = (el) => {
  const v = parseInt(el.value, 10);
  return Number.isInteger(v) ? v : NaN;
};

/* ---------- Construcción de tablas ---------- */
function buildTables(preset) {
  state.N = clampInt($('inN').value, 1, 12, 5);
  state.M = clampInt($('inM').value, 1, 6, 3);
  $('inN').value = state.N;
  $('inM').value = state.M;
  state.names = resNames();

  const get = (mat, i, j) => (preset && preset[mat] && preset[mat][i] && preset[mat][i][j] != null ? preset[mat][i][j] : 0);
  const mkTable = (id, mat, editable) => {
    let h = '<div class="tablebox"><table class="matrix"><thead><tr><th></th>';
    state.names.forEach((n) => (h += `<th>${n}</th>`));
    h += '</tr></thead><tbody>';
    for (let i = 0; i < state.N; i++) {
      h += `<tr><th>P${i}</th>`;
      for (let j = 0; j < state.M; j++) {
        h += editable
          ? `<td><input class="cell" data-mat="${mat}" data-i="${i}" data-j="${j}" type="number" min="0" max="999" value="${get(mat, i, j)}"/></td>`
          : `<td class="ro" data-mat="need" data-i="${i}" data-j="${j}" id="need-${i}-${j}">0</td>`;
      }
      h += '</tr>';
    }
    $(id).innerHTML = h + '</tbody></table></div>';
  };
  mkTable('tblAlloc', 'alloc', true);
  mkTable('tblMax', 'max', true);
  mkTable('tblNeed', 'need', false);

  // Available
  let ah = '';
  for (let j = 0; j < state.M; j++) {
    const v = preset && preset.available && preset.available[j] != null ? preset.available[j] : (j === 0 ? 3 : j === 1 ? 3 : 2);
    ah += `<div class="avail-box"><span>${state.names[j]}</span><input class="cell" id="avail-${j}" type="number" min="0" max="999" value="${v}"/></div>`;
  }
  $('availRow').innerHTML = ah;

  // Request row + pid select
  let rh = '';
  for (let j = 0; j < state.M; j++) rh += `<div class="avail-box"><span>${state.names[j]}</span><input class="cell" id="req-${j}" type="number" min="0" max="999" value="0"/></div>`;
  $('reqRow').innerHTML = rh;
  $('reqPid').innerHTML = Array.from({ length: state.N }, (_, i) => `<option value="${i}">P${i}</option>`).join('');

  document.querySelectorAll('input.cell').forEach((el) => el.addEventListener('input', () => { refreshLive(); saveState(); }));
  refreshLive();
}

/* ---------- Autoguardado del escenario ---------- */
function saveState() {
  try {
    const s = readSystem();
    if (!Number.isInteger(s.N) || !Number.isInteger(s.M)) return;
    localStorage.setItem('banker-state', JSON.stringify({
      N: s.N, M: s.M, names: state.names,
      available: s.available, max: s.max, allocation: s.allocation,
    }));
  } catch { /* almacenamiento no disponible: no es crítico */ }
}
function loadSavedState() {
  try {
    const d = JSON.parse(localStorage.getItem('banker-state') || 'null');
    if (d && d.allocation && d.max) return d;
  } catch { /* JSON corrupto: ignorar */ }
  return null;
}

function readSystem() {
  const N = state.N, M = state.M;
  const alloc = [], max = [], available = [];
  for (let i = 0; i < N; i++) {
    alloc.push([]); max.push([]);
    for (let j = 0; j < M; j++) {
      alloc[i].push(numVal(document.querySelector(`[data-mat="alloc"][data-i="${i}"][data-j="${j}"]`)));
      max[i].push(numVal(document.querySelector(`[data-mat="max"][data-i="${i}"][data-j="${j}"]`)));
    }
  }
  for (let j = 0; j < M; j++) available.push(numVal($(`avail-${j}`)));
  return { N, M, allocation: alloc, max, available };
}

/* ---------- Validación en vivo + Need ---------- */
function refreshLive() {
  const s = readSystem();
  const need = s.allocation.map((row, i) => row.map((v, j) => {
    const a = Number.isInteger(v) ? v : 0;
    const m = Number.isInteger(s.max[i][j]) ? s.max[i][j] : 0;
    return m - a;
  }));
  for (let i = 0; i < s.N; i++)
    for (let j = 0; j < s.M; j++) {
      const el = $(`need-${i}-${j}`);
      if (el) {
        el.textContent = need[i][j];
        el.classList.remove('cellok', 'cellbad'); // limpiar semáforo de la corrida anterior
      }
    }
  // marcar celdas inválidas
  document.querySelectorAll('[data-mat]').forEach((el) => el.classList.remove('bad'));
  for (let i = 0; i < s.N; i++)
    for (let j = 0; j < s.M; j++) {
      const a = s.allocation[i][j], m = s.max[i][j];
      const badA = !Number.isInteger(a) || a < 0;
      const badM = !Number.isInteger(m) || m < 0;
      const over = Number.isInteger(a) && Number.isInteger(m) && a > m;
      if (badA || over) document.querySelector(`[data-mat="alloc"][data-i="${i}"][data-j="${j}"]`).classList.add('bad');
      if (badM || over) document.querySelector(`[data-mat="max"][data-i="${i}"][data-j="${j}"]`).classList.add('bad');
    }
  const { errors } = validateSystem(s);
  $('errBox').innerHTML = errors.length
    ? `<div class="errors"><b>Datos con problemas (${errors.length}):</b><ul>${errors.map((e) => `<li>${e}</li>`).join('')}</ul></div>` : '';
  return { system: s, need };
}

/* ---------- Ejecutar seguridad ---------- */
function runSafety() {
  const { system: s } = refreshLive();
  const { errors } = validateSystem(s);
  if (errors.length) {
    setPill('', 'Datos con errores');
    $('resultBanner').className = 'state-banner';
    $('resultBanner').innerHTML = 'Hay errores en los datos. Corrígelos antes de analizar.';
    $('resultCard').classList.remove('hidden');
    return;
  }
  const need = calcNeed(s.max, s.allocation);
  const r = safetyCheck(s.available, s.allocation, need);
  state.lastResult = r;
  state.lastSys = s;
  state.stepIdx = 0;
  state.showAllSteps = false;

  const vec = (v) => `[ ${v.join(', ')} ]`;
  if (r.safe) {
    setPill('safe', 'Estado seguro');
    $('resultBanner').className = 'state-banner safe';
    $('resultBanner').innerHTML = `El sistema está en <b>estado seguro</b>: existe un orden en el que todos los procesos pueden terminar sin caer en interbloqueo. Work final: ${vec(r.finalWork)}.`;
    $('seqRow').innerHTML = r.sequence.map((p, k) =>
      `${k > 0 ? '<span class="arrow">→</span>' : ''}<span class="chip">P${p}</span>`).join('');
  } else {
    setPill('unsafe', 'Estado inseguro');
    $('resultBanner').className = 'state-banner unsafe';
    $('resultBanner').innerHTML = `El sistema está en <b>estado inseguro</b>: no existe ningún orden que permita que todos los procesos terminen, y Work queda en ${vec(r.finalWork)}.`;
    $('seqRow').innerHTML = '';
  }
  // fila roja para procesos que no pueden terminar (rúbrica: estado inseguro)
  document.querySelectorAll('table.matrix tr').forEach((tr) => tr.classList.remove('rowbad'));
  r.unfinished.forEach((i) =>
    document.querySelectorAll(`[data-mat="alloc"][data-i="${i}"], [data-mat="max"][data-i="${i}"], [data-mat="need"][data-i="${i}"]`)
      .forEach((el) => el.closest('tr').classList.add('rowbad')));
  paintNeedCells(r);
  renderSteps();
  $('resultCard').classList.remove('hidden');
}

/* ---------- Copiar análisis al portapapeles ---------- */
function buildReport() {
  const r = state.lastResult;
  if (!r) return '';
  const s = state.lastSys;
  const vec = (v) => `[ ${v.join(', ')} ]`;
  const L = [];
  L.push('ANÁLISIS — ALGORITMO DEL BANQUERO');
  L.push(`Fecha: ${new Date().toLocaleString('es-GT')}`);
  L.push(`N = ${s.N} procesos, M = ${s.M} recursos`);
  L.push(`Available: ${vec(s.available)}`);
  L.push('');
  L.push('P  | Allocation | Max        | Need');
  s.allocation.forEach((row, i) =>
    L.push(`P${i} | ${vec(row).padEnd(10)} | ${vec(s.max[i]).padEnd(10)} | ${vec(calcNeed(s.max, s.allocation)[i])}`));
  L.push('');
  if (r.safe) L.push(`ESTADO: SEGURO — secuencia ${r.sequence.map((i) => 'P' + i).join(' → ')}`);
  else L.push(`ESTADO: INSEGURO — procesos bloqueados: ${r.unfinished.map((i) => 'P' + i).join(', ')}`);
  L.push(`Work final: ${vec(r.finalWork)}`);
  L.push('');
  L.push('Pasos del algoritmo:');
  r.steps.forEach((st, k) =>
    L.push(` ${k + 1}. P${st.candidate} ${st.granted ? 'puede terminar: Work ' + vec(st.workBefore) + ' → ' + vec(st.workAfter) : 'espera: Need ' + vec(st.need) + ' > Work ' + vec(st.workBefore) + ' (en algún recurso)'}`));
  return L.join('\n');
}
function copyReport() {
  if (!state.lastResult) return;
  const txt = buildReport();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(
      () => $('btnCopy').textContent = '¡Copiado!',
      () => fallbackCopy(txt));
  } else fallbackCopy(txt);
}
function fallbackCopy(txt) {
  const ta = document.createElement('textarea');
  ta.value = txt;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); $('btnCopy').textContent = '¡Copiado!'; } catch { alert(txt); }
  document.body.removeChild(ta);
}

/* ---------- Semaforización de la condición Need <= Work ---------- */
/* Cada celda de Need se pinta verde/roja según la última evaluación de ese
   proceso en el log: verde si cumplía la condición, rojo en el recurso faltante. */
function paintNeedCells(r) {
  const lastEval = {};
  r.steps.forEach((st) => { lastEval[st.candidate] = st; });
  for (const pidStr of Object.keys(lastEval)) {
    const i = Number(pidStr), st = lastEval[i];
    for (let j = 0; j < st.need.length; j++) {
      const el = $(`need-${i}-${j}`);
      if (!el) continue;
      el.classList.remove('cellok', 'cellbad');
      el.classList.add(st.need[j] <= st.workBefore[j] ? 'cellok' : 'cellbad');
    }
  }
}

/* ---------- Paso a paso interactivo ---------- */
function renderSteps() {
  const r = state.lastResult;
  if (!r) return;
  const vec = (v) => `[ ${v.join(', ')} ]`;
  const upto = state.showAllSteps ? r.steps.length - 1 : Math.min(state.stepIdx, r.steps.length - 1);
  $('stepsBox').innerHTML = r.steps.slice(0, upto + 1).map((st) =>
    `<div class="step ${st.granted ? 'yes' : 'no'}" data-p="${st.candidate}"><span class="tag">${st.granted ? 'P' + st.candidate + ' puede terminar' : 'P' + st.candidate + ' no puede terminar aún'}</span>
     <span class="mono">Need[P${st.candidate}] = ${vec(st.need)} · Work = ${vec(st.workBefore)}${st.granted ? ' → ' + vec(st.workAfter) : ''}</span></div>`
  ).join('');
  if (staleRow) { staleRow.classList.remove('hl'); staleRow = null; }
  const cur = $('stepsBox').children[upto];
  if (cur && !state.showAllSteps) { // resaltar la fila del paso actual
    staleRow = document.querySelector(`[data-mat="alloc"][data-i="${cur.dataset.p}"][data-j="0"]`);
    if (staleRow) staleRow = staleRow.closest('tr');
    if (staleRow) staleRow.classList.add('hl');
  }
  $('stepCount').textContent = `Paso ${upto + 1} de ${r.steps.length}`;
  $('btnNext').disabled = state.showAllSteps || upto >= r.steps.length - 1;
}

function setPill(kind, text) {
  $('statusPill').className = 'status-pill' + (kind ? ' ' + kind : '');
  $('statusText').textContent = text;
}

/* ---------- Request ---------- */
function runRequest() {
  const { system: s } = refreshLive();
  const { errors } = validateSystem(s);
  const box = $('verdictBox');
  if (errors.length) {
    box.innerHTML = `<div class="verdict invalida">Corrige los errores de validación primero.</div>`;
    return;
  }
  const pid = parseInt($('reqPid').value, 10);
  const req = [];
  for (let j = 0; j < s.M; j++) req.push(numVal($(`req-${j}`)));
  if (req.some((v) => !Number.isInteger(v) || v < 0)) {
    box.innerHTML = `<div class="verdict invalida">El vector Request no es válido: usa enteros mayores o iguales a 0.</div>`;
    return;
  }
  const need = calcNeed(s.max, s.allocation);
  const out = requestCheck(s.available, s.allocation, need, pid, req);
  const cls = out.verdict === 'concedida' ? 'concedida' : out.verdict === 'invalida' ? 'invalida' : 'denegada';
  box.innerHTML = `<div class="verdict ${cls}"><b>P${pid} solicita [ ${req.join(', ')} ]</b> → ${out.msg}</div>`;
  state.pendingGrant = out.verdict === 'concedida' ? out.next : null;
  $('btnApplyReq').disabled = !state.pendingGrant;
}

function applyGrant() {
  if (!state.pendingGrant) return;
  const g = state.pendingGrant;
  for (let i = 0; i < state.N; i++)
    for (let j = 0; j < state.M; j++) {
      document.querySelector(`[data-mat="alloc"][data-i="${i}"][data-j="${j}"]`).value = g.allocation[i][j];
    }
  for (let j = 0; j < state.M; j++) $(`avail-${j}`).value = g.available[j];
  state.pendingGrant = null;
  $('btnApplyReq').disabled = true;
  refreshLive();
  saveState();
  runSafety();
}

/* ---------- Escenarios ---------- */
const SCN_SAFE = {
  available: [3, 3, 2],
  max: [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]],
  alloc: [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]],
};
const SCN_UNSAFE = {
  available: [2, 0, 0],
  max: [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]],
  alloc: [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]],
};
function loadScenario(scn, N, M, names) {
  $('inN').value = N; $('inM').value = M; $('inNames').value = names;
  buildTables(scn);
  saveState();
  runSafety();
}

/* ---------- Import / Export ---------- */
function exportJSON() {
  const { system: s } = refreshLive();
  const blob = new Blob([JSON.stringify({ N: s.N, M: s.M, resources: state.names, available: s.available, max: s.max, allocation: s.allocation }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'escenario_banquero.json';
  a.click();
  URL.revokeObjectURL(a.href);
}
function importJSON(file) {
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const d = JSON.parse(rd.result);
      $('inN').value = d.N ?? d.n ?? 5;
      $('inM').value = d.M ?? d.m ?? 3;
      $('inNames').value = (d.resources || ['A', 'B', 'C']).join(',');
      buildTables({ available: d.available, max: d.max, alloc: d.allocation });
      saveState();
      runSafety();
    } catch { alert('Archivo JSON inválido.'); }
  };
  rd.readAsText(file);
}

/* ---------- Tema (por defecto: cyber oscuro; alterna a claro) ---------- */
function initTheme() {
  const saved = localStorage.getItem('banker-theme');
  setTheme(saved !== 'light', false); // oscuro salvo preferencia guardada en claro; sin animación al arrancar
}
function setTheme(dark, animate = true) {
  if (animate) document.body.classList.add('transition-theme'); // activar crossfade
  if (dark) delete document.body.dataset.theme;
  else document.body.dataset.theme = 'light';
  $('btnTheme').textContent = dark ? 'Modo claro' : 'Modo cyber';
  localStorage.setItem('banker-theme', dark ? 'dark' : 'light');
}

/* ---------- Resaltar la fila del paso revisado ---------- */
function initStepHighlight() {
  let lastRow = null;
  $('stepsBox').addEventListener('mouseover', (e) => {
    const st = e.target.closest('.step');
    if (!st) return;
    if (lastRow) lastRow.classList.remove('hl');
    lastRow = document.querySelector(`[data-mat="alloc"][data-i="${st.dataset.p}"][data-j="0"]`)
      && document.querySelector(`[data-mat="alloc"][data-i="${st.dataset.p}"][data-j="0"]`).closest('tr');
    if (lastRow) lastRow.classList.add('hl');
  });
  $('stepsBox').addEventListener('mouseleave', () => {
    if (lastRow) { lastRow.classList.remove('hl'); lastRow = null; }
  });
}

/* ---------- Drag & drop de JSON ---------- */
function initDragDrop() {
  document.body.addEventListener('dragover', (e) => e.preventDefault());
  document.body.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.json')) importJSON(f);
  });
}

/* ---------- Atajo de teclado ---------- */
function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runSafety(); }
  });
}

/* ---------- Wiring ---------- */
$('btnTheme').onclick = () => setTheme(document.body.dataset.theme === 'light');
initTheme();
initStepHighlight();
initDragDrop();
initShortcuts();
$('btnResize').onclick = () => {
  const s = readSystem(); // preservar lo escrito antes de regenerar
  buildTables({ available: s.available, max: s.max, alloc: s.allocation });
  saveState();
};
$('btnRun').onclick = runSafety;
$('btnNext').onclick = () => { state.showAllSteps = false; state.stepIdx = Math.min(state.stepIdx + 1, state.lastResult.steps.length - 1); renderSteps(); };
$('btnAll').onclick = () => { state.showAllSteps = true; renderSteps(); };
$('btnCopy').onclick = copyReport;
$('btnSafe').onclick = () => loadScenario(SCN_SAFE, 5, 3, 'A,B,C');
$('btnUnsafe').onclick = () => loadScenario(SCN_UNSAFE, 5, 3, 'A,B,C');
$('btnRequest').onclick = runRequest;
$('btnApplyReq').onclick = applyGrant;
$('btnExport').onclick = exportJSON;
$('btnImport').onclick = () => $('fileImport').click();
$('fileImport').onchange = (e) => e.target.files[0] && importJSON(e.target.files[0]);
$('inN').onchange = () => $('btnResize').click();
$('inM').onchange = () => $('btnResize').click();

const saved = loadSavedState(); // restaura la última sesión si existe
buildTables(saved ? { available: saved.available, max: saved.max, alloc: saved.allocation } : SCN_SAFE);
if (saved) {
  $('inN').value = saved.N; $('inM').value = saved.M;
  $('inNames').value = (saved.names || saved.resources || ['A', 'B', 'C']).join(',');
}
refreshLive();
