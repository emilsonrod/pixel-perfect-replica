# Catálogo Digital · Casa Luma

> **Nota de actualización.** Este documento describe la primera iteración, con datos en `localStorage` y sin cuentas. Desde la integración con Supabase los productos, el QR y los pagos se guardan en la base de datos, `/admin` exige iniciar sesión y los enlaces de pago funcionan entre dispositivos. Los avisos de "demostración local" y los límites sobre almacenamiento del navegador ya no aplican. La configuración vigente está en la sección "Conexión con Supabase" del `README.md`.

## Funcionalidades

- Catálogo público en `/` con los productos publicados, fotografías, nombre, precio, descripción breve, búsqueda por nombre y filtros por categoría.
- Detalle en `/producto/$productId` con descripción completa, estado de disponibilidad, galería cuando existen varias fotos y compartir.
- Compartir nativo cuando el navegador lo permite; alternativa para copiar el enlace y confirmación del resultado.
- Compartir por WhatsApp mediante el selector de destinatario de WhatsApp. No se ha inventado un teléfono del negocio ni se presenta esto como un pedido enviado.
- Administración en `/admin`: listado, búsqueda, filtro de publicación, crear, editar, publicar/despublicar y eliminar con confirmación y cancelación.
- Formulario con nombre, descripción, precio, categoría, hasta tres fotografías y publicación. Rechaza campos obligatorios vacíos, precios negativos y fotografías inválidas.
- Carga de fotos JPG, PNG y WebP, comprobación de tipo/tamaño, redimensionado a 1000 píxeles y almacenamiento local. Las fotos de colección permiten probar sin cargar archivos.
- Cambios conservados después de recargar y sincronizados entre pestañas del mismo navegador; los errores de almacenamiento se muestran sin afirmar que se guardaron los cambios.
- Estados vacíos y de producto no disponible, controles accesibles y confirmaciones.

## Pantallas y componentes

Las pantallas están separadas en `CatalogPage`, `ProductDetailPage`, `AdminPage` y `ProductFormPage`. La presentación reutiliza `SiteHeader`, `SiteFooter`, `ProductCard`, `SearchField`, `EmptyState`, `IconButton` y los controles UI existentes. `ProductProvider` comparte los productos entre pantallas. Las reglas de producto, fotos y compartir están separadas de la presentación.

## Archivos principales

- `src/styles.css`: tokens semánticos, Inter, paleta bosque/superficies claras, tarjetas, formularios y adaptación a móvil.
- `src/routes/__root.tsx`: navegación compartida, proveedor de productos y notificaciones.
- `src/routes/index.tsx`, `admin.tsx`, `admin_.nuevo.tsx`, `admin_.editar.$productId.tsx`, `producto.$productId.tsx`: pantallas navegables y metadatos propios.
- `src/features/catalog/`: validación, datos de ejemplo, almacenamiento y pantallas.
- `src/components/catalog/`: elementos reutilizables del catálogo.
- `src/assets/`: referencias CDN de las fotografías generadas; las capturas originales solo se usaron como guía visual.
- `src/test/catalog-rules.test.ts`: reglas concretas de precio, campos obligatorios, filtros y datos almacenados.

## Decisiones sobre detalles no definidos

- Se conserva Casa Luma como negocio de ejemplo y Catálogo Digital como nombre del proyecto.
- Se traducen los textos al español y se conservan los cuatro productos y sus precios en reales (R$ 49, 79, 39 y 69) de las referencias.
- Las categorías son Cerámica, Decoración y Accesorios, coherentes con la colección.
- En escritorio se adapta la colección a cuatro columnas; en móvil se conservan dos, con navegación compacta.
- No se agrega inicio de sesión: esta iteración es solo frontend y el MVP solicitado no incluye autenticación. La captura de acceso no se simula con credenciales ficticias.

## Datos de ejemplo y límites

Los cuatro productos iniciales, Casa Luma y sus descripciones son datos de ejemplo. Las fotografías son recreaciones generadas siguiendo la referencia, no fotografías originales del negocio. Toda modificación se guarda exclusivamente en `localStorage`, no en un servidor.

La administración no tiene control de acceso. No usarla para datos privados. No hay cuentas de negocios, servidor compartido, inventario, procesamiento bancario, gestión de pedidos ni sincronización entre dispositivos. Un producto creado o modificado en un navegador no aparecerá en el navegador de otro cliente; compartir estos enlaces solo es útil para demostración hasta conectar almacenamiento compartido. Los enlaces de los cuatro productos de ejemplo sí existen en cada navegador nuevo.

Los metadatos de detalle usan los productos de ejemplo o un título genérico, ya que los productos locales no existen durante la renderización en servidor. Las miniaturas sociales para productos locales requieren almacenamiento compartido.

WhatsApp abre su servicio externo con el texto preparado; la selección de destinatario y el envío quedan a cargo del usuario. No se ha enviado un mensaje real. Los cambios se pierden si se borran los datos del navegador. El almacenamiento tiene un límite propio del navegador y no es un sustituto de un servidor.

## Pruebas realizadas

- Vitest: 13 pruebas de reglas y la prueba de navegación existente, todas aprobadas.
- Navegador real: búsqueda sin acentos, filtro de cerámica, apertura del detalle, copia de enlace, formulario vacío, rechazo de precio negativo, creación, recarga, edición, despublicación/publicación, detalle de producto nuevo, cancelación de eliminación y eliminación persistente.
- Comprobación de fotografías cargadas y ausencia de errores de ejecución en el recorrido.
- Revisión de escritorio de 1280 píxeles y móvil de 390 píxeles; comprobación de que el catálogo, la administración y el formulario no desborden horizontalmente.

