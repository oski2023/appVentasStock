# DOCUMENTO DE ESPECIFICACIÓN DE REQUERIMIENTOS
**Aplicación web de ventas y control de stock**

* **Versión:** 1.3
* **Fecha:** 22 de noviembre de 2026
* **Modalidad:** Venta presencial
* **Estado:** Borrador funcional para validación

---

## Control del documento

| Dato | Descripción |
| :--- | :--- |
| **Nombre del sistema** | Sistema web de ventas y control de stock |
| **Tipo de documento** | Especificación de Requerimientos de Software (ERS) |
| **Versión** | 1.3 |
| **Modalidad de venta** | Presencial, en un único local |
| **Dispositivo de venta** | Tablet o celular del vendedor |
| **Proveedor de pago** | Mercado Pago (QR dinámico), con pago por billetera virtual |
| **Objetivo** | Definir alcance, funcionalidades, reglas de negocio, datos, seguridad y criterios de aceptación para orientar el diseño y desarrollo. |
| **Destinatarios** | Responsable del negocio, analistas, diseñadores UX/UI, desarrolladores y equipo de pruebas. |

## Historial de versiones

| Versión | Fecha | Descripción |
| :--- | :--- | :--- |
| 1.0 | 22/11/2026 | Primera versión de la especificación. |
| 1.1 | 22/11/2026 | Se define la venta presencial. Se agregan la venta asistida con pago manual, la verificación de entrega, el pago aprobado fuera de término, la generación e impresión de etiquetas y la importación inicial de datos. Se corrigen contradicciones sobre umbral de alertas, roles, códigos, precios y medios de pago. |
| 1.2 | 22/11/2026 | Se definen las devoluciones (plazo de 3 días y reingreso inmediato al stock), la identificación solo por código QR, la venta desde tablet o celular, la facturación en papel fuera del sistema y la carga diferida de ventas durante cortes de internet. |
| 1.3 | 22/11/2026 | Se definen la impresión de etiquetas en hoja A4 y Mercado Pago con pago por billetera virtual. Se proponen la autorización de devoluciones y la infraestructura. |

### Resumen de cambios de la versión 1.3

| Tema | Cambio | Secciones |
| :--- | :--- | :--- |
| **Etiquetas** | Se imprimen en hojas A4 autoadhesivas precortadas, con una impresora común. Formato de referencia: 24 etiquetas de 70 × 37 mm por hoja. No se usa impresora térmica. | RF-30, RNF-13, 5.5, 14 |
| **Proveedor de pago** | Mercado Pago con QR dinámico (API de Orders). Por la pasarela el cliente paga solo con billetera virtual. | 2.2, RF-10, RN-14, 7.2, 10, 14 |
| **Autorización de devoluciones (propuesto)** | El vendedor registra solo las devoluciones con comprobante y reintegro manual o cambio. Sin comprobante o con reintegro por la pasarela, autoriza el administrador. | RF-23, RN-19, 5.7, 14 |
| **Infraestructura (propuesto)** | Tres ambientes, backend y PostgreSQL en servicios administrados, dominio `.com.ar` con HTTPS, backups y monitoreo. | 14 |

### Resumen de cambios de la versión 1.2

| Tema | Cambio | Secciones |
| :--- | :--- | :--- |
| **Devoluciones** | Plazo máximo de 3 días corridos desde la compra. La unidad vuelve al stock en el momento en que se registra la devolución. | RF-23, RN-09, RN-17, 5.7 |
| **Identificación** | Se reemplaza el código de barras por un código QR generado por el sistema para cada variante. No se usan lectores USB ni códigos EAN. | 2.2, RF-03, RF-29, RF-30, 7.2 |
| **Dispositivo de venta** | El vendedor vende desde una tablet o un celular, con la cámara para leer los QR. No hay computadora de caja. | 2.1, RF-25, RNF-13, 9 |
| **Facturación** | El sistema no emite facturas. La facturación se hace en papel, fuera del sistema. | 2.3, 14 |
| **Sin conexión** | Si se corta internet, las ventas se anotan en una planilla y se cargan después en el sistema. | RF-33, RN-18, 5.8 |

### Resumen de cambios de la versión 1.1

| Tema | Cambio | Secciones |
| :--- | :--- | :--- |
| **Modalidad de venta** | Se define la venta presencial en un único local. El cliente retira el producto en el momento. La venta online con envío o retiro diferido queda fuera de alcance. | 1.2, 2.2, 2.3, 5 |
| **Pago manual** | El vendedor puede registrar cobros en efectivo, transferencia o posnet, con cálculo de vuelto y auditoría. | RF-25, RF-26, RN-12, 5.2 |
| **Entrega verificada** | Ningún producto sale del local sin un pago aprobado o registrado. El vendedor verifica el comprobante y marca la entrega. | RF-27, RN-11, 4.1 |
| **Pago fuera de término** | Se define qué hacer cuando la aprobación llega después de vencida la reserva: nueva reserva, o estado "Pagada sin stock" con devolución o cambio. | RF-28, RN-13, 5.4 |
| **Etiquetas** | Generación de códigos internos para variantes sin EAN e impresión de etiquetas con código de barras y QR. | RF-29, RF-30, RN-15, 5.5 |
| **Umbral de alerta** | Se unifica en el campo `stock_minimo` por variante, con valor por defecto 5. | RF-14, RN-08 |
| **Precios** | En la v1 los precios son finales con IVA incluido, en pesos, sin descuentos ni recargos. | RF-08, 2.2, 2.3 |
| **Clientes y roles** | El cliente compra como invitado. Los usuarios del sistema son solo administradores y vendedores. | 2.1, 7.2 |
| **Códigos** | Un único código de barras por variante. El QR contiene la URL de la ficha; se elimina `qr_token`. | RN-01, 7.2 |
| **Medios de pago** | En la pasarela se habilitan solo medios de acreditación inmediata. | RF-10, RN-14 |
| **Facturación** | El comprobante del sistema lleva la leyenda "Documento no válido como factura". | RF-21, 2.3 |
| **Carga inicial** | Importación de productos, variantes y stock desde CSV/Excel. | RF-31 |
| **Etapas** | Se propone el desarrollo en tres etapas. | 13.1 |

---

## 1. Introducción

### 1.1 Propósito
Este documento especifica los requerimientos de una aplicación web para la venta presencial en un local: consultar productos, seleccionar variantes y cantidades, cobrar y mantener actualizado el inventario. El sistema deberá reflejar el stock disponible luego de cada venta confirmada y alertar cuando la existencia de una variante sea igual o inferior a su stock mínimo, que por defecto es de cinco unidades.

