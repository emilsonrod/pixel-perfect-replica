# Pixel-Perfect Replica

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/31f6d100-e440-43ee-8f9a-48e645a73246).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Conexión con Supabase

La aplicación guarda productos, QR y pagos en Supabase. Sin las variables de entorno el catálogo muestra un aviso y la administración no está disponible.

1. **Base de datos.** Aplica `docs/supabase-schema.sql` y después `docs/supabase-seed.sql` (PostgreSQL 15 o superior). El diseño completo está en `docs/modelo-er-supabase.md`.
2. **Administrador.** En Supabase, *Authentication → Users*, crea el usuario y registra su UUID como `owner` en `public.business_members` (el final de `supabase-seed.sql` tiene el `INSERT` comentado).
3. **Variables de entorno.** Copia `.env.example` a `.env` y completa:
   - `VITE_SUPABASE_URL`: URL del proyecto.
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: clave publishable o anon. La aplicación rechaza claves `service_role` y `sb_secret_`.
   - `VITE_BUSINESS_SLUG`: slug del negocio (`casa-luma` por defecto).
4. **Arranque.** `npm install` y `npm run dev`. La administración está en `/admin/login`.

Cómo está dividido el código:

| Pieza | Archivos |
|---|---|
| Cliente y utilidades | `src/lib/supabase.ts`, `supabase-storage.ts`, `image-ref.ts`, `supabase-errors.ts` |
| Sesión y acceso | `src/features/auth/` (`AuthProvider`, `RequireAdmin`, `LoginPage`) |
| Productos | `src/features/catalog/repository.ts` y `product-provider.tsx` |
| Pagos | `src/features/payments/repository.ts` y `payment-provider.tsx` |

Los proveedores reciben un `repository` por prop, así las pruebas usan una versión en memoria y no necesitan red.

Limitaciones actuales:

- `RequireAdmin` solo evita mostrar pantallas a quien no corresponde. La protección real es la RLS de la base de datos.
- Las categorías siguen fijas en `src/features/catalog/model.ts` (Cerámica, Decoración, Accesorios) y deben existir con el mismo nombre en la tabla `categories`.
- Un cliente sin cuenta no puede saber si hay QR activo, así que el botón "Pagar con QR" se muestra siempre y el servidor responde si falta (decisión D3 pendiente).
- Las fotos del seed siguen apuntando a `/__l5e/assets-v1/...`; súbelas a Storage cuando quieras independizarte de Lovable.
- No hay límite de frecuencia para crear solicitudes de pago desde clientes anónimos.
