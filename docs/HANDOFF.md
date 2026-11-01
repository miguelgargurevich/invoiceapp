# Handoff — InvoiceApp

> Actualizado: 2026-11-01 por claude-code

## Estado actual

- App de facturación orientada a EE. UU. (Next.js 14 + Express + Prisma + Postgres, R2, Stripe) en producción.
- Facturación electrónica SUNAT (Perú): núcleo de emisión CONSTRUIDO en la rama local `feat/sunat-diseno` (sin push):
  backend `src/sunat/**` + API `/api/comprobantes` y `/api/sunat` + motor `apps/sunat-engine` (PHP/Greenter).
  E2E contra SUNAT beta: 8/8 aceptados (factura contado, factura crédito+detracción, boleta, NC, ND, baja RA, anulación RC).
  Suites: `npm test` 92/92, `npm run test:db` 44/44. Falta: frontend, despliegue y verificar parámetros contra la norma.

## Última sesión

- 2026-11-01 (Claude Code con Haiku 5.5, delegado en worktree `.claude/worktrees/sunatf-t1-catalogos`, rama `feat/sunatf-t1-catalogos`):
  Tarea 1 del plan del frontend (`docs/superpowers/plans/2026-11-01-sunat-frontend.md`): clientes con `esAgenteRetencion`
  (POST y PUT de `/api/clientes`, sin tocar el esquema de Prisma: la columna ya existía en la migración `sunat_nucleo`) y
  `GET /api/sunat/catalogos` (solo Perú) con afectaciones, tipos de operación, unidades, motivos de NC/ND, detracciones y
  percepciones, servidos desde `src/sunat/catalogos` para que el frontend no tenga copia. Pruebas nuevas:
  `test/db/sunat-catalogos-clientes.test.js` (3). Suites: `npm test` 92/92; `npm run test:db` 47/47 (44 previas + 3).
  Mutaciones (una por cambio, todas en rojo y restauradas con `cp` + `cmp`): quitar `esAgenteRetencion` del esquema;
  PUT sin el campo guarda `false`; quitar `soloPeru` de `/catalogos`; detracción 037 al 10 %.
  Gotchas: el `apps/backend/node_modules` del worktree es propio; el catálogo de detracciones y percepciones sigue
  pendiente de verificar contra la norma (ver `src/sunat/catalogos/index.js`).
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
- 2026-11-01 (Claude Code con Sonnet 5.5, delegado en worktree `.claude/worktrees/sunat-t4-cifrado`, rama `feat/sunat-t4-cifrado`):
  Tarea 4 del plan (cifrado de secretos). Hecho: `src/sunat/seguridad/cifrado.js` (`cifrar`, `descifrar`, `obtenerLlave`,
  AES-256-GCM, formato `v1:iv:tag:datos`), `SUNAT_MASTER_KEY=` en `apps/backend/.env.example` y 11 pruebas
  `node:test` (4 del plan + 7 de seguridad). Suite `npm test`: 21 en verde. Mutaciones: 8 de 9 en rojo.
  Gotchas: el código del plan se endureció en dos puntos: (1) `descifrar` valida IV de 12 bytes y tag de 16 (Node
  acepta tags GCM truncados si no se fija la longitud) y exige exactamente 4 partes; (2) el `!datos` del plan
  rechazaba `cifrar('')`, ahora un texto vacío hace ida y vuelta. Mutante equivalente: `authTagLength` en `cifrar`
  es redundante (GCM ya usa 16 por defecto al cifrar); se deja explícito. La llave real (`SUNAT_MASTER_KEY`) aún no
  está definida en ningún entorno: hay que generarla con `openssl rand -base64 32` y cargarla en Coolify antes de la Tarea 5+.
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunat-t6-almacen`, rama `feat/sunat-t6-almacen`):
  Tarea 6 del plan (almacén privado en R2). Hecho: `src/sunat/almacen.js` (`crearAlmacenPrivado`: `guardar`, `leer`,
  `urlFirmada`), `@aws-sdk/s3-request-presigner@^3.922.0` en `package.json`, `getR2Client` exportado desde
  `src/utils/storage.js` (único cambio ahí), `R2_PRIVATE_BUCKET=` en `.env.example`, pruebas en
  `test/unit/sunat/almacen.test.js`. Suite `npm test`: 13 pruebas en verde (10 previas + 3). Mutaciones (bucket
  equivocado en `guardar`, sin `expiresIn`, sin chequeo de `R2_PRIVATE_BUCKET`): las tres en rojo y restauradas.
  Gotchas: el caret `^3.922.0` resuelve al 3.x más nuevo (presigner 3.1161.0); el lock sube transitivas de
  `@aws-sdk` (`core` 3.974.8→3.979.1, `signature-v4-multi-region`, `types`, `xml-builder`, `smithy/core`,
  `smithy/signature-v4`) y quita `fast-xml-parser` y compañía. `npm install` reordenó `bcryptjs` y `@supabase` en
  `package.json`: revertido a mano. Las pruebas no tocan R2 real.
- 2026-11-01 (Claude Code con Sonnet 5.5, delegado en worktree `.claude/worktrees/sunat-t8-engine`, rama `feat/sunat-t8-engine`):
  Tarea 8 del plan, microservicio `apps/sunat-engine` (PHP 8.3 + Greenter `greenter/lite` v5.3.0): `composer.json` y
  `composer.lock`, `Dockerfile`, `docker/openssl-legacy.cnf`, `public/{index.php,.htaccess}`,
  `src/{ErrorDatos,Certificado,Emisor,Mapper,Respuesta,Rutas}.php`, fixtures y `tests/smoke.sh`. Código del plan sin
  cambios en `src/`: los setters de Greenter del plan existían todos (no hubo «Call to undefined method»).
  Verificado: `./tests/smoke.sh` en verde (inspeccionar, token, firmar factura, crédito+detracción y nota de crédito);
  `BETA=1 ./tests/smoke.sh` en verde: SUNAT beta (MODDATOS, RUC 20000000001) aceptó la factura F001-1 (código 0) con el
  certificado autofirmado, sin necesitar el certificado de pruebas de Greenter, y devolvió ticket de baja. Rutas no
  cubiertas por `smoke.sh` (descuento, ICBPER, percepción, retención, resumen, `Respuesta::deTicket/deEnvio`) se
  comprobaron aparte con un script desechable dentro del contenedor: construyen y firman sin errores.
  Mutaciones de `smoke.sh` (token esperado, RUC del certificado, `emisor.solClave` ausente): las tres en rojo.
  Gotchas: (1) el plan no fijaba la plataforma de Composer; `composer:2` corre PHP 8.5 y resolvió `symfony/finder v8`
  (exige PHP ≥ 8.4.1), que habría roto `composer install` en la imagen `php:8.3-apache`. Se agregó
  `config.platform.php = "8.3.0"` a `composer.json` y el lock se regeneró (queda `symfony/finder v7.4.22`). Si se sube
  la imagen base de PHP, subir también ese valor y regenerar el lock. (2) `vendor/` no se commitea
  (`apps/sunat-engine/vendor/` en el `.gitignore` raíz); `composer.lock` sí. (3) `smoke.sh` usa el puerto 8089 y borra
  su contenedor con `trap`. (4) Sin probar: `/comprobantes/cdr` en producción, `/tickets/consultar`, `/resumenes/enviar`
  contra beta y firma con un `.pfx` real (RC2/3DES, proveedor legacy de OpenSSL).
- 2026-11-01 (Claude Code con Sonnet 5.5, delegado en worktree `.claude/worktrees/sunat-t3-calculo`, rama `feat/sunat-t3-calculo`):
  Tarea 3 del plan (`calcularComprobante`). Hecho: `src/sunat/calculo/calcular.js` (`calcularComprobante`, `ErrorCalculo`) y
  `test/unit/sunat/calcular.test.js`: las 13 pruebas del plan + 7 añadidas (retención excluida con detracción, detracción en
  USD, umbral exacto de S/ 700, tipo de cambio y percepción en USD, forma de pago inválida, crédito con detracción,
  invariantes de totales). Código del plan copiado sin cambios (no hubo que corregir nada). Suite `npm test`: 61 en verde.
  Mutaciones: 18 de 18 en rojo (las 5 pedidas + 13 más); con solo las 13 del plan sobrevivían 9 (entre ellas retención
  junto con detracción), por eso las pruebas añadidas. Revisión de dinero: todo con `decimal.js`; el único `Number` es el
  conteo de bolsas ICBPER (no es un monto); redondeo half-up a 2 por línea; totales = suma de líneas ya redondeadas.
  Gotchas (el plan calcula así; NO se cambió, decidir antes de la Tarea 7):
  (1) Sin validar entradas: `descuento: -10` sube el valor (precio 100 → valorVenta `110.00`, total `129.80`);
  `bolsasIcbper: -2` da ICBPER `-1.00` y total `-0.76`; `bolsasIcbper: 1.5` se acepta (`0.75`); `tasaIgv: -18` da IGV
  `-18.00`; un `precio: 'abc'` lanza `DecimalError` en vez de `ErrorCalculo` (hay que validar en el esquema Zod de la Tarea 7).
  (2) Con `precioIncluyeIgv` el total puede diferir de céntimos de lo que paga el cliente porque se redondea por línea:
  precio 0.10 con IGV → total `0.09`; tres líneas de 33.33 con IGV → total `100.02` (el cliente esperaba 99.99).
  (3) Una sola regla de umbral (S/ 700) para todas las detracciones; el catálogo actual solo trae códigos con ese umbral,
  pero al agregar códigos con otro umbral (p. ej. transporte) habrá que moverlo a `DETRACCION_CODIGOS`.
  (4) Percepción con crédito: `netoPendiente` no incluye la percepción (118.00 aunque el cliente paga 120.36), así que las
  cuotas suman sin percepción. (5) Con detracción y `retencion: true` la retención se omite en silencio (null), no error.
  (6) No hay afectaciones gratuitas (11 a 17) ni IVAP.
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunat-t5-esquema`, rama `feat/sunat-t5-esquema`):
  Tarea 5 del plan (esquema Prisma, migración y base de pruebas). Hecho: `prisma/schema.prisma` con `Empresa.pais`
  (default `US`), `Cliente.esAgenteRetencion`, `Factura.numero` ahora `Int?` y los campos SUNAT de `Factura` y
  `DetalleFactura`; modelos nuevos `EmisorSunat`, `CuotaFactura`, `ProcesoSunat`, `ProcesoSunatItem` y `EnvioSunat`.
  Migración `prisma/migrations/20261101000000_sunat_nucleo/migration.sql` (generada con `migrate diff` desde el esquema
  de `HEAD`; 181 líneas, sin `DROP TABLE` ni `DROP COLUMN`; único `ALTER` es `numero DROP NOT NULL`). Base de pruebas:
  `test/db/ayuda.js` y `test/db/esquema.test.js` (2 pruebas). Contenedor nuevo `invoiceapp-pg-test` en el puerto 5436.
  Pruebas: `npm run test:db` 2/2 en verde; `npm test` 41/41 en verde. Mutaciones (esquema restaurado con `cp` + `cmp`
  después de cada una, base reseteada): `numero` a `Int` obligatorio → la prueba de borradores sin número falla
  (`PrismaClientValidationError`, lo rechaza el cliente generado); quitar `@default("US")` de `pais` → la prueba de
  empresas existentes falla (mismo error). Ambas en rojo.
  Gotchas: (1) `npx prisma validate` exige `DATABASE_URL` en el entorno aunque el esquema no conecte; se pasó la URL de
  la base de pruebas solo para ese comando. (2) `ayuda.js` sobrescribe `DATABASE_URL` con la base de pruebas y hace
  `TRUNCATE`; solo `TEST_DATABASE_URL` lo cambia, así que no apuntarla a nada que no sea de pruebas. (3) El repo mezcla
  migraciones: `migrations/20260506_add_local_auth_user_profiles.sql` es un `.sql` suelto, no una carpeta de Prisma.
  Antes de desplegar (Opus, con OK de Miguel): `prisma migrate status` contra producción; no se hizo aquí.
  (4) `migrate diff` compara contra el esquema de `HEAD`, no contra la base de producción real.
  (5) El `.gitignore` raíz ignora `prisma/migrations/` (desde el commit inicial) y `*.sql`. La migración de esta tarea se
  añadió con `git add -f`, porque sin ella en git `migrate deploy` no la aplica. Decidir si se excepciona en `.gitignore`
  (`!prisma/migrations/`); no se tocó aquí porque ese archivo no estaba en «Permitidos».
