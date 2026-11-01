# Handoff — InvoiceApp

> Actualizado: 2026-11-01 por claude-code

## Estado actual

- App de facturación orientada a EE. UU. (Next.js 14 + Express + Prisma + Postgres, R2, Stripe) en producción.
- Facturación electrónica SUNAT (Perú): diseño aprobado, sin código todavía. Rama `feat/sunat-diseno`.

## Última sesión

- 2026-11-01 (claude-code): revisión de InvoiceApp como base para SUNAT, diseño del núcleo de emisión
  (`docs/superpowers/specs/2026-11-01-sunat-nucleo-emision-design.md`) y plan de implementación
  (`docs/superpowers/plans/2026-11-01-sunat-nucleo-emision.md`).

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
