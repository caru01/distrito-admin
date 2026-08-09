# Distrito BG Admin

Panel administrativo autenticado de Distrito BG. Consume la misma API y base de
datos que la tienda pública, pero concentra operación, inventario, contabilidad y
seguridad.

## Funciones disponibles

| Módulo | Función principal |
| --- | --- |
| Dashboard | Centro operativo con ventas, pedidos, catálogo, stock, estado de tienda y accesos por permiso |
| Tomar pedido | Creación y edición asistida con dirección exacta, Google Places, mapa y marcador ajustable |
| Pedidos | Seguimiento, estados, impresión, contacto por WhatsApp y cierre automático del detalle tras cada acción exitosa |
| Empresas de Domicilios | Operadores aliados, tarifas, ETA, estado, volumen, pendientes y dinero pagado |
| Categorías | Administración de categorías del catálogo |
| Productos | Catálogo, precios, imagen, disponibilidad, inventario unificado, filtros y paginación real |
| Clientes | CRM funcional con perfiles, segmentos, etiquetas, consentimiento, historial, métricas, búsqueda remota moderna, filtros, paginación y CSV |
| CRM | Dashboard comercial, contactos 360°, Inbox WhatsApp, segmentos, plantillas, campañas, automatizaciones, atribución y reportes |
| Inventario | Existencias, costos, umbrales y movimientos por producto vendible |
| Gastos | Registro de egresos |
| Cierre contable | Vista previa, cierre y reapertura de periodos |
| Reportes | Periodos de 7/30/90 días o personalizados, comparativos reales, ventas, clientes, productos y exportación CSV |
| Anuncios | Campañas programables, frecuencia por cliente, CTA, vista previa y notificaciones Push |
| Configuración | Identidad, contacto, logo, pagos, costo del domicilio, temas, cocina y voz/idioma de alertas |
| Horarios | Semana regular, anticipación, cierre y excepciones |
| Perfil | Información, contraseña y dispositivos propios |
| Usuarios | Cuentas reales, estados, roles, sesiones y cupo de 1-5 pedidos por domiciliario |
| Roles | Roles reales y matriz central de permisos |
| Auditoría | Intentos, actividad y sesiones |

## Preparación local

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

Comandos:

| Comando | Función |
| --- | --- |
| `npm run dev` | Servidor Vite de desarrollo |
| `npm run build` | Build optimizado en `dist/` |
| `npm run preview` | Previsualización del build |
| `npm run prod` | Build seguido de previsualización |
| `npm run ci` | Instalación reproducible |

## Configuración de API

```env
VITE_API_URL=auto
VITE_API_PORT=3001
```

La variable contiene solo el origen, sin `/api/pedidos`. `src/config/api.js` es la
única fuente del prefijo HTTP y exporta `API_URL` para todos los módulos.

El lanzador raíz usa `VITE_API_URL=auto` y `VITE_API_PORT=3001` para resolver la API
con el mismo hostname usado para abrir el panel desde localhost, LAN o Internet.

El botón **Ver tienda virtual** se configura de manera independiente:

```env
VITE_STOREFRONT_URL=auto
VITE_STOREFRONT_PORT=5173
```

En ejecución local, `auto` conserva el hostname usado para abrir el panel. En un
despliegue público, `VITE_STOREFRONT_URL` debe contener la URL HTTPS definitiva de
la tienda.

Si un módulo muestra `Unexpected token '<'`, el panel recibió HTML en lugar de
JSON. En desarrollo, verifica que `VITE_API_URL=auto`, reinicia Vite y confirma
`http://localhost:3001/api/pedidos/health`. Clientes y Anuncios usan además una
lectura defensiva que presenta un error de API comprensible sin dejar la pantalla
vacía.

## Dashboard operativo

`/admin` consume `GET /admin/dashboard`, una respuesta agregada que incluye:

- pedidos, ventas confirmadas y ticket promedio del día;
- flujo de pedidos recibidos, en cocina, listos para despacho, en reparto y con pago pendiente;
- productos activos, inactivos y destacados;
- inventario crítico y agotado;
- últimos seis pedidos y productos más solicitados del día;
- estado del horario y preparación de la tienda virtual;
- accesos rápidos filtrados mediante `AuthContext.hasPermission`.

Se conserva una copia de la última respuesta en `sessionStorage` para mostrar el
dashboard inmediatamente mientras la API actualiza los datos en segundo plano.

## Estructura