- 2026-11-01 (Claude Code con Sonnet 5.5, delegado en worktree `.claude/worktrees/sunat-t7-borradores`, rama `feat/sunat-t7-borradores`):
  Tarea 7 del plan (borradores). Hecho: `src/sunat/emision/borradores.js` (`comprobanteSchema`, `INCLUDE_COMPROBANTE`,
  `INCLUDE_RESPUESTA`, `entradaCalculo`, `datosDesdeFactura`, `previsualizar`, `guardarBorrador`) y
  `test/db/borradores.test.js`: las 8 pruebas del plan + 7 añadidas (barrera Zod: `descuento: -10`, `bolsasIcbper: 1.5` y `-2`,
  `precio: "abc"`, `cantidad` 0 o negativa; entrada inválida no guarda nada; sin `empresa` en la respuesta al guardar ni al
  editar; cuotas reemplazadas al editar; separación entre empresas en cliente, serie, documento afectado y comprobante a
  editar; nota solo sobre documento aceptado; serie inactiva). Código del plan copiado sin cambios (no hubo que corregir nada).
  `npm run test:db`: 17 en verde (2 de esquema + 15); `npm test`: 61 en verde. Mutaciones: 18 de 18 en rojo (cliente,
  serie, afectado y comprobante a editar sin `empresaId`; `empresa` en `INCLUDE_RESPUESTA`; editar un no borrador; sin chequeo
  de percepción; no borrar cuotas ni detalles al editar; serie sin `activa`; sin chequeo de estado del afectado;
  `ACEPTADO_CON_OBS` no aceptado; nota sin afectado; y 5 del esquema). Con solo las 8 del plan no se detectaban la separación
  entre empresas, el estado del afectado, las cuotas ni el esquema, por eso las añadidas.
  Gotchas (el plan lo hace así; NO se cambió, decidir antes de la Tarea 11):
  (1) Carrera al editar: el estado `BORRADOR` se lee FUERA de la transacción y el `update` va por `id` sin condición de
  estado; si una emisión (Tarea 11) pasa el comprobante a `PENDIENTE` entre ambos, la edición pisaría líneas y totales de
  algo ya en camino a SUNAT. Arreglo posible: `updateMany` con `estadoSunat: 'BORRADOR'` dentro de la transacción y fallar
  si afecta 0 filas. (2) `datosDesdeFactura` no reconstruye `fechaVencimiento` de la factura: si la Tarea 9 o la 11 re-guardan
  desde ahí, se pierde. (3) Editar no cambia `userId` ni `fechaEmision` (solo se fijan al crear); la fecha real de emisión
  la debe poner la Tarea 11. (4) `esAgentePercepcion` es `false` por defecto: probado el rechazo, NO el camino con emisor
  agente de percepción. (5) Las pruebas de BD comparten `limpiar()` (TRUNCATE) y corren con `--test-concurrency=1`; no
  lanzarlas en paralelo contra la misma base.
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunat-t9-mapper`, rama `feat/sunat-t9-mapper`):
  Tarea 9 del plan (cliente del engine y mapper). Hecho: `src/sunat/engine/cliente.js` (`crearClienteEngine`, siete
  llamadas, cabecera `x-engine-token`; 422 → `ErrorConstruccion`; red, 5xx y 401 → `ErrorEngineNoDisponible`),
  `src/sunat/engine/mapper.js` (`armarEmisor`, `armarComprobante`, `armarBaja`, `armarResumen`, `nombreBase`),
  pruebas `test/unit/sunat/engineCliente.test.js` (2) y `engineMapper.test.js` (5; una de ellas añadida al plan para la
  línea exonerada) y `SUNAT_ENGINE_URL` / `SUNAT_ENGINE_TOKEN` en `.env.example`. Código del plan copiado sin cambios.
  Suite `npm test`: 68 en verde (61 previas + 7). Contrato con el motor: las claves del JSON coinciden exactamente con
  los cuatro fixtures de `apps/sunat-engine/tests/fixtures/` y con lo que leen `Mapper.php` y `Emisor.php`; no hizo falta
  cambiar el mapper. Mutaciones: 5 de 5 en rojo (sin `x-engine-token`; 422 como `ErrorEngineNoDisponible`;
  `porcentajeIgv` distinto de 0 en exonerada; sin leyenda 2006; fecha sin `-05:00`), cada una en su prueba.
  Gotchas (para la validación de las tareas 10 y 11, el mapper NO valida): (1) `Factura.numero` es `Int?`: sin número
  sale `"null"` como correlativo. (2) `DetalleFactura.valorUnitario` y `precioUnitarioIgv` son `Decimal?`; `aDecimal(null)`
  devuelve `0` sin avisar, y un `netoPendiente` nulo da `0.00` en crédito. Rechazar esos casos antes de mapear.
  (3) El motor responde 500 con `Error interno del motor: <mensaje>`; ese texto llega a `ErrorEngineNoDisponible` y no
  debe mostrarse tal cual al usuario. (4) Sin probar contra el motor vivo: solo contrato estático y `fetchImpl` simulado.
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunat-t10-estados`, rama `feat/sunat-t10-estados`):
  Tarea 10 del plan (estados, plazos y validación previa). Hecho: `src/sunat/emision/estados.js` (`ESTADO`,
  `clasificarRespuesta`, `siguienteReintento`), `src/sunat/emision/plazos.js` (`dentroDePlazoEnvio`,
  `dentroDePlazoBaja`, `diasDesdeEmision`), `src/sunat/emision/validacion.js` (`validarParaEmision`), y pruebas
  `test/unit/sunat/estados.test.js` (3) y `test/unit/sunat/validacion.test.js` (6). Código del plan copiado tal cual.
  Se añadieron a `estados.test.js` los bordes 1999, 2000 y 4000: sin ellos, la mutación «2000 como aceptado»
  sobrevivía con las pruebas del plan. `npm test` 70/70 en verde. Mutaciones (archivo copiado al scratchpad,
  restaurado con `cp` + `cmp`): 1033 como error temporal, plazo de baja de 8 días, factura sin exigir RUC y boleta
  sin umbral → rojo; 2000 como aceptado → rojo solo con los bordes nuevos.
  Gotchas: (1) `clasificarRespuesta` devuelve el string `'CONSULTAR_CDR'` para 1033, que no está en `ESTADO`: el
  llamador debe consultar el CDR y no guardar ese valor como estado. (2) `siguienteReintento(0)` devuelve `undefined`
  (el plan no lo prueba): el primer intento es el 1. (3) `validarParaEmision` hace `f.serie[0]` sin guarda: con
  `serie: null` lanza `TypeError` en vez de devolver un mensaje; la serie debe venir validada de `ConfiguracionSeries`.
  (4) Los plazos (3 y 7 días) y el umbral de boleta (700) están en `catalogos/parametros.js` y siguen pendientes de
  verificar contra la norma vigente, como el resto de parámetros.
