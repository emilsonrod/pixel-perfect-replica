# Reporte de cambios: integración con Supabase

Proyecto: Casa Luma · Catálogo Digital. Base de datos: proyecto Supabase `FirstApp` (`gjabtaktzisqfhljdhtr`).

Todos los cambios están en el árbol de trabajo y **no se han confirmado en git**. Antes de esta integración se aplicó una remediación de seguridad parcial (Vite, cabeceras HTTP, sanitizadores). Esos cambios aparecen mezclados en `git diff`, por eso la sección 9 los separa.

---

## 1. Resumen

| Antes | Ahora |
|---|---|
| Productos y pagos en `localStorage` de cada navegador | Productos, QR y pagos en Supabase (PostgreSQL, Storage, RPC) |
| `/admin` público, sin cuentas | `/admin` exige iniciar sesión con Supabase Auth y ser miembro del negocio |
| Fotos como data URI base64 dentro del JSON | Fotos en buckets de Storage; la base guarda solo la ruta |
| Cliente creaba la solicitud de pago y decidía el importe en el navegador | El servidor decide importe y origen; el cliente sin cuenta usa funciones RPC |
| Enlaces de pago válidos solo en el mismo navegador | Enlaces de pago válidos en cualquier dispositivo |

Arquitectura: cada pantalla sigue hablando con su contexto React (`useProducts`, `usePayments`). El contexto delega en un **repositorio** que habla con Supabase. Los proveedores aceptan un `repository` por prop, así las pruebas usan una versión en memoria.

```
Pantalla -> useProducts / usePayments -> Provider -> Repository -> Supabase
                                          ^ useAuth (sesión y membresía)
```

---

## 2. Archivos nuevos

### Cliente y utilidades (`src/lib/`)

| Archivo | Contenido |
|---|---|
| `supabase.ts` | `getSupabase()` crea el cliente una sola vez. `isSupabaseConfigured`, `businessSlug` (de `VITE_BUSINESS_SLUG`, por defecto `casa-luma`). `isPrivilegedKey()` detecta claves `service_role` y `sb_secret_` y `getSupabase()` se niega a usarlas. En servidor no guarda sesión. |
| `supabase-storage.ts` | `getBusinessId()` busca el id del negocio por slug (con caché). `publicUrl()`, `displayImage()` (convierte ruta de Storage en URL; deja intactas las rutas `/__l5e/...`), `uploadDataUri()` (sube a `<carpeta>/<uuid>.<ext>`). |
| `image-ref.ts` | Funciones puras sin red: `BUCKETS` (`product-images`, `payment-qr`, `payment-receipts`), `mimeExtension()`, `parseImageDataUri()`, `pathFromPublicUrl()`, `isManagedAsset()`. |
| `supabase-errors.ts` | `userMessage()`: deja pasar los mensajes en español que lanzan las funciones SQL (`P0001`, `23514`), traduce `42501` a "No tienes permiso…" y oculta cualquier otro error con un texto genérico. |

### Autenticación (`src/features/auth/`)

| Archivo | Contenido |
|---|---|
| `auth-context.ts` | `AuthContext`, `useAuth()`. Valor: `ready`, `configured`, `user`, `isMember`, `signIn()`, `signOut()`. |
| `auth-provider.tsx` | `AuthProvider`. Escucha `onAuthStateChange`, consulta `business_members` para saber si el usuario pertenece al negocio. `signIn` devuelve mensajes distintos para correo sin confirmar, demasiados intentos y falla de red; cualquier otro fallo dice "Correo o contraseña incorrectos". |
| `login-page.tsx` | `LoginPage`: formulario de correo y contraseña. Redirige a `/admin` cuando hay sesión y membresía. |
| `require-admin.tsx` | `RequireAdmin`: muestra aviso si falta configuración, "Cargando…", redirige a `/admin/login` sin sesión, y bloquea cuentas que no son miembros. Es solo experiencia de usuario; la protección real es la RLS. |

### Datos

| Archivo | Contenido |
|---|---|
| `src/features/catalog/repository.ts` | Tipo `ProductRepository` y `createSupabaseProductRepository()` con `list()`, `save()`, `remove()`, `setPublished()`. |
| `src/features/payments/repository.ts` | Tipo `PaymentRepository` y `createSupabasePaymentRepository()` con `loadConfig()`, `listRequests()`, `getRequest()`, `saveQr()`, `createRequest()`, `attachReceipt()`, `confirmRequest()`. |
| `src/features/payments/use-payment-request.ts` | Hook `usePaymentRequest(id)`: carga una solicitud por id (para clientes sin cuenta). |

