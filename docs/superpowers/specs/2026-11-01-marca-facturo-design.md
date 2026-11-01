# Diseño — Nueva marca: Facturo (logo «ticket» y color verde)

> Fecha: 2026-11-01 · Estado: aprobado por Miguel (nombre, concepto y aplicación) · Rama: `feat/marca-facturo`

## Decisiones tomadas

- **Nombre:** «InvoiceApp» pasa a **Facturo** en todo lo que ve el usuario. Pendiente fuera de este trabajo: verificar el dominio y el registro de marca en INDECOPI.
- **Concepto:** ticket. Un recibo con borde inferior en zigzag, una «F» hecha de barras (como líneas de comprobante) y una moneda menta con su ranura.
- **Color:** el color principal de toda la interfaz pasa del azul al verde del ticket.

## 1. Identidad

| Elemento | Valor |
|---|---|
| Verde principal (ticket) | `#0F6E56` |
| Verde medio («o» del logotipo, hover) | `#1D9E75` |
| Menta (moneda, «o» sobre oscuro) | `#5DCAA5` |
| Texto del logotipo (claro / oscuro) | `#2C2C2A` / `#F1EFE8` |
| Tipografía del logotipo | Geist (la fuente de la app), peso 500, tracking −0.02em, en minúsculas: «factur» + «o» en verde |

Rampa `primary` de Tailwind (reemplaza la azul):
`50 #E1F5EE · 100 #C3EBDC · 200 #9FE1CB · 300 #7AD5B8 · 400 #5DCAA5 · 500 #1D9E75 · 600 #0F6E56 · 700 #0C5E49 · 800 #085041 · 900 #04342C`.
La 600 es el verde del ticket. En el modo oscuro se usan 400 y 500 para el texto y los acentos, que ya contrastan sobre gris oscuro.

## 2. Piezas gráficas (`apps/frontend/public/marca/`)

Todo nace de SVG dibujados a mano (sin efectos, sin degradados), con las proporciones del boceto aprobado:

| Archivo | Uso |
|---|---|
| `facturo-icono.svg` | Ícono completo (ticket + F + moneda) |
| `facturo-logotipo.svg` | Ícono + «facturo», para fondo claro |
| `facturo-logotipo-oscuro.svg` | Ícono + «facturo» en `#F1EFE8` y «o» menta, para fondo oscuro |
| `favicon.svg` | Versión simplificada sin moneda y con zigzag de 3 dientes, que se lee a 16 px |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (180) | Exportados del ícono, con margen de seguridad |
| `apps/frontend/app/favicon.ico` | 16, 32 y 48 px, exportado de `favicon.svg` (reemplaza el de Next) |

Los PNG y el ICO se generan con un script reproducible (`scripts/marca/exportar.mjs`). Rasteriza los SVG con `@resvg/resvg-js`, que se ejecuta con `npx` y no se agrega a las dependencias del proyecto, porque en la Mac no hay `sharp` ni `rsvg-convert`. El `.ico` lo arma el mismo script, empaquetando los PNG de 16, 32 y 48 px (el formato ICO admite PNG embebidos). Los binarios se commitean.

El texto del logotipo se convierte a trazos (paths) en el SVG, para no depender de que el navegador tenga la fuente.

## 3. Aplicación en la app

1. **Logo:** `components/global/Sidebar.tsx`, `app/[locale]/login/page.tsx` y `app/[locale]/register/page.tsx` dejan `/invoiceapp-logo.png` y usan el ícono o el logotipo SVG según el espacio (el ícono con el menú colapsado, el logotipo en el login). Se borra `public/invoiceapp-logo.png`.
2. **Metadatos:** `app/layout.tsx` (title, description, openGraph, `icons`), `app/manifest.ts` (name, short_name, `theme_color #0F6E56` e íconos 192/512), `lib/seo-schemas.ts` y `public/ai.txt`.
3. **Nombre en textos:** reemplazar «InvoiceApp» / «Invoice App» por «Facturo» en `messages/es.json` y `messages/en.json`, el landing (`components/landing/*`), las páginas legales (`app/[locale]/(legal)/*`), la ayuda, el login y el registro, los correos (`apps/backend/src/services/emailService.js`, incluido `RESEND_FROM_NAME` por defecto), `.env.example` y los README.
   **No cambian** los identificadores técnicos: el nombre del repo, las carpetas, los paquetes (`invoiceapp/sunat-engine`), la base de datos `invoiceapp` del compose, las claves de `localStorage` ni los nombres de bases de prueba.
4. **Color:**
   - `tailwind.config.ts`: la rampa `primary` pasa a la verde de la sección 1.
   - Los 188 usos hardcodeados de `blue-*`, `indigo-*` y `sky-*` en 49 archivos del frontend se reemplazan por `primary-*` con el mismo número de tono. Los degradados `from-blue-500 to-indigo-600` pasan a `from-primary-500 to-primary-700`.
   - **Excepción, que se revisa caso por caso:** donde el azul significa «información» (la variante `info` de `Badge`, avisos informativos, el estado «Pendiente de envío» de SUNAT) se mantiene azul, porque es un color de estado y no de marca. La lista de excepciones queda en el resumen del commit.
   - Los gradientes del login y el registro (azul → violeta) pasan a verde (`primary-700` → `primary-900`).

## 4. Verificación

- `npm test` y `npx tsc --noEmit` del frontend, y `npm test` del backend (por el cambio en los correos), en verde.
- `npx next build` en verde.
- Que no quede ninguna mención: `git grep -niE "invoice ?app" -- apps ':!*package-lock.json'` solo devuelve identificadores técnicos justificados, y `git grep -nE "(blue|indigo|sky)-[0-9]+" -- apps/frontend` solo devuelve las excepciones de color de estado.
- **Revisión visual en Chrome, que hace Opus** con la app local: login, registro, dashboard, menú colapsado y expandido, configuración, comprobantes y landing, en modo claro y oscuro. También el favicon en la pestaña. Capturas antes y después.

## Fuera de alcance

El cambio de dominio, la cuenta de correo del remitente (el dominio de Resend), el registro de marca, los perfiles en redes y el repo de GitHub.
