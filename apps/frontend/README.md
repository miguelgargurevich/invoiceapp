# InvoiceApp — Frontend

Next.js 14 (App Router) con next-intl (es/en) y Tailwind. El desarrollo local completo (base de datos, backend y motor SUNAT) está en el [README principal](../../README.md).

## Desarrollo

```bash
cp .env.example .env.local
npm install --legacy-peer-deps   # sin --legacy-peer-deps no instala (peer deps de Next 14 y eslint-config-next)
npm run dev                      # http://localhost:3000
```

## Variables de entorno

| Variable | Para qué sirve |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | URL del backend, por ejemplo `http://localhost:4000`. |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio: metadatos, sitemap y datos estructurados. Por defecto `http://localhost:3000`. |

Las variables `NEXT_PUBLIC_*` se incorporan al compilar: `NEXT_PUBLIC_SITE_URL` debe estar definida antes de `npm run build`.

## Producción

```bash
npm run build
npm start
```
