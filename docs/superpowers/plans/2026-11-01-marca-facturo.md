# Marca Facturo — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:subagent-driven-development o superpowers:executing-plans. **Regla de Miguel que manda:** se ejecuta con la skill `delegar` (worktree propio por tarea, verificación de Opus).

**Objetivo:** reemplazar InvoiceApp por la marca **Facturo**: logo «ticket», favicon e íconos, la interfaz en verde y el nombre nuevo en los textos.

**Arquitectura:** el logo vive como componente React (`components/marca/LogoFacturo.tsx`, SVG en línea) y como archivos en `public/marca/`. El color se cambia en la rampa `primary` de Tailwind, y los azules hardcodeados pasan a esa rampa. El nombre se cambia en los textos visibles, no en los identificadores técnicos.

**Spec:** `docs/superpowers/specs/2026-11-01-marca-facturo-design.md`

## Restricciones globales

- Base: rama `feat/marca-facturo` (sale de `feat/sunat-frontend`, con el frontend SUNAT completo).
- Colores exactos: ticket `#0F6E56`, verde medio `#1D9E75`, menta `#5DCAA5`, texto claro `#2C2C2A`, texto sobre oscuro `#F1EFE8`.
- Sin dependencias nuevas en el proyecto. `@resvg/resvg-js` se instala solo en una carpeta temporal para exportar PNG.
- El frontend instala con `npm ci --legacy-peer-deps`. Verificación: desde `apps/frontend`, `npm test` y `npx tsc --noEmit`; `npx next build` al final de cada tarea.
- No cambian los identificadores técnicos: el repo, las carpetas, `invoiceapp/sunat-engine`, la base `invoiceapp` del compose, las claves de `localStorage` ni las bases de prueba.
- **Diferencia con el spec:** el logotipo con texto **no se convierte a trazos**. En la app se arma como ícono SVG más texto HTML en Geist (`LogoFacturo`). En los SVG sueltos, el texto usa `font-family="Geist, Inter, system-ui, sans-serif"`. Convertirlo exigiría herramientas de fuentes que no hay en la Mac.

**Orden:** la tarea 1 (piezas gráficas) y la 2 (color) van en paralelo, porque tocan archivos distintos. La 3 (nombre y logo) necesita las dos. La 4 la hace Opus.

---

### Tarea 1: Piezas gráficas, componente del logo e íconos de la app

`Riesgo: medio` · `Permitidos: apps/frontend/public/marca/**, apps/frontend/app/favicon.ico, apps/frontend/components/marca/LogoFacturo.tsx, apps/frontend/app/manifest.ts, scripts/marca/exportar.mjs, docs/HANDOFF.md`

**Produce:** `IconoFacturo({ tamano?, className? })` y `LogoFacturo({ variante?: 'icono'|'completo', tamano?, oscuro?, className? })` en `@/components/marca/LogoFacturo`; los archivos `public/marca/{facturo-icono.svg, favicon.svg, facturo-logotipo.svg, facturo-logotipo-oscuro.svg, icon-192.png, icon-512.png, apple-touch-icon.png}`; y `app/favicon.ico` (16, 32 y 48 px).

- [ ] **Paso 1: SVG.** Crear exactamente estos archivos.

`apps/frontend/public/marca/facturo-icono.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Facturo">
  <path d="M19 11a8 8 0 0 1 8-8H101a8 8 0 0 1 8 8V115L100 124L91 115L82 124L73 115L64 124L55 115L46 124L37 115L28 124L19 115Z" fill="#0F6E56"/>
  <rect x="40" y="25" width="12" height="58" rx="3" fill="#FFFFFF"/>
  <rect x="40" y="25" width="44" height="12" rx="3" fill="#FFFFFF"/>
  <rect x="40" y="49" width="31" height="12" rx="3" fill="#FFFFFF"/>
  <circle cx="84" cy="86" r="11" fill="#5DCAA5"/>
  <rect x="82" y="80" width="4" height="12" rx="2" fill="#0F6E56"/>
</svg>
```

