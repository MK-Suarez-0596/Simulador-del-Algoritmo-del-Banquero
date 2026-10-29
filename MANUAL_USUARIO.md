# Manual de usuario — Simulador del Algoritmo del Banquero

Guía completa para usar el simulador, desde abrirlo hasta demostrar cada regla del algoritmo.

---

## 1. Requisitos previos

Ninguno para la versión web: la interfaz (`index.html`) es un solo archivo que funciona en cualquier navegador moderno (Chrome, Firefox, Edge), incluso sin conexión ni instalación. La versión de consola (`banker.py`) necesita **Python 3.8+**.

Opcional, para servirlo en red local:

```bash
cd Simulador_del_algoritmo_del_banquero
python3 -m http.server 8000        # abrir http://localhost:8000
```

## 2. Primer arranque

Al abrir `index.html` verás la interfaz en **modo cyber** (tema de terminal en tonos azul oscuro con detalles neón). Si lo prefieres, el botón **Modo claro** en la esquina superior derecha cambia a un tema plano de documento; el cambio tiene una transición suave y tu elección queda recordada para la próxima vez.

En el borde superior también está el **indicador de estado** del sistema que estás analizando: mostrará `Sin analizar` hasta la primera ejecución, y después `Estado seguro` (verde) o `Estado inseguro` (rojo).

## 3. Preparar el sistema (bloque 1 — Datos)

1. **Procesos (N):** número de procesos del sistema, de 1 a 12.
2. **Recursos (M):** tipos de recurso, de 1 a 6 (por ejemplo: impresoras A, RAM B, unidades de disco C).
3. **Nombre de recursos:** etiquetas separadas por comas (`A,B,C`). Si escribes menos de M, los faltantes se nombran con el alfabeto.
4. Presiona **Aplicar** para regenerar las tablas con ese tamaño.

Los valores escritos **se conservan** al cambiar el tamaño: lo que cabe del escenario anterior se mantiene.

### Escenarios precargados

| Botón | Qué carga |
|---|---|
| **Caso seguro** | El ejemplo clásico del libro: 5 procesos, 3 recursos, `Available = [3,3,2]`. Sale **seguro** con secuencia `P1 → P3 → P4 → P0 → P2`. |
| **Caso inseguro** | El mismo sistema pero con `Available = [2,0,0]`. Sale **inseguro**: nadie puede completarse. |

### Guardar y cargar escenarios

- **Guardar JSON** descarga un archivo `escenario_banquero.json` con el estado actual (N, M, nombres, Available, las dos matrices).
- **Cargar JSON** abre un selector de archivos. También puedes **arrastrar** cualquier `casos/*.json` directamente sobre la página: se carga y se analiza al instante.
- **Autoguardado:** cada celda que editas se guarda automáticamente en el navegador. Si cierras la pestaña y vuelves, el escenario sigue exactamente igual.

### Validación

El simulador valida mientras escribes (no al final):

- Todos los valores deben ser **enteros ≥ 0** (máximo 999).
- **Allocation[Pᵢ][Rⱼ] no puede superar a Max[Pᵢ][Rⱼ]** — un proceso no puede estar usando más de lo que declaró como máximo.
- Las celdas con problema se pintan en **rojo** y arriba aparece la lista detallada, por ejemplo: `Allocation[P2][R1]=3 supera a Max=2`.

El algoritmo **no se ejecuta** hasta que la lista de errores quede vacía.

## 4. Las matrices (bloque 2)

Verás tres tablas y el vector de recursos libres arriba:

- **Available** — cuántas instancias hay libres de cada recurso. Es lo único “del banco”.
- **Allocation** (editable) — instancias que cada proceso ya tiene asignadas.
- **Max** (editable) — demanda máxima total que cada proceso puede llegar a pedir.
- **Need** (calculada) — `Need = Max − Allocation`. Es lo que a lo más le falta pedir a cada proceso. **No se edita**: se recalcula al instante con cada cambio en Max o Allocation.

## 5. Ejecutar el algoritmo de seguridad

Presiona **Ejecutar algoritmo de seguridad**. En el bloque 3 aparece el resultado:

- **Banner de estado:** verde con la explicación y el `Work` final si el sistema es seguro; rojo si es inseguro, indicando qué procesos quedan bloqueados (sus filas se marcan en rojo en todas las tablas).
- **Secuencia segura:** la cadena `P1 → P3 → P4 → …` en chips cian. Es el orden sugerido para atender los procesos.
- **Semáforo en Need:** cada celda de la matriz Need queda pintada con el veredicto de ese proceso: verde si al momento de evaluarlo esa condición se cumplía, roja si ese recurso era el que le faltaba. Con eso se *ve* por qué un proceso avanza o se queda.