### 1.2 Alcance del producto
La solución se utilizará en un local físico. Cada producto llevará una etiqueta con un código QR generado por el sistema. El cliente podrá escanear el QR con su celular para ver la ficha del producto y armar su compra, o el vendedor podrá escanear los productos con su tablet o celular.

El cobro podrá hacerse por un proveedor de pagos integrado o de forma manual (efectivo, transferencia o posnet), registrado por el vendedor. Una vez aprobado o registrado el pago, se registrará la venta y se descontarán las unidades del inventario. Antes de que el cliente se retire, el vendedor verificará el pago y marcará la venta como entregada.

* Consulta de productos mediante el QR de la etiqueta, búsqueda por nombre o ingreso del código.
* Administración de productos, variantes, precios, existencias y etiquetas.
* Carrito con selección de variante y cantidad, armado por el cliente desde su celular o por el vendedor desde su tablet o celular.
* Pago electrónico integrado o pago manual registrado por el vendedor.
* Verificación del pago y registro de la entrega en el local.
* Actualización consistente del stock y generación de alertas de bajo inventario.
* Panel administrativo con ventas, existencias, movimientos y cobros.

### 1.3 Objetivos
* Reducir errores de inventario y evitar vender unidades inexistentes.
* Asegurar que ningún producto salga del local sin un pago aprobado o registrado.
* Permitir que el cliente conozca las características y el precio antes de comprar.
* Agilizar la selección por modelo, talle, color y cantidad.
* Automatizar el cálculo del total y el descuento de stock.
* Dar visibilidad inmediata al stock disponible y a los productos con pocas unidades.
* Ofrecer una experiencia adaptable a celulares, tabletas y computadoras.

---

## 2. Descripción general

### 2.1 Tipos de usuario

| Rol | Responsabilidades / permisos |
| :--- | :--- |
| **Cliente** | Escanear el QR de la etiqueta o buscar productos, ver la ficha, elegir variantes y cantidades, armar el carrito desde su celular, pagar por la pasarela y mostrar el comprobante al vendedor. Compra como invitado, sin registrarse. |
| **Administrador** | Gestionar productos, variantes, códigos, precios, stock, etiquetas, usuarios internos, medios de pago, umbrales, alertas, ventas, devoluciones y reportes. Importar los datos iniciales. |
| **Vendedor / operador** | Desde su tablet o celular: escanear productos, armar ventas, registrar pagos manuales, verificar pagos, marcar entregas, registrar devoluciones, consultar disponibilidad y cargar las ventas anotadas durante cortes de internet. No podrá modificar precios, stock ni configuraciones, ni anular pagos, salvo autorización. |
| **Sistema / proveedor de pagos** | Procesar la operación de pago y notificar su resultado mediante una respuesta segura. |

### 2.2 Supuestos y decisiones de alcance
* **Modalidad:** Venta presencial en un único local. El cliente retira el producto en el momento de la compra.
* **Control de stock:** Se controla por variante/SKU, no solamente por producto general (ejemplo: remera modelo A, talle M, color azul).
* **Pagos:** Se realizará mediante un proveedor externo o en forma manual (efectivo, transferencia o posnet) registrada por el vendedor. La aplicación no almacenará números completos de tarjetas ni códigos de seguridad. El cobro con posnet se realiza en la terminal del proveedor y el vendedor registra el resultado.
* **Pasarela:** El proveedor de pago es Mercado Pago, con QR dinámico. Por la pasarela el cliente paga solo con billetera virtual (dinero en cuenta), que se acredita en el momento. No se habilitan pagos en efectivo por redes de cobranza.
* **Descuento de inventario:** Se ejecutará únicamente cuando el pago esté aprobado por la pasarela o registrado por el vendedor.
* **Reservas:** Para evitar ventas simultáneas de la última unidad, el sistema reservará temporalmente el stock durante el pago por pasarela. La reserva dura 10 minutos por defecto y es configurable.
* **Identificación:** Cada variante se identifica con un único código QR generado por el sistema, que contiene la URL de la ficha pública con el SKU. La etiqueta muestra además el código en texto para ingresarlo a mano si la cámara no lo lee. No se usan códigos de barras.
* **Hardware de venta:** El vendedor trabaja desde una tablet o un celular y lee los QR con la cámara. No hay computadora de caja ni lector USB.
* **Devoluciones:** Plazo máximo de 3 días corridos desde la compra. La unidad vuelve al stock en el momento en que se registra la devolución.
* **Contingencia offline:** Si se corta internet, las ventas se anotan en una planilla en papel y se cargan en el sistema cuando vuelve la conexión.
* **Precios:** Son finales, con IVA incluido, en pesos argentinos. La v1 no aplica descuentos ni recargos.
* **Validación:** Los precios y el stock mostrados al cliente se validarán nuevamente al confirmar la compra.
* **Invitados:** El cliente compra como invitado. Sus datos (nombre, email) son opcionales y solo se piden para enviarle el comprobante.
* **Visibilidad de stock:** Al público se le muestra la disponibilidad como "Disponible", "Últimas unidades" (stock igual o menor al mínimo) o "Sin stock", no la cantidad exacta. El personal interno ve la cantidad exacta.

### 2.3 Fuera de alcance inicial
* Venta online con envío o con retiro diferido en el local.
* Contabilidad completa, liquidación impositiva y facturación. El sistema no emite facturas: la facturación se hace en papel, fuera del sistema. El comprobante del sistema llevará la leyenda "Documento no válido como factura".
* Códigos de barras, códigos EAN del fabricante y lectores USB.
* Funcionamiento sin conexión dentro de la aplicación; los cortes se cubren con la planilla en papel.
* Gestión de envíos, logística y seguimiento de paquetes.
* Programa de puntos, cupones, descuentos, promociones o campañas de marketing.
* Integración directa con la terminal de posnet; el vendedor registra el resultado a mano.
* Aplicaciones móviles nativas; la primera entrega será una aplicación web responsive.
* Operación como plataforma para varios comercios.
* Almacenamiento o procesamiento directo de datos sensibles de tarjetas.

---

## 3. Requerimientos funcionales