`apps/frontend/public/marca/favicon.svg` (sin moneda, zigzag de 3 dientes):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Facturo">
  <path d="M19 11a8 8 0 0 1 8-8H101a8 8 0 0 1 8 8V115L91 127L73 115L55 127L37 115L19 127Z" fill="#0F6E56"/>
  <rect x="42" y="26" width="16" height="66" rx="4" fill="#FFFFFF"/>
  <rect x="42" y="26" width="46" height="16" rx="4" fill="#FFFFFF"/>
  <rect x="42" y="54" width="34" height="15" rx="4" fill="#FFFFFF"/>
</svg>
```

`apps/frontend/public/marca/facturo-logotipo.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 128" role="img" aria-label="Facturo">
  <path d="M19 11a8 8 0 0 1 8-8H101a8 8 0 0 1 8 8V115L100 124L91 115L82 124L73 115L64 124L55 115L46 124L37 115L28 124L19 115Z" fill="#0F6E56"/>
  <rect x="40" y="25" width="12" height="58" rx="3" fill="#FFFFFF"/>
  <rect x="40" y="25" width="44" height="12" rx="3" fill="#FFFFFF"/>
  <rect x="40" y="49" width="31" height="12" rx="3" fill="#FFFFFF"/>
  <circle cx="84" cy="86" r="11" fill="#5DCAA5"/>
  <rect x="82" y="80" width="4" height="12" rx="2" fill="#0F6E56"/>
  <text x="132" y="86" font-family="Geist, Inter, system-ui, sans-serif" font-size="64" font-weight="500" letter-spacing="-1.3" fill="#2C2C2A">factur<tspan fill="#1D9E75">o</tspan></text>
</svg>
```

`apps/frontend/public/marca/facturo-logotipo-oscuro.svg`: igual al anterior, con `fill="#F1EFE8"` en `<text>` y `fill="#5DCAA5"` en el `<tspan>`.

- [ ] **Paso 2: componente — `apps/frontend/components/marca/LogoFacturo.tsx`**

```tsx
import { cn } from '@/lib/utils';

interface IconoProps {
  tamano?: number;
  className?: string;
}

export function IconoFacturo({ tamano = 32, className }: IconoProps) {
  return (
    <svg viewBox="0 0 128 128" width={tamano} height={tamano} className={className} role="img" aria-label="Facturo">
      <path d="M19 11a8 8 0 0 1 8-8H101a8 8 0 0 1 8 8V115L100 124L91 115L82 124L73 115L64 124L55 115L46 124L37 115L28 124L19 115Z" fill="#0F6E56" />
      <rect x="40" y="25" width="12" height="58" rx="3" fill="#FFFFFF" />
      <rect x="40" y="25" width="44" height="12" rx="3" fill="#FFFFFF" />
      <rect x="40" y="49" width="31" height="12" rx="3" fill="#FFFFFF" />
      <circle cx="84" cy="86" r="11" fill="#5DCAA5" />
      <rect x="82" y="80" width="4" height="12" rx="2" fill="#0F6E56" />
    </svg>
  );
}

interface LogoProps extends IconoProps {
  variante?: 'icono' | 'completo';
  oscuro?: boolean;
}

// «factur» + «o» en verde, en la fuente de la app (Geist). `oscuro` fuerza los colores para fondos oscuros.
export function LogoFacturo({ variante = 'completo', tamano = 32, oscuro = false, className }: LogoProps) {
  if (variante === 'icono') return <IconoFacturo tamano={tamano} className={className} />;
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <IconoFacturo tamano={tamano} />
      <span
        className={cn('font-medium tracking-tight leading-none', oscuro ? 'text-[#F1EFE8]' : 'text-[#2C2C2A] dark:text-[#F1EFE8]')}
        style={{ fontSize: Math.round(tamano * 0.75) }}
      >
        factur<span className={oscuro ? 'text-[#5DCAA5]' : 'text-[#1D9E75] dark:text-[#5DCAA5]'}>o</span>
      </span>
    </span>
  );
}
```

- [ ] **Paso 3: script de exportación — `scripts/marca/exportar.mjs`**

```js
// Exporta los PNG y el favicon.ico de la marca desde los SVG de apps/frontend/public/marca.
// Uso (desde la raíz del repo):
//   T=$(mktemp -d) && npm i --prefix "$T" @resvg/resvg-js@2.6.2 >/dev/null && RESVG_DIR="$T" node scripts/marca/exportar.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const marca = path.join(raiz, 'apps/frontend/public/marca');
const require = createRequire(path.join(process.env.RESVG_DIR || raiz, 'noop.js'));
const { Resvg } = require('@resvg/resvg-js');

