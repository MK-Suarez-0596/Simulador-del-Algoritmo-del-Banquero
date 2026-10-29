# Documentación técnica — Simulador del Algoritmo del Banquero

Referencia interna para leer, modificar o defender el código. Complementa el [INFORME.md](INFORME.md) (narrativa académica) y el [MANUAL_USUARIO.md](MANUAL_USUARIO.md) (uso).

---

## 1. Arquitectura

```
┌──────────────────────────── index.html ────────────────────────────┐
│  <style> (styles.css)          <script> (banker.js)   <script> (app.js)  │
│  presentación                   NÚCLEO (sin DOM)        VISTA                         │
└───────────────────────────────────────────────────────────────────────┘
                                                        ┌────────────────┐
casos/*.json ── load/import ──→ app.js ──datos limpios──→│  banker.js     │
                                                        │  (funciones puras) │
banker.py: implementación espejo en Python (CLI + autotests)          └────────────────┘
```

Regla de oro: **la lógica no conoce el DOM** (se puede probar con Node o con Python) y **la vista no decide resultados** (solo valida el ingreso, llama al núcleo y pinta).

Doble encarnación del mismo algoritmo:
- `banker.js` — navegador (y Node, vía `module.exports`).
- `banker.py` — Python estándar; misma firma/semántica, sirve como verificación cruzada y autotest automático.

## 2. Referencia del núcleo (`banker.js`)

Todas son funciones puras: sin estado global, sin efectos, devuelven estructuras nuevas.

### `calcNeed(max, alloc) → number[]`
```text
need[i][j] = max[i][j] - allocation[i][j]
```
La Need nunca se ingresa: se deduce, garantizando coherencia con las dos entradas.

### `leq(a, b) → boolean`
Comparación vectorial: `true` iff a[j] ≤ b[j] para todo j. Es exactamente la condición del safety algorithm: `Need[i] ≤ Work`.

### `safetyCheck(available, allocation, need) → SafetyResult`
```text
SafetyResult = {
  safe: boolean        // todos terminaron
  sequence: number[]   // orden de finalización de los procesos
  steps: [{ iter, candidate, need: M ints, workBefore: M ints,
            granted: boolean, workAfter: M ints, reason: string }]
  finalWork: M ints, unfinished: int[]
}
```
Algoritmo: Work ← Available; repetir vueltas sobre procesos con `Finish=false`; si `leq(need[i], work)` → el proceso termina (Work += Allocation[i], Finish=true, push a secuencia, `granted=true`); si no, registrar con `granted=false` (no modifica Work). Termina cuando una vuelta completa no libera a nadie. Cada evaluación genera un `step` con la **razón** en texto (qué recurso faltaba y cuánto); ese log alimenta el paso a paso de la UI y el reporte de "Copiar análisis".

### `requestCheck(available, allocation, need, pid, req) → RequestResult`
```text
verdict: 'excede-max' | 'espera' | 'concedida' | 'denegada' | 'invalida'
```
Orden de verificación: Request > Need → `excede-max` · Request > Available → `espera` · concesión tentativa + `safetyCheck` → `concedida` (devuelve `next` con el nuevo estado) o `denegada`. La vista nunca modifica el estado real; lo hace solo si el usuario presiona *Aplicar concesión* y solo cuando el veredicto fue concesión.

### `validateSystem({N, M, available, max, allocation}) → {errors, warnings}`
Reglas del enunciado: elementos enteros y en rango (`N: 1..12`, `M: 1..6`, valores 0..999), dimensiones exactas y **Allocation ≤ Max** celda a celda. Los errores llegan pre-formateados listos para mostrar ("Allocation[P2][R1]=3 supera a Max=2").

## 3. Capa de vista (`app.js`)