| ID | Requerimiento | Descripción | Prioridad |
| :--- | :--- | :--- | :--- |
| **RF-01** | Catálogo de productos | El sistema deberá mostrar un catálogo con nombre, imagen, descripción, precio final, disponibilidad (indicador para el público, cantidad exacta para el personal) y variantes del producto. | Alta |
| **RF-02** | Búsqueda y filtros | El cliente y el operador podrán buscar por nombre, categoría, SKU o código y filtrar por atributos disponibles. | Alta |
| **RF-03** | Lectura de código QR | El sistema deberá permitir leer el código QR de la etiqueta con la cámara del celular del cliente o de la tablet o celular del vendedor. También se podrá ingresar el código manualmente. | Alta |
| **RF-04** | Ficha por código | Al reconocer un código QR válido, se mostrará la ficha del producto o variante: descripción, modelo, talle, color, precio y disponibilidad. | Alta |
| **RF-05** | Selección de variante | El cliente deberá poder seleccionar modelo, talle, color u otros atributos definidos para el producto. | Alta |
| **RF-06** | Selección de cantidad | El cliente podrá indicar la cantidad deseada. El sistema no permitirá superar el stock disponible (stock actual menos reservas activas). | Alta |
| **RF-07** | Carrito | El cliente, desde su celular, o el vendedor, desde su tablet o celular, podrá agregar, quitar y modificar productos y cantidades antes de confirmar la compra. | Alta |
| **RF-08** | Cálculo del total | El sistema calculará el subtotal por ítem y el total final con precios finales (IVA incluido), en pesos argentinos. La v1 no aplica descuentos ni recargos. | Alta |
| **RF-09** | Confirmación de compra | Antes de pagar, el sistema mostrará un resumen con productos, variantes, cantidades, precios y total. | Alta |
| **RF-10** | Procesamiento del pago | El sistema generará un QR dinámico de Mercado Pago con el importe de la venta. El cliente lo paga con su billetera virtual y el sistema recibe el resultado mediante una notificación (webhook) con firma verificada. | Alta |
| **RF-11** | Registro de venta | Cuando el pago sea aprobado o registrado manualmente, el sistema registrará la venta, sus ítems, importes, fecha, medio de pago, vendedor (si corresponde) y referencia de pago. | Alta |
| **RF-12** | Descuento de stock | Al confirmar la venta, el sistema descontará del stock la cantidad vendida de cada variante, en una única operación transaccional. | Alta |
| **RF-13** | Stock actualizado | Luego de la venta, el administrador y los usuarios autorizados podrán visualizar el stock actualizado. | Alta |
| **RF-14** | Alerta de stock bajo | El sistema generará una alerta cuando el stock de una variante sea menor o igual a su stock mínimo (campo `stock_minimo`, por defecto 5, configurable por variante). | Alta |
| **RF-15** | Panel de alertas | El administrador podrá consultar alertas activas, variante afectada, stock actual y fecha de detección. | Media |
| **RF-16** | Gestión de productos | El administrador podrá crear, editar, activar/desactivar y consultar productos, categorías, imágenes y descripciones. | Alta |
| **RF-17** | Gestión de variantes | El administrador podrá definir SKU, modelo, talle, color, precio, stock y stock mínimo por variante. El código QR lo genera el sistema (RF-29). | Alta |
| **RF-18** | Ajustes de inventario | El administrador autorizado podrá registrar ingresos, egresos, devoluciones, roturas y ajustes, indicando motivo y usuario. | Alta |
| **RF-19** | Historial de movimientos | El sistema conservará un historial auditable de cada movimiento de stock, con fecha, tipo, cantidad, referencia y responsable. | Alta |
| **RF-20** | Historial de ventas | El administrador podrá consultar ventas por fecha, estado, medio de pago, vendedor, importe y número de operación. | Media |
| **RF-21** | Comprobante | El sistema mostrará un comprobante con número de operación, detalle, medio de pago, estado y un código QR de verificación. Llevará la leyenda "Documento no válido como factura". | Alta |
| **RF-22** | Control de acceso | El sistema deberá autenticar a los usuarios administrativos y aplicar permisos según su rol. | Alta |
| **RF-23** | Cancelación y devolución | El sistema permitirá registrar cancelaciones y devoluciones, estas últimas dentro de los 3 días corridos posteriores a la compra. El vendedor podrá registrar sola una devolución con comprobante que se resuelva con cambio o con reintegro manual. Sin comprobante, o cuando el reintegro se haga por la pasarela (API de devoluciones del proveedor), hará falta la autorización del administrador. El reintegro de stock seguirá RN-09. | Alta |
| **RF-24** | Auditoría | Las operaciones administrativas sensibles deberán registrar quién realizó la acción, cuándo y qué dato cambió. | Media |
| **RF-25** | Venta asistida | El vendedor, desde su tablet o celular, podrá armar una venta escaneando los QR o buscando productos, ver el total y elegir el medio de pago: pasarela (mostrando un QR de cobro en pantalla) o pago manual. | Alta |
| **RF-26** | Registro de pago manual | El vendedor podrá registrar un cobro en efectivo, transferencia o posnet, indicando medio, importe y referencia (número de operación de la transferencia o del cupón de posnet). En efectivo, el sistema calculará el vuelto a partir del importe recibido. El registro confirma la venta y descuenta el stock en la misma transacción. | Alta |
| **RF-27** | Verificación y entrega | Antes de que el cliente se retire, el vendedor escaneará el QR del comprobante o ingresará su número. El sistema mostrará el estado del pago y el detalle, y el vendedor marcará la venta como "Entregada". | Alta |
| **RF-28** | Pago aprobado fuera de término | Si la aprobación de un pago llega después de vencida la reserva, el sistema intentará reservar de nuevo las unidades. Si hay stock, confirmará la venta normalmente. Si no, registrará la venta como "Pagada sin stock", avisará al administrador y al vendedor, y permitirá resolverla con la devolución del dinero o el cambio por otra variante. | Alta |
| **RF-29** | Generación de códigos | Al crear una variante, el sistema generará un código interno único (por ejemplo, con prefijo del comercio) y el código QR asociado, que contiene la URL de la ficha y el SKU. | Alta |
| **RF-30** | Impresión de etiquetas | El administrador podrá generar etiquetas por variante con nombre, talle, color, precio, código QR y el código en texto. Podrá elegir la cantidad de copias (por defecto, igual a las unidades ingresadas) y la posición inicial en la hoja, para aprovechar hojas ya usadas. El sistema generará un PDF para hojas A4 autoadhesivas precortadas (formato de referencia: 24 etiquetas de 70 × 37 mm). Al cambiar un precio, listará las etiquetas a reimprimir. | Alta |
| **RF-31** | Importación inicial | El administrador podrá importar productos, variantes y stock inicial desde un archivo CSV o Excel, con validación previa y reporte de errores por fila. El stock importado se registrará como movimiento "Inventario inicial". | Media |
| **RF-32** | Resumen de cobros | El administrador podrá ver los cobros de un período agrupados por medio de pago y por vendedor, para controlar la caja. | Media |
| **RF-33** | Carga de ventas diferidas | Cuando vuelva la conexión, el vendedor podrá cargar las ventas anotadas en la planilla durante el corte, con su fecha y hora reales, ítems y medio de pago. Cada venta quedará marcada como "Carga diferida" y descontará el stock al cargarse. | Alta |

