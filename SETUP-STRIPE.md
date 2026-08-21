# Cómo activar los pagos reales con Stripe

Esta guía es para ti (el dueño del sitio). Son pasos que **solo tú puedes hacer**
porque requieren tus propias cuentas (Stripe, Google, Vercel). Yo ya dejé todo
el código listo — aquí solo conectas las piezas.

## Qué construí

- `api/create-payment-intent.js` — calcula el total **en el servidor** (nunca
  confía en lo que mande el navegador) y le pide a Stripe que prepare el cobro.
- `api/webhook.js` — Stripe le avisa a esta función cuando un pago **de verdad**
  se completó, y ahí (y solo ahí) se registra el pedido en tu Google Sheet.
- `api/_catalog.js` — la lista de precios real, la que se usa para cobrar.
  **Si agregas o cambias precios de productos en `index.html`, actualiza
  también este archivo** — si no, el cobro seguirá usando el precio viejo.
- `script.js` — ahora usa los campos reales de Stripe (Stripe Elements) para
  número de tarjeta, vencimiento y CVC. Esos datos ya no pasan por tu servidor
  ni por este código — van directo y cifrados a Stripe, como debe ser.
- `sheets/AppsScript.gs` — el script que convierte una Google Sheet normal en
  una base de datos que recibe pedidos en tiempo real.

## Antes de empezar

Necesitas cuatro cosas: una cuenta de **Stripe** (ya la tienes), una cuenta de
**Google** (para la hoja de cálculo), una cuenta de **Vercel** (gratis, para
hospedar el sitio con su backend), y que este repositorio esté en tu GitHub
(ya lo está).

---

## Paso 1 — Crear la "base de datos" en Google Sheets