### Rutas, pruebas y configuración

| Archivo | Contenido |
|---|---|
| `src/routes/admin_.login.tsx` | Ruta `/admin/login` (con `noindex`). |
| `src/test/image-ref.test.ts` | Pruebas de las funciones de `image-ref.ts`, `isPrivilegedKey` y `userMessage`. |
| `.env.example` | Plantilla de variables de entorno. |
| `.env` | Credenciales locales. **No está en git** (`.gitignore`). |
| `docs/` | Esquema SQL, seed, diseño ER (md y png), prompts de automatización y este reporte. |

---

## 3. Funciones por repositorio

### `ProductRepository` -> objetos de Supabase

| Método | Qué hace en Supabase |
|---|---|
| `list()` | `select` sobre la vista `catalog_products` filtrada por `business_id`, orden `created_at`, límite 500. Valida cada fila con Zod y descarta las inválidas en vez de romper la página. Convierte rutas de imagen en URL. |
| `save(input, id?)` | Sube a `product-images` las fotos nuevas (data URI) y llama a la RPC **`save_product`** (alta o edición de producto y fotos en una transacción). Resuelve el nombre de categoría a su `id` (con caché). |
| `remove(id)` | `delete` sobre `products` (las fotos caen por `ON DELETE CASCADE`). |
| `setPublished(id, published)` | `update products set published`. |

### `PaymentRepository` -> objetos de Supabase

| Método | Qué hace en Supabase |
|---|---|
| `loadConfig()` | Lee el QR activo de `payment_qr_configs` (solo miembros, por RLS). |
| `listRequests()` | Lee `payment_requests` del negocio (límite 1000), resuelve el QR de cada solicitud y genera URL firmada (1 h) del comprobante. |
| `getRequest(id)` | RPC **`get_payment_request`**: un cliente sin cuenta lee su solicitud por UUID. |
| `saveQr(config)` | Sube la imagen original a `payment-qr` (sin recomprimir) y llama a la RPC **`set_qr_config`**. |
| `createRequest(input, product)` | RPC **`create_payment_request`**. El servidor fija importe y origen. |
| `attachReceipt(id, image)` | Sube a `payment-receipts/<id>/…` y llama a la RPC **`attach_receipt`**. |
| `confirmRequest(id, verified)` | RPC **`confirm_payment_request`** (idempotente, exige verificación bancaria). |

---

## 4. Archivos modificados

### Catálogo

| Archivo | Cambio |
|---|---|
| `features/catalog/model.ts` | `imageSchema` acepta además URL https de Storage con la estructura exacta `bucket/uuid/archivo`. `productSchema` añade `slug` opcional. Nuevas `productPath()` y `matchesProductPath()` (URL por slug, con respaldo por id). **Eliminados** `STORAGE_KEY`, `storedProductsSchema` y `readStoredProducts`. |
| `features/catalog/product-context.ts` | `saveProduct`, `removeProduct` y `togglePublication` ahora devuelven `Promise<boolean>`. Nuevos campos `loadError` y `reload`. |
| `features/catalog/product-provider.tsx` | Reescrito. Recibe `repository` opcional. Carga cuando se conoce la sesión y recarga al iniciar o cerrar sesión (los miembros reciben también los no publicados). Cada escritura captura el error, muestra un mensaje seguro y recarga. Sin `localStorage` ni evento `storage`. |
| `features/catalog/catalog-page.tsx` | Estados "Cargando productos…" y error con botón "Reintentar". |
| `features/catalog/product-detail-page.tsx` | Busca por slug o id. El botón "Pagar con QR" se muestra siempre salvo que un miembro sepa que no hay QR. |
| `features/catalog/product-form.tsx` | `submit` asíncrono; bloquea el botón mientras guarda. |
| `features/catalog/admin-page.tsx` | Interruptor de publicación y eliminación esperan la respuesta antes de mostrar éxito. |
| `features/catalog/share.ts` | Los enlaces usan `productPath()` (slug). |
| `components/catalog/product-card.tsx` | Enlaces con `productPath()`. |
| `components/catalog/admin-tabs.tsx` | Botón **Salir** (`signOut`) cuando hay sesión. |

### Pagos

