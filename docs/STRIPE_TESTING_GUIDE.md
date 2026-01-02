# 🧪 Guía de Pruebas - Stripe Subscriptions

**Basado en la documentación oficial de Stripe:**  
https://docs.stripe.com/billing/subscriptions/build-subscriptions

---

## 📋 Resumen de Implementación

Tu implementación sigue las mejores prácticas de Stripe y incluye:

✅ **Checkout Session** - Páginas alojadas por Stripe  
✅ **Webhooks** - Eventos `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`  
✅ **Customer Portal** - Para que clientes gestionen sus suscripciones  
✅ **Gestión de estados** - TRIALING, ACTIVE, PAST_DUE, CANCELED  
✅ **Metadata** - Para vincular con tu base de datos  

---

## 🚀 Pasos Rápidos

### 1. Configurar Variables de Entorno

```bash
# apps/backend/.env
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000
```

### 2. Aplicar Migración

```bash
cd apps/backend
npx prisma db push
```

### 3. Crear Productos en Stripe

Dashboard → Products → Create product

**3 planes recomendados:**
- **Starter:** $15/mes, $144/año
- **Pro:** $29/mes, $278/año ⭐ Popular
- **Business:** $49/mes, $470/año

### 4. Iniciar Webhooks Local

```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```

### 5. Probar Checkout

```bash
curl -X POST http://localhost:4000/api/subscriptions/create-checkout-session \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{"planId":"uuid","billingInterval":"MONTH"}'
```

**Tarjeta de prueba:** `4242 4242 4242 4242`

---

## 📦 Configuración Detallada

### Crear Productos y Precios

#### Opción A: Dashboard Manual

1. https://dashboard.stripe.com/test/products
2. "+ Create product"
3. Configurar:
   - Name: `Starter`
   - Description: `Perfect for freelancers`
   - **Monthly Price:** $15 USD, Recurring, Monthly
   - **Yearly Price:** $144 USD, Recurring, Yearly
4. Copiar los Price IDs (ej: `price_1ABC...`)

#### Opción B: Stripe CLI

```bash
# Crear producto
stripe products create --name="Starter" --description="Basic plan"

# Crear precio mensual (reemplaza prod_xxx)
stripe prices create \
  --product=prod_xxx \
  --unit-amount=1500 \
  --currency=usd \
  --recurring[interval]=month

# Crear precio anual
stripe prices create \
  --product=prod_xxx \
  --unit-amount=14400 \
  --currency=usd \
  --recurring[interval]=year
```

### Guardar Price IDs en DB

```sql
UPDATE plans 
SET 
  stripe_price_id_monthly = 'price_1ABC123',
  stripe_price_id_yearly = 'price_1ABC124',
  stripe_product_id = 'prod_XXXXX'
WHERE slug = 'starter';
```

---

## 🔗 Configurar Webhooks

### Desarrollo Local (Stripe CLI)

```bash
# Terminal 1: Backend
npm start

# Terminal 2: Stripe CLI
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```

**Salida:**
```
Ready! Your webhook signing secret is whsec_xxx...
```

Copia el `whsec_xxx` a tu `.env`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Producción

1. https://dashboard.stripe.com/test/webhooks
2. "+ Add endpoint"
3. URL: `https://tu-api.com/api/webhooks/stripe`
4. Eventos a escuchar:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copiar Signing secret a producción

---

## 🧪 Probar Flujos Completos

### Test 1: Nueva Suscripción

**Backend:**
```javascript
POST /api/subscriptions/create-checkout-session
{
  "planId": "uuid-del-plan",
  "billingInterval": "MONTH"
}
```

**Respuesta:**
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

**Pasos:**
1. Abrir URL en navegador
2. Completar con tarjeta: `4242 4242 4242 4242`
3. Verificar redirect a `/en/settings?success=true`
4. Verificar webhook `checkout.session.completed`
5. Verificar en DB: subscription con status `TRIALING` o `ACTIVE`

### Test 2: Customer Portal

**Backend:**
```javascript
POST /api/subscriptions/create-portal-session
// Respuesta: { "url": "https://billing.stripe.com/..." }
```

**En el portal puedes:**
- Ver detalles de suscripción
- Actualizar método de pago
- Cancelar suscripción
- Descargar facturas

### Test 3: Pago Fallido

1. En Dashboard: Subscriptions → Tu suscripción
2. "..." → "Simulate payment failure"
3. Verificar webhook `invoice.payment_failed`
4. Verificar en DB: status = `PAST_DUE`
5. Tu backend debe notificar al usuario

### Test 4: Cancelación

