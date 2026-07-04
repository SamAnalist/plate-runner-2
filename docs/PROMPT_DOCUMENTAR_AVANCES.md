# Prompt para Claude — Documentar avances actuales

Antes de seguir con nuevas features, necesito que documentes formalmente todo lo que ya hiciste hasta ahora.

Además, acabo de agregar al repo estos archivos de contexto:

- `AGENTS.md`
- `CLAUDE.md`

Léelos y alinea el proyecto con esas instrucciones.

## Objetivo

Actualizar la carpeta `docs/` para que el estado actual del proyecto quede claro y pueda ser revisado por otro arquitecto.

## Contexto de lo que ya reportaste como implementado

- Monorepo con pnpm workspace.
- App web React + TypeScript + Vite.
- Tailwind.
- `packages/shared` con tipos de simulación.
- Validadores de placa.
- `apps/web/src/utils/depth.ts` con lógica de perspectiva.
- `apps/web/src/hooks/useSimulation.ts` con loop `requestAnimationFrame` y fases `idle`, `running`, `at_gate`, `done`.
- `SimulationScene.tsx` con contenedor SVG, z-ordering por profundidad y overlays de estado.
- `Road.tsx` con carretera perspectivada.
- `Vehicle.tsx` con auto SVG front/rear, paletas de color, sombra y skew por placement.
- `LicensePlate.tsx` con SVG `<text>` y `textLength` para mantener la placa dentro del rectángulo.
- `Gate.tsx` con parking arm animado, LED y stripes.
- `ControlPanel.tsx` con controles de placa, dirección, placement, gate, color, speed y playback.
- `PlateInput.tsx` con validación inmediata.
- `docs/PROGRESS.md` y `docs/SIMULATION_SPEC.md` ya existen, pero deben actualizarse y expandirse.

## Tareas obligatorias

### 1. Leer contexto

Lee:

- `AGENTS.md`
- `CLAUDE.md`
- `docs/PROGRESS.md`
- `docs/SIMULATION_SPEC.md`

Luego revisa el código actual para confirmar que la documentación refleje lo que realmente existe.

### 2. Actualizar `docs/PROGRESS.md`

Agrega una entrada formal de fase que documente lo ya hecho.

Debe incluir:

- Fase completada.
- Objetivo de la fase.
- Resumen de implementación.
- Archivos creados/modificados.
- Decisiones técnicas.
- Cómo correr el proyecto.
- Cómo probar manualmente.
- Limitaciones actuales.
- Bugs o riesgos conocidos.
- Próximos pasos recomendados.

Usa este formato:

```md
## Phase 0/1 — Initial Monorepo and Visual Simulator Base

### Goal

### Implemented

### Files Changed

### Technical Decisions

### Manual Testing

### Known Limitations

### Bugs/Risks

### Next Steps
```

### 3. Actualizar `docs/SIMULATION_SPEC.md`

Debe documentar claramente:

- Tipos principales de simulación.
- Reglas de placa.
- Direction: `incoming` y `away`.
- Detector placements.
- Gate modes actuales.
- Si existe `stay_closed`, documentar que debe migrarse conceptualmente a `wait_for_signal`.
- Estados actuales de simulación.
- Mapping actual de fases a estados objetivo.
- Reglas de perspectiva actuales.
- Cómo se calcula profundidad, escala, skew y posición del vehículo.
- Cómo se renderiza la placa para garantizar 12 caracteres.
- Qué debe pasar visualmente con gate auto-open.
- Qué debe pasar visualmente cuando el gate queda cerrado esperando señal.

### 4. Crear `docs/CAMERA_CALIBRATION.md`

Aunque todavía no esté implementado el focus zone completo, crea este documento como contrato de la próxima fase.

Debe incluir:

- Objetivo de la calibración.
- Qué es una focus zone.
- Reglas esperadas para que la placa sea legible.
- Cómo debería funcionar Calibration Mode.
- Cómo debería funcionar Camera Mode.
- Cómo probar placas cortas y placas de 12 caracteres.
- Recomendaciones para cámara externa.
- Qué falta implementar.

### 5. Crear `docs/SECURITY_SPEC.md`

Debe documentar desde ahora:

- Reglas de validación de placas.
- Prohibición de HTML injection.
- No usar `dangerouslySetInnerHTML`.
- Futuro API key para endpoints.
- Futuro token interno para remote pairing.
- Logs futuros de conexión.
- Payload limits futuros.
- Rate limit futuro.

### 6. Revisar naming de gate mode

No implementes un refactor grande todavía, pero documenta claramente:

- Nombre actual en código.
- Nombre objetivo: `wait_for_signal`.
- Plan de migración.

Si el cambio es pequeño y seguro, puedes hacerlo.
Si lo haces, documenta los archivos modificados y crea commit separado.

### 7. No agregar features nuevas

No implementes ahora:

- Backend.
- Remote mode.
- Pairing.
- Plate lists.
- Scheduler.
- API.
- Focus zone interactivo.

Esta tarea es de documentación y estabilización de contexto.

### 8. Commits

Haz uno o más commits descriptivos.

Sugeridos:

```bash
git add AGENTS.md CLAUDE.md docs/
git commit -m "docs: add project agent instructions and current progress"
```

Si haces cambios de código pequeños para naming:

```bash
git commit -m "refactor: align gate mode naming with signal workflow"
```

### 9. Entrega final

Al final responde con:

```md
# Documentation Phase Completed

## Summary

## Files Created/Modified

## Documentation Added

## Code Changes, if any

## Gate Mode Naming Status

## How to Review Docs

## Commits

## Known Gaps

## Recommended Next Prompt
```

No ocultes nada incompleto.