| Archivo | Cambio |
|---|---|
| `features/payments/model.ts` | `productId` admite `null` (producto borrado). **Eliminados** `PAYMENT_STORAGE_KEY` y `readPaymentState`. |
| `features/payments/payment-context.ts` | Operaciones asíncronas. `createRequest(input, product)` **ya no recibe `source`**: lo decide el servidor. Nuevo `getRequest(id)`. |
| `features/payments/payment-provider.tsx` | Reescrito sobre `PaymentRepository`. QR y lista solo se cargan si el usuario es miembro. |
| `features/payments/payment-request-form.tsx` | Producto del flujo cliente por slug o id. El cliente no necesita leer el QR. Muestra el QR del negocio solo si se conoce. |
| `features/payments/customer-payment-page.tsx` | Usa `usePaymentRequest`, recarga tras subir el comprobante. |
| `features/payments/review-payment-page.tsx` | Confirmar espera la respuesta del servidor. |
| `features/payments/qr-settings-page.tsx` | Guardado asíncrono con estado de carga. |
| `features/payments/payment-ui.tsx` | Aviso "Demostración local" sustituido por una nota real: el negocio confirma manualmente tras revisar su banco. Mensaje de solicitud no disponible sin referencia al navegador. |
| `features/payments/share.ts` | Quitado "Demostración local…" del texto de WhatsApp y del aviso al copiar el enlace. |

### Raíz y rutas

| Archivo | Cambio |
|---|---|
| `routes/__root.tsx` | `AuthProvider` envuelve a `ProductProvider` y `PaymentProvider`. |
| `routes/admin.tsx`, `admin_.nuevo.tsx`, `admin_.editar.$productId.tsx`, `admin_.pagos.tsx`, `admin_.pagos_.nuevo.tsx`, `admin_.pagos_.qr.tsx`, `admin_.pagos_.revisar.$requestId.tsx` | Cada pantalla de administración se envuelve en `<RequireAdmin>`. |
| `routeTree.gen.ts` | Regenerado por TanStack Router para incluir `/admin/login`. No se edita a mano. |

### Dependencias y configuración

| Archivo | Cambio |
|---|---|
| `package.json` / `package-lock.json` | Añadida `@supabase/supabase-js` (^2.119.2). |
| `.gitignore` | Ignora `.env` y `.env.*`, salvo `.env.example`. |
| `README.md` | Nueva sección "Conexión con Supabase" (pasos, tabla de piezas, limitaciones). |
| `IMPLEMENTACION.md` | Nota de actualización: la persistencia local ya no aplica. |

---

## 5. Pruebas

| Archivo | Cambio |
|---|---|
| `test/product-provider.test.tsx` | Reescrito con repositorio en memoria y `AuthContext` simulado. Cubre: consumidores compartidos, carga solo cuando se conoce la sesión y recarga al cambiar de usuario, catálogo vacío, fallo de carga, rechazo de guardado, validación antes de llamar al repositorio, publicar y eliminar. |
| `test/payment-provider.test.tsx` | Reescrito. Cubre el ciclo QR, solicitud, comprobante pendiente y confirmación; que un no miembro no lee QR ni lista; lectura de una solicitud por id; rechazo de la base; validación previa. |
| `test/catalog-rules.test.ts` | Quitadas las pruebas de `localStorage`. Añadidas: `imageSchema` acepta solo orígenes conocidos (rechaza `javascript:`, `data:text/html`, http, otro bucket, otro host, SVG) y `productPath`/`matchesProductPath`. |
| `test/payment-rules.test.ts` | Quitada la prueba de `readPaymentState`. Añadidas: unión `pending`/`paid` y solicitud con `productId` nulo. |
| `test/image-ref.test.ts` | Nueva (ver sección 2). |

---

## 6. Variables de entorno

| Variable | Obligatoria | Uso |
|---|---|---|
| `VITE_SUPABASE_URL` | sí | URL del proyecto |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | sí | Clave publishable/anon (pública por diseño) |
| `VITE_BUSINESS_SLUG` | no | Slug del negocio, por defecto `casa-luma` |

Los nombres `NEXT_PUBLIC_*` no sirven: este proyecto usa Vite y solo expone variables `VITE_*`.

---

## 7. Comportamiento que cambió

1. **Importe del cliente.** Un cliente paga siempre el precio del producto; si envía otro, el servidor lo rechaza. Antes lo comprobaba solo el navegador.
2. **Origen de la solicitud.** `admin` o `customer` lo decide la base según si quien llama es miembro, no el código del navegador.
3. **Lectura de pagos.** Solo los miembros ven la lista y el QR. Un cliente accede únicamente a su solicitud, conociendo su UUID.
4. **Comprobantes.** Bucket privado; se leen con URL firmada de 1 hora.
5. **Productos no publicados.** Solo los ven los miembros (RLS). El catálogo público filtra por `published`.
6. **Errores.** Ya no se muestra ningún error interno; solo los mensajes pensados para el usuario o un texto genérico.
7. **Sincronización entre pestañas** por evento `storage`: eliminada. Los datos se actualizan al recargar o tras cada operación.

