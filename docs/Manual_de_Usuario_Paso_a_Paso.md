# Manual de Usuario y Funcionamiento Paso a Paso
## Sistema Web de Ventas y Control de Stock - Versión Local Operativo (v1.0)

Este manual describe de forma práctica cómo opera el sistema en el local comercial, explicando el circuito diario de venta, el uso de cada uno de los códigos QR, devoluciones, control de inventario y cierre de caja.

---

## 1. Los 3 Códigos QR del Sistema (¿Para qué sirve cada uno?)

Para evitar confusiones, el sistema utiliza **tres códigos QR distintos**, cada uno con un propósito específico dentro del local:

```
[QR 1: En la Etiqueta de la Ropa] ➔ El cliente o vendedor consulta la prenda y precio
           │
           ▼
[QR 2: En el Celular del Cliente] ➔ El vendedor lo escanea para cargar el pedido al mostrador
           │
           ▼
[QR 3: En el Comprobante de Venta] ➔ Se escanea para entregar la bolsa y para devoluciones
```

### QR Nº 1: Código QR de la Etiqueta (En la Prenda)
* **¿Dónde está?:** Impreso en la etiqueta colgante o autoadhesiva de cada prenda en el perchero.
* **¿Para qué sirve?:**
  * **Para el Cliente:** Lo escanea con la cámara de su celular para abrir la **Ficha del Producto** (ver fotos, descripción, talles disponibles, colores y precio final con IVA). Además, desde allí puede presionar **"Agregar al Carrito"** para armar su pedido mientras recorre el local.
  * **Para el Vendedor:** Puede escanearlo desde su tablet o celular para ver el stock real en depósito o cargarlo directamente a la venta en el mostrador.

---

### QR Nº 2: Código QR de Pedido / Carrito (En el Celular del Cliente)
* **¿Dónde está?:** En la pantalla del celular del cliente, dentro de su carrito de compras virtual.
* **¿Para qué sirve?:**
  * Cuando el cliente termina de elegir sus prendas, su celular genera un pedido con un código (ej: `PED-ABC12345`) y un código QR en pantalla.
  * Al llegar al mostrador, el vendedor toca en **"Escanear Pedido de Cliente"** desde el sistema de cobro (POS) y lee ese QR.
  * **Beneficio:** En un segundo se cargan todas las prendas seleccionadas por el cliente sin que el cajero tenga que tipear nada ni buscar prenda por prenda.

---

### QR Nº 3: Código QR de Comprobante / Verificación (Al Confirmar la Venta)
* **¿Dónde está?:** En la pantalla de *"¡Venta Confirmada!"* y en el comprobante digital emitido.
* **¿Para qué sirve?:**
  * **Verificación de Entrega:** Antes de que el cliente se retire del local con la bolsa, el personal de empaque o el vendedor escanea este QR en la sección **"Entrega"** para verificar que el cobro esté acreditado y marcar la mercadería como *Entregada*.
  * **Devoluciones:** Si el cliente regresa dentro del plazo de 3 días para cambiar un talle o devolver una prenda, el vendedor escanea este QR en la sección **"Devoluciones"** para traer la venta original en pantalla.
  * *Nota legal:* Todo comprobante incluye la leyenda obligatoria *"Documento no válido como factura"*.

---

## 2. Paso a Paso: Cómo realizar una Venta en Mostrador (POS)

1. En el menú superior o inferior, ingresa a la pestaña **POS (Venta Asistida)**.
2. **Cargar los productos a la venta:**
   * **Opción A (Escaneo directo):** Haz clic en el ícono de cámara y escanea el QR de la etiqueta de la prenda.
   * **Opción B (Búsqueda por texto/código):** Escribe el nombre o SKU de la prenda en la barra de búsqueda y presiona sobre la variante.
   * **Opción C (Pedido armado por el cliente):** Presiona *"Cargar Pedido de Cliente"* y escanea el QR del celular del cliente (o ingresa el código `PED-...`).
3. **Seleccionar el Medio de Pago:**
   * **Efectivo:** Ingresa el dinero recibido del cliente. El sistema calculará automáticamente el vuelto exacto a entregar.
   * **Transferencia / Billetera Virtual (Mercado Pago, MODO, Cuenta DNI, Bancos):** El cliente transfiere al alias/CVU del local o escanea el cartelito de Mercado Pago. El vendedor corrobora la acreditación e ingresa el **número de comprobante / operación** que figura en el celular del cliente.
   * **Posnet / Tarjeta:** Se pasa la tarjeta por la terminal física del local y se ingresa el **número de cupón**.
