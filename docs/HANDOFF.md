# Handoff — InvoiceApp

> Actualizado: 2026-11-01 por claude-code

## Estado actual

- App de facturación orientada a EE. UU. (Next.js 14 + Express + Prisma + Postgres, R2, Stripe) en producción.
- Facturación electrónica SUNAT (Perú): diseño aprobado, sin código todavía. Rama `feat/sunat-diseno`.

## Última sesión

- 2026-11-01 (claude-code): revisión de InvoiceApp como base para SUNAT, diseño del núcleo de emisión
  (`docs/superpowers/specs/2026-11-01-sunat-nucleo-emision-design.md`) y plan de implementación
  (`docs/superpowers/plans/2026-11-01-sunat-nucleo-emision.md`).
- 2026-11-01 (Claude Code con Haiku 5.5, delegado en worktree `.claude/worktrees/sunat-t1-base`, rama `feat/sunat-t1-base`):
  Tarea 1 del plan (base de pruebas, errores, fechas, números y catálogos). Hecho: `decimal.js@^10.6.0`,
  scripts `test` y `test:db`, `src/sunat/{errores,fechas,numeros}.js`, `src/sunat/catalogos/{index,parametros}.js`,
  pruebas `node:test` en `test/unit/sunat/`. Suite `npm test`: 10 pruebas en verde (8 del plan + 2 de `errores.js`,
  que el plan no cubría). Mutaciones: una por archivo de `src`, todas en rojo y restauradas.
  Gotchas: `npm install` reordenó dos dependencias en `package.json` (revertido a mano) y quitó `"dev": true` de
  `fsevents` en el lock; `npm audit` reporta 17 vulnerabilidades preexistentes, sin tocarlas aquí.
  Pendiente: revisar los porcentajes de `DETRACCION_CODIGOS`, `PERCEPCION_REGIMENES` y `parametros.js` contra la norma vigente.
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunat-t2-letras`, rama `feat/sunat-t2-letras`):
  Tarea 2 del plan (monto en letras). Hecho: `src/sunat/calculo/montoEnLetras.js` (`montoEnLetras(monto, moneda = 'PEN')`)
  y `test/unit/sunat/montoEnLetras.test.js` (17 pruebas). Código y pruebas copiados tal cual del plan; no hubo que corregir nada.
  Suite `npm test`: 27 pruebas en verde (10 de la Tarea 1 + 17). Mutaciones (5, todas en rojo y restauradas con `cp` + `cmp`):
  quitar apócope, CIEN→CIENTO, nombre USD, nombre PEN, límite `>=` → `>` en mil millones.
  Gotchas: NO valida negativos: `montoEnLetras('-1')` devuelve `SON:  MILLONES  MIL  CON 00/100 SOLES` (basura, sin error).
  Hoy no hace falta (los totales de comprobante no son negativos), pero si entra una nota con monto negativo, validar antes.
  Redondeo: `toFixed(2)` de decimal.js es half-up (`0.125` → `0.13`). Monedas fuera de `PEN|USD|EUR` salen con el código
  como nombre (`SON: CINCO CON 00/100 GBP`).

## Próximos pasos

- [x] Spec aprobado.
- [x] Plan de implementación: `docs/superpowers/plans/2026-11-01-sunat-nucleo-emision.md` (16 tareas, backend + motor; el frontend va en un plan aparte).
- [ ] Ejecutar el plan (delegado por riesgo; las tareas 2, 4, 6 y 8 se pueden correr en paralelo después de la 1).
- [ ] Diseñar subproyectos 3 (guía de remisión), 4 (retención/percepción) y 5 (SaaS/PSE).

## Decisiones recientes

- 2026-11-01: motor propio con Greenter (PHP) como microservicio sin estado en Coolify; InvoiceApp es dueño de cálculos, correlativos y estados. Por qué: Greenter ya cubre todos los comprobantes y validaciones de SUNAT; escribir UBL+firma en Node era el mayor riesgo.
- 2026-11-01: cola con pg-boss sobre el Postgres existente (sin Redis).
- 2026-11-01: se reutiliza `ConfiguracionSeries` (tipos 01/03/07/08) y `Cliente.tipoDocumento` no se migra (se lee con `codigoDocIdentidad`).
- 2026-11-01: se extiende `Factura` con `Empresa.pais` (`US` | `PE`) en vez de una tabla paralela; `estadoSunat` separado de `estado` (cobranza).

## Gotchas

- `Factura` hoy se puede editar estando «emitida» y «anular» solo cambia el estado: con SUNAT eso deja de valer para empresas `PE`.
- Los montos se calculan con flotantes (`subtotal * taxRate`): pasar a `decimal.js` antes de emitir a SUNAT.