---

## 4. Reglas de negocio

| ID | Regla |
| :--- | :--- |
| **RN-01** | El inventario se administra por variante/SKU. Cada combinación vendible de modelo, talle y color debe tener un identificador único y un único código QR. |
| **RN-02** | El stock disponible nunca podrá quedar por debajo de cero. |
| **RN-03** | La cantidad solicitada debe ser un entero positivo y no podrá superar la cantidad disponible. |
| **RN-04** | El total se calcula en el servidor utilizando precios vigentes; no se confiará en importes enviados por el navegador. |
| **RN-05** | El stock se descuenta una sola vez por venta confirmada. Las notificaciones repetidas del proveedor de pagos no deben duplicar el descuento. |
| **RN-06** | Si el pago es rechazado o expira, la reserva de stock deberá liberarse y no se registrará una venta pagada. |
| **RN-07** | La reserva de stock tendrá una duración configurable, de 10 minutos por defecto. Vencido ese plazo sin pago aprobado, se liberará automáticamente. |
| **RN-08** | Cuando el stock resultante sea menor o igual al stock mínimo de la variante (por defecto 5), se generará o actualizará una alerta de bajo stock. |
| **RN-09** | Una devolución aceptada incrementa el stock de la variante en el momento en que se registra. |
| **RN-10** | Todo ajuste manual de stock deberá indicar un motivo y quedar registrado en el historial. |
| **RN-11** | Una venta solo puede pasar a "Entregada" si su pago está aprobado por la pasarela o registrado manualmente. |
| **RN-12** | Un pago manual queda asociado al vendedor que lo registró y no puede editarse. Para corregirlo se anula (con permiso de administrador y motivo) y se registra uno nuevo. |
| **RN-13** | Un pago aprobado nunca se descarta, aunque llegue después de vencida la reserva: siempre termina en venta confirmada, cambio de variante o devolución del dinero. |
| **RN-14** | Por la pasarela solo se acepta el pago con billetera virtual, de acreditación inmediata. |
| **RN-15** | Cuando cambia el precio de una variante, sus etiquetas quedan marcadas como desactualizadas hasta que se reimprimen. |
| **RN-16** | Los SKU y códigos QR son únicos y no se reutilizan, aunque la variante se desactive. |
| **RN-17** | Solo se aceptan devoluciones dentro de los 3 días corridos posteriores a la fecha de la venta. Pasado ese plazo, el sistema no permite registrarlas. |
| **RN-18** | Una venta de carga diferida conserva la fecha y hora reales de la venta y registra quién la cargó y cuándo. Si al cargarla el stock no alcanza, el sistema pide primero un ajuste de inventario con motivo. |
| **RN-19** | Una devolución sin comprobante o con reintegro por la pasarela requiere la autorización de un administrador. Toda devolución registra quién la hizo y quién la autorizó. |

### 4.1 Estados de la venta

| Estado | Significado |
| :--- | :--- |
| **Pendiente de pago** | La venta está armada y, si se paga por pasarela, tiene stock reservado. |
| **Pagada** | El pago fue aprobado por la pasarela o registrado por el vendedor. El stock ya fue descontado. |
| **Pagada sin stock** | El pago se aprobó fuera de término y no había unidades para reservar. Se resuelve con cambio o devolución. |
| **Entregada** | El vendedor verificó el pago y el cliente retiró los productos. |
| **Cancelada** | El pago fue rechazado, venció o la venta se anuló antes de pagarse. No descuenta stock. |
| **Devuelta** | Se reintegró el dinero, total o parcialmente. El stock se repone según RN-09. |

---

## 5. Flujos principales

### 5.1 Compra con autoservicio desde el celular
1. El cliente escanea con su celular el QR de la etiqueta o busca el producto.
2. El sistema muestra la descripción, imagen, precio y variantes.
3. El cliente selecciona modelo, talle/color (si corresponde) y cantidad.
4. El sistema valida la disponibilidad y muestra el subtotal.
5. El cliente agrega el artículo al carrito y puede seguir agregando otros.
6. El cliente confirma la compra e inicia el pago.
7. El servidor vuelve a validar precios y stock y crea una reserva temporal de las unidades.
8. La pasarela procesa el pago y comunica el resultado por webhook.
9. Si el pago se aprueba, el sistema confirma la venta, descuenta el stock y registra el movimiento.
10. El cliente recibe el comprobante con QR y lo muestra al vendedor.
11. El vendedor escanea el QR, verifica que la venta esté pagada y la marca como entregada.

### 5.2 Venta asistida desde tablet o celular
1. El vendedor escanea los QR con la cámara de su tablet o celular, o busca los productos por nombre.
2. El sistema arma la venta y muestra el total.
3. El vendedor elige el medio de pago:
   * **Pago por pasarela:** el sistema reserva el stock y muestra un QR de cobro; el cliente paga con su celular y se sigue desde el paso 8 del flujo 5.1.
   * **Pago manual:** el vendedor elige efectivo, transferencia o posnet e ingresa el importe y la referencia. En efectivo, el sistema muestra el vuelto.
4. Al registrar el pago manual, el sistema confirma la venta, descuenta el stock y asocia el cobro al vendedor, todo en una transacción.
5. El sistema emite el comprobante y la venta queda como entregada.

### 5.3 Pago rechazado o vencido
Si el pago es rechazado, cancelado o no se completa dentro del tiempo de reserva, la venta queda como "Cancelada" y las unidades reservadas vuelven a estar disponibles. No se descuenta stock. El vendedor puede ofrecer otro medio de pago, lo que genera un nuevo intento.

