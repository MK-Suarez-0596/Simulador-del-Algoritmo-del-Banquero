#!/usr/bin/env python3
"""Simulador del Algoritmo del Banquero (CLI) — UMG Sistemas Operativos.

Replica la misma lógica que banker.js para defensa y pruebas por consola.
Sin dependencias: solo biblioteca estándar.

Uso:
    python3 banker.py --ejemplo seguro        # caso clásico seguro
    python3 banker.py --ejemplo inseguro      # mismo sistema, sin recursos
    python3 banker.py --archivo casos/caso_seguro.json
    python3 banker.py --archivo casos/caso_seguro.json --request 1:1,0,2
    python3 banker.py --test                  # autotests
"""
import argparse, json, sys
from copy import deepcopy


def calc_need(mx, alloc):
    return [[mx[i][j] - alloc[i][j] for j in range(len(mx[0]))] for i in range(len(mx))]


def leq(a, b):
    return all(x <= y for x, y in zip(a, b))


def safety_check(available, allocation, need):
    """Retorna (safe, sequence, steps, final_work)."""
    work = list(available)
    finish = [False] * len(allocation)
    seq, steps = [], []
    progress = True
    while progress:
        progress = False
        for i in range(len(allocation)):
            if finish[i]:
                continue
            before = list(work)
            if leq(need[i], work):
                work = [w + a for w, a in zip(work, allocation[i])]
                finish[i] = True
                seq.append(i)
                progress = True
                steps.append((i, True, before, list(work), list(need[i])))
            else:
                steps.append((i, False, before, before, list(need[i])))
    return all(finish), seq, steps, work


def validate(n, m, avail, mx, alloc):
    errs = []
    if not (1 <= n <= 12): errs.append("N debe estar entre 1 y 12.")
    if not (1 <= m <= 6): errs.append("M debe estar entre 1 y 6.")
    if len(avail) != m or any(not isinstance(v, int) or v < 0 for v in avail):
        errs.append("Available: M enteros >= 0.")
    for name, mat in (("Max", mx), ("Allocation", alloc)):
        if len(mat) != n or any(len(r) != m or any(not isinstance(v, int) or v < 0 for v in r) for r in mat):
            errs.append(f"{name}: matriz {n}x{m} con enteros >= 0.")
    if not errs:
        for i in range(n):
            for j in range(m):
                if alloc[i][j] > mx[i][j]:
                    errs.append(f"Allocation[P{i}][R{j}]={alloc[i][j]} supera a Max={mx[i][j]}.")
    return errs


def request_check(available, allocation, need, pid, req):
    m = len(available)
    if any(r > n for r, n in zip(req, need[pid])):
        return "excede-max", "Excede su Need (demanda máxima).", None
    if any(r > a for r, a in zip(req, available)):
        return "espera", "Recursos insuficientes: el proceso debe esperar.", None
    av2 = [a - r for a, r in zip(available, req)]
    al2 = deepcopy(allocation); al2[pid] = [a + r for a, r in zip(al2[pid], req)]
    nd2 = deepcopy(need); nd2[pid] = [n - r for n, r in zip(nd2[pid], req)]
    safe, seq, steps, w = safety_check(av2, al2, nd2)
    if safe:
        return "concedida", f"Secuencia: {' → '.join(f'P{i}' for i in seq)}", (av2, al2, nd2, seq)
    return "denegada", "Llevaría a estado inseguro: se deniega y revierte.", None


EJEMPLOS = {
    "seguro": {
        "N": 5, "M": 3, "available": [3, 3, 2],
        "allocation": [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]],
        "max": [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]],
    },
    "inseguro": {
        "N": 5, "M": 3, "available": [2, 0, 0],
        "allocation": [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]],
        "max": [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]],
    },
}


def mostrar(d, detalle=True):
    n, m, av, al, mx = d["N"], d["M"], d["available"], d["allocation"], d["max"]
    errs = validate(n, m, av, mx, al)
    if errs:
        print("Errores de validación:"); [print(" -", e) for e in errs]; return 1
    need = calc_need(mx, al)
    print(f"N={n}  M={m}  Available={av}\nNeed = Max - Allocation:")
    for i in range(n):
        print(f"  P{i}: Need={need[i]}  Alloc={al[i]}  Max={mx[i]}")
    safe, seq, steps, w = safety_check(av, al, need)
    print("\nESTADO SEGURO" if safe else "\nESTADO INSEGURO (posible deadlock)")
    if safe:
        print("Secuencia segura:", " → ".join(f"P{i}" for i in seq))
    print(f"Work final: {w}")
    if detalle:
        print("\nPaso a paso:")
        for i, ok, before, after, nd in steps:
            tag = "termina" if ok else "espera  "
            print(f"  P{i} [{tag}] Need={nd} Work={before}" + (f" → {after}" if ok else ""))
    return 0 if safe else 2


def autotests():
    s = EJEMPLOS["seguro"]
    need = calc_need(s["max"], s["allocation"])
    safe, seq, _, _ = safety_check(s["available"], s["allocation"], need)
    assert safe and seq == [1, 3, 4, 0, 2], f"seguro falló: {seq}"
    u = EJEMPLOS["inseguro"]
    needu = calc_need(u["max"], u["allocation"])
    safe2, _, _, _ = safety_check(u["available"], u["allocation"], needu)
    assert not safe2, "inseguro debió dar inseguro"
    v, _, _ = request_check(s["available"], s["allocation"], need, 1, [1, 0, 2])
    assert v == "concedida", f"request válido falló: {v}"
    v2, _, _ = request_check(s["available"], s["allocation"], need, 0, [4, 0, 0])
    assert v2 == "espera", f"request sin recursos falló: {v2}"
    v3, _, _ = request_check(s["available"], s["allocation"], need, 0, [0, 5, 0])
    assert v3 == "excede-max", f"request > need falló: {v3}"
    print("Todos los autotests PASARON (4/4).")


def main():
    ap = argparse.ArgumentParser(description="Simulador del Algoritmo del Banquero (CLI)")
    ap.add_argument("--ejemplo", choices=["seguro", "inseguro"])
    ap.add_argument("--archivo", help="JSON con N,M,available,allocation,max")
    ap.add_argument("--request", help="Pid:valores  ej. 1:1,0,2")
    ap.add_argument("--test", action="store_true")
    a = ap.parse_args()
    if a.test:
        autotests(); return
    d = EJEMPLOS.get(a.ejemplo or "seguro")
    if a.archivo:
        with open(a.archivo, encoding="utf-8") as f:
            j = json.load(f)
        d = {"N": j.get("N", j.get("n")), "M": j.get("M", j.get("m")),
             "available": j["available"], "allocation": j["allocation"], "max": j["max"]}
    rc = mostrar(d)
    if a.request:
        pid_s, vals = a.request.split(":")
        pid, req = int(pid_s), [int(x) for x in vals.split(",")]
        need = calc_need(d["max"], d["allocation"])
        v, msg, _ = request_check(d["available"], d["allocation"], need, pid, req)
        print(f"\nRequest P{pid} {req}: [{v}] {msg}")
    sys.exit(rc)


if __name__ == "__main__":
    main()