**Backend:**
```javascript
POST /api/subscriptions/cancel
```

**Verifica:**
- `cancel_at_period_end = true`
- Usuario mantiene acceso hasta fin de período
- Al final: webhook `customer.subscription.deleted`
- Status en DB: `CANCELED`

---

## 💳 Tarjetas de Prueba

### Pagos Exitosos
- **Visa:** `4242 4242 4242 4242`
- **Mastercard:** `5555 5555 5555 4444`
- **Amex:** `3782 822463 10005`

### Pagos que Fallan
- **Rechazada:** `4000 0000 0000 0002`
- **Sin fondos:** `4000 0000 0000 9995`
- **Requiere autenticación:** `4000 0027 6000 3184`

### Fecha, CVC, ZIP
- **Fecha:** Cualquier fecha futura (ej: `12/28`)
- **CVC:** `123` o cualquier 3 dígitos
- **ZIP:** `12345` o cualquier código postal

**Documentación completa:** https://docs.stripe.com/testing

---

## 📊 Monitorear Eventos

### Dashboard (Workbench)
https://dashboard.stripe.com/workbench/events

- Ver eventos en tiempo real
- Filtrar por tipo
- Ver payload completo

### Stripe CLI
```bash
# Ver eventos en vivo
stripe listen

# Ver últimos 10 eventos
stripe events list --limit 10

# Ver detalle de un evento
stripe events retrieve evt_xxx
```

### Logs Backend
```
✅ Webhook verified: checkout.session.completed
💳 Checkout session completed: cs_test_xxx
✅ Subscription created/updated for empresa: uuid-xxx
```

---

## 🎯 API Reference

### Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/subscriptions/plans` | Listar planes disponibles |
| `GET` | `/api/subscriptions/current` | Suscripción actual del usuario |
| `POST` | `/api/subscriptions/create-checkout-session` | Crear sesión de pago |
| `POST` | `/api/subscriptions/create-portal-session` | Crear sesión del portal |
| `POST` | `/api/subscriptions/cancel` | Cancelar suscripción |
| `POST` | `/api/subscriptions/reactivate` | Reactivar suscripción |
| `GET` | `/api/subscriptions/usage` | Ver uso actual |
| `POST` | `/api/webhooks/stripe` | Webhook de Stripe |

### Ejemplo: Crear Checkout

**Request:**
```bash
curl -X POST http://localhost:4000/api/subscriptions/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "planId": "uuid-del-plan-pro",
    "billingInterval": "YEAR"
  }'
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_a1B2c3...",
  "sessionId": "cs_test_a1B2c3..."
}
```

---

## 🐛 Troubleshooting

### ❌ "No such price"
**Causa:** Price ID no existe  
**Solución:** Verifica el Price ID en Dashboard → Products

### ❌ Webhooks no se reciben
**Causa:** Secret incorrecto o CLI no está corriendo  
**Solución:**
```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
# Copiar el whsec_xxx a .env
```

### ❌ "Invalid signature"
**Causa:** `STRIPE_WEBHOOK_SECRET` incorrecto  
**Solución:** Usa el secret generado por `stripe listen` o el del Dashboard

### ❌ "Customer already subscribed"
**Causa:** Stripe permite 1 suscripción activa por customer  
**Solución:** Cancela la suscripción existente primero

### ❌ Checkout redirect falla
**Causa:** `FRONTEND_URL` mal configurado  
**Solución:** Verifica que tenga protocolo: `http://localhost:3000`

---

## 📚 Recursos Oficiales

- **Guía principal:** https://docs.stripe.com/billing/subscriptions/build-subscriptions
- **Dashboard (Test):** https://dashboard.stripe.com/test/dashboard
- **API Docs:** https://docs.stripe.com/api
- **Código de ejemplo:** https://github.com/stripe-samples/checkout-single-subscription
- **Tarjetas de prueba:** https://docs.stripe.com/testing
- **Webhooks:** https://docs.stripe.com/webhooks

---

## ✅ Checklist de Implementación

- [ ] Variables de entorno configuradas
- [ ] Productos creados en Stripe
- [ ] Price IDs guardados en BD
- [ ] Migración aplicada (`npx prisma db push`)
- [ ] Checkout probado exitosamente
- [ ] Webhooks configurados y recibiendo eventos
- [ ] Customer Portal probado
- [ ] Pago fallido manejado correctamente
- [ ] Cancelación probada
- [ ] Logs y monitoreo funcionando

---

**Estado:** ✅ Sistema completo y listo para pruebas  
**Documentación:** Basada en guías oficiales de Stripe  
**Última actualización:** 2 enero 2026
