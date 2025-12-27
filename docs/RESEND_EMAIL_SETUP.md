# 📧 Configuración de Resend para Emails

## Resumen
El sistema usa **Resend** (https://resend.com) para el envío de correos electrónicos, incluyendo:
- Solicitudes de firma digital
- Confirmaciones de firma
- Facturas y proformas por email

## Configuración

### 1. Crear Cuenta en Resend

1. Visita https://resend.com
2. Crea una cuenta gratuita (incluye 3,000 emails/mes)
3. Verifica tu email

### 2. Obtener API Key

1. Accede al Dashboard de Resend
2. Ve a **API Keys** en el menú lateral
3. Click en **Create API Key**
4. Dale un nombre (ej: "InvoiceApp Production")
5. Copia la API Key (empieza con `re_`)

### 3. Verificar Dominio (Recomendado)

Para usar tu propio dominio (ej: `noreply@gargurevich.com`):

1. Ve a **Domains** en Resend
2. Click **Add Domain**
3. Ingresa tu dominio: `gargurevich.com`
4. Resend te dará registros DNS para configurar:
   - SPF (TXT)
   - DKIM (TXT)
   - DMARC (TXT)

5. Agrega estos registros en tu proveedor DNS:

**Ejemplo en Vercel DNS:**
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all

Type: TXT
Name: resend._domainkey
Value: [valor proporcionado por Resend]

Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@gargurevich.com
```

6. Espera la verificación (puede tardar hasta 48 horas, usualmente minutos)

### 4. Configurar Variables de Entorno

Edita el archivo `.env` en `apps/backend/`:

```env
# Resend Email API
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@gargurevich.com
RESEND_FROM_NAME=InvoiceApp

# Base URL para links en emails
FRONTEND_URL=https://invoiceapp.gargurevich.com
```

**Si usas dominio NO verificado** (solo para testing):
```env
RESEND_FROM_EMAIL=onboarding@resend.dev
```

### 5. Variables Requeridas

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `RESEND_API_KEY` | API Key de Resend | `re_123abc...` |
| `RESEND_FROM_EMAIL` | Email remitente | `noreply@gargurevich.com` |
| `RESEND_FROM_NAME` | Nombre remitente | `InvoiceApp` |
| `FRONTEND_URL` | URL base de la app | `https://invoiceapp.gargurevich.com` |

## Tipos de Emails

### 1. Solicitud de Firma (Signature Request)
**Trigger:** Cuando el dueño hace click en "Request Signature"

**Template:** HTML embebido en `emailService.js`

**Características:**
- ✅ Diseño responsive (mobile-friendly)
- ✅ Botón CTA destacado "Sign Document Now"
- ✅ Información del documento (número, monto)
- ✅ Fecha de expiración (7 días)
- ✅ Logo de la empresa (si está configurado)
- ✅ Instrucciones claras
- ✅ Link de firma en texto plano (fallback)
- ✅ Cumplimiento legal (ESIGN/UETA)

### 2. Confirmación de Firma (Signature Confirmation)
**Trigger:** Cuando el cliente completa la firma

**Enviado a:**
- Cliente (confirmación)
- Dueño del negocio (notificación)

**Características:**
- ✅ Ícono de éxito
- ✅ Detalles de la firma (fecha, hora)
- ✅ Link de descarga del PDF firmado
- ✅ Mensaje personalizado según destinatario

## Testing

### Modo Test (Sin Dominio Verificado)

Usa el dominio de testing de Resend:
```env
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Limitaciones:**
- Solo puedes enviar a tu propio email verificado
- No puedes enviar a clientes reales
- Limitado a 100 emails/día

### Verificar Envío

1. Activa el endpoint:
```bash
cd apps/backend
npm run dev
```

2. Crea una solicitud de firma desde el frontend

3. Verifica en el Dashboard de Resend:
   - Ve a **Logs**
   - Deberías ver el email enviado
   - Click para ver detalles (HTML preview, estado, errores)

## Troubleshooting

### ❌ "Invalid API key"
- Verifica que `RESEND_API_KEY` esté correctamente configurada
- La key debe empezar con `re_`
- No dejes espacios al copiarla

### ❌ "Domain not verified"
- Si usas tu dominio, verifica que esté verificado en Resend
- Revisa los registros DNS (SPF, DKIM, DMARC)
- Usa `onboarding@resend.dev` para testing

### ❌ "Email not sent"
- Revisa los logs del backend: `console.log` mostrará errores
- Verifica el Dashboard de Resend > Logs para ver el estado
- Asegúrate de que `FRONTEND_URL` esté configurada correctamente

### ❌ Link de firma no funciona
- Verifica que `FRONTEND_URL` no termine en `/`
- Debe ser: `https://invoiceapp.gargurevich.com` (sin barra final)
- El link generado será: `${FRONTEND_URL}/en/sign/${token}`

## Límites del Plan Gratuito

**Resend Free Tier:**
- ✅ 3,000 emails/mes
- ✅ 100 emails/día
- ✅ 1 dominio verificado
- ✅ Soporte para templates HTML
- ✅ API completa

Para más información: https://resend.com/pricing

## Variables de Producción (Vercel)

Si despliegas en Vercel, agrega las variables:

```bash
vercel env add RESEND_API_KEY
vercel env add RESEND_FROM_EMAIL
vercel env add RESEND_FROM_NAME
vercel env add FRONTEND_URL
```

O desde el Dashboard de Vercel:
1. Ve a tu proyecto > Settings > Environment Variables
2. Agrega cada variable con su valor
3. Redeploy la aplicación

## Monitoreo

**Dashboard de Resend:**
- Emails enviados (última hora, día, mes)
- Tasa de entrega
- Errores y bounces
- Webhooks para eventos (opcional)

## Próximos Pasos

1. ✅ Obtener API Key de Resend
2. ✅ Verificar dominio (recomendado)
3. ✅ Configurar variables en `.env`
4. ✅ Reiniciar el backend
5. ✅ Probar enviando una solicitud de firma
6. ✅ Verificar email en bandeja de entrada
7. ✅ Revisar logs en Resend Dashboard

---

**Soporte:**
- Documentación Resend: https://resend.com/docs
- API Reference: https://resend.com/docs/api-reference
