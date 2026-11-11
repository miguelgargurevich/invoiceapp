# Demo de Facturo para clientes: diseño

Fecha: 2026-11-11. Estado: **aprobado**; **fase A (backend) hecha** el 11-nov en la rama `feat/demo` (ver `docs/HANDOFF.md`). Se arma en paralelo con la demo de Torre y con el mismo esquema, adaptado a Facturo.

## Pedido
«Necesito crear una demo para enviarle a los clientes. Esa demo debe considerar todo: un video, los roles, la información, la guía… Lo mismo para Facturo.»

## Decisiones de Miguel (11-nov)
- **Acceso:** pública, para cualquiera con el enlace y sin registrarse.
- **SUNAT:** los comprobantes de la demo van de verdad a **SUNAT beta**, sin valor legal y con respuesta real. El PDF lleva la marca «DEMOSTRACIÓN».
- **Perfiles:** tres, que se presentan como «roles»:
  - Emprendedor con boletas;
  - Empresa de servicios;
  - Tu cliente.
- **Orden:** primero el entorno; después el video que lo recorre.

## Diferencia con Torre
En Torre hay roles dentro de un condominio: administradora, junta y vecino. En Facturo, cada cuenta es **una empresa con un solo usuario** (`Empresa.userId` es único): no hay contador ni vendedor. Por eso los «roles» de la demo son **perfiles de negocio** más el **lado del cliente**, que abre y firma una proforma desde el enlace público `/sign/<token>`. Las cuentas con varios usuarios por empresa no entran en esta demo; serían una funcionalidad aparte.

---

## 1. Entorno de demostración
- **Dónde:**
  - un recurso nuevo en Coolify, `facturo-demo`, con el mismo `docker-compose.coolify.yml` y la misma rama main;
  - su propia base Postgres y su propio volumen;
  - dominios `demo.facturo.gargurevich.dev` (web) y `api.demo.facturo.gargurevich.dev` (API).
  Cada despliegue de main actualiza las dos instancias.
- **Interruptor:** variable `MODO_DEMO=si` solo en ese recurso. Es configuración del despliegue (dice qué es esa instalación), no un dato del negocio; los datos de la demo viven en su base. Sin la variable, nada de esto existe: producción no cambia.
- **Reinicio cada noche** (3:00 a. m., hora de Lima), con una tarea programada de Coolify:
  1. borra la base de la demo;
  2. aplica el esquema;
  3. siembra los datos con fechas relativas a hoy.
  Hay un botón «Reiniciar demo» solo para el superadmin, por si alguien la deja rara.
- **Candado** (todo en el backend, con pruebas):
  - **Correos:** no sale ninguno; el correo se apaga con `MODO_DEMO`, aunque haya clave de Resend.
  - **Cobros:** Culqi y Stripe apagados; «Mejorar plan» explica que es una demo.
  - **SUNAT:** solo el ambiente BETA, con usuario `MODDATOS` y un certificado de prueba. No se puede pasar a producción, ni subir certificado o clave SOL propios.
  - **Cuentas:** sin registro (el botón lleva a `facturo.gargurevich.dev/es/register`); no se cambian la contraseña, el correo ni el plan, y no se borra la empresa.
  - **Archivos:** el logo y el certificado no se suben, para no guardar archivos de terceros.
  - **Límite:** hasta 30 comprobantes por perfil y por día, para que nadie llene SUNAT beta.
  - **Datos legales:** el pie muestra «Demostración de Facturo».

## 2. Datos de ejemplo (relativos a hoy, todos ficticios)
- **Nombres:**
  - nombres y razones sociales inventados;
  - correos `@*.example`;
  - celulares `9000xxxxx`;
  - RUC ficticios con dígito verificador válido.
  - SUNAT beta con MODDATOS acepta el RUC de pruebas `20000000001` para el emisor; los clientes usan RUC inventados.
- **Perfil «Emprendedor con boletas»:** «Bodega Don Lucho», RUC 10, plan Emprendedor.
  - De 3 a 4 meses de boletas a clientes con DNI y algunas facturas.
  - Productos de bodega.
  - Una nota de crédito.