### 5.4 Pago aprobado fuera de término
1. La pasarela notifica la aprobación de un pago cuya reserva ya venció.
2. El sistema intenta reservar nuevamente las mismas unidades.
3. Si hay stock, confirma la venta, descuenta el stock y sigue el flujo normal.
4. Si no hay stock, registra la venta como "Pagada sin stock" y avisa al administrador y al vendedor en el panel.
5. El vendedor resuelve con el cliente: cambio por otra variante disponible o devolución del dinero por la pasarela.
6. Como la venta es presencial, una "Pagada sin stock" con el producto en mano del cliente indica una diferencia de inventario: el sistema sugiere revisar el stock de esa variante con un ajuste.

### 5.5 Generación e impresión de etiquetas
1. El administrador da de alta una variante o registra un ingreso de mercadería.
2. El sistema genera un código interno único y su código QR.
3. El administrador elige las variantes, la cantidad de copias y la posición inicial en la hoja A4.
4. El sistema genera un PDF con las etiquetas: nombre, talle, color, precio, código QR y código en texto.
5. Cuando cambia un precio, la variante aparece en el listado de etiquetas a reimprimir.

### 5.6 Alerta de bajo stock
Después de cada venta, devolución o ajuste, el sistema evaluará el stock de la variante. Si queda igual o por debajo de su stock mínimo, la variante aparecerá en el panel de alertas. La alerta deberá evitar duplicados y actualizarse cuando cambie la existencia.

### 5.7 Devolución
1. El cliente se presenta con el producto y el comprobante dentro de los 3 días corridos posteriores a la compra.
2. El vendedor escanea el QR del comprobante o ingresa su número, y elige los ítems devueltos.
3. El sistema verifica el plazo. Si pasaron más de 3 días, no permite registrar la devolución.
4. Si no hay comprobante o el reintegro es por la pasarela, el sistema pide la autorización de un administrador (RN-19).
5. El vendedor registra la devolución; la unidad vuelve al stock en ese momento y queda el movimiento en el historial.
6. Se reintegra el dinero: por la API de la pasarela si se pagó por ese medio, o en forma manual con su registro.

### 5.8 Venta sin conexión a internet
1. Si se corta internet, el vendedor anota cada venta en una planilla en papel: fecha y hora, productos, talle/color, cantidad, importe y medio de pago.
2. Durante el corte solo se aceptan pagos manuales (efectivo, transferencia o posnet que funcione sin la aplicación).
3. Cuando vuelve la conexión, el vendedor carga cada venta en la pantalla de ventas diferidas.
4. El sistema registra la venta con su fecha real, la marca como "Carga diferida" y descuenta el stock.
5. Si alguna variante no tiene stock suficiente, el sistema pide un ajuste de inventario con motivo antes de cargarla.

---

## 6. Requerimientos no funcionales

| ID | Atributo | Criterio |
| :--- | :--- | :--- |
| **RNF-01** | Usabilidad | La interfaz deberá ser clara, consistente y permitir completar una compra con la menor cantidad razonable de pasos. |
| **RNF-02** | Responsive | La aplicación deberá adaptarse a celulares, tabletas y escritorio, con controles táctiles adecuados. |
| **RNF-03** | Rendimiento | Las páginas habituales deberán responder en un tiempo objetivo de hasta 2 segundos bajo carga normal, excluyendo demoras del proveedor externo. |
| **RNF-04** | Disponibilidad | El objetivo inicial de disponibilidad será 99,5 % mensual, sujeto a infraestructura y proveedor de alojamiento. |
| **RNF-05** | Seguridad | Todo el tráfico deberá utilizar HTTPS. Las contraseñas se almacenarán con hash seguro y las sesiones tendrán controles de expiración. |
| **RNF-06** | Autorización | Las funciones administrativas estarán protegidas por roles y permisos; el cliente no podrá acceder a datos internos. |
| **RNF-07** | Integridad | Las operaciones de venta y stock deberán ser transaccionales para impedir inconsistencias y sobreventa. |
| **RNF-08** | Escalabilidad | La arquitectura deberá permitir aumentar productos, usuarios y operaciones sin rediseñar el núcleo del sistema. |
| **RNF-09** | Mantenibilidad | El código deberá organizarse por módulos, documentar APIs y contar con pruebas automatizadas. |
| **RNF-10** | Compatibilidad | La interfaz deberá funcionar en versiones vigentes de Chrome, Edge, Firefox y Safari. |
| **RNF-11** | Accesibilidad | Se deberán utilizar etiquetas, contraste suficiente, navegación por teclado y mensajes de error comprensibles. |
| **RNF-12** | Respaldo | La base de datos deberá contar con copias de seguridad periódicas y un procedimiento probado de restauración. |
| **RNF-13** | Hardware del local | La venta asistida deberá funcionar en tablets y celulares Android e iOS, leyendo los QR con la cámara. Las etiquetas se imprimirán en hojas A4 con una impresora común. El QR deberá medir al menos 20 mm de lado y ser legible por la cámara de un celular o tablet. |

---

## 7. Propuesta tecnológica y base de datos

### 7.1 Base de datos recomendada: PostgreSQL
Se recomienda PostgreSQL como motor relacional. Es adecuado para este sistema porque permite transacciones ACID, restricciones de integridad, índices, relaciones entre productos/variantes/ventas y bloqueos de filas para controlar compras simultáneas. Estas capacidades son especialmente importantes para que dos clientes no compren al mismo tiempo la última unidad.

* **Motor:** PostgreSQL 16 o una versión estable posterior compatible con el entorno.
* **Identificadores:** UUID o claves numéricas; SKU y códigos QR con restricción de unicidad.
* **Importes:** Tipo `NUMERIC`/`DECIMAL`, nunca `FLOAT`, para evitar errores de redondeo.
* **Fechas:** `TIMESTAMPTZ` y almacenamiento consistente en UTC, mostrando hora local en la interfaz.
* **Integridad:** Claves foráneas, restricciones `CHECK`, índices y transacciones.

### 7.2 Entidades principales

