# Informe técnico — Simulador del Algoritmo del Banquero

**Curso:** Sistemas Operativos · **Universidad Mariano Gálvez de Guatemala**
**Entrega:** código fuente + informe + defensa oral.

## 1. Descripción de la solución

Programa que resuelve el Algoritmo del Banquero: dado N, M, `Allocation`,
`Max` y `Available`, calcula `Need = Max − Allocation` y aplica el
**algoritmo de seguridad** (vectores `Work` y `Finish`) para decidir si el
sistema está en estado seguro y, de serlo, entregar la **secuencia segura**.
Además simula **solicitudes de recursos (Request)** con concesión tentativa
verificada por el mismo algoritmo.

Se implementó dos veces con la misma lógica para cubrir todos los frentes:
- **Web app** (`index.html` + `styles.css` + `banker.js` + `app.js`): interfaz
  principal para la defensa. Tablas editables, validación en vivo, Need
  automática, resultado visual, paso a paso, Request, escenarios precargados
  e import/export JSON. Cero dependencias, funciona offline con doble clic.
- **CLI** (`banker.py`): equivalente en Python 3 estándar para demostrar el
  algoritmo por consola y correr autotests (`--test`).

## 2. Tecnología utilizada

HTML5 + CSS3 + JavaScript vanilla (sin frameworks ni CDN) y Python 3
(solo biblioteca estándar). Criterio: portabilidad total — el docente puede
abrir `index.html` en cualquier equipo sin instalar nada, y el CLI corre en
cualquier Linux con Python.

## 3. Instalación / ejecución

No requiere instalación.

```bash
# Web (opción A): doble clic en index.html
# Web (opción B, recomendada):
cd "/home/mk/Documents/Program/SO/Simulador_del_algoritmo_del_banquero"
python3 -m http.server 8000
# → http://localhost:8000

# CLI:
python3 banker.py --ejemplo seguro
python3 banker.py --archivo casos/caso_seguro.json --request 1:1,0,2
python3 banker.py --test
```

## 4. Diseño del algoritmo implementado

**Seguridad** (`safetyCheck` en `banker.js:38`, `safety_check` en `banker.py`):
`Work = Available`, `Finish = [false]*N`; buscar repetidamente un `Pi` con
`Finish[i]=false` y `Need[i] ≤ Work`; si existe, `Work += Allocation[i]`,
`Finish[i]=true`, agregar a la secuencia; si en una vuelta completa nadie
avanza, terminar. Seguro ⟺ todos `Finish=true`. Cada evaluación se registra
(`steps[]`) para el modo paso a paso.

**Solicitud** (`requestCheck`): ① si `Request > Need` → error (excede el máximo
declarado); ② si `Request > Available` → el proceso espera; ③ concesión
tentativa (`Available−=Req`, `Allocation+=Req`, `Need−=Req`) + `safetyCheck`:
si es seguro se concede, si no se deniega y se revierte.

**Validación** (`validateSystem`): enteros ≥ 0 (máx 999), dimensiones N×M /
M, y `Allocation ≤ Max` celda por celda; N 1–12, M 1–6.

## 5. Casos de prueba

### Caso 1 — Estado SEGURO (clásico Silberschatz, `casos/caso_seguro.json`)

N=5, M=3, Available=[3,3,2].
Allocation=[[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]],
Max=[[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]] →
Need=[[7,4,3],[1,2,2],[6,0,0],[0,1,1],[4,3,1]].

**Resultado obtenido:** estado SEGURO, secuencia **P1 → P3 → P4 → P0 → P2**,
Work final [10,5,7]. Traza: P1 (Need [1,2,2] ≤ [3,3,2], Work→[5,3,2]) →
P3 ([0,1,1] ≤ [5,3,2], Work→[7,4,3]) → P4 → P0 → P2. Verificado en web y CLI.

### Caso 2 — Estado INSEGURO (`casos/caso_inseguro.json`)

Mismo sistema con Available=[2,0,0].
**Resultado obtenido:** estado INSEGURO. Ningún `Need[i] ≤ [2,0,0]`
(P3, el más cercano, pide [0,1,1]); cero procesos completados, Work final
[2,0,0]. El programa lista los 5 procesos como bloqueados (posible deadlock).

### Caso 3 — Request (sobre el caso 1)

- `P1 solicita [1,0,2]`: Request ≤ Need [1,2,2], ≤ Available [3,3,2],
  estado tentativo seguro → **concedida**, nueva secuencia P1 → P3 → P4 → P0 → P2.
- `P0 solicita [0,5,0]`: excede Need [7,4,3] en B → **error**.
- `P0 solicita [4,0,0]`: dentro de Need pero pide 4 de A con solo 3 libres
  → **debe esperar**.

Los tres comportamientos fueron verificados con `python3 banker.py --test`
(4/4 autotests) y en la interfaz web.

## 6. Manual de usuario (resumen)

Ver `README.md`. Flujo: configurar N/M → editar Allocation/Max/Available →
ejecutar el análisis → leer estado, secuencia y paso a paso → simular
Request → exportar/importar escenarios JSON sin reiniciar.
exportar/importar escenarios JSON sin reiniciar.

## 7. Rúbrica (auto-verificación)

1. Ingreso + validación (2 pts) — hecho. 2. Need (1.5) — hecho. 3. Seguridad con
Work/Finish/Need≤Work (3) — hecho. 4. Estado seguro/inseguro (1.5) — hecho.
5. Secuencia segura (2) — hecho. 6. Código organizado, comentado, con manejo de
errores (1.5) — hecho. 7. Informe + casos (1) — este documento. 8. Defensa:
algoritmo trazable a mano con `caso_mini.json` (3×2, P0→P1→P2).