- **Perfil «Empresa de servicios»:** «Soluciones Andinas S.A.C.», RUC 20, plan Negocio.
  - Facturas de varios meses, una con detracción y una con cuotas a crédito.
  - Notas de crédito y débito.
  - Una factura **rechazada**, para mostrar «Requiere atención» y su motivo.
  - Proformas pendiente, aceptada, rechazada y vencida.
  - Color de marca propio y su logo.
- **Perfil «Tu cliente»:** una proforma de «Soluciones Andinas» pendiente de firma, con su enlace público.
- **Fechas:** todo se calcula desde hoy (hoy, hace 3 días, el mes pasado…), así el dashboard siempre tiene «este mes».
- **Cómo:** una sola siembra, `apps/backend/scripts/sembrar-demo.js`, que reemplaza a la de los videos y la reusa: crea las empresas por la API y envía los comprobantes a SUNAT beta.

## 3. Entrar por rol, sin contraseña
- **Página `/demo`** en la web de la demo:
  - el título «Prueba Facturo sin registrarte»;
  - tres tarjetas «Entrar como…», cada una con su ícono de lucide y una línea de qué va a ver:
    - **Emprendedor con boletas:** «Emite boletas en segundos y mira tus ventas del día.»
    - **Empresa de servicios:** «Facturas con detracción, proformas que tu cliente firma y tu marca en el PDF.»
    - **Tu cliente:** «Así recibe y firma tu cliente una proforma, sin crear cuenta.»
- **Cómo entra:** `POST /api/demo/entrar { perfil }` devuelve la sesión de la cuenta de demo de ese perfil.
  - Solo existe con `MODO_DEMO=si`.
  - Solo para esas cuentas.
  - Con límite de peticiones.
  - «Tu cliente» no inicia sesión: abre el enlace `/sign/<token>` de la proforma sembrada.
- **Dos personas a la vez:** si dos entran como el mismo perfil, comparten la empresa de demo. Es aceptable porque se reinicia cada noche; el panel «Qué probar» lo avisa.

## 4. Guía dentro de la demo
- **Franja fija arriba**, en berenjena suave y sin taparle nada a la app:
  - «Estás en la demo de Facturo. Los datos son de ejemplo y se borran cada noche.»
  - Botones: **Cambiar de perfil** (vuelve a `/demo`), **Crear mi cuenta** (va a la web real) y **WhatsApp** (número desde la configuración en BD; si está vacío, no sale).
- **Panel «Qué probar»:** lateral, se puede cerrar y recuerda los pasos hechos en `localStorage`. Pasos por perfil:
  - **Emprendedor:**
    1. Mira tus ventas del mes en el dashboard.
    2. Emite una boleta a un cliente con DNI.
    3. Abre la boleta y descarga su PDF.
    4. Anula una boleta con una nota de crédito.
    5. Agrega un producto nuevo.
    6. Instala Facturo en tu celular.
  - **Empresa de servicios:**
    1. Revisa la factura rechazada y su motivo.
    2. Emite una factura con detracción.
    3. Crea una proforma y envíale el enlace de firma a tu cliente.
    4. Convierte una proforma aceptada en factura.
    5. Cambia el color de tu marca y mira el PDF.
    6. Descarga el XML y el CDR de SUNAT.
  - **Tu cliente:**
    1. Revisa la proforma.
    2. Fírmala con el dedo o el mouse.
    3. Mira cómo queda «Aceptada» del lado de la empresa.
  Cada paso lleva a su pantalla con un enlace. No se inventan funciones: solo lo que existe hoy.

## 5. Video del recorrido (≈ 2:30)
- **Formatos:** 16:9 y 9:16.
- **Cómo se graba:** con el mismo método de `scripts/marketing/` (voz «Dora», Playwright y ffmpeg), contra la **demo local** (`MODO_DEMO=si`, la misma siembra).
- **Orden:**
  1. `/demo` (10 s);
  2. Emprendedor (≈ 45 s);
  3. Empresa de servicios (≈ 60 s);
  4. Tu cliente firma (≈ 25 s);
  5. «Pruébalo tú» con el enlace de la demo (10 s).
