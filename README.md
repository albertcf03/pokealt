# PokeAlt · Tienda y subastas de Pokémon TCG

Tienda web en React con base de datos real en **Supabase**: catálogo, stock, pedidos, subastas en tiempo real, cuentas de cliente, panel de administración y Libro de Reclamaciones.

Sin configurar nada, la web arranca en **modo demo** (los datos se guardan solo en el navegador). Con las dos variables de Supabase pasa a usar la base de datos real.

---

## Qué hace el backend

| Parte | Cómo funciona |
|---|---|
| Catálogo y stock | Todos los visitantes ven el mismo stock. Los cambios del admin aparecen al instante en todas las pantallas. |
| Pedidos | Se registran con `place_order()`: descuenta el stock en la misma operación, rechaza si no alcanza y toma los precios de la base de datos (no del navegador). |
| Subastas | Las pujas pasan por `place_bid()`: exige cuenta con perfil completo, valida el monto mínimo y el cierre, y si alguien puja en los últimos 2 minutos la subasta se extiende 2 minutos (anti-francotirador). Todos ven la puja nueva en vivo. |
| Cuentas | Registro con correo y contraseña, recuperación de contraseña y perfil con nombre, alias público, DNI/CE y celular. En el historial de pujas solo se ve el alias, parcialmente oculto. |
| Panel admin | Solo lo ven las cuentas con rol `admin`. Edita productos, precios, stock, configuración, pedidos (cancelar devuelve el stock) y reclamos. |
| Libro de Reclamaciones | `submit_claim()` asigna el número correlativo por año (`000001-2026`) y calcula el vencimiento a 15 días hábiles. |
| Avisos de pedidos | Cada pedido nuevo te llega por correo (Resend) y/o WhatsApp (CallMeBot); opcionalmente el cliente recibe un correo de confirmación. Con la tienda abierta, el admin ve el aviso en pantalla con timbre. Se configura en **Admin → Configuración → Avisos**. |
| Fotos de productos | En **Admin → Inventario** el botón de cámara sube una foto desde el celular o la computadora. Se achica en el navegador y se guarda en Supabase Storage (bucket `product-images`). |
| Seguridad | Row Level Security en todas las tablas: un cliente solo ve sus pedidos, nadie puede darse rol de admin y los datos personales de los postores no son públicos. |

Todavía **no** incluye: cobro real con tarjeta (en modo real la pestaña Tarjeta muestra "llega muy pronto"; Yape y Plin se verifican a mano), boletas/facturas electrónicas ni página con varias subastas. Son los siguientes pasos.

---

## Paso a paso para ponerla en línea

> **Ya hecho:** el proyecto de Supabase `pokealt` (región São Paulo) está creado, con las tablas, reglas de seguridad, los 14 productos, la configuración y la primera subasta. La web ya apunta a ese proyecto desde `src/config.js`, así que **no hace falta configurar variables en Vercel**. Los pasos 1 a 3 quedan como referencia por si algún día creas otro proyecto.