| Entidad | Campos principales / finalidad |
| :--- | :--- |
| `users` | `id`, `nombre`, `email`, `password_hash`, `estado`, `created_at`. Usuarios internos del sistema. |
| `roles` / `user_roles` | Roles y asignación de permisos: administrador y vendedor. El cliente no tiene usuario. |
| `categories` | `id`, `nombre`, `descripción`, `estado`. |
| `products` | `id`, `category_id`, `nombre`, `descripción`, `imágenes`, `estado`. |
| `product_variants` | `id`, `product_id`, `SKU`, `modelo`, `talle`, `color`, `codigo` (único, contenido en el QR junto con la URL de la ficha), `precio`, `stock_actual`, `stock_minimo` (por defecto 5), `etiqueta_desactualizada`. |
| `customers` | `id`, `nombre`, `email`, `teléfono`. Todos opcionales; se usan solo para enviar el comprobante. |
| `carts` / `cart_items` | Carrito del cliente o venta en armado por el vendedor, y sus líneas: variante, cantidad y precio de referencia. |
| `stock_reservations` | `id`, `variante`, `cantidad`, `vencimiento`, `estado` y `referencia_de_checkout`. |
| `sales` | `id`, `customer_id` (opcional), `número`, `canal` (autoservicio / venta asistida), `vendedor_id`, `fecha`, `subtotal`, `total`, `estado` (ver 4.1), `moneda`, `entregada_por`, `entregada_en`, `carga_diferida`, `cargada_por`, `cargada_en`. |
| `sale_items` | `id`, `sale_id`, `variant_id`, `descripción/SKU histórico`, `cantidad`, `precio_unitario` y `subtotal`. |
| `payments` | `id`, `sale_id`, `tipo` (pasarela / manual), `medio` (billetera virtual, efectivo, transferencia, posnet), `referencia_externa`, `importe`, `importe_recibido`, `vuelto`, `estado`, `registrado_por`, `anulado_por`, `motivo_anulación`, `fecha` y `respuesta_resumida_del_proveedor`. |
| `refunds` | `id`, `sale_id`, `payment_id`, `importe`, `medio`, `referencia_externa`, `motivo`, `registrado_por`, `autorizado_por` y `fecha`. |
| `stock_movements` | `id`, `variant_id`, `tipo` (venta, ingreso, egreso, devolución, rotura, ajuste, inventario inicial), `cantidad` (+/-), `motivo`, `referencia`, `usuario` y `fecha`. |
| `stock_alerts` | `id`, `variant_id`, `stock_detectado`, `umbral`, `estado`, `fecha_de_creación` y `resolución`. |
| `label_print_jobs` | `id`, `variantes`, `cantidad_de_copias`, `formato`, `usuario` y `fecha`. |
| `import_jobs` | `id`, `archivo`, `filas_correctas`, `filas_con_error`, `detalle_de_errores`, `usuario` y `fecha`. |

### 7.3 Relaciones principales
* Una categoría puede contener muchos productos.
* Un producto puede tener muchas variantes; cada variante tiene su propio SKU, código y stock.
* Una venta contiene uno o más ítems y puede tener uno o más intentos de pago, por pasarela o manuales.
* Una venta puede tener cero o más devoluciones, cada una asociada al pago que se reintegra.
* Cada pago manual se asocia al vendedor que lo registró.
* Cada movimiento de stock corresponde a una variante y puede vincularse con una venta, devolución, ajuste o importación.
* Las reservas se asocian a variantes y a una operación de checkout, con vencimiento.

### 7.4 Modelo de inventario
El campo `stock_actual` representa las unidades físicas disponibles registradas. Para mostrar disponibilidad durante una compra, se recomienda calcular:

$$\text{stock\_disponible} = \text{stock\_actual} - \text{unidades\_reservadas\_activas}$$

Al aprobarse el pago, la reserva se convierte en salida por venta: se reduce `stock_actual` y se cierra la reserva, dentro de una transacción. En un pago manual no hay reserva previa: la validación de stock, la venta y el descuento se hacen en la misma transacción.

El sistema debe mantener un libro de movimientos de stock como historial auditable. El valor actual podrá almacenarse para consultas rápidas, pero deberá poder reconciliarse con los movimientos registrados.

---

## 8. Arquitectura lógica propuesta

| Componente | Responsabilidad |
| :--- | :--- |
| **Frontend web responsive** | Catálogo, escáner QR, ficha del producto, carrito, checkout, venta asistida, verificación de entrega, devoluciones, carga de ventas diferidas y panel administrativo. |
| **Backend / API** | Reglas de negocio, autenticación, autorización, precios, ventas, pagos manuales, reservas, inventario, etiquetas, importación y reportes. |
| **PostgreSQL** | Persistencia de productos, variantes, ventas, pagos, reservas, movimientos y usuarios. |
| **Servicio de imágenes** | Almacenamiento y entrega de fotografías de productos. |
| **Pasarela de pago** | Mercado Pago: QR dinámico por venta, pago con billetera virtual, devoluciones y notificaciones firmadas de aprobación, rechazo, cancelación o reembolso. |
| **Lectura de códigos** | Lectura de QR con la cámara del navegador de la tablet o el celular (por ejemplo, con las librerías ZXing o `html5-qrcode`). |
| **Generador de etiquetas** | Generación de PDF con códigos QR para hojas A4 autoadhesivas precortadas. |
| **Servicio de notificaciones** | Alertas internas (stock bajo, ventas pagadas sin stock) y, opcionalmente, correo electrónico. |
| **Tarea programada** | Liberación de reservas vencidas, conciliación de pagos pendientes con la pasarela y tareas de mantenimiento. |

La aplicación deberá separar la interfaz de usuario, la lógica de negocio y el acceso a datos. La confirmación del pago por pasarela se validará en el backend mediante una notificación firmada (webhook) del proveedor, no únicamente por el retorno visual del navegador. La lectura de códigos con cámara requiere que el sitio funcione con HTTPS.

---

## 9. Interfaces y pantallas requeridas