const aPng = (archivo, ancho, fondo) => new Resvg(fs.readFileSync(path.join(marca, archivo)), {
  fitTo: { mode: 'width', value: ancho },
  ...(fondo ? { background: fondo } : {}),
}).render().asPng();

const salidas = [
  ['facturo-icono.svg', 192, null, 'icon-192.png'],
  ['facturo-icono.svg', 512, null, 'icon-512.png'],
  ['facturo-icono.svg', 180, '#FFFFFF', 'apple-touch-icon.png'],
];
for (const [svg, ancho, fondo, destino] of salidas) {
  fs.writeFileSync(path.join(marca, destino), aPng(svg, ancho, fondo));
  console.log('ok', destino);
}

// ICO con PNG embebidos (16, 32, 48): cabecera de 6 bytes, una entrada de 16 bytes por imagen y luego los PNG.
const tamanos = [16, 32, 48];
const imagenes = tamanos.map((t) => aPng('favicon.svg', t));
const cabecera = Buffer.alloc(6 + 16 * imagenes.length);
cabecera.writeUInt16LE(0, 0);
cabecera.writeUInt16LE(1, 2);
cabecera.writeUInt16LE(imagenes.length, 4);
let desplazamiento = cabecera.length;
imagenes.forEach((img, i) => {
  const e = 6 + 16 * i;
  cabecera.writeUInt8(tamanos[i], e);
  cabecera.writeUInt8(tamanos[i], e + 1);
  cabecera.writeUInt8(0, e + 2);
  cabecera.writeUInt8(0, e + 3);
  cabecera.writeUInt16LE(1, e + 4);
  cabecera.writeUInt16LE(32, e + 6);
  cabecera.writeUInt32LE(img.length, e + 8);
  cabecera.writeUInt32LE(desplazamiento, e + 12);
  desplazamiento += img.length;
});
fs.writeFileSync(path.join(raiz, 'apps/frontend/app/favicon.ico'), Buffer.concat([cabecera, ...imagenes]));
console.log('ok favicon.ico');
```

- [ ] **Paso 4: exportar y comprobar**

Correr desde la raíz del worktree la línea de «Uso» del script. Luego `file apps/frontend/public/marca/*.png apps/frontend/app/favicon.ico`.
Esperado: `icon-192.png` es 192×192, `icon-512.png` 512×512, `apple-touch-icon.png` 180×180, y `favicon.ico` es «MS Windows icon resource - 3 icons». Revisa a ojo `icon-512.png` y `favicon.ico` (por ejemplo con `qlmanage -t`, o abriéndolos) y describe lo que ves en el resumen.

- [ ] **Paso 5: manifest — `apps/frontend/app/manifest.ts`**

Poner `name: 'Facturo'`, `short_name: 'Facturo'`, `theme_color: '#0F6E56'` y `background_color: '#FFFFFF'`. Reemplazar el bloque `icons` comentado por:

```ts
    icons: [
      { src: '/marca/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/marca/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/marca/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
```

- [ ] **Paso 6: verificar y commitear**

Correr: `cd apps/frontend && npx tsc --noEmit && npm test`
Esperado: sin errores.

```bash
git add apps/frontend/public/marca apps/frontend/app/favicon.ico apps/frontend/components/marca/LogoFacturo.tsx apps/frontend/app/manifest.ts scripts/marca/exportar.mjs
git commit -m "feat(marca): logo Facturo (ticket), favicon, íconos y componente LogoFacturo"
```

---

### Tarea 2: La interfaz pasa al verde de Facturo

`Riesgo: alto` · `Delicado: no` · `Permitidos: apps/frontend/tailwind.config.ts, apps/frontend/app/**/*.tsx, apps/frontend/components/**/*.tsx, apps/frontend/app/globals.css, docs/HANDOFF.md`

- [ ] **Paso 1: rampa `primary` en `apps/frontend/tailwind.config.ts`.** Reemplazar los valores azules de `primary` por:

```ts
        primary: {
          50: '#E1F5EE',
          100: '#C3EBDC',
          200: '#9FE1CB',
          300: '#7AD5B8',
          400: '#5DCAA5',
          500: '#1D9E75',
          600: '#0F6E56',
          700: '#0C5E49',
          800: '#085041',
          900: '#04342C',
        },