1. Ve a [sheets.google.com](https://sheets.google.com) y crea una hoja nueva.
   Nómbrala como quieras, por ejemplo "Pedidos NexaPharm".
2. Menú **Extensiones → Apps Script**.
3. Borra el contenido de `Código.gs` y pega **todo** el contenido del archivo
   [`sheets/AppsScript.gs`](sheets/AppsScript.gs) de este repo.
4. Guarda (Ctrl/Cmd+S).
5. **Implementar → Nueva implementación**:
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario** (importante — si no, Stripe no
     podrá escribir en la hoja)
   - Clic en **Implementar**, autoriza los permisos que te pida Google.
6. Copia la **URL de la aplicación web** (termina en `/exec`). Guárdala — es tu
   `SHEETS_WEBHOOK_URL` del paso 4.

Cada vez que edites el script después, tienes que volver a "Gestionar
implementaciones" → editar → "Nueva versión" para que se actualice.

---

## Paso 2 — Tus claves de Stripe

En el [Dashboard de Stripe](https://dashboard.stripe.com/apikeys), en modo
**Prueba** (Test mode, el switch está arriba a la derecha):

- Copia la **Publishable key** (empieza con `pk_test_...`)
- Copia la **Secret key** (empieza con `sk_test_...`) — **nunca la pegues en
  el código ni en el chat conmigo**, solo va en las variables de entorno de
  Vercel (paso 4).

El **Webhook signing secret** lo obtienes en el paso 5, después de desplegar.

---

## Paso 3 — Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com) → **Add New → Project**.
2. Conecta tu cuenta de GitHub y selecciona el repositorio `nexapharmaceutical`.
3. Vercel detecta automáticamente `index.html` como sitio estático y todo lo
   que está en `/api` como funciones backend — no necesitas configurar nada
   más ahí. Dale **Deploy**.
4. Cuando termine, te da una URL tipo `https://nexapharmaceutical.vercel.app`
   — esa es tu sitio en vivo (puedes luego conectar tu dominio propio
   `nexapharm.com` desde Vercel → Settings → Domains).

---

## Paso 4 — Variables de entorno en Vercel

En tu proyecto de Vercel: **Settings → Environment Variables**. Agrega:

| Nombre | Valor |
|---|---|
| `STRIPE_SECRET_KEY` | tu `sk_test_...` del paso 2 |
| `SHEETS_WEBHOOK_URL` | la URL `/exec` del paso 1 |
| `STRIPE_WEBHOOK_SECRET` | (lo agregas en el paso 5) |
| `STRIPE_CURRENCY` | opcional — por defecto `usd`. Escribe `mxn` si cobras en pesos |

Después de agregar/editar variables, tienes que volver a desplegar
(**Deployments** → los tres puntos del último deploy → **Redeploy**) para que
tomen efecto.

---

## Paso 5 — Conectar el webhook de Stripe

1. En Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. URL del endpoint: `https://tu-sitio.vercel.app/api/webhook`
3. Evento a escuchar: busca y selecciona **`payment_intent.succeeded`**.
4. Guarda. Stripe te muestra un **Signing secret** (`whsec_...`) — cópialo.
5. Vuelve a Vercel → Environment Variables → pega ese valor en
   `STRIPE_WEBHOOK_SECRET` → guarda → **Redeploy**.

---

## Paso 6 — Pegar tu Publishable Key en el sitio

Abre `script.js`, busca esta línea cerca del inicio (línea ~7):

```js
const STRIPE_PUBLISHABLE_KEY = 'pk_test_REPLACE_WITH_YOUR_KEY';
```

Reemplázala por tu `pk_test_...` real del paso 2. Guarda, sube el cambio a
GitHub (o pégalo directo en Vercel si editas ahí) — Vercel vuelve a desplegar
solo con cada push.

---

## Paso 7 — Probar que todo funciona (modo prueba)

Con las claves `pk_test_` / `sk_test_` todavía activas:

1. Entra a tu sitio desplegado, agrega un producto, procede al pago.
2. Usa una [tarjeta de prueba de Stripe](https://stripe.com/docs/testing):
   número `4242 4242 4242 4242`, cualquier fecha futura, cualquier CVC.
3. Si todo está bien conectado: el pago se confirma en el sitio, aparece en
   Stripe Dashboard → Payments, **y** aparece una fila nueva en tu Google
   Sheet en segundos.
4. Si la fila no aparece en la hoja pero el pago sí se ve en Stripe: revisa
   Stripe Dashboard → Developers → Webhooks → tu endpoint → pestaña de
   intentos, ahí ves el error exacto.

---

## Paso 8 — Pasar a modo real (cobrar de verdad)

Cuando ya probaste todo:

1. En Stripe, cambia el switch a **modo Live** (arriba a la derecha).
2. Repite el paso 2 pero copiando las claves que empiezan con `pk_live_` /
   `sk_live_`.
3. Repite el paso 5 — el webhook de modo prueba y el de modo real son
   **distintos**, tienes que crear uno nuevo en modo Live y te da un
   `whsec_` diferente.
4. Actualiza `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` en Vercel con los
   valores Live, y `STRIPE_PUBLISHABLE_KEY` en `script.js` con el `pk_live_`.
5. Redeploy. A partir de aquí, los pagos son reales — pruébalo tú mismo una
   vez con una tarjeta real antes de anunciarlo.

---

## Notas de seguridad (no te las saltes)

- **Nunca** pegues una `sk_...` (secret key) en el código del sitio, en
  GitHub, ni en el chat conmigo — solo va en las variables de entorno de
  Vercel, que no son públicas.
- El número completo de tarjeta y el CVC **nunca** tocan tu servidor ni tu
  Google Sheet — Stripe los maneja directo en el navegador del cliente. Lo
  que se guarda en la hoja es solo el resumen del pedido (correo, productos,
  montos), nunca datos de la tarjeta.
- Si algún día sospechas que una clave secreta se filtró, revócala desde el
  Dashboard de Stripe y genera una nueva de inmediato.