| Pantalla | Elementos mínimos |
| :--- | :--- |
| **Inicio / catálogo** | Buscador, categorías, tarjetas de productos, precio, disponibilidad y acceso al escáner. |
| **Escáner / búsqueda por código** | Vista de cámara, permiso de cámara, campo para ingresar código manualmente y resultado identificado. |
| **Detalle de producto** | Imágenes, descripción, modelo, talles/colores, precio, disponibilidad y selector de cantidad. |
| **Carrito** | Lista de ítems, variante, cantidad editable, subtotal por línea, total y botón de continuar. |
| **Checkout** | Datos opcionales del comprador (para enviar el comprobante), resumen final, aceptación de condiciones y acción de pagar. |
| **Resultado de compra** | Estado de la operación, número de venta, importe, detalle y comprobante con QR para mostrar al vendedor. |
| **Venta asistida (tablet / celular)** | Botón de escaneo con cámara, búsqueda, lista de ítems, total, elección de medio de pago y QR de cobro. Diseñada para pantalla táctil. |
| **Registro de pago manual** | Medio de pago, importe, importe recibido y vuelto (efectivo), referencia (transferencia o posnet) y confirmación. |
| **Verificación y entrega** | Escaneo del QR del comprobante o ingreso del número, estado del pago, detalle y botón "Marcar como entregada". |
| **Panel administrativo** | Indicadores, ventas recientes, stock total, alertas de bajo stock, ventas pagadas sin stock y accesos rápidos. |
| **Gestión de productos** | Alta/edición, variantes, carga de imágenes, SKU, códigos, precios, stock mínimo y estado. |
| **Etiquetas** | Selección de variantes, cantidad de copias, posición inicial en la hoja, vista previa, descarga del PDF y listado de etiquetas desactualizadas. |
| **Importación** | Carga del archivo, vista previa, errores por fila y confirmación. |
| **Devoluciones** | Búsqueda por QR o número de comprobante, días transcurridos desde la compra, ítems a devolver, medio de reintegro, autorización del administrador cuando corresponda y confirmación. |
| **Carga de ventas diferidas** | Fecha y hora reales, ítems, cantidades, medio de pago e importe; aviso si falta stock y acceso al ajuste. |
| **Inventario** | Stock por variante, entradas/salidas, ajustes, filtros e historial de movimientos. |
| **Ventas y cobros** | Listado, detalle, estado, medio de pago, vendedor, filtros, resumen de cobros, anulación de pagos manuales y registro de devoluciones/cancelaciones. |

---

## 10. Seguridad, pagos y privacidad

* Utilizar HTTPS en todos los ambientes que manejen datos reales.
* Aplicar validación de datos en frontend y backend; la validación del backend será obligatoria.
* Proteger las rutas administrativas y de venta mediante autenticación y autorización por rol.
* Almacenar contraseñas con Argon2id o bcrypt con parámetros seguros; nunca en texto plano.
* Implementar protección contra CSRF, XSS, inyección SQL, fuerza bruta y abuso de endpoints.
* Verificar la autenticidad de los webhooks del proveedor de pagos y procesarlos de manera idempotente.
* No guardar datos completos de tarjetas ni CVV; delegar el ingreso de esos datos al proveedor de pagos.
* Registrar en auditoría los pagos manuales, sus anulaciones y las entregas, sin almacenar secretos ni datos de pago innecesarios.
* Definir política de privacidad, retención de datos y consentimiento conforme a la normativa aplicable.
* **Mercado Pago:** Integrado con QR dinámico mediante su **API de Orders** (la integración QR anterior se está discontinuando). Cada notificación se valida con la firma del encabezado `x-signature`. Antes de producción se probarán los casos de prueba con las credenciales y el simulador de notificaciones del ambiente de pruebas.

---

## 11. Criterios de aceptación

| ID | Condición verificable |
| :--- | :--- |
| **CA-01** | Al escanear un código válido, se muestra el producto o variante correcta con descripción y precio. |
| **CA-02** | Si el código no existe, se informa claramente y se permite volver a buscar. |
| **CA-03** | Al seleccionar talle/modelo y cantidad, el sistema muestra el subtotal correcto. |
| **CA-04** | El sistema impide agregar una cantidad superior a la disponible. |
| **CA-05** | El carrito calcula correctamente la suma de todos los ítems. |
| **CA-06** | Un pago aprobado genera una venta y descuenta exactamente las cantidades compradas. |
| **CA-07** | Un pago rechazado o vencido no descuenta stock y libera la reserva. |
| **CA-08** | Dos compras simultáneas de la última unidad no pueden producir stock negativo ni dos ventas confirmadas. |
| **CA-09** | Cuando el stock queda igual o por debajo del stock mínimo de la variante, se muestra una alerta para esa variante. |
| **CA-10** | El panel administrativo muestra el stock actualizado luego de confirmar la venta. |
| **CA-11** | Cada modificación de inventario queda reflejada en el historial con fecha, motivo y responsable. |
| **CA-12** | La aplicación puede utilizarse sin pérdida de funcionalidad esencial en celular, tableta y escritorio. |
| **CA-13** | Un pago manual registrado por el vendedor confirma la venta, descuenta el stock, queda asociado al vendedor y, en efectivo, muestra el vuelto correcto. |
| **CA-14** | Una venta sin pago aprobado ni registrado no puede marcarse como entregada. |
| **CA-15** | Un pago aprobado después de vencida la reserva confirma la venta si hay stock, o la deja como "Pagada sin stock" con aviso al administrador y al vendedor si no lo hay. |
| **CA-16** | Al crear una variante se genera un código único, y el QR de su etiqueta impresa se lee correctamente con la cámara de un celular o tablet. |
| **CA-17** | El comprobante muestra la leyenda "Documento no válido como factura". |
| **CA-18** | Una importación con filas inválidas informa los errores por fila y no carga esas filas. |
| **CA-19** | Una devolución dentro de los 3 días repone el stock en el momento; una fuera de plazo no se puede registrar. |
| **CA-20** | Una venta de carga diferida queda con su fecha real, marcada como "Carga diferida", y descuenta el stock. |

---

## 12. Casos de prueba iniciales

| Caso | Datos / acción | Resultado esperado |
| :--- | :--- | :--- |
| **CP-01** | Variante con stock 10; comprar 2; pago aprobado. | Stock final 8; venta confirmada; movimiento de salida por 2. |
| **CP-02** | Variante con stock 6 y stock mínimo 5; comprar 1; pago aprobado. | Stock final 5; se activa alerta de bajo stock. |
| **CP-03** | Variante con stock 3; intentar comprar 4. | La compra se bloquea o se solicita reducir la cantidad. |
| **CP-04** | Variante con stock 1; dos clientes intentan comprar 1 simultáneamente. | Solo una compra puede reservar y confirmar la última unidad. |
| **CP-05** | Pago rechazado luego de reservar 2 unidades. | No se descuenta stock; se libera la reserva. |
| **CP-06** | Se recibe dos veces el mismo webhook de pago aprobado. | La venta y el descuento se procesan una sola vez. |
| **CP-07** | Escanear un código inexistente. | Se informa que no se encontró el producto. |
| **CP-08** | Devolución de una unidad 2 días después de la compra. | Se registra la devolución y el stock de la variante aumenta en 1 en ese momento. |
| **CP-09** | Venta asistida de 2 unidades por $30.000; pago en efectivo con $50.000. | Venta confirmada; vuelto $20.000; stock −2; pago asociado al vendedor. |
| **CP-10** | Reserva vencida a los 10 minutos; el webhook aprobado llega a los 15 minutos y hay stock. | Venta confirmada; stock descontado una sola vez. |
| **CP-11** | Igual que CP-10, pero otra venta ya se llevó la última unidad. | Venta "Pagada sin stock"; aviso al administrador y al vendedor; se puede resolver con cambio o devolución. |
| **CP-12** | Intentar marcar como entregada una venta pendiente de pago. | La acción se bloquea con un mensaje claro. |
| **CP-13** | Crear una variante, imprimir 5 etiquetas y escanear una con la tablet. | Se muestra la variante correcta. |
| **CP-14** | Cambiar el precio de una variante. | La variante aparece en el listado de etiquetas a reimprimir. |
| **CP-15** | Un vendedor sin permiso intenta anular un pago manual. | La acción se rechaza y queda registrada en auditoría. |
| **CP-16** | Intentar registrar una devolución 4 días después de la compra. | El sistema rechaza la devolución por estar fuera de plazo. |
| **CP-17** | Cargar una venta de la planilla de ayer a las 15:30, 1 unidad, efectivo. | Venta con fecha de ayer 15:30, marcada como "Carga diferida"; stock −1. |
| **CP-18** | Un vendedor intenta registrar una devolución sin comprobante. | El sistema pide la autorización de un administrador antes de registrarla. |
| **CP-19** | Imprimir 5 etiquetas empezando en la posición 10 de una hoja A4 de 24. | El PDF ubica las etiquetas en las posiciones 10 a 14 y cada QR se lee con la tablet. |