| Pieza | Responsabilidad |
|---|---|
| `buildTables(preset)` | Renderiza tablas de Allocation, Max (editables) y Need (readonly, `data-mat="need"`), Available, vector Request y selector de P. Acepta `preset` para precargar escenarios. |
| `readSystem()` | Recolecta inputs → `{N, M, allocation, max, available}` (ints NaN invalid). |
| `refreshLive()` | Revalidada en cada tecla: recalcula Need, limpia/pinta invalididas (celda `.bad`), semáforo fuera, lista de errores, y `saveState()`. |
| `runSafety()` | Valida → `calcNeed` + `safetyCheck` → pinta banner, secuencia, semaforiza Need (`paintNeedCells`, contra el workBefore observado en cada proceso), marca filas `.rowbad` de los bloqueados, restablece el stepper y renderiza el primer paso. |
| `renderSteps()` / `btnNext`, `btnAll` | Avanza el log un paso a la vez resaltando la fila del proceso; *Ver todos* las muestra todas. |
| `runRequest()` / `applyGrant()` | Verificación del request sin tocar el estado; aplicar el nuevo estado (solo si fue concedida) y volver a ejecutar el análisis. |
| `exportJSON` / `importJSON` / drag&drop | Escenarios a/desde archivo. |
| `saveState` / `loadSavedState` | Autoguardado en `localStorage['banker-state']` (incluye N, M y nombres). Un almacenamiento no disponible no es fatal. |
| `setTheme(dark, animate)` | Alterna cyber/claro; al abrir sin animación, en clicks con crossfade (ver §6). |

## 4. Formato de escenarios (JSON)

```json
{
  "N": 3,
  "M": 2,
  "resources": ["A", "B"],      // opcional
  "available": [2, 1],
  "max": [[3,2],[4,2],[2,2]],
  "allocation": [[1,1],[2,1],[1,0]]
}
```

- `N`/`M`: claves mayúsculas (acepta también `n`/`m` por compatibilidad al importar).
- `max` y `allocation`: N arreglos de M enteros.
- Reglas equivalentes a las de la UI (validateSystem) al aplicar; los archivos en `casos/` cumplen de sobra.

## 5. Estado interno y persistencia

| Claves en `localStorage` | contenido |
|---|---|
| `banker-state` | último escenario (N, M, nombres, available, max, allocation) |
| `banker-theme` | `'dark'` (cyber, default) or `'light'` |

Nada viaja a un servidor: todo local. El borrado de datos del navegador solo afecta esas claves.

## 6. Temas y transición

- `:root` define la paleta cyber (por defecto, cuerpo sin atributo).
- `body[data-theme="light"]` redefine esas mismas variables (más overrides sobrios).
- `body::before` dibuja las capas de fondo cyber (halos + malla); en modo claro su opacidad baja a 0 con transición, permitiendo el crossfade (los gradientes no interpolables se desvanecen por separado).
- La clase `transition-theme` (agregada por `setTheme(…, animate=true)`) activa transición global de color/borde/sombra/opacity; en el arranque se respeta `animate=false` para evitar parpadeos.

## 7. Modificar y re-construir

```bash
# Editar fuente
editor: styles.css, banker.js, app.js
# Regenerar la copia incrustada en index.html
python3 - <<'EOF'
import re
h = open('index.html', encoding='utf-8').read()
css, ajs, bjs = open('styles.css').read(), open('app.js').read(), open('banker.js').read()
h = re.sub(r'(?s)<style>.*?</style>', '<style>\n'+css+'\n</style>', h, count=1)
blocks = re.findall(r'(?s)<script>.*?</script>', h)
h = h.replace(blocks[0], '<script>\n'+bjs+'\n</script>').replace(blocks[1], '<script>\n'+ajs+'\n</script>')
open('index.html','w',encoding='utf-8').write(h)
EOF
# Verificación
node --check app.js && python3 banker.py --test
```

## 8. Convenciones de código

- Español en UI y mensajes; identificadores en inglés estándar (`need`, `work`, `finish` — son los terms de la teoría).
- Comentarios explican *por qué* en cada decisión, no *qué*: las funciones del núcleo usan los términos de la teoría (Work, Finish, leq).
- Errores siempre como listas nombradas; ningún `alert()` para validación (solo para un archivo JSON que no carga, que es un evento externo).
- El núcleo no lanza excepciones esperadas: devuelve veredictos con nombre (`verdict`) — hace trivial el test y el uso desde CLI.