```text
distrito-admin/
├── src/
│   ├── main.jsx                    # Router y carga diferida de módulos
│   ├── config/api.js               # URL única de API
│   ├── context/AuthContext.jsx     # Sesión, usuario y permisos
│   ├── components/PermissionGate.jsx
│   ├── layouts/AdminLayout.jsx     # Navegación protegida
│   ├── pages/                      # Módulos funcionales
│   │   └── crm/                    # Vistas CRM, Inbox y Marketing
│   ├── services/printService.js    # Impresión de comprobantes
│   └── styles/design-system.css    # Componentes visuales compartidos
├── vercel.json                     # Reescritura SPA a index.html
├── .env.example
└── vite.config.mjs
```

`main.jsx` usa `React.lazy` y `Suspense`. Cada módulo se descarga cuando el usuario
visita su ruta; no deben volver a importarse todas las páginas de manera estática.

`TomarPedido.jsx` importa `DeliveryAddressPicker` desde `../distrito-shared`. La
clave y el Map ID se leen del `.env` local de `distrito-web` durante el build para
mantener una sola configuración local; no se copian credenciales al código fuente.
El origen del panel también debe estar autorizado en Google Cloud (`localhost:5174`,
`127.0.0.1:5174`, la IP LAN con `:5174` y el dominio HTTPS productivo). El selector
compartido usa Place Autocomplete Data API, muestra el error de autorización junto
al campo y conserva captura manual si Google no está disponible.

## Autenticación y sesión

1. Login obtiene access token, refresh token, perfil y permisos.
2. El access token dura 15 minutos y se renueva mientras existe actividad.
3. La sesión caduca tras 60 minutos sin interacción; la API es la autoridad final.
4. Al enfocar o volver a la pestaña, el contexto verifica la sesión y fuerza el
   login si ya caducó.
5. Cada usuario admite hasta tres dispositivos; el mismo dispositivo reemplaza su
   sesión anterior al volver a ingresar.
6. Perfil muestra las sesiones propias y permite cerrarlas individualmente.
7. La restauración de sesión conserva un orden estable de hooks en el layout y el
   contexto descarta verificaciones o renovaciones antiguas si un login más reciente
   ya cambió la sesión. Así, recargar una pestaña autenticada no deja la UI en negro
   ni obliga a borrar datos del navegador.
8. Un límite de errores en la raíz evita pantallas vacías ante fallos inesperados y
   ofrece una recarga segura sin borrar la sesión del usuario.

## Roles y permisos

Los permisos se representan como:

```text
Modulo:accion
```

Ejemplos:

```text
Pedidos:ver
Productos:editar
Usuarios:crear
```

`AuthContext.hasPermission` y `PermissionGate` controlan la presentación. La API
repite la autorización para las operaciones sensibles; ocultar un botón nunca se
considera una medida de seguridad suficiente.

Además, una frontera global verifica el rol real en PostgreSQL y bloquea a las
cuentas `Domiciliario`/`Repartidor` de las rutas del ERP. Solo `GET
/admin/settings` permanece disponible para que Delivery consuma identidad y tema.

Los módulos declarados en la interfaz deben coincidir exactamente con los módulos
sembrados por las migraciones. Los roles Administrador y Super Administrador
quedaron alineados con las 85 capacidades vigentes, incluidas 13 acciones CRM
separadas.

## Pedidos e inventario

- El panel puede cambiar el estado mediante `/admin/orders/:id`.
- La edición completa usa `/admin/orders/:id/edit`.
- Crear o editar un domicilio guarda dirección, barrio, coordenadas, Place ID,
  referencia, apartamento, torre y piso con el mismo contrato de la tienda pública.
- El costo del domicilio no está codificado en Tomar pedido: se obtiene de
  Configuración y la API vuelve a calcularlo dentro de la transacción.
- La fecha manual es `datetime-local` interpretada como hora Colombia; si queda
  vacía, PostgreSQL usa la hora actual. La lista, los filtros y la comanda se
  presentan explícitamente con `America/Bogota`.
- Al editar un carrito, el panel envía identificadores y cantidades; la API recupera
  los precios y recalcula el total.
- El stock del producto se reserva al crear el pedido.
- Cancelar o editar reconcilia las existencias transaccionalmente.
- Los cierres contables bloquean pedidos retroactivos dentro de un periodo cerrado.
- En el detalle de un pedido nuevo, **Preparar e imprimir cocina** abre la comanda
  térmica antes de cambiar a `En preparación`; el siguiente control publica
  **Marcar listo para despacho** para los domiciliarios.
