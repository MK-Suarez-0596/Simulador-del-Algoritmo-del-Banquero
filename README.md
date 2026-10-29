# Simulador del Algoritmo del Banquero

Simulador del **Algoritmo del Banquero** (Dijkstra, 1965) para Sistemas Operativos: detecta el **estado de seguridad** de un sistema de procesos y recursos, entrega la **secuencia segura** de ejecución y simula **solicitudes de recursos (Request)** con concesión tentativa verificada.

Proyecto de la Universidad Mariano Gálvez de Guatemala — curso de Sistemas Operativos.

## Características

- **Algoritmo de seguridad** con `Work`, `Finish` y verificación `Need ≤ Work`, con detección de estado seguro/inseguro.
- **Secuencia segura** de ejecución (`P1 → P3 → P4 → …`) y **paso a paso interactivo**: botón *Siguiente paso* que evalúa un proceso por clic y resalta su fila en la matriz.
- **Semáforo en la matriz Need**: cada celda queda verde si cumplió `Need ≤ Work` en su evaluación, roja si esa era la condición que fallaba.
- **Simulador de Request** con las 3 reglas del libro: Request ≤ Need, Request ≤ Available, y concesión tentativa + verificación de seguridad (si dejaría el estado inseguro, se **deniega y se descarta**).
- **Validación en vivo**: Allocation ≤ Max, enteros ≥ 0, errores por celda con proceso/recurso exacto.
- **Casos precargados** (seguro / inseguro), guardar y cargar escenarios en JSON (también arrastrándolos a la página) e importar/exportar sin reiniciar.
- **Copiar análisis**: genera el reporte completo en texto (matrices, secuencia, Work, pasos) al portapapeles, listo para el informe.
- Fila en rojo para procesos que quedan bloqueados en estado inseguro.
- **Autoguardado**: al reabrir la página, el último escenario sigue ahí.
- Modo **cyber** / modo claro, con transición suave y preferencia recordada.
- **Sin dependencias de red ni frameworks**: HTML+CSS+JS vánillo y Python 3 estándar.

## Archivos

| Archivo | Rol |
|---|---|
| `index.html` | Interfaz completa **autocontenida** (CSS y JS incrustados): abre con doble clic, funciona offline en cualquier navegador. |
| `banker.js` | Lógica pura del núcleo: `calcNeed`, `safetyCheck`, `requestCheck`, `validateSystem`. |
| `app.js` | Capa de vista: tablas, validación en vivo, paso a paso, import/export. |
| `styles.css` | Hoja de estilos fuente (tema cyber + modo claro). |
| `banker.py` | CLI equivalente, con autotests: `python3 banker.py --ejemplo seguro --request 1:1,0,2`. |
| `casos/*.json` | Tres escenarios de prueba (seguro, inseguro y mini trazable a mano). |
| `INFORME.md` | Informe técnico con estructura del algoritmo y casos de prueba. |

> `index.html` lleva el código incrustado adentro para poder abrirlo sin servidor.
> Las versiones fuente (`banker.js`, `app.js`, `styles.css`) son la base editable:
> si se modifica una, se debe volver a copiar dentro de `index.html`.
> `banker.py` es independiente.

## Uso rápido

```bash
# Opción 1: abrir index.html con doble clic (funciona offline)

# Opción 2: servidor local
python3 -m http.server 8000
# http://localhost:8000

# CLI
python3 banker.py                       # prueba de autoseguro por defecto
python3 banker.py --ejemplo seguro
python3 banker.py --ejemplo inseguro
python3 banker.py --archivo casos/caso_seguro.json --request 1:1,0,2
python3 banker.py --test
```

## Casos de referencia

| Caso | Available | Resultado |
|---|---|---|
| `caso_seguro.json` — clásico (Silberschatz) | `[3,3,2]` | **SEGURO**, secuencia `P1 → P3 → P4 → P0 → P2` |
| `caso_inseguro.json` — mismo sistema | `[2,0,0]` | **INSEGURO**: ninguno cumple `Need ≤ Work` |
| `caso_mini.json` | `[2,1]` | **SEGURO**, `P0 → P1 → P2` (útil para trazar a mano) |

Solicitudes de ejemplo sobre el caso seguro:
`P1 [1,0,2]` → **concedida** · `P0 [0,5,0]` → error (excede Need) · `P0 [4,0,0]` → espera (excede Available).

## Pruebas

```bash
python3 banker.py --test
```
4 aserciones automatizadas: caso seguro con secuencia exacta, caso inseguro, concesión válida de Request y los dos rechazos esperados (excede Need y excede Available).

## Licencia

MIT — ver [LICENSE](LICENSE).
