import { pool, withTransaction } from '../../db/index.js';
import { ProcessRefundInput } from './refunds.schemas.js';

export class RefundsService {
  /**
   * Valida si una venta es elegible para devolución según la regla de 3 días corridos (RN-17, CA-16).
   */
  static async checkEligibility(numeroOperacion: string) {
    const saleQuery = `
      SELECT id, numero_operacion, estado, total, fecha_real
      FROM sales
      WHERE numero_operacion = $1
    `;
    const { rows: saleRows } = await pool.query(saleQuery, [numeroOperacion.trim().toUpperCase()]);
    if (saleRows.length === 0) {
      return { elegible: false, motivo: 'No se encontró ninguna venta con ese número de operación' };
    }

    const sale = saleRows[0];

    if (sale.estado !== 'pagada' && sale.estado !== 'entregada') {
      return {
        elegible: false,
        motivo: `No se pueden registrar devoluciones para una venta en estado '${sale.estado}'`,
      };
    }

    const fechaVenta = new Date(sale.fecha_real);
    const ahora = new Date();
    const diffMs = ahora.getTime() - fechaVenta.getTime();
    const diasCorridos = diffMs / (1000 * 60 * 60 * 24);
    const diasEnteros = Math.floor(diasCorridos);

    if (diasCorridos > 3.0) {
      return {
        elegible: false,
        dias_transcurridos: diasEnteros,
        motivo: `Ha superado el plazo máximo de 3 días corridos desde la compra (${diasEnteros} de 3 días transcurridos). No se permiten devoluciones fuera de término (RN-17, CA-16).`,
      };
    }

    // Obtener los ítems de la venta con las cantidades disponibles para devolución
    const itemsQuery = `
      SELECT 
        si.variant_id, si.descripcion_historica, si.sku_historico, si.cantidad, si.precio_unitario, si.subtotal,
        COALESCE(SUM((elem->>'cantidad')::int), 0) AS cantidad_devuelta_previa
      FROM sale_items si
      LEFT JOIN refunds r ON r.sale_id = si.sale_id
      LEFT JOIN LATERAL jsonb_array_elements(r.items) elem ON (elem->>'variant_id')::uuid = si.variant_id
      WHERE si.sale_id = $1
      GROUP BY si.id, si.variant_id, si.descripcion_historica, si.sku_historico, si.cantidad, si.precio_unitario, si.subtotal
    `;

    const { rows: itemsRows } = await pool.query(itemsQuery, [sale.id]);

    const items = itemsRows.map((it) => {
      const cantidadOriginal = parseInt(it.cantidad, 10);
      const devueltaPrevia = parseInt(it.cantidad_devuelta_previa, 10);
      const cantidadDisponible = Math.max(0, cantidadOriginal - devueltaPrevia);

      return {
        variant_id: it.variant_id,
        sku: it.sku_historico,
        descripcion: it.descripcion_historica,
        precio_unitario: parseFloat(it.precio_unitario),
        cantidad_original: cantidadOriginal,
        cantidad_devuelta_previa: devueltaPrevia,
        cantidad_disponible_devolucion: cantidadDisponible,
      };
    });

    const hayItemsDisponibles = items.some((it) => it.cantidad_disponible_devolucion > 0);

    return {
      elegible: hayItemsDisponibles,
      venta_id: sale.id,
      numero_operacion: sale.numero_operacion,
      fecha_venta: sale.fecha_real,
      dias_transcurridos: diasEnteros,
      items,
      motivo: hayItemsDisponibles ? null : 'Todos los productos de esta venta ya han sido devueltos previamente',
    };
  }