```

- [ ] **Paso 2: reemplazo automático de azules.** Guardar en tu scratchpad (no en el repo) y correr desde `apps/frontend`:

```js
// reemplazar-azules.mjs: blue/indigo/sky-N → primary-N en .tsx y .css (950 → 900). Excluye components/common/Badge.tsx.
import fs from 'node:fs';
import path from 'node:path';
const raices = ['app', 'components'];
const patron = /\b((?:[a-z-]+:)*)(bg|text|border|from|to|via|ring|ring-offset|fill|stroke|shadow|outline|decoration|divide|placeholder|accent|caret)-(blue|indigo|sky)-(\d{2,3})\b/g;
const excluir = new Set([path.normalize('components/common/Badge.tsx')]);
let total = 0;
const recorrer = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) recorrer(ruta);
    else if (/\.(tsx|css)$/.test(e.name) && !excluir.has(path.normalize(ruta))) {
      const antes = fs.readFileSync(ruta, 'utf8');
      let n = 0;
      const despues = antes.replace(patron, (_m, prefijo, prop, _color, tono) => { n += 1; return `${prefijo}${prop}-primary-${tono === '950' ? '900' : tono}`; });
      if (n) { fs.writeFileSync(ruta, despues); total += n; console.log(n, ruta); }
    }
  }
};
raices.forEach(recorrer);
console.log('total', total);
```

Esperado: unos 188 reemplazos.

- [ ] **Paso 3: devolver el azul donde significa «información».** Revisa el diff (`git diff --stat` y luego archivo por archivo) y vuelve a poner azul (`blue-*`) **solo** donde el color comunica información o un estado, no la marca. Por ejemplo: cajas o avisos con ícono `Info`, textos de ayuda informativos o el estado «pendiente». `Badge.tsx` ya quedó fuera, con sus variantes `info` e `indigo`. Lista cada archivo y línea que devolviste a azul en el mensaje del commit.

- [ ] **Paso 4: degradados del login y el registro.**
  - En `app/[locale]/login/page.tsx`, cambiar `to-purple-800` por `to-primary-900` en el fondo del panel (línea ~108).
  - En `app/[locale]/register/page.tsx`, cambiar `from-green-600 via-emerald-600 to-teal-700` por `from-primary-600 via-primary-700 to-primary-900`.

- [ ] **Paso 5: comprobar lo que queda**

Correr: `git grep -nE "(blue|indigo|sky)-[0-9]+" -- apps/frontend/app apps/frontend/components`
Esperado: solo `Badge.tsx` y las excepciones del paso 3.

- [ ] **Paso 6: verificar y commitear**

Correr: `cd apps/frontend && npx tsc --noEmit && npm test && npx next build`
Esperado: todo en verde.

```bash
git add apps/frontend/tailwind.config.ts   # y cada archivo modificado, uno por uno
git commit -m "feat(marca): la interfaz pasa al verde de Facturo"
```

---

### Tarea 3: Nombre Facturo y logo nuevo en la app

`Riesgo: alto` · `Delicado: no` · `Permitidos: apps/frontend/**, apps/backend/src/services/emailService.js, apps/backend/.env.example, README.md, FEATURES.md, docs/HANDOFF.md`

**Consume:** `IconoFacturo` y `LogoFacturo` de `@/components/marca/LogoFacturo` (tarea 1); la interfaz ya en verde (tarea 2).

- [ ] **Paso 1: logo en el menú — `components/global/Sidebar.tsx`.** Reemplazar el bloque de respaldo `{/* Fallback: Logo de la app */}` (el `<div className="w-8 h-8 bg-white …">` que contiene `<Image src="/invoiceapp-logo.png" …/>`) por:

```tsx
    // Fallback: logo de Facturo
    return (
      <div className="w-8 h-8 flex items-center justify-center">
        <IconoFacturo tamano={32} />
      </div>
    );
