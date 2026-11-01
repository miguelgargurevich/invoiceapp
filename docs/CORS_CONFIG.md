# Configuración de CORS

El backend (`apps/backend/app.js`) acepta peticiones del navegador solo desde los orígenes listados aquí. No hay comodines ni patrones por defecto.

## Orígenes permitidos

1. **Fijos (desarrollo):**
   - `http://localhost:3000`
   - `http://localhost:3001`
   - `http://127.0.0.1:3000`
   - Con `NODE_ENV=development`, cualquier origen `localhost`.

2. **Variable `FRONTEND_URL`:** el dominio del frontend desplegado, por ejemplo `https://facturacion.miempresa.com`.

3. **Variable `CORS_ORIGINS`:** dominios extra separados por comas (opcional):

   ```env
   CORS_ORIGINS=https://app.miempresa.com,https://admin.miempresa.com
   ```

   `ALLOWED_ORIGINS` (el nombre anterior) también se acepta. Si se usan las dos, se suman.

## Verificar CORS

```bash
curl -i -X OPTIONS http://localhost:4000/api/empresas \
     -H "Origin: https://app.miempresa.com" \
     -H "Access-Control-Request-Method: GET"

# Con un origen permitido responde:
#   Access-Control-Allow-Origin: https://app.miempresa.com
#   Access-Control-Allow-Credentials: true
```

## Características de seguridad

- **Lista explícita:** solo los orígenes configurados reciben cabeceras CORS.
- **Credenciales:** `credentials: true` para el envío del `Authorization`.
- **Métodos:** GET, POST, PUT, DELETE, PATCH, OPTIONS.
- **Cabeceras permitidas:** Content-Type, Authorization.
- **Bloqueos:** el backend registra en consola `CORS blocked origin: <origen>`.

## Troubleshooting

### Error: "Not allowed by CORS"

1. Comprueba que el origen (con protocolo y puerto) está en `FRONTEND_URL` o `CORS_ORIGINS`.
2. Revisa el log del backend: `CORS blocked origin: ...`.
3. Reinicia el backend después de cambiar las variables.

### La petición funciona en desarrollo pero no en producción

1. Verifica que `FRONTEND_URL` apunta al dominio real del frontend (con `https://`).
2. Añade ese dominio a `CORS_ORIGINS` si el frontend y el backend están en dominios distintos.