4. **Confirmar la Venta:**
   * Si la mercadería se le entrega en mano en ese mismo instante, marca la casilla *"Marcar como entregada en el momento"*.
   * Presiona el botón verde **"Confirmar y Cobrar Venta"**.
   * El stock de cada prenda se descuenta inmediatamente del inventario y se emite el comprobante de venta.

---

## 3. Paso a Paso: Cómo Verificar y Entregar Mercadería

Si en el local el cajero cobra en una caja y el empaque se hace en otro sector:

1. El personal de entrega ingresa a la pestaña **"Entrega"**.
2. Escanea con la tablet el QR del comprobante del cliente (o tipea el código `VTA-...`).
3. El sistema muestra en pantalla el estado del cobro:
   * Si la venta fue cobrada, muestra el detalle de las prendas que deben colocarse en la bolsa.
4. Presiona **"Confirmar Entrega de Mercadería"**. La venta queda marcada formalmente como *Entregada* en el sistema.

---

## 4. Paso a Paso: Cómo Gestionar una Devolución

1. Ingresa a la pestaña **"Devoluciones"** (ícono de flecha de retorno).
2. Tipea el número de comprobante (ej: `VTA-20261125-B65A`) o escanéalo.
3. El sistema valida las reglas del negocio:
   * **Plazo de 3 días:** Verifica que no hayan transcurrido más de 3 días corridos desde la compra (mostrando por ejemplo *"0 de 3 día(s) transcurridos"*). Si pasaron más de 3 días, bloquea la devolución automáticamente.
4. **Indicar ítems y motivo:**
   * Selecciona qué prendas devuelve el cliente y la cantidad.
   * Selecciona el medio de solución: *Efectivo* (reintegro de billetes), *Transferencia* o *Cambio por otra prenda*.
   * Escribe el motivo obligatorio (ej: *"Cambio de talle"* o *"Falla de confección"*).
   * *Devolución sin comprobante:* Si el cliente perdió el ticket, se marca la casilla correspondiente; el sistema exigirá la clave o ID del Administrador para autorizarla.
5. Presiona **"Procesar Devolución"**:
   * Las prendas devueltas **se reintegran automáticamente al stock disponible en el acto**.
   * El dinero devuelto queda registrado como un egreso de caja.

---

## 5. Carga de Ventas Diferidas (Si se corta la luz o Internet)

Si durante el día se corta la energía o la conexión:
1. El vendedor anota las ventas en la planilla de papel con la hora exacta, prenda y medio de pago.
2. Al restablecerse el servicio, ingresa a la pestaña **"Diferidas"** en el sistema.
3. Ingresa la fecha y hora real en que se hizo la venta física.
4. Carga las prendas y el medio de cobro.
5. Al guardar, el sistema descuenta el stock y marca la operación con la etiqueta visible **"Carga Diferida"** para que la auditoría y los reportes coincidan a la perfección.

---

## 6. Arqueo y Cierre de Caja al Final del Día

1. Ingresa a la pestaña **"Caja"**.
2. Selecciona el período a consultar (*Ventas de Hoy*, *Ayer*, *Últimos 7 días* o *Historial Completo*).
3. **El panel calcula el Arqueo Neto Real en Mano:**
   * **Total General:** Recaudación neta total (`Ventas brutas - Devoluciones`).
   * **Efectivo en Mano (Gaveta):** Dinero físico exacto que debe haber en el cajón (`Efectivo de ventas - Efectivo reintegrado por devoluciones`).
   * **Transferencias Netas:** Dinero ingresado por bancos/billeteras virtuales deduciendo reintegros.
   * **Posnet:** Total operado mediante terminales de tarjeta con cupones.
4. Si hubo devoluciones en el día, un banner destacado te muestra cuántas prendas reingresaron al stock y cuánto dinero se devolvió.
5. Puedes alternar entre las pestañas **"Ventas Realizadas"** y **"Devoluciones & Reingresos"** para auditar cada ticket individual.

---

## 7. Catálogo, Inventario y Etiquetas A4

* **Alertas de Bajo Stock:** Cuando a una prenda le quedan **5 unidades o menos**, el sistema genera una alerta amarilla/roja automática para avisar que es momento de reponer.
* **Ajustes de Inventario:** Desde *Administración ➔ Ajustes & Historial* se pueden ingresar recepciones de mercadería nueva, bajas por rotura o recuentos físicos con motivo auditable.
* **Impresión de Etiquetas en Hoja A4:**
  * En *Administración ➔ Etiquetas A4*, el sistema genera un PDF listo para imprimir en hojas estándar de **24 etiquetas precortadas autoadhesivas** (70 × 37 mm).
  * Puedes indicar la **posición inicial** (ej: empezar en la etiqueta número 8) para aprovechar hojas que ya fueron usadas parcialmente sin desperdiciar papel.