- **Revisión:** OCR a 1 cuadro por segundo, para que no aparezcan `gargurevich|miguel|10409241862|gmail` (fuera del dominio del cierre), más las hojas de contacto.

## 6. Guía para enviar
Un documento corto en `docs/demo/ENVIAR-DEMO.md` que también se publica como recurso de My Workspace. Incluye:
- un mensaje de WhatsApp de 3 o 4 líneas con el enlace de la demo y el video;
- un correo con asunto y cuerpo;
- los 3 perfiles y qué conviene que el cliente pruebe primero según su negocio;
- respuestas a dudas frecuentes: si es real (no, es SUNAT de pruebas), si se guardan sus datos (no, se borra cada noche) y cómo pasar a su cuenta.

---

## Plan de construcción (para delegar, cuando se apruebe)

| Fase | Qué | Ejecutor | Riesgo |
|---|---|---|---|
| A | Modo demo en el backend: `MODO_DEMO`, el candado completo, `POST /api/demo/entrar` y el límite diario, con pruebas por cada bloqueo | Sonnet (**hecha**, 11-nov) | alto, delicado (auth sin contraseña) |
| B | Siembra relativa a hoy de los 3 perfiles, y el reinicio (script más botón del superadmin) | Haiku | alto, no delicado |
| C | Frontend: página `/demo`, franja, panel «Qué probar» y marca «DEMOSTRACIÓN» en el PDF | Haiku | medio |
| D | Recurso `facturo-demo` en Coolify: dominios, base, variable y tarea nocturna | Opus, con el OK de Miguel | producción |
| E | Video de 2:30: guion, voces (Opus) y grabación (Haiku) | Opus y Haiku | medio |
| F | Guía para enviar | Opus | bajo |

- **Paralelo:** A y C van juntas, porque tocan archivos distintos y se ponen de acuerdo por el contrato del API. B va después de A. D, cuando A, B y C estén integradas. E y F van al final.
- **Verificación (Opus):**
  - leer cada diff;
  - correr las suites;
  - probar la demo local en el navegador y en el simulador;
  - confirmar que **producción no cambia** cuando falta `MODO_DEMO`.

## Pendiente de Miguel
- **WhatsApp:** el número que irá en la franja (o dejarlo vacío por ahora).
- **Presupuesto:** confirmar un segundo Postgres en el mismo VPS de Coolify.

---

## Anexo: contrato entre backend y frontend (fijado el 11-nov para las fases A y C)

- **Cuentas de demo:** `emprendedor@demo.facturo.example` y `servicios@demo.facturo.example`. Las crea la fase B; las pruebas de A crean las suyas.
- **`GET /api/demo/estado`**, público:
  - sin `MODO_DEMO=si` → **404**;
  - con él → **200** con:
    ```
    { activa: true, whatsapp: string|null, limiteDiario: 30,
      perfiles: [ { id: 'emprendedor', nombre, descripcion },
                  { id: 'servicios', nombre, descripcion },
                  { id: 'cliente', nombre, descripcion, enlaceFirma: '/es/sign/<token>'|null } ] }
    ```
  - `enlaceFirma` es la solicitud de firma PENDIENTE más reciente de la empresa de «servicios».
  - `whatsapp` sale de la columna nueva `ConfiguracionSitio.demoWhatsapp` (null = no se muestra).
- **`POST /api/demo/entrar { perfil: 'emprendedor'|'servicios' }`**, público y con límite de peticiones:
  - devuelve **lo mismo que `/api/auth/login`**: `{ user, session: { access_token, token_type } }`;
  - perfil inválido → 400; sin `MODO_DEMO` → 404; cuenta de demo inexistente → 503.
- **Bloqueos del candado:** **403** `{ error: '<mensaje en español>', codigo: 'DEMO_BLOQUEADO' }`.
- **Límite diario de comprobantes:** **429** `{ error, codigo: 'DEMO_LIMITE' }`.
- **PDF de comprobantes** (backend, `sunat/pdf/representacion.js`): marca de agua «DEMOSTRACIÓN». Los PDF que arma el navegador (proforma, factura antigua) los marca el frontend.
- **`PUT /api/admin/sitio/legal`:** acepta además `demoWhatsapp` (formato de celular peruano o vacío).