```

Agregar `import { IconoFacturo } from '@/components/marca/LogoFacturo';`. `Image` se sigue usando para el logo de la empresa: no lo quites.

- [ ] **Paso 2: logo en el login y el registro** (`app/[locale]/login/page.tsx` y `app/[locale]/register/page.tsx`; dos lugares por archivo).
  - Cada `<Image src="/invoiceapp-logo.png" … width={N} height={N} … />` pasa a `<IconoFacturo tamano={N - 8} />`.
  - Si el contenedor de ese logo tiene un fondo `bg-gradient-to-br from-primary-… to-primary-…`, cambia esas clases por `bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700`. Si no, el ticket verde queda sobre fondo verde y no se ve.
  - Agrega el import, y quita `import Image from 'next/image'` solo si el archivo ya no lo usa.
  - Borra `apps/frontend/public/invoiceapp-logo.png`.

- [ ] **Paso 3: metadatos.**
  - En `app/layout.tsx`, el título, la descripción, `openGraph`, `twitter` y `applicationName` pasan a «Facturo». Agrega `icons: { icon: [{ url: '/favicon.ico', sizes: 'any' }, { url: '/marca/favicon.svg', type: 'image/svg+xml' }], apple: '/marca/apple-touch-icon.png' }` y `themeColor` `#0F6E56` (en `viewport` si el archivo ya exporta uno).
  - Lo mismo en `app/[locale]/login/metadata.ts` y `lib/seo-schemas.ts`. En `public/ai.txt`, el nombre.

- [ ] **Paso 4: el nombre en los textos.** Reemplazar «InvoiceApp», «Invoice App» e «invoiceapp» por «Facturo» en todo texto visible:
  - `messages/es.json` y `messages/en.json` (valores, no claves).
  - Las páginas `app/[locale]/(legal)/*`, la ayuda, el login, el registro, el landing (`components/landing/*`) y `README.md` de la raíz y del frontend.
  - Los correos de `apps/backend/src/services/emailService.js`: el `fromName` por defecto `'Invoice App'` pasa a `'Facturo'`, igual que los textos de las plantillas.
  - `RESEND_FROM_NAME` en `apps/backend/.env.example`.

  **No tocar** los identificadores técnicos de las Restricciones globales. Tampoco las URLs con `invoiceapp` en código de infraestructura: si encuentras una, déjala y anótala.

- [ ] **Paso 5: comprobar lo que queda**

Correr: `git grep -niE "invoice ?app" -- apps README.md FEATURES.md ':!*package-lock.json'`
Esperado: solo identificadores técnicos. Lista cada resultado que quede con su justificación en el resumen.

- [ ] **Paso 6: verificar y commitear**

Correr: `cd apps/frontend && npx tsc --noEmit && npm test && npx next build` y `cd ../backend && npm test`
Esperado: todo en verde.

```bash
git add <cada archivo modificado>   # y git rm apps/frontend/public/invoiceapp-logo.png
git commit -m "feat(marca): nombre Facturo y logo nuevo en la app"
```

---

### Tarea 4: Revisión visual en Chrome (la hace Opus)

Con la app local (backend en :4001, frontend en :3000) corriendo desde la rama integrada, en Chrome:
- Login y registro (escritorio y móvil).
- Dashboard con el menú expandido y colapsado.
- Configuración, `/comprobantes` y el landing.
- Modo claro y oscuro, y el favicon en la pestaña.

Capturas de antes y después. Anotar cualquier contraste insuficiente (texto `primary-*` sobre fondos `primary-*`) y corregirlo antes de cerrar. Actualizar el HANDOFF.

## Cobertura del spec

| Spec | Tarea |
|---|---|
| Identidad (colores, logotipo) | 1, 2 |
| Piezas en `public/marca/`, favicon, PNG, script | 1 |
| Logo en el menú, el login y el registro; borrar el PNG viejo | 3 |
| Metadatos y manifest | 1, 3 |
| Nombre en textos, correos y README; identificadores técnicos intactos | 3 |
| Rampa `primary`, 188 azules, excepciones informativas, degradados | 2 |
| Verificación (tests, build, grep, Chrome) | 1–4 |
