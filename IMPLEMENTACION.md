# Catálogo Digital · Casa Luma

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

La administración no tiene control de acceso. No usarla para datos privados. No hay cuentas de negocios, servidor compartido, inventario, pagos, pedidos ni sincronización entre dispositivos. Un producto creado o modificado en un navegador no aparecerá en el navegador de otro cliente; compartir estos enlaces solo es útil para demostración hasta conectar almacenamiento compartido. Los enlaces de los cuatro productos de ejemplo sí existen en cada navegador nuevo.

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