- Los estados visibles, descripciones y colores vienen de
  `@distrito/shared-ui`; las transiciones se validan en la API y los estados
  terminales no se pueden reabrir mediante el endpoint genérico.
- Si un pedido quedó en **Pago pendiente**, la acción **Pago confirmado: enviar a
  cocina** lo reincorpora al flujo e imprime la comanda.
- Pedidos se mantiene conectado a SSE: aceptación, GPS operativo y entrega se
  reflejan sin recargar. Los domicilios `Listo` no pueden marcarse manualmente en
  camino o entregados desde esta vista; Delivery controla esa transición.
- El contacto por WhatsApp genera un enlace temporal firmado al seguimiento sin
  incluir el teléfono del cliente en la URL.
- Los botones operativos dentro del detalle cierran el panel lateral únicamente
  cuando la API confirma el cambio; un error conserva el detalle para reintentar.

## Rutas de interfaz

| Ruta | Página |
| --- | --- |
| `/admin/login` | Inicio de sesión |
| `/admin/reset-password` | Restablecimiento de contraseña |
| `/admin` | Dashboard |
| `/admin/tomar-pedido` | Toma de pedido |
| `/admin/pedidos` | Pedidos |
| `/admin/productos` | Productos |
| `/admin/categorias` | Categorías |
| `/admin/inventario` | Inventario de productos |
| `/admin/gastos` | Gastos |
| `/admin/cierre-contable` | Cierre contable |
| `/admin/reportes` | Reportes |
| `/admin/anuncios` | Anuncios |
| `/admin/crm/*` | CRM, contactos, Inbox, marketing, reportes y configuración WhatsApp |
| `/admin/configuracion` | Configuración |
| `/admin/horarios` | Horarios |
| `/admin/usuarios` | Usuarios |
| `/admin/roles` | Roles y permisos |
| `/admin/auditoria` | Auditoría y sesiones |
| `/admin/perfil` | Perfil |

`vercel.json` reescribe las rutas a `index.html` para que React Router pueda resolver
accesos directos y recargas.

## CRM y WhatsApp

El módulo se carga de forma diferida desde `AdminCRM.jsx`. En escritorio el Inbox
usa dos paneles; en móvil alterna lista y conversación sin perder la sesión. El
directorio usa paginación real, exporta los filtros actuales y busca nombre,
teléfono, correo, barrio o número de pedido. La ficha muestra pedidos, timeline,
etiquetas operables, consentimiento, notas sensibles y preferencias derivadas del
carrito real.

La interfaz no conoce tokens de Meta. **CRM → Configuración** muestra únicamente
estado del webhook, número conectado, sufijo del Phone Number ID, última actividad
y profundidad de cola. La configuración y el paso externo de activación están en
[`../distrito-docs/CRM_WHATSAPP_2026-08-09.md`](../distrito-docs/CRM_WHATSAPP_2026-08-09.md).

## Rendimiento y dependencias

- Los módulos se generan como chunks independientes.
- Reportes y gráficas se descargan únicamente al visitar esa sección.
- Las imágenes de productos usan carga diferida.
- React Router se actualizó a 7.18.2 conservando el modo declarativo compatible.
- `npm audit` no reporta vulnerabilidades conocidas al 9 de agosto de 2026.
- El módulo de Reportes continúa siendo el chunk más pesado, con unos 109 KB gzip;
  queda diferido y es candidato a una optimización posterior de gráficas.

## Diseño adaptativo

`src/styles/design-system.css` es la única fuente global de estilos del panel; el
antiguo `src/index.css`, que duplicaba el escaparate, fue eliminado. Los módulos
deben reutilizar primitivas `ds-*` y añadir clases específicas solo cuando el flujo
lo requiera.

| Rango | Comportamiento principal |
| --- | --- |
| `<= 480 px` | Modales tipo hoja inferior, acciones a ancho completo y formularios de una columna |
| `481-767 px` | Navegación lateral off-canvas, tablas en tarjetas y controles táctiles |
| `768-1199 px` | Barra lateral compacta, formularios de dos columnas y paneles auxiliares superpuestos |
| `1200-1599 px` | Escritorio compacto; el checkout de toma de pedidos se abre como drawer |
| `>= 1600 px` | Operación amplia con catálogo, resumen y datos del cliente visibles simultáneamente |