### 1. Crear el proyecto en Supabase (gratis)
1. Entra a [supabase.com](https://supabase.com) y crea una cuenta.
2. **New project** → ponle `pokealt`, elige una contraseña para la base de datos (guárdala) y como región **South America (São Paulo)**, la más cercana a Perú.
3. Espera 1 a 2 minutos a que el proyecto termine de crearse.

### 2. Crear las tablas
1. En el menú izquierdo abre **SQL Editor** → **New query**.
2. Copia todo el contenido de `supabase/schema.sql`, pégalo y presiona **Run**. Debe decir *Success*.
3. Abre otra **New query**, pega `supabase/seed.sql` y presiona **Run**. Esto carga los 14 productos, la configuración y la primera subasta (cierra un domingo a las 20:00, hora de Lima).
4. Repite con `supabase/notifications.sql` (avisos de pedidos) y `supabase/storage.sql` (fotos de productos).

### 3. Copiar las llaves
En **Project Settings → API Keys** copia la **Project URL** y la **Publishable key** (empieza con `sb_publishable_`) y ponlas en `src/config.js`.

> Nunca uses la *secret key* ni la *service_role key* en la web.

### 4. Publicar la web en Vercel (gratis)
1. El código debe estar en un repositorio de GitHub (sin la carpeta `node_modules`).
2. Entra a [vercel.com](https://vercel.com) con tu cuenta de GitHub → **Add New → Project** → elige el repositorio → **Import**.
3. Presiona **Deploy** (no hace falta tocar nada más). Vercel te da una dirección como `pokealt.vercel.app`.

### 5. Conectar el login con tu dirección web
En Supabase: **Authentication → URL Configuration**:
- **Site URL**: tu dirección de Vercel (o tu dominio, por ejemplo `https://pokealt.pe`).
- **Redirect URLs**: agrega la misma dirección.

Así los correos de confirmación y de "olvidé mi contraseña" llevan a tu web.

### 6. Hacerte administrador
1. En tu web, haz clic en **Ingresar → Crear cuenta** con tu correo y confirma el correo que te llega.
2. En Supabase → **SQL Editor** ejecuta (con tu correo):
   ```sql
   update public.profiles set role = 'admin' where email = 'tu@correo.com';
   ```
3. Vuelve a entrar a la web: verás el botón **Admin**.

### 7. Activar los avisos de pedidos
En **Admin → Configuración → Avisos de pedidos nuevos**:
- **Correo**: crea una cuenta gratis en [resend.com](https://resend.com) con tu correo, entra a **API Keys**, crea una clave y pégala. Escribe ese mismo correo en "Tu correo". Sin dominio propio, Resend solo envía al correo de tu cuenta.
- **WhatsApp**: guarda en tus contactos el número de CallMeBot que figura en [callmebot.com](https://www.callmebot.com/blog/free-api-whatsapp-messages/), envíale `I allow callmebot to send me messages` y pega la apikey que te responde. Escribe tu número con 51 adelante.
- Presiona **Guardar avisos** y luego **Enviar aviso de prueba**. Abajo aparece si cada envío salió bien.
- **Correo al cliente**: activa la opción cuando verifiques tu dominio en Resend (por ejemplo `pokealt.pe`) y usa un remitente de ese dominio.

Las claves quedan cifradas en Supabase Vault; la web nunca las vuelve a mostrar.

### 8. Antes de abrir al público
- **Correos**: el servicio de correo incluido en Supabase solo envía unos pocos correos por hora. Configura un SMTP propio en **Authentication → Emails → SMTP Settings** (por ejemplo con [Resend](https://resend.com), que tiene plan gratis) para que todos los clientes reciban su confirmación.
- **Datos reales**: en el panel **Admin → Configuración** pon tus números de Yape y Plin.
- **Dominio**: en Vercel → **Settings → Domains** puedes conectar `pokealt.pe`.

---

## Para desarrolladores

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # genera dist/
```

- `src/Pokealt.jsx`: toda la interfaz. Recibe la prop `backend`; sin ella funciona en modo demo con localStorage (así corre también dentro de un Artifact de Claude).
- `src/config.js`: dirección y llave pública del proyecto de Supabase (las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` de `.env` o Vercel tienen prioridad).
- `src/backend/supabase.js`: capa de datos (consultas, funciones RPC, tiempo real y cuentas).
- `supabase/schema.sql`: tablas, funciones y reglas de seguridad. Se puede ejecutar de nuevo sin perder datos.
- `supabase/seed.sql`: datos iniciales. No duplica si se vuelve a ejecutar.
- `supabase/notifications.sql`: avisos de pedidos con `pg_net` y claves en Vault. Solo corre en Supabase; `place_order()` lo llama si existe y el pedido se guarda aunque el aviso falle.
- `supabase/storage.sql`: bucket público `product-images`; solo el admin sube, cambia o borra.

### Gestionar subastas
Mientras se construye la página de subastas, se crean desde **Table Editor → auctions → Insert row** (título, grado, precio base, incremento y fecha de cierre `ends_at`) o con SQL:

```sql
insert into public.auctions (title, grade, image, start_price, increment, ends_at)
values ('Blastoise 2/102 Holo · Base Set', 'PSA 9 · Unlimited', 'water', 900, 20, '2026-10-11 20:00:00-05');
```

La web muestra la subasta activa que cierra primero.

### Suscripciones a alertas de stock
Los números que se suscriben desde la web quedan en la tabla `stock_alerts` (Table Editor).