### El paso a paso interactivo

Debajo del resultado está el **log de pasos**, controlado con dos botones:

- **Siguiente paso** — ejecuta **una** evaluación del algoritmo: resalta permanentemente la fila del proceso en la tabla Allocation y muestra `Need[Pᵢ] = [...] · Work = [ ... ] → [ ... ]` (con flecha verde si el proceso pudo terminar, gris si no). El contador indica `Paso k de N`.
- **Ver todos** — muestra el log completo de una vez (útil para comparar lecturas o capturar).

Este modo es la mejor forma de explicar el algoritmo en una presentación: se avanza con cada clic mientras se narra la condición y el efecto en Work.

### Copiar análisis

El botón **Copiar análisis** (esquina del bloque 3) pone en el portapapeles un reporte en texto con: fecha, N, M, Available, las tres matrices completa alineadas, el estado, la secuencia o los bloqueados, el Work final y todos los pasos numerados. Pegarlo en el informe (o en WhatsApp) conserva el formato.

### Atajo de teclado

`Ctrl` + `Enter` (o `Cmd` + `Enter` en Mac) ejecuta el análisis sin tocar el mouse.

## 6. Simular solicitudes de recursos (bloque 4)

Aquí se prueba el **algoritmo de solicitud** (*resource-request*):

1. Elige el proceso que va a pedir recursos.
2. Escribe cuántas instancias quiere de cada recurso (puede dejar 0).
3. Presiona **Solicitar**.

El veredicto aplica las reglas en orden:

| Situación | Veredicto |
|---|---|
| El pedido **excede su propia Need** (pide más de lo que declaró como máximo) | ❌ **Error** — el sistema lo rechaza de entrada. |
| El pedido es válido pero **excede el Available** | ⏳ **Espera** — el proceso queda en cola hasta que haya instancias. |
| Todo válido y el estado tentativo queda **seguro** | ✅ **Concedida** — se muestra la nueva secuencia que existiría. |
| Todo válido pero el estado tentativo quedaría **inseguro** | ⛔ **Denegada** — el proceso espera **y el estado real no se modifica**. |

La concesión tentativa es la esencia del algoritmo: se simula descontar los recursos, sumarlos a Allocation del proceso y restarlos de su Need, y sobre ese hipotético estado se vuelve a correr el safety algorithm. Denegar y revertir es lo que garantiza que el sistema nunca entre en riesgo de interbloqueo por esta vía.

Si la solicitud fue **concedida**, el botón **Aplicar concesión al sistema** queda habilitado: al presionarlo, el nuevo estado (Available, Allocation y Need) se escribe en las tablas y el análisis corre de nuevo. Así se demuestra en vivo que un sistema seguro, bien usado, sigue seguro.

## 7. La versión de consola (`banker.py`)

Misma lógica, salida textual, útil para verificar resultdos o para pruebas rápidas:

```bash
python3 banker.py                          # caso seguro precargado
python3 banker.py --ejemplo seguro         # idem
python3 banker.py --ejemplo inseguro       # el sistema sin recursos
python3 banker.py --archivo casos/caso_mini.json      # cualquier escenario JSON
python3 banker.py --archivo casos/caso_seguro.json --request 1:1,0,2
python3 banker.py --test                   # corre los 4 autotests
```

El código de salida (`0` / `2`) distingue estado seguro de inseguro, útil para scripting.

## 8. Recetas rápidas

- **Demostrar por qué el estado inseguro es la clave:** carga el caso seguro, ejecútalo; cambia el Available a `[2,0,0]` y ejecuta de nuevo. Mismo sistema, distinto destino. Eso *es* la diferencia entre seguro e inseguro.
- **Probar una concesión buena y una mala:** sobre el caso seguro, `P1 [1,0,2]` (concedida, aplica la concesión) y luego intenta `P0 [7,4,3]` (todo su Need; quedará inseguro → denegada).
- **Trazar a mano con el curso:** usa `casos/caso_mini.json` (3×2): las cuentas son cortas y se pueden replicar en pizarrón.
- **Reporte para el informe:** ejecutado el análisis, Copiar análisis → pega en el documento; cada corrida queda fechada.

## 9. Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| Botón de ejecutar no da resultado | Hay celdas en rojo (validación) | Corrige las celdas marcadas; la lista de errores indica cuál y por qué |
| Los escenarios no se restauran | Navegador en modo privado o borrado de datos del sitio | Vuelve a cargar el JSON que guardes con Guardar |
| El archivo JSON no carga | Formato distinto | Debe tener `N`, `M`, `available`, `allocation`, `max` (ver DOCUMENTACION.md) |
| Prefiero el tema de siempre | Estás en modo cyber | Botón **Modo claro** (encima del indicador de estado) |