---

## 13. Entregables sugeridos

* Documento de diseño de arquitectura y modelo entidad-relación.
* Prototipo navegable de las pantallas principales.
* Aplicación web responsive para clientes, vendedores (tablet / celular) y administración.
* API documentada y esquema/migraciones de PostgreSQL.
* Integración con proveedor de pagos en ambiente de pruebas y producción.
* Módulo de catálogo, variantes, escaneo de códigos y carrito.
* Módulo de venta asistida, pagos manuales, verificación de entrega y carga de ventas diferidas.
* Módulo de códigos QR, etiquetas e importación inicial.
* Módulo de ventas, reservas, inventario, alertas e historial.
* Pruebas unitarias, de integración, seguridad básica y aceptación.
* Manual breve de administración y venta, y guía de despliegue/respaldo.

### 13.1 Etapas de desarrollo

| Etapa | Contenido | Requerimientos |
| :--- | :--- | :--- |
| **1. Local operativo** | Catálogo, variantes, códigos QR y etiquetas, importación inicial, ajustes de stock con historial, venta asistida con pago manual, verificación de entrega, comprobante, alertas, devoluciones con reintegro manual y carga de ventas diferidas. Con esto el local ya puede vender y controlar stock. | RF-01 a RF-09, RF-11 a RF-22, RF-23 (reintegro manual), RF-25 a RF-27, RF-29 a RF-31, RF-33 |
| **2. Pago integrado** | Pasarela con QR de cobro en la venta asistida y autoservicio desde el celular, reservas, webhooks, pago fuera de término y tarea programada. | RF-10, RF-28 |
| **3. Cierre** | Devoluciones con reintegro por API, resumen de cobros, reportes y auditoría completa. | RF-23 (reintegro por API), RF-24, RF-32 |

---

## 14. Riesgos y puntos pendientes de definición

| Tema | Estado | Definición |
| :--- | :--- | :--- |
| **Modalidad de compra** | Resuelto | Venta presencial; el cliente retira en el momento. |
| **Alcance comercial** | Resuelto | Un único negocio. |
| **Identificación del producto** | Resuelto | Solo código QR por variante, generado por el sistema. No se usa código de barras. |
| **Clientes** | Resuelto | Compra como invitado, con datos opcionales. |
| **Precios** | Resuelto para v1 | Precios finales con IVA, sin descuentos ni promociones. |
| **Alertas** | Resuelto | `stock_minimo` por variante, con valor por defecto 5. |
| **Reservas** | Resuelto, a validar | 10 minutos por defecto, configurable. Validar con la vigencia del QR dinámico de Mercado Pago. |
| **Proveedor de pago** | Resuelto | Mercado Pago con QR dinámico (API de Orders) y webhooks firmados. Por la pasarela el cliente paga solo con billetera virtual; las comisiones no son un factor de decisión. |
| **Devoluciones** | Resuelto; autorización propuesta | Plazo máximo de 3 días corridos desde la compra; la unidad vuelve al stock al registrarse. Propuesta a confirmar: el vendedor registra solo las devoluciones con comprobante y reintegro manual o cambio; sin comprobante o con reintegro por la pasarela, autoriza el administrador. |
| **Hardware** | Resuelto | Código QR por variante; venta desde tablet o celular; etiquetas en hojas A4 autoadhesivas precortadas con impresora común (referencia: 24 etiquetas de 70 × 37 mm, QR de 20 mm o más). Antes de comprar las hojas, probar que el QR impreso se lea bien. |
| **Facturación** | Resuelto | El sistema no emite facturas. La facturación se hace en papel, fuera del sistema. |
| **Conectividad del local** | Resuelto | Si se corta internet, las ventas se registran en una planilla y se cargan manualmente cuando vuelve la conexión (RF-33, flujo 5.8). |
| **Dispositivo del vendedor** | Resuelto | El vendedor hace las ventas desde una tablet o un celular. |
| **Infraestructura** | Propuesto | Ambientes de desarrollo (local), pruebas y producción. Backend en un servicio administrado (por ejemplo, Render o Railway) y PostgreSQL administrado con backups automáticos (por ejemplo, Neon o Supabase). Dominio `.com.ar` en NIC Argentina con HTTPS. Backup diario del proveedor más una exportación semanal externa, con una restauración de prueba. Monitoreo de disponibilidad con aviso por correo. |

---

## 15. Recomendación final

Se recomienda desarrollar la solución con PostgreSQL como base de datos relacional y una API backend que centralice las reglas de venta e inventario. El stock debe gestionarse por variante/SKU y todo cambio debe quedar registrado en un historial. Como la venta es presencial, el control clave es que ningún producto salga del local sin un pago aprobado o registrado, verificado por el vendedor.

Se sugiere empezar por la **Etapa 1**, que ya permite operar el local con pagos manuales y etiquetas, e integrar Mercado Pago en la **Etapa 2**, con reservas temporales, transacciones y el tratamiento de los pagos aprobados fuera de término. Antes de comenzar, se deberán confirmar los puntos marcados como propuestos en la sección 14.