Las tablas operativas tienen tarjetas móviles. Las matrices extensas, como
permisos, conservan desplazamiento horizontal táctil porque su relación entre filas
y columnas no debe perderse. “Tomar pedido” y “Registrar compra” cambian de paneles
paralelos a layouts apilados o drawers según el ancho disponible.

El layout raíz mantiene la ventana fija y convierte `admin-main-content` en la única
región de desplazamiento vertical. Sus contenedores usan `min-height: 0`, altura
dinámica (`100dvh`) y desplazamiento táctil; por ello todas las rutas largas siguen
siendo navegables sin habilitar scroll independiente en cada página.

### Criterios de los módulos comerciales

- Productos y el inventario comparten `track_stock`, existencia, umbral, unidad,
  costo y código de barras. No se mantiene una copia paralela de existencias.
- Reportes solicita a la API un rango máximo de 366 días y compara el intervalo
  elegido con el periodo inmediatamente anterior de igual duración.
- La exportación de Reportes genera CSV compatible con Excel y neutraliza fórmulas
  en valores de texto.
- Anuncios guarda contenido, CTA, programación y frecuencia en PostgreSQL. La vista
  previa administrativa usa exactamente esos mismos campos.
- Configuración administra la identidad de las tres aplicaciones: logo, nombre,
  títulos, paleta, tipografía, densidad y estilo de tarjetas. Cada aplicación lee
  la misma fila de ajustes y aplica únicamente su prefijo.
- Anuncios conserva varias campañas y permite formato modal/banner, audiencias,
  prioridad, cupón, programación y métricas de vista/clic. Las notificaciones push
  no alteran la campaña publicada.
- Clientes deriva compras, ticket, recencia y segmento desde Pedidos; el perfil CRM
  solo guarda datos de contacto, etiquetas, notas, estado y consentimiento.
- Cierre contable reconcilia efectivo, incluye costos por producto e inventario
  valorizado, exporta CSV y exige motivo al reabrir. La API recalcula y bloquea
  solapamientos para que el navegador no sea la fuente financiera.
- Mapa de Domicilios consume `/admin/delivery/overview`, muestra presencia, GPS,
  capacidad y pedidos activos, y permite asignar pedidos `Listo` únicamente a
  domiciliarios conectados y con cupo. Los cambios se reciben por SSE
  y el refresco cada 20 segundos funciona como recuperación ante una reconexión.
- La vista dibuja en un único Google Maps el restaurante y todos los domiciliarios
  que ya reportaron coordenadas. Cada repartidor aparece como motocicleta con su
  nombre y pedido; un evento `delivery_location` mueve únicamente ese marcador.
- El punto de salida se administra en **Configuración → Domicilios → Ubicación de
  la cocina** mediante Google Places, mapa y marcador movible. Dirección, Place ID
  y coordenadas se guardan una vez y alimentan los mapas público y administrativo.
- El layout escucha `order_created` en todas las rutas. Reproduce un patrón sonoro,
  muestra el aviso visual y pronuncia “Nuevo pedido” con el idioma y estilo de voz
  elegidos en Configuración. El navegador selecciona la voz instalada que mejor
  coincida con esa preferencia.

## Validación y despliegue

```powershell
npm run build
npm audit --omit=dev
```

Antes de publicar también deben pasar desde `distrito-api`:

```powershell
npm run check
npm test
```

Para Vercel:

1. Configura `VITE_API_URL`.
2. Usa `npm run build`.
3. Publica `dist/`.
4. Conserva la reescritura SPA de `vercel.json`.
5. Verifica login, recarga de una ruta interna y permisos de un usuario no administrador.

## Reglas para próximos cambios

- No copiar la tienda pública dentro de este repositorio.
- No construir URLs HTTP manuales fuera de `src/config/api.js`.
- No confiar en precios o permisos calculados en el navegador.
- Mantener nombres de módulos sincronizados con la migración de permisos.
- Reutilizar el sistema visual y servicios compartidos antes de duplicar código.
- No crear otra hoja global ni copiar estilos del escaparate; extender el sistema
  de diseño y sus breakpoints compartidos.
- Agregar páginas al router mediante carga diferida.
- Mantener asignación, presencia y ubicación en el módulo `Domicilios`; no copiar
  esas reglas dentro de Pedidos o del componente del mapa.
- Ejecutar build y tests de API antes de desplegar.