---

## 8. Verificación realizada

| Comprobación | Resultado |
|---|---|
| `tsc --noEmit` | Sin errores |
| `vitest` | 47 de 47 pruebas pasan (6 archivos) |
| `npm run build` | Correcto |
| `eslint src` sin la regla Prettier | 0 errores, 6 avisos preexistentes de `react-refresh` en `components/ui/` |
| SSR sin variables de entorno | `/`, `/admin`, `/admin/login`, `/producto/taza-de-ceramica` y `/pago/<uuid>` responden 200 con `X-Frame-Options: DENY` |
| Lectura REST con la clave pública en `gjabtaktzisqfhljdhtr` | `businesses` 1 fila, `categories` 3, `catalog_products` 4 (precios 69, 49, 79, 39) |
| Tablas privadas con clave pública | `payment_requests` y `business_members` responden `42501` (bloqueadas) |
| Inicio de sesión del administrador | Confirmado por ti (funciona) |

**No verificado** contra la base real: crear o editar un producto con foto, guardar el QR, crear una solicitud de pago, subir un comprobante y confirmar un pago. Las pruebas automáticas usan un repositorio en memoria, por lo que no ejercitan las RPC ni las políticas de Storage. Conviene recorrer ese flujo a mano.

`npm run lint` completo falla por los finales de línea CRLF de Windows (regla Prettier), un problema que ya existía.

---

## 9. Cambios previos de seguridad (no son de Supabase)

Aparecen en el mismo `git diff` pero pertenecen a la remediación anterior:

| Archivo | Cambio |
|---|---|
| `package.json` | Vite 8.1.5 -> 8.3.8 (`devDependencies` y `overrides`); `@fontsource-variable/inter`; `@testing-library/dom` |
| `src/start.ts` | Middleware de cabeceras `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |
| `src/components/ui/chart.tsx` | Sanitización de identificadores y valores CSS en `ChartStyle` |
| `src/lib/safe-image.ts` | `safeImageDataUri()` para `href`/`src` de comprobantes. En esta integración pasó a validar con `imageSchema`, de modo que también acepta URL de Storage |
| `src/lib/error-page.ts` | Página de error SSR en español |
| `src/assets/*.asset.json` | Eliminados `project_id`, `r2_key`, `asset_id`, `created_at` |
| `src/styles.css` | `@import "@fontsource-variable/inter"` |

**Efecto de la integración sobre SEC-03 (Zod).** El truncado defensivo que se añadió en `readStoredProducts` y `readPaymentState` desapareció junto con esas funciones, porque ya no se lee `localStorage`. Ahora los datos llegan de consultas con límite (500 productos, 1000 solicitudes) y cada fila se valida por separado. La dependencia `zod` sigue en una versión con advisory conocido, así que `npm audit` seguirá reportando 1 vulnerabilidad alta.

---

## 10. Pendientes y riesgos

| Tema | Detalle |
|---|---|
| Fotos del seed | Los 4 productos siguen apuntando a `/__l5e/assets-v1/...`, que solo existe en Lovable. En local dan 404. Solución: editar cada producto y subir su foto. |
| Botón "Pagar con QR" | Un cliente sin cuenta no puede saber si hay QR activo (decisión D3). El botón se muestra siempre y el servidor responde con error si falta. |
| Categorías | Fijas en `model.ts`; deben existir en la tabla `categories` con el mismo nombre. |
| Límite de frecuencia | `create_payment_request` es invocable por anónimos sin límite (hallazgo H5). Falta captcha o rate limit. |
| SEO del detalle | `routes/producto.$productId.tsx` sigue leyendo `initialProducts` para el título y la descripción; los productos nuevos salen con título genérico. |
| Remediación de seguridad | Faltan: quitar los enlaces a Google Fonts de `__root.tsx`, `.env.example` ya creado, ajuste de logs en `error-capture.ts`, `npm audit` final e informe de cierre. |
| Git | Nada confirmado. Antes de hacer commit, revisa que `.env` no aparezca en `git status`. |
| Lovable | `AGENTS.md` indica que Lovable gestiona la base de datos. Los cambios al esquema deben hacerse desde Lovable o con aprobación del responsable. |