- 2026-11-01 (Claude Code con Sonnet 5.5, delegado en worktree `.claude/worktrees/sunat-t11-emision`, rama `feat/sunat-t11-emision`):
  Tarea 11 del plan (servicio de emisión) más tres correcciones de la revisión de la Tarea 7. Hecho:
  `src/sunat/emision/servicio.js` (`crearServicioEmision` → `emitir` y `procesarEnvio`; `claveArchivo`),
  `test/db/falsos.js` (`engineFalso`, `almacenFalso`, `colaFalsa`) y `test/db/servicio.test.js`. Código del plan copiado
  tal cual, salvo lo siguiente. (1) `emitir` bloquea la fila de la factura (`SELECT … FOR UPDATE` filtrado por
  `empresa_id`) antes de leerla y chequear `BORRADOR`: dos emisiones simultáneas del mismo borrador ya no sacan dos
  números (una cumple, la otra falla con `ErrorEstado`; `ultimoNumero` queda en 1). (2) `guardarBorrador` lee el estado
  dentro de la transacción con el mismo bloqueo, así que editar mientras se emite espera y luego rechaza con
  `ErrorBorrador`. (3) `datosDesdeFactura` conserva `fechaVencimiento` (ISO string, solo si existe).
  Pruebas añadidas a las del plan: doble emisión del mismo borrador, emitir con otra empresa, fallo del motor sin XML
  guardado, 1033 que consulta y guarda el CDR, edición bloqueada por una emisión en curso y edición desde otra empresa.
  `npm test` 77/77 y `npm run test:db` 30/30 en verde. Mutaciones (archivo copiado al scratchpad, restaurado con `cp` +
  `cmp`), todas en rojo: sin `FOR UPDATE` de la factura, sin `FOR UPDATE` de la serie, no revertir si falla la firma
  (número consumido), 1033 sin consultar CDR, no guardar el CDR, emitir sin filtrar por empresa, `guardarBorrador` sin
  chequeo de estado en la transacción, sin su `FOR UPDATE` y `datosDesdeFactura` sin `fechaVencimiento`.
  Gotchas: (1) `emitir` firma y guarda el XML dentro de la transacción (hasta 30 s): mientras tanto la serie y la fila
  quedan bloqueadas, y una edición del mismo borrador espera con la transacción por defecto de Prisma (5 s), así que
  con un motor lento podría fallar por tiempo agotado en vez de por `ErrorBorrador` (sin probar). (2) Si la
  transacción se revierte después de `almacen.guardar`, el XML queda huérfano en el almacén; la clave es determinista
  (el número no se consume) y el siguiente intento la sobrescribe. (3) La prueba de doble emisión usa una firma con
  150 ms de retardo para que ambas lleguen al chequeo antes de que una confirme. (4) `procesarEnvio` no bloquea la fila:
  dos ejecuciones simultáneas del mismo comprobante enviarían dos veces a SUNAT (la cola de la Tarea 13 debe evitarlo
  o el servicio debe bloquear).
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunat-t13-cola`, rama `feat/sunat-t13-cola`):
  Tarea 13 del plan (cola pg-boss y manejadores). Hecho: `src/sunat/cola/manejadores.js` (`crearManejadores`),
  `src/sunat/cola/index.js` (`crearCola`, `COLAS`) y `test/unit/sunat/manejadores.test.js` (4 pruebas).
  `pg-boss` fijado en `10.4.2` exacto (`npm install pg-boss@10.4.2 --save-exact`, sin `^`). Código del plan copiado
  tal cual; no hubo que corregir nada. Verificado sin base de datos: `require('./src/sunat/cola')` carga y `crearCola`
  construye sin conectar; en 10.4.2 existen `start`, `stop`, `getQueue`, `createQueue`, `send` (con `startAfter` en
  segundos) y `work` (el handler recibe un arreglo de jobs). `npm test` 81/81 en verde. Mutaciones (archivo copiado al
  scratchpad, restaurado con `cp` + `cmp`): reintentar fuera de plazo, no notificar al aceptar, error del correo que
  rompe el trabajo, reconsultar el ticket a 30 s → 4 de 4 en rojo.
  Gotchas: (1) `npm install` reordenó `bcryptjs` y `@supabase/supabase-js` en `package.json`: revertido a mano. El lock
  solo añade 5 paquetes (pg-boss, cron-parser, luxon, serialize-error, type-fest). `npm audit` sigue con 17
  vulnerabilidades preexistentes, sin tocar. (2) `startAfter` numérico > 0 se pasa como texto; 0 equivale a inmediato.
  (3) `crearCola` no tiene pruebas unitarias: su comportamiento real contra Postgres (schema `pgboss`, `work`, `stop`)
  queda sin probar hasta la base de datos de pruebas. Usar conexión directa, no el pooler en modo transacción.
- 2026-11-01 (Claude Code con Sonnet 5.5, worktree `.claude/worktrees/sunat-t12-anulacion`, rama `feat/sunat-t12-anulacion`):
  Tarea 12 del plan (anulación por baja RA y resumen diario RC). Hecho: `src/sunat/emision/anulacion.js`
  (`crearServicioAnulacion` → `solicitarAnulacion`, `procesarTicket`) y `test/db/anulacion.test.js` (6 pruebas: las 4 del
  plan + separación entre empresas + concurrencia). Código del plan copiado tal cual, salvo un añadido: `solicitarAnulacion`
  abre la transacción con `SELECT id FROM facturas WHERE id AND empresa_id FOR UPDATE` (igual que `emitir`) antes de leer y
  chequear el estado; sin eso, dos solicitudes simultáneas pasaban ambas el chequeo de «aceptado» y creaban dos procesos
  (RA 1 y RA 2) para el mismo comprobante. Prueba de concurrencia: engine falso con 200 ms de espera en `enviarBaja` y
  `Promise.allSettled` → una cumple, otra falla con `ErrorEstado`, un solo `ProcesoSunat` y una sola llamada al engine.
  Mutaciones (archivo copiado al scratchpad, restaurado con `cp` + `cmp`): serie B por RA, aceptar fuera de plazo,
  no restaurar el estado previo al rechazar, quitar el filtro `empresaId`, no marcar `estado: 'anulada'`, aceptar
  comprobantes no aceptados, quitar el `FOR UPDATE` (3 corridas) → todas en rojo.
  Gotchas: (1) `solicitarAnulacion` llama al engine dentro de la transacción (timeout 60 s): si SUNAT recibe la baja y
  luego falla la BD, el ticket queda huérfano en SUNAT y la factura sigue «aceptada» (se puede reintentar; SUNAT
  rechazaría el duplicado). (2) `procesarTicket` no bloquea el proceso: dos ejecuciones simultáneas duplicarían la fila
  de `EnvioSunat`, pero el resultado final sobre la factura es idempotente. (3) Un RC con varias boletas por proceso no
  está soportado: cada anulación es su propio proceso (decisión del plan).
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunat-t14-pdf`, rama `feat/sunat-t14-pdf`):
  Tarea 14 del plan (PDF con QR, correo y arranque del módulo). Hecho: `src/sunat/pdf/representacion.js` (`textoQr`,
  `generarPdf`, `NOMBRES_COMPROBANTE`), `src/sunat/notificador.js` (`crearNotificador`: PDF y XML al correo del cliente;
  sin correo no envía), `src/sunat/index.js` (`iniciarSunat`; sin `SUNAT_ENGINE_URL` queda desactivado) y `qrcode@^1.5.4`.
  Cola: `encolarEnvio` y `encolarTicket` con `singletonKey`; `crearCola` acepta `schema` (por defecto `pgboss`) y la
  prueba `test/db/cola.test.js` corre contra el Postgres de pruebas en el esquema `pgboss_prueba` (se borra al empezar).
  `npm test` 86/86 en verde; `test/db/cola.test.js` 1/1. Código del plan copiado tal cual salvo: la fecha del QR
  tiene una prueba extra con 02:30 UTC (en Lima es el día anterior), porque la fixture del plan no distingue Lima de UTC.
  Mutaciones (archivo copiado al scratchpad, restaurado con `cp` + `cmp`), todas en rojo: QR sin hash; fecha en UTC;
  adjuntar solo el PDF; enviar sin correo de cliente; cola sin `singletonKey`; cola sin `policy: 'short'`.
  Gotchas: (1) `singletonKey` NO deduplica con la política estándar de pg-boss: la cola se crea con `policy: 'short'`
  (índice `job_i1`, deduplica por `COALESCE(singleton_key, '')`). `iniciar` solo crea colas que faltan: una cola ya
  creada con la política estándar no se corrige sola (hay que borrarla o cambiarla con `updateQueue`). (2)
  `src/sunat/index.js` requiere `./emision/anulacion` (Tarea 12), que no existe en este worktree: su carga completa se
  verifica al integrar. `node --check` sí pasa. (3) `npm install qrcode` reordenó `bcryptjs` y
  `@supabase/supabase-js` en `package.json`: revertido a mano. (4) La prueba «varias páginas» del PDF no cuenta las
  páginas: solo comprueba cabecera `%PDF` y tamaño mayor a 2000 bytes.
