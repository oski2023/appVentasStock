import { withTransaction } from '../../db/index.js';
import { generateOperationNumber } from '../../utils/order-number.js';
import { generateQrDataUrl } from '../../utils/qr.js';
import { CreateDeferredSaleInput } from './deferred-sales.schemas.js';

export class DeferredSalesService {
  /**
   * Carga una venta diferida anotada durante contingencia sin conexión (RF-33, RN-18, CA-20).
   */
  static async createDeferredSale(input: CreateDeferredSaleInput, usuarioId: string) {
    return withTransaction(async (client) => {
      // 1. Validar que la fecha real no sea en el futuro
      const fechaVentaReal = new Date(input.fecha_real);
      if (fechaVentaReal.getTime() > Date.now()) {
        throw new Error('La fecha real de la venta diferida no puede ser posterior a la fecha y hora actual');
      }

      // 2. Extraer variantes
      const itemMap = new Map<string, number>();
      for (const item of input.items) {
        const currentQty = itemMap.get(item.variant_id) || 0;
        itemMap.set(item.variant_id, currentQty + item.cantidad);
      }
      const variantIds = Array.from(itemMap.keys());

      // 3. Bloquear filas de variantes con FOR UPDATE
      const { rows: variants } = await client.query(
        `SELECT v.id, v.sku, v.modelo, v.talle, v.color, v.precio, v.stock_actual, v.stock_minimo,
                p.nombre AS producto_nombre
         FROM product_variants v
         INNER JOIN products p ON v.product_id = p.id
         WHERE v.id = ANY($1)
         FOR UPDATE`,
        [variantIds]
      );

      if (variants.length !== variantIds.length) {
        throw new Error('Una o más variantes no existen en el sistema');
      }

      // 4. Regla RN-18: Si el stock actual no alcanza, solicitar primero un ajuste de inventario con motivo
      for (const variant of variants) {
        const requestedQty = itemMap.get(variant.id)!;
        const stockActual = parseInt(variant.stock_actual, 10);

        if (stockActual < requestedQty) {
          throw new Error(
            `Stock insuficiente para "${variant.producto_nombre} (${variant.sku})". ` +
            `Stock actual en sistema: ${stockActual}, solicitado por venta diferida: ${requestedQty}. ` +
            `Conforme a la regla RN-18, debe registrar primero un ajuste de inventario con motivo antes de cargar esta venta diferida.`
          );
        }
      }

      // 5. Calcular totales
      let subtotalTotal = 0;
      const calculatedItems: Array<{
        variant_id: string;
        sku: string;
        descripcion: string;
        cantidad: number;
        precio_unitario: number;
        subtotal: number;
        stock_anterior: number;
        stock_nuevo: number;
        stock_minimo: number;
      }> = [];

      for (const variant of variants) {
        const requestedQty = itemMap.get(variant.id)!;
        const stockActual = parseInt(variant.stock_actual, 10);
        const stockMinimo = parseInt(variant.stock_minimo, 10);
        const precio = parseFloat(variant.precio);
        const itemSubtotal = parseFloat((precio * requestedQty).toFixed(2));
        subtotalTotal += itemSubtotal;

        const descripcion = `${variant.producto_nombre} ${variant.modelo || ''} ${variant.talle || ''} ${variant.color || ''}`.trim();

        calculatedItems.push({
          variant_id: variant.id,
          sku: variant.sku,
          descripcion,
          cantidad: requestedQty,
          precio_unitario: precio,
          subtotal: itemSubtotal,
          stock_anterior: stockActual,
          stock_nuevo: stockActual - requestedQty,
          stock_minimo: stockMinimo,
        });
      }

      const total = parseFloat(subtotalTotal.toFixed(2));

      // 6. Validar pago manual
      const { medio, importe_recibido, referencia_externa } = input.pago;
      let finalImporteRecibido = total;
      let vuelto = 0;

      if (medio === 'efectivo') {
        if (importe_recibido !== undefined && importe_recibido >= total) {
          finalImporteRecibido = parseFloat(importe_recibido.toFixed(2));
          vuelto = parseFloat((finalImporteRecibido - total).toFixed(2));
        }
      }

      // 7. Cliente opcional
      let customerId: string | null = null;
      if (input.customer && (input.customer.nombre || input.customer.email)) {
        const custResult = await client.query(
          `INSERT INTO customers (nombre, email, telefono)
           VALUES ($1, $2, $3) RETURNING id`,
          [input.customer.nombre || null, input.customer.email || null, input.customer.telefono || null]
        );
        customerId = custResult.rows[0].id;
      }

      // 8. Crear la venta con carga_diferida = true, conservando la fecha real histórica (RN-18, CA-20)
      const numeroOperacion = generateOperationNumber();
      const saleInsertQuery = `
        INSERT INTO sales (
          numero_operacion, canal, vendedor_id, customer_id, subtotal, total, moneda,
          estado, entregada_por, entregada_en, carga_diferida, cargada_por, cargada_en, fecha_real
        )
        VALUES (
          $1, 'venta_asistida', $2, $3, $4, $5, 'ARS',
          'entregada', $2, $6, true, $2, clock_timestamp(), $6
        )
        RETURNING *
      `;

      const saleResult = await client.query(saleInsertQuery, [
        numeroOperacion,
        usuarioId,
        customerId,
        total,
        total,
        fechaVentaReal,
      ]);

      const sale = saleResult.rows[0];

      // 9. Insertar líneas de venta y descontar stock en product_variants
      for (const item of calculatedItems) {
        await client.query(
          `INSERT INTO sale_items (
            sale_id, variant_id, descripcion_historica, sku_historico, cantidad, precio_unitario, subtotal
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            sale.id,
            item.variant_id,
            item.descripcion,
            item.sku,
            item.cantidad,
            item.precio_unitario,
            item.subtotal,
          ]
        );

        // Descontar stock
        await client.query(
          `UPDATE product_variants
           SET stock_actual = stock_actual - $1, updated_at = clock_timestamp()
           WHERE id = $2`,
          [item.cantidad, item.variant_id]
        );

        // Movimiento en stock_movements
        await client.query(
          `INSERT INTO stock_movements (
            variant_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia, sale_id, usuario_id
          ) VALUES ($1, 'venta', $2, $3, $4, 'Carga diferida por contingencia offline', $5, $6, $7)`,
          [
            item.variant_id,
            -item.cantidad,
            item.stock_anterior,
            item.stock_nuevo,
            numeroOperacion,
            sale.id,
            usuarioId,
          ]
        );

        // Alerta de stock bajo si corresponde
        if (item.stock_nuevo <= item.stock_minimo) {
          await client.query(
            `INSERT INTO stock_alerts (variant_id, stock_detectado, umbral, estado)
             VALUES ($1, $2, $3, 'activa')
             ON CONFLICT (variant_id) WHERE estado = 'activa'
             DO UPDATE SET stock_detectado = EXCLUDED.stock_detectado, fecha_creacion = clock_timestamp()`,
            [item.variant_id, item.stock_nuevo, item.stock_minimo]
          );
        }
      }

      // 10. Registrar el pago
      await client.query(
        `INSERT INTO payments (
          sale_id, tipo, medio, referencia_externa, importe, importe_recibido, vuelto, estado, registrado_por, fecha
        ) VALUES ($1, 'manual', $2, $3, $4, $5, $6, 'aprobado', $7, $8)`,
        [
          sale.id,
          medio,
          referencia_externa || null,
          total,
          finalImporteRecibido,
          vuelto,
          usuarioId,
          fechaVentaReal,
        ]
      );

      const receiptUrl = `/comprobante/${numeroOperacion}`;
      const qrDataUrl = await generateQrDataUrl(receiptUrl);

      return {
        mensaje: 'Venta diferida registrada con éxito y stock descontado',
        venta: {
          id: sale.id,
          numero_operacion: sale.numero_operacion,
          subtotal: parseFloat(sale.subtotal),
          total: parseFloat(sale.total),
          moneda: sale.moneda,
          estado: sale.estado,
          carga_diferida: true,
          fecha_real: sale.fecha_real,
          cargada_en: sale.cargada_en,
          leyenda_fiscal: 'Documento no válido como factura',
        },
        comprobante: {
          qr_code: qrDataUrl,
          qr_content: receiptUrl,
        },
      };
    });
  }
}
