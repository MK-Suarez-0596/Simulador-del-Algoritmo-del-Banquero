/* ============================================================
 * banker.js — Núcleo del Algoritmo del Banquero (Dijkstra, 1965)
 * Sin dependencias. Lógica pura, testeable y reutilizable.
 * Estructuras (N procesos, M recursos):
 *   Available [M], Max [N×M], Allocation [N×M], Need = Max − Allocation
 * ============================================================ */
'use strict';

/**
 * Calcula Need = Max − Allocation.
 * @param {number[][]} max
 * @param {number[][]} alloc
 * @returns {number[][]}
 */
function calcNeed(max, alloc) {
  return max.map((row, i) => row.map((v, j) => v - alloc[i][j]));
}

/** true si a[i] <= b[i] para todo i (Need[i] <= Work). */
function leq(a, b) {
  for (let j = 0; j < a.length; j++) if (a[j] > b[j]) return false;
  return true;
}

const vecAdd = (a, b) => a.map((v, j) => v + b[j]);
const vecSub = (a, b) => a.map((v, j) => v - b[j]);

/**
 * Algoritmo de seguridad (Safety Algorithm, Silberschatz §8.5).
 * @returns {{
 *   safe: boolean, sequence: number[], workTrace: number[][],
 *   finishTrace: boolean[][], steps: object[], finalWork: number[], unfinished: number[]
 * }}
 * steps[] contiene un registro por iteración para el modo "paso a paso":
 *   { iter, candidate, need, workBefore, granted, workAfter, reason }
 */
function safetyCheck(available, allocation, need) {
  const N = allocation.length, M = available.length;
  const work = [...available];
  const finish = new Array(N).fill(false);
  const sequence = [];
  const workTrace = [[...work]];
  const finishTrace = [[...finish]];
  const steps = [];
  let iter = 0;
  let progress = true;

  while (progress) {
    progress = false;
    iter++;
    for (let i = 0; i < N; i++) {
      if (finish[i]) continue;
      const ok = leq(need[i], work);
      const before = [...work];
      if (ok) {
        for (let j = 0; j < M; j++) work[j] += allocation[i][j];
        finish[i] = true;
        sequence.push(i);
        progress = true;
        steps.push({
          iter, candidate: i, need: [...need[i]], workBefore: before,
          granted: true, workAfter: [...work],
          reason: `Need[P${i}] ≤ Work → se ejecuta, libera Allocation[P${i}] y Work crece.`,
        });
      } else {
        const lacking = need[i]
          .map((v, j) => (v > work[j] ? `R${j} (pide ${v}, hay ${work[j]})` : null))
          .filter(Boolean)
          .join(', ');
        steps.push({
          iter, candidate: i, need: [...need[i]], workBefore: before,
          granted: false, workAfter: before,
          reason: `Need[P${i}] > Work — insuficiente: ${lacking}. Se omite en esta vuelta.`,
        });
      }
    }
  }

  const safe = finish.every(Boolean);
  return {
    safe, sequence,
    workTrace, finishTrace, steps,
    finalWork: [...work],
    unfinished: finish.map((f, i) => (!f ? i : -1)).filter((i) => i >= 0),
  };
}

/**
 * Valida el estado del sistema antes de ejecutar el algoritmo.
 * @returns {{ errors: string[], warnings: string[] }}
 */
function validateSystem({ N, M, available, max, allocation }) {
  const errors = [], warnings = [];
  if (!Number.isInteger(N) || N < 1 || N > 12) errors.push('N debe ser entero entre 1 y 12.');
  if (!Number.isInteger(M) || M < 1 || M > 6) errors.push('M debe ser entero entre 1 y 6.');
  if (errors.length) return { errors, warnings };

  const isBad = (v) => !Number.isInteger(v) || v < 0 || v > 999;
  if (available.length !== M || available.some(isBad))
    errors.push('Available: debe tener M enteros ≥ 0 (máx 999).');
  const checkMat = (mat, name) => {
    if (mat.length !== N || mat.some((r) => r.length !== M || r.some(isBad)))
      errors.push(`${name}: matriz ${N}×${M} con enteros ≥ 0.`);
  };
  checkMat(max, 'Max');
  checkMat(allocation, 'Allocation');
  if (errors.length) return { errors, warnings };

  for (let i = 0; i < N; i++)
    for (let j = 0; j < M; j++)
      if (allocation[i][j] > max[i][j])
        errors.push(`Allocation[P${i}][R${j}] = ${allocation[i][j]} supera a Max = ${max[i][j]}.`);
  return { errors, warnings };
}

/**
 * Algoritmo de solicitud (Request / Resource-Request, Silberschatz §8.5.3).
 * Simula la concesión tentativa y verifica seguridad.
 * @param {number} pid índice del proceso
 * @param {number[]} req vector solicitud
 */
function requestCheck(available, allocation, need, pid, req) {
  const M = available.length;
  if (req.length !== M) return { verdict: 'invalida', msg: 'La solicitud debe tener M valores.' };
  if (req.some((v) => !Number.isInteger(v) || v < 0))
    return { verdict: 'invalida', msg: 'La solicitud solo admite enteros ≥ 0.' };
  if (req.every((v) => v === 0))
    return { verdict: 'invalida', msg: 'Solicitud vacía: pide al menos 1 recurso.' };
  for (let j = 0; j < M; j++)
    if (req[j] > need[pid][j])
      return {
        verdict: 'excede-max',
        msg: `P${pid} pide ${req[j]} de R${j} pero su Need es ${need[pid][j]}. Error: excede su demanda máxima.`,
      };
  for (let j = 0; j < M; j++)
    if (req[j] > available[j])
      return {
        verdict: 'espera',
        msg: `Recursos insuficientes: pide ${req[j]} de R${j}, hay ${available[j]}. P${pid} debe esperar.`,
      };

  // Concesión tentativa
  const avail2 = vecSub(available, req);
  const alloc2 = allocation.map((r, i) => (i === pid ? vecAdd(r, req) : [...r]));
  const need2 = need.map((r, i) => (i === pid ? vecSub(r, req) : [...r]));
  const res = safetyCheck(avail2, alloc2, need2);
  if (res.safe)
    return {
      verdict: 'concedida', msg: `Solicitud concedida de forma segura. Nueva secuencia: ${fmtSeq(res.sequence)}.`,
      result: res, next: { available: avail2, allocation: alloc2, need: need2 },
    };
  return {
    verdict: 'denegada',
    msg: `Solicitud denegada: el estado resultante sería inseguro (riesgo de interbloqueo). P${pid} debe esperar; la concesión tentativa se descarta.`,
    result: res,
  };
}

/** "P1 → P3 → P4 → P0 → P2" */
function fmtSeq(seq) {
  return seq.map((i) => `P${i}`).join(' → ');
}

// Export para Node (CLI / tests) sin romper el navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calcNeed, leq, safetyCheck, validateSystem, requestCheck, fmtSeq, vecAdd, vecSub };
}