- 2026-11-01 (Claude Code con Sonnet 5.5, worktree `.claude/worktrees/sunat-t15-api`, rama `feat/sunat-t15-api`):
  Tarea 15 del plan (API). Hecho: `src/sunat/http.js` (`responderError`, `soloPeru`, `bloquearElectronicos`),
  `src/routes/comprobantes.js` (`/api/comprobantes`), `src/routes/sunat.js` (`/api/sunat`: emisor, series, alertas),
  montaje en `app.js`, y en `src/routes/facturas.js` solo el paso 6 (`bloquearSiSunat` en 7 rutas, 409 en POST para
  empresas PE, 400 de pagos en borrador). `npm test` 91/91 y `npm run test:db` 44/44 en verde. Código del plan copiado
  tal cual salvo: (1) `router.param('id')` en `comprobantes.js` verifica que el comprobante sea electrónico y de la
  empresa (404 si no); sin eso, PUT y emitir de un comprobante AJENO respondían 400/409 con «no encontrado» (los
  servicios lanzan `ErrorBorrador`/`ErrorEstado`), no 404. (2) Pruebas extra: secretos en detalle y lista, segunda
  empresa PE (404 en GET, PUT, DELETE, emitir, anular, corregir, xml, cdr, pdf y lista vacía), certificado vencido,
  mensajes crudos del motor/500 y una prueba que monta el router REAL de `/api/facturas` con JWT real.
  `editado.json.total === '236'` coincide con la serialización real de Prisma: sin ajuste.
  Mutaciones (archivo copiado al scratchpad, restaurado con `cp` + `cmp`), todas en rojo: GET /:id y lista con
  `INCLUDE_COMPROBANTE`; `router.param` sin `empresaId`; quitar `soloPeru`; `bloquearElectronicos` sin `empresaId`;
  503 y 500 con mensaje crudo; PRODUCCION sin `confirmarProduccion`; no comparar RUC del certificado; no validar
  vencimiento (sobrevivía: se añadió la aserción); `vistaEmisor` con `solClaveCifrada`; quitar `bloquearSiSunat` de
  PUT /:id y de payment-summary; quitar el 409 PE y el 400 de pagos en borrador. Única que sobrevive: quitar el
  filtro `empresaId` solo de `buscar()` (lo cubre `router.param`: doble barrera deliberada).
  Gotchas: (1) arrancar `app.js` exige también `STRIPE_SECRET_KEY` (`webhooks.js` crea el cliente de Stripe al
  cargarse), además de `RESEND_API_KEY`, `JWT_SECRET` y `DATABASE_URL`. (2) La prueba de `/api/facturas` crea un
  plan `prueba-rutas` en la BD de pruebas (la tabla `plans` no se trunca en `limpiar()`). (3) `PUT /api/sunat/emisor`
  no lleva `soloPeru` a propósito: configurar el emisor convierte la empresa en PE. (4) El 500 genérico sigue
  registrando el error completo en el log (`console.error('[SUNAT]', error)`): revisar que no imprima secretos si
  algún servicio mete datos sensibles en un mensaje de error.

- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunat-fix-fechas-rc`, rama `fix/sunat-fix-fechas-rc`):
  Corrección del E2E contra SUNAT beta (fechas corridas un día y resumen RC rechazado con 2992). Hecho:
  `apps/sunat-engine/src/Mapper.php` con `fecha()`: una fecha sin hora («2026-11-01») se toma al mediodía de
  `America/Lima`; se usa en emisión, cuotas, resumen y baja. `Mapper::resumen` pone `setPorcentajeIgv` en cada
  `SummaryDetail`. `mapper.js` (`armarResumen`) manda `porcentajeIgv` por detalle (`taxRate` de la empresa, si no 18;
  `0` si la boleta no tiene IGV). `tests/smoke.sh`: `PUERTO` (8089 por defecto), verificación de la cuota en el XML
  firmado (`PaymentDueDate>2030-12-31<`, sin `2030-12-30`), y con `BETA=1` envío del RC (`fixtures/resumen.json`, anula
  B001-1) con sondeo de `/tickets/consultar` hasta `codigo 0`. Sin BETA solo comprueba que `/resumenes/enviar` responde 422.
  Verificado: `npm test` 92/92; `./tests/smoke.sh` verde; `BETA=1 ./tests/smoke.sh` verde (factura, baja, RC aceptado).
  Mutaciones (todas en rojo): sin mediodía de Lima (falla la cuota); sin `setPorcentajeIgv` (SUNAT 2992 en el envío);
  sin `porcentajeIgv` en `armarResumen` (falla la prueba de Node).
  Gotchas: (1) quitar solo la zona y dejar el mediodía NO falla: con mediodía el día es el mismo en cualquier zona
  razonable; la mutación útil es quitar el mediodía y la zona. (2) El 2992 de un RC llega YA en la respuesta de
  `/resumenes/enviar` (`ticket: null`), no al consultar el ticket. (3) Cada corrida BETA envía un RC nuevo con correlativo
  `date +%s % 99999 + 1`: SUNAT beta acumula RC de prueba. (4) `vendor/` se instaló con `composer:2` en Docker (no hay PHP
  local). (5) El cliente de la boleta de la fixture es DNI 12345678 (dato de prueba).
- 2026-11-01 (claude-code, Opus 5.5, orquestador): ejecución del plan delegando por riesgo (Sonnet: 3, 4, 7, 8, 11, 12, 15;
  Haiku: 1, 2, 5, 6, 9, 10, 13, 14 y el arreglo de fechas/RC). Cada tarea revisada (diff), suites corridas sobre la rama
  integrada e integrada con cherry-pick. Correcciones fuera del plan: bloqueo de fila en emitir, editar y anular
  (doble emisión/anulación simultánea); `router.param` 404 para comprobantes ajenos; `singletonKey` + `policy: 'short'`
  en pg-boss; fechas sin hora al mediodía de Lima en el motor (Greenter escribe en hora de Lima: salían un día antes,
  también las cuotas) y `porcentajeIgv` en el resumen (SUNAT rechazaba el RC con 2992). E2E `scripts/sunat-beta-e2e.js`
  8/8 en beta; guía `docs/sunat/DESPLIEGUE.md`.

## Próximos pasos

- [x] Spec aprobado.
- [x] Plan de implementación: `docs/superpowers/plans/2026-11-01-sunat-nucleo-emision.md` (16 tareas, backend + motor; el frontend va en un plan aparte).
- [x] Ejecutar el plan del núcleo de emisión (16 tareas + arreglo de fechas/RC; E2E beta 8/8).
- [ ] Decidir: cuando el precio incluye IGV, redondear por línea deja céntimos de diferencia (3 × 33.33 → 100.02); ¿IGV de línea = precio − valor?
- [ ] Decidir `.gitignore`: ignora `prisma/migrations/` y `*.sql` desde el commit inicial (la migración SUNAT entró con `git add -f`).
- [ ] Verificar contra la norma vigente: porcentajes de detracción/percepción, umbrales (700) y plazos (3 y 7 días) de `catalogos/parametros.js`.
- [ ] Probar la firma con un `.pfx` real de una entidad certificadora peruana (solo se probó con autofirmados).
- [x] Diseño y plan del frontend para empresas `PE`: `docs/superpowers/specs/2026-11-01-sunat-frontend-design.md` y
  `docs/superpowers/plans/2026-11-01-sunat-frontend.md` (rama `feat/sunat-frontend`, 10 tareas).
- [ ] Ejecutar el plan del frontend (delegado por riesgo; 1, 2 y 3 en paralelo).
- [ ] Despliegue según `docs/sunat/DESPLIEGUE.md` (con OK de Miguel; `prisma migrate status` contra producción primero).
- [ ] Diseñar subproyectos 3 (guía de remisión), 4 (retención/percepción) y 5 (SaaS/PSE).

## Decisiones recientes

- 2026-11-01: motor propio con Greenter (PHP) como microservicio sin estado en Coolify; InvoiceApp es dueño de cálculos, correlativos y estados. Por qué: Greenter ya cubre todos los comprobantes y validaciones de SUNAT; escribir UBL+firma en Node era el mayor riesgo.
- 2026-11-01: cola con pg-boss sobre el Postgres existente (sin Redis).
- 2026-11-01: se reutiliza `ConfiguracionSeries` (tipos 01/03/07/08) y `Cliente.tipoDocumento` no se migra (se lee con `codigoDocIdentidad`).
- 2026-11-01: se extiende `Factura` con `Empresa.pais` (`US` | `PE`) en vez de una tabla paralela; `estadoSunat` separado de `estado` (cobranza).

## Gotchas

- `Factura` hoy se puede editar estando «emitida» y «anular» solo cambia el estado: con SUNAT eso deja de valer para empresas `PE`.
- Los montos se calculan con flotantes (`subtotal * taxRate`): pasar a `decimal.js` antes de emitir a SUNAT.