  /**
   * Procesa la devolución con restitución inmediata de stock en transacción ACID (RN-09, RN-17, RN-19).
   */
  static async processRefund(input: ProcessRefundInput, usuarioId: string, usuarioRole: string) {
    return withTransaction(async (client) => {
      // 1. Obtener la venta
      const { rows: saleRows } = await client.query(
        `SELECT id, numero_operacion, estado, total, fecha_real
         FROM sales
         WHERE numero_operacion = $1 FOR UPDATE`,
        [input.numero_operacion.trim().toUpperCase()]
      );

      if (saleRows.length === 0) {
        throw new Error('Venta no encontrada');
      }

      const sale = saleRows[0];

      // 2. Validar plazo de 3 días corridos (RN-17, CA-16)
      const fechaVenta = new Date(sale.fecha_real);
      const ahora = new Date();
      const diasCorridos = (ahora.getTime() - fechaVenta.getTime()) / (1000 * 60 * 60 * 24);

      if (diasCorridos > 3.0) {
        throw new Error(
          `Plazo vencido: La venta fue realizada hace ${Math.floor(
            diasCorridos
          )} días. El plazo máximo para devoluciones es de 3 días corridos (RN-17, CA-16).`
        );
      }

      // 3. Regla RN-19: si es sin comprobante, requiere autorización de admin
      let autorizadorId: string | null = null;
      if (input.sin_comprobante) {
        if (usuarioRole === 'admin') {
          autorizadorId = usuarioId;
        } else if (input.autorizado_por_id) {
          // Validar que el usuario autorizador sea admin
          const adminCheck = await client.query(
            `SELECT u.id FROM users u
             INNER JOIN roles r ON u.role_id = r.id
             WHERE u.id = $1 AND r.nombre = 'admin' AND u.estado = true`,
            [input.autorizado_por_id]
          );
          if (adminCheck.rows.length === 0) {
            throw new Error('El usuario autorizador especificado no es un administrador activo válido');
          }
          autorizadorId = input.autorizado_por_id;
        } else {
          throw new Error(
            'Una devolución sin comprobante requiere obligatoriamente la autorización de un administrador (RN-19, CP-18)'
          );
        }
      }

      // 4. Buscar el pago aprobado original
      const { rows: paymentRows } = await client.query(
        `SELECT id, medio, importe FROM payments WHERE sale_id = $1 AND estado = 'aprobado' ORDER BY fecha DESC LIMIT 1`,
        [sale.id]
      );

      if (paymentRows.length === 0) {
        throw new Error('No se encontró un pago aprobado asociado a esta venta');
      }
      const originalPayment = paymentRows[0];

      // 5. Validar cada ítem y calcular importe total a devolver
      let importeTotalReintegro = 0;
      const itemsProcesados: Array<{
        variant_id: string;
        cantidad: number;
        precio_unitario: number;
        subtotal: number;
      }> = [];

      for (const reqItem of input.items) {
        // Bloquear y consultar variante e ítem original
        const { rows: saleItemRows } = await client.query(
          `SELECT si.cantidad, si.precio_unitario, v.id AS variant_id, v.stock_actual, v.stock_minimo, v.sku
           FROM sale_items si
           INNER JOIN product_variants v ON si.variant_id = v.id
           WHERE si.sale_id = $1 AND si.variant_id = $2 FOR UPDATE OF v`,
          [sale.id, reqItem.variant_id]
        );

        if (saleItemRows.length === 0) {
          throw new Error(`El producto con ID ${reqItem.variant_id} no pertenece a esta venta`);
        }

        const saleItem = saleItemRows[0];
        const precioUnitario = parseFloat(saleItem.precio_unitario);
        const subtotalItem = parseFloat((precioUnitario * reqItem.cantidad).toFixed(2));
        importeTotalReintegro += subtotalItem;

        const stockAnterior = parseInt(saleItem.stock_actual, 10);
        const stockMinimo = parseInt(saleItem.stock_minimo, 10);
        const stockNuevo = stockAnterior + reqItem.cantidad;

        // 6. Restitución inmediata del stock (RN-09, CA-08)
        await client.query(
          `UPDATE product_variants
           SET stock_actual = stock_actual + $1, updated_at = clock_timestamp()
           WHERE id = $2`,
          [reqItem.cantidad, saleItem.variant_id]
        );

        // 7. Registro en auditoría de movimientos de stock (RF-19)
        await client.query(
          `INSERT INTO stock_movements (
            variant_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia, sale_id, usuario_id
          ) VALUES ($1, 'devolucion', $2, $3, $4, $5, $6, $7, $8)`,
          [
            saleItem.variant_id,
            reqItem.cantidad, // Positivo por reingreso de mercadería
            stockAnterior,
            stockNuevo,
            `Devolución de venta: ${input.motivo}`,
            sale.numero_operacion,
            sale.id,
            usuarioId,
          ]
        );

        // 8. Si el stock superó el umbral mínimo, resolver alerta si estaba activa
        if (stockNuevo > stockMinimo) {
          await client.query(
            `UPDATE stock_alerts
             SET estado = 'resuelta', fecha_resolucion = clock_timestamp()
             WHERE variant_id = $1 AND estado = 'activa'`,
            [saleItem.variant_id]
          );
        }

        itemsProcesados.push({
          variant_id: saleItem.variant_id,
          cantidad: reqItem.cantidad,
          precio_unitario: precioUnitario,
          subtotal: subtotalItem,
        });
      }

      importeTotalReintegro = parseFloat(importeTotalReintegro.toFixed(2));

      // 9. Registrar el reintegro en refunds
      const { rows: refundRows } = await client.query(
        `INSERT INTO refunds (
          sale_id, payment_id, importe, medio, referencia_externa, motivo, items, registrado_por, autorizado_por
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
        RETURNING *`,
        [
          sale.id,
          originalPayment.id,
          importeTotalReintegro,
          input.medio,
          input.referencia_externa || null,
          input.motivo,
          JSON.stringify(itemsProcesados),
          usuarioId,
          autorizadorId,
        ]
      );

      // 10. Evaluar si la venta quedó devuelta en su totalidad
      const { rows: totalRefundedRows } = await client.query(
        `SELECT SUM(importe) AS total_reintegrado FROM refunds WHERE sale_id = $1`,
        [sale.id]
      );
      const totalReintegrado = parseFloat(totalRefundedRows[0].total_reintegrado || '0');
      if (totalReintegrado >= parseFloat(sale.total)) {
        await client.query(`UPDATE sales SET estado = 'devuelta' WHERE id = $1`, [sale.id]);
      }

      return {
        mensaje: 'Devolución procesada y stock restituido de forma inmediata',
        devolucion: {
          ...refundRows[0],
          importe: parseFloat(refundRows[0].importe),
        },
        items_devueltos: itemsProcesados,
      };
    });
  }

  /**
   * Consulta el historial de devoluciones
   */
  static async listRefunds() {
    const query = `
      SELECT 
        r.id, r.importe, r.medio, r.referencia_externa, r.motivo, r.fecha, r.items,
        s.numero_operacion,
        u.nombre AS registrado_por_nombre,
        ua.nombre AS autorizado_por_nombre
      FROM refunds r
      INNER JOIN sales s ON r.sale_id = s.id
      INNER JOIN users u ON r.registrado_por = u.id
      LEFT JOIN users ua ON r.autorizado_por = ua.id
      ORDER BY r.fecha DESC
    `;
    const { rows } = await pool.query(query);
    return rows.map((r) => ({
      ...r,
      importe: parseFloat(r.importe),
    }));
  }
}