- Navegador real: carga de una fotografía WebP propia, creación con precio cero, conservación de la fotografía después de recargar, límite de tres fotos y cambio entre imágenes de la galería.
- Las cuatro pantallas se comprobaron también en anchos de 375, 768 y 1440 píxeles, sin desbordamiento horizontal.
- WhatsApp abrió su página de envío con el nombre y enlace del producto correctamente preparados. No se envió ningún mensaje.

No se afirma haber probado sesión, persistencia de servidor ni entrega de mensajes porque no se implementan en esta iteración. La herramienta media-cli se usó para recrear las fotografías de la colección.

## Módulo de pagos QR · demostración local

El usuario confirmó conservar el alcance local de la primera iteración. El diseño `payment.jpg` es la referencia de las pantallas de configuración, solicitud, QR del cliente, revisión y pago recibido. No se usó la captura como un QR bancario ni se cargó un código ficticio en los datos iniciales.

### Funcionalidades

- En **Administrar → Pagos**, el administrador carga o reemplaza una imagen QR bancaria y configura el destinatario. Se valida JPG, PNG o WebP de hasta 5 MB y que la imagen pueda abrirse. Se conservan los píxeles originales del QR, sin recortar ni recomprimir; no se verifica su contenido bancario.
- El administrador crea una solicitud con producto, nombre del cliente e importe positivo con dos decimales. El QR, destinatario, producto e importe quedan registrados en la solicitud para que los cambios posteriores no alteren una solicitud existente.
- El cliente accede desde **Pagar con QR** en el detalle de un producto publicado con precio positivo, ingresa su nombre y ve la solicitud con el precio de ese producto. Sin QR configurado no se crea una solicitud.
- El cliente puede ver y descargar el QR original, adjuntar o reemplazar una imagen de comprobante y abrir WhatsApp con un aviso preparado. Adjuntar un comprobante deja el pago pendiente, nunca lo confirma.
- El administrador ve solicitudes pendientes y confirmadas, abre el comprobante y marca que verificó el ingreso en su banco antes de confirmar manualmente. La confirmación conserva su fecha original si se repite.
- El cliente ve el estado confirmado después de la revisión. Los datos persisten al recargar y se sincronizan entre pestañas de este navegador; los errores de guardado no se presentan como éxito.

### Pantallas y archivos

- Nuevas pantallas: `AdminPaymentsPage`, `QrSettingsPage`, `PaymentRequestForm`, `CustomerPaymentPage` y `ReviewPaymentPage` en `src/features/payments/`.
- Presentación reutilizable: `AdminTabs`, `QrPreview`, `PaymentStatus`, `PaymentAmount`, `PaymentReceived` y elementos de navegación/avisos en `payment-ui.tsx`, con botones y controles existentes.
- Lógica separada: `model.ts` para reglas y estados, `images.ts` para preservar el QR, `share.ts` para enlaces/descarga/WhatsApp y contexto estable con `PaymentProvider` para almacenamiento local.
- Nuevas páginas: `/admin/pagos`, `/admin/pagos/qr`, `/admin/pagos/nuevo`, `/admin/pagos/revisar/$requestId`, `/pago/$requestId` y `/producto/$productId/pagar`, con metadatos propios y sin indexación de solicitudes.
- Integración en `src/routes/__root.tsx`, administración y detalle del catálogo; estilos y tokens nuevos centralizados en `src/styles.css`.
- Pruebas nuevas en `src/test/payment-rules.test.ts` y `src/test/payment-provider.test.tsx`.

### Verificación realizada

- **34 pruebas aprobadas**: 17 nuevas para pagos y 17 existentes de catálogo, contexto y navegación; comprobación de código sin errores ni avisos en el módulo nuevo.
- Navegador real: configuración sin imagen rechazada, carga de QR propio de prueba, guardado/recarga, solicitud con cliente obligatorio, rechazo de importe negativo, creación con R$ 49,00 y copia de enlace.
- Descarga del QR comparada byte por byte con el archivo cargado: original conservado.
- Carga de comprobante de prueba, estado todavía pendiente, revisión del administrador, confirmación tras marcar verificación bancaria y lectura del estado confirmado desde la pantalla del cliente después de recargar.
- Inicio del pago desde el detalle del catálogo y filtros de pagos pendientes/confirmados comprobados.
- Pantallas nuevas revisadas a 375, 390, 768 y 1440 píxeles sin desbordamiento horizontal; capturas móviles/escritorio inspeccionadas; sin errores de ejecución en el recorrido.
- En un navegador independiente, el enlace muestra solicitud no disponible: se comprobó que no se simula almacenamiento compartido.

### Límites

No se procesó ni verificó ninguna transferencia real. El banco recibe el pago fuera de la aplicación; la confirmación es un registro manual realizado por quien usa la pantalla del administrador. La demostración no distingue identidades ni restringe permisos, por lo que no debe usarse para información privada ni como prueba financiera. El QR y los comprobantes se guardan solo en este navegador y pueden agotar su espacio disponible.

Los enlaces de solicitud no funcionan en otros dispositivos, aunque se puedan copiar o preparar en WhatsApp. WhatsApp no adjunta ni envía automáticamente el comprobante. Para uso real entre administrador y clientes se necesita almacenamiento compartido y acceso protegido; no se activaron porque se confirmó la demostración local.
