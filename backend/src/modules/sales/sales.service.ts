import { pool, withTransaction } from '../../db/index.js';
import { generateOperationNumber } from '../../utils/order-number.js';
import { generateQrDataUrl } from '../../utils/qr.js';
import { CreateAssistedSaleInput, SalesListQuery } from './sales.schemas.js';

export class SalesService {
  /**
   * Registra una venta asistida con pago manual de forma 100% atómica con bloqueo FOR UPDATE (RF-25, RF-26).
   */
  static async createAssistedSale(input: CreateAssistedSaleInput, vendedorId: string) {
    return withTransaction(async (client) => {
      // 1. Extraer los IDs de variantes y asegurar unicidad en la lista de items
      const itemMap = new Map<string, number>();
      for (const item of input.items) {
        const currentQty = itemMap.get(item.variant_id) || 0;
        itemMap.set(item.variant_id, currentQty + item.cantidad);
      }
      const variantIds = Array.from(itemMap.keys());

      // 2. Bloquear filas de las variantes para evitar sobreventa concurrente (RNF-07, CA-08)
      const lockQuery = `
        SELECT 
          v.id, v.sku, v.modelo, v.talle, v.color, v.precio, v.stock_actual, v.stock_minimo,
          p.nombre AS producto_nombre
        FROM product_variants v
        INNER JOIN products p ON v.product_id = p.id
        WHERE v.id = ANY($1) AND v.estado = true
        FOR UPDATE
      `;
      const { rows: lockedVariants } = await client.query(lockQuery, [variantIds]);

      if (lockedVariants.length !== variantIds.length) {
        throw new Error('Una o más variantes seleccionadas no existen o están inactivas');
      }

      // 3. Validar disponibilidad de stock y calcular subtotales y total con precios de servidor (RN-02, RN-03, RN-04)
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

      for (const variant of lockedVariants) {
        const requestedQty = itemMap.get(variant.id)!;
        const stockActual = parseInt(variant.stock_actual, 10);
        const stockMinimo = parseInt(variant.stock_minimo, 10);
        const precio = parseFloat(variant.precio);

        if (stockActual < requestedQty) {
          throw new Error(
            `Stock insuficiente para "${variant.producto_nombre} (${variant.sku})". Disponible: ${stockActual}, solicitado: ${requestedQty}`
          );
        }

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

      // 4. Validar pago manual (RF-26, RN-12)
      const { medio, importe_recibido, referencia_externa } = input.pago;
      let finalImporteRecibido = total;
      let vuelto = 0;

      if (medio === 'efectivo') {
        if (importe_recibido === undefined || importe_recibido < total) {
          throw new Error(
            `El importe recibido en efectivo ($${importe_recibido || 0}) debe ser igual o superior al total ($${total})`
          );
        }
        finalImporteRecibido = parseFloat(importe_recibido.toFixed(2));
        vuelto = parseFloat((finalImporteRecibido - total).toFixed(2));
      } else {
        // En transferencia o posnet se exige referencia externa
        if (!referencia_externa || referencia_externa.trim() === '') {
          throw new Error(
            `Debe indicar el número de comprobante o cupón para pagos con ${medio}`
          );
        }
      }

      // 5. Manejar cliente opcional (invitado)
      let customerId: string | null = null;
      if (input.customer && (input.customer.nombre || input.customer.email)) {
        const custResult = await client.query(
          `INSERT INTO customers (nombre, email, telefono)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [input.customer.nombre || null, input.customer.email || null, input.customer.telefono || null]
        );
        customerId = custResult.rows[0].id;
      }

      // 6. Generar número de operación y crear registro en `sales`
      const numeroOperacion = generateOperationNumber();
      const estadoVenta = input.marcar_entregada ? 'entregada' : 'pagada';

      const saleInsertQuery = `
        INSERT INTO sales (
          numero_operacion, canal, vendedor_id, customer_id, subtotal, total, moneda,
          estado, entregada_por, entregada_en, carga_diferida, fecha_real
        )
        VALUES (
          $1, 'venta_asistida', $2, $3, $4, $5, 'ARS',
          $6, $7, $8, false, clock_timestamp()
        )
        RETURNING id, numero_operacion, subtotal, total, moneda, estado, fecha_real, created_at
      `;

      const saleResult = await client.query(saleInsertQuery, [
        numeroOperacion,
        vendedorId,
        customerId,
        total,
        total,
        estadoVenta,
        input.marcar_entregada ? vendedorId : null,
        input.marcar_entregada ? new Date() : null,
      ]);

      const sale = saleResult.rows[0];

      // 7. Insertar ítems de la venta (`sale_items`)
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

        // 8. Descontar stock atómicamente de la variante (RF-12, RN-05)
        await client.query(
          `UPDATE product_variants
           SET stock_actual = stock_actual - $1, updated_at = clock_timestamp()
           WHERE id = $2`,
          [item.cantidad, item.variant_id]
        );

        // 9. Registrar movimiento de stock auditable (RF-19)
        await client.query(
          `INSERT INTO stock_movements (
            variant_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia, sale_id, usuario_id
          ) VALUES ($1, 'venta', $2, $3, $4, 'Venta asistida en mostrador', $5, $6, $7)`,
          [
            item.variant_id,
            -item.cantidad, // Negativo para egresos/ventas
            item.stock_anterior,
            item.stock_nuevo,
            numeroOperacion,
            sale.id,
            vendedorId,
          ]
        );

        // 10. Evaluar alerta de stock bajo (RF-14, RN-08)
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

      // 11. Registrar el pago manual (RF-26, RN-12)
      const paymentInsertQuery = `
        INSERT INTO payments (
          sale_id, tipo, medio, referencia_externa, importe, importe_recibido, vuelto, estado, registrado_por, fecha
        ) VALUES ($1, 'manual', $2, $3, $4, $5, $6, 'aprobado', $7, clock_timestamp())
        RETURNING id, tipo, medio, referencia_externa, importe, importe_recibido, vuelto, estado, fecha
      `;

      const paymentResult = await client.query(paymentInsertQuery, [
        sale.id,
        medio,
        referencia_externa || null,
        total,
        finalImporteRecibido,
        vuelto,
        vendedorId,
      ]);

      const payment = paymentResult.rows[0];

      // 12. Generar código QR del comprobante (RF-21)
      const receiptUrl = `/comprobante/${numeroOperacion}`;
      const qrDataUrl = await generateQrDataUrl(receiptUrl);

      return {
        venta: {
          id: sale.id,
          numero_operacion: sale.numero_operacion,
          subtotal: parseFloat(sale.subtotal),
          total: parseFloat(sale.total),
          moneda: sale.moneda,
          estado: sale.estado,
          fecha: sale.fecha_real,
          leyenda_fiscal: 'Documento no válido como factura', // RF-21, CA-17
        },
        pago: {
          id: payment.id,
          medio: payment.medio,
          importe: parseFloat(payment.importe),
          importe_recibido: parseFloat(payment.importe_recibido),
          vuelto: parseFloat(payment.vuelto),
          referencia: payment.referencia_externa,
          estado: payment.estado,
        },
        items: calculatedItems.map((ci) => ({
          sku: ci.sku,
          descripcion: ci.descripcion,
          cantidad: ci.cantidad,
          precio_unitario: ci.precio_unitario,
          subtotal: ci.subtotal,
          stock_remanente: ci.stock_nuevo,
        })),
        comprobante: {
          qr_code: qrDataUrl,
          qr_content: receiptUrl,
        },
      };
    });
  }

  /**
   * Obtiene la información completa del comprobante visible para el cliente y vendedor (RF-21).
   */
  static async getReceipt(numeroOperacion: string) {
    const saleQuery = `
      SELECT 
        s.id, s.numero_operacion, s.canal, s.subtotal, s.total, s.moneda, s.estado,
        s.fecha_real, s.created_at, s.entregada_en,
        u.nombre AS vendedor_nombre,
        c.nombre AS customer_nombre, c.email AS customer_email
      FROM sales s
      LEFT JOIN users u ON s.vendedor_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.numero_operacion = $1
    `;

    const { rows: saleRows } = await pool.query(saleQuery, [numeroOperacion.trim().toUpperCase()]);
    if (saleRows.length === 0) return null;

    const sale = saleRows[0];

    const itemsQuery = `
      SELECT id, descripcion_historica, sku_historico, cantidad, precio_unitario, subtotal
      FROM sale_items
      WHERE sale_id = $1
      ORDER BY id ASC
    `;
    const { rows: itemRows } = await pool.query(itemsQuery, [sale.id]);

    const paymentsQuery = `
      SELECT id, tipo, medio, referencia_externa, importe, importe_recibido, vuelto, estado, fecha
      FROM payments
      WHERE sale_id = $1
    `;
    const { rows: paymentRows } = await pool.query(paymentsQuery, [sale.id]);

    const receiptUrl = `/comprobante/${sale.numero_operacion}`;
    const qrDataUrl = await generateQrDataUrl(receiptUrl);

    return {
      numero_operacion: sale.numero_operacion,
      estado: sale.estado,
      canal: sale.canal,
      vendedor: sale.vendedor_nombre,
      cliente: sale.customer_nombre || 'Cliente general',
      subtotal: parseFloat(sale.subtotal),
      total: parseFloat(sale.total),
      moneda: sale.moneda,
      fecha: sale.fecha_real,
      entregada_en: sale.entregada_en,
      leyenda_fiscal: 'Documento no válido como factura', // RF-21, CA-17
      items: itemRows.map((it) => ({
        sku: it.sku_historico,
        descripcion: it.descripcion_historica,
        cantidad: it.cantidad,
        precio_unitario: parseFloat(it.precio_unitario),
        subtotal: parseFloat(it.subtotal),
      })),
      pagos: paymentRows.map((p) => ({
        medio: p.medio,
        importe: parseFloat(p.importe),
        importe_recibido: p.importe_recibido ? parseFloat(p.importe_recibido) : null,
        vuelto: parseFloat(p.vuelto),
        referencia: p.referencia_externa,
        estado: p.estado,
        fecha: p.fecha,
      })),
      qr_code: qrDataUrl,
      qr_content: receiptUrl,
    };
  }

  /**
   * Marca una venta como 'entregada' tras verificar pago (RF-27, RN-11, CA-14).
   */
  static async markAsDelivered(numeroOperacion: string, vendedorId: string) {
    const checkQuery = `
      SELECT id, estado, total
      FROM sales
      WHERE numero_operacion = $1
    `;
    const { rows: checkRows } = await pool.query(checkQuery, [numeroOperacion.trim().toUpperCase()]);
    if (checkRows.length === 0) {
      throw new Error('No se encontró ninguna venta con el número de operación proporcionado');
    }

    const sale = checkRows[0];

    // Regla de negocio RN-11 y CA-14: solo puede pasar a entregada si el pago está aprobado/registrado
    if (sale.estado === 'pendiente_pago') {
      throw new Error('La venta no puede marcarse como entregada porque el pago aún está pendiente de aprobación');
    }

    if (sale.estado === 'cancelada') {
      throw new Error('No se puede entregar una venta que ha sido cancelada');
    }

    if (sale.estado === 'entregada') {
      return {
        message: 'La venta ya había sido marcada como entregada previamente',
        numero_operacion: numeroOperacion,
        estado: 'entregada',
      };
    }

    const updateQuery = `
      UPDATE sales
      SET estado = 'entregada', entregada_por = $1, entregada_en = clock_timestamp()
      WHERE id = $2
      RETURNING numero_operacion, estado, entregada_en
    `;

    const { rows: updatedRows } = await pool.query(updateQuery, [vendedorId, sale.id]);
    return {
      message: 'Entrega verificada y registrada exitosamente',
      venta: updatedRows[0],
    };
  }

  /**
   * Consulta el historial de ventas con filtros (RF-20).
   */
  static async listSales(query: SalesListQuery) {
    const conditions: string[] = ['1=1'];
    const values: any[] = [];
    let idx = 1;

    if (query.estado) {
      conditions.push(`s.estado = $${idx++}`);
      values.push(query.estado);
    }
    if (query.vendedor_id) {
      conditions.push(`s.vendedor_id = $${idx++}`);
      values.push(query.vendedor_id);
    }
    if (query.desde) {
      conditions.push(`s.fecha_real >= $${idx++}`);
      values.push(query.desde);
    }
    if (query.hasta) {
      conditions.push(`s.fecha_real <= $${idx++}`);
      values.push(query.hasta);
    }

    // Consulta de resumen / cierre de caja acumulado en el rango seleccionado
    const summarySql = `
      SELECT 
        COUNT(DISTINCT s.id)::int AS total_operaciones,
        COALESCE(SUM(s.total) FILTER (WHERE s.estado != 'cancelada'), 0) AS total_general,
        COALESCE(SUM(p.importe) FILTER (WHERE p.medio = 'efectivo' AND p.estado = 'aprobado'), 0) AS total_efectivo,
        COALESCE(SUM(p.importe) FILTER (WHERE p.medio = 'transferencia' AND p.estado = 'aprobado'), 0) AS total_transferencia,
        COALESCE(SUM(p.importe) FILTER (WHERE p.medio = 'posnet' AND p.estado = 'aprobado'), 0) AS total_posnet,
        COALESCE(SUM(p.importe_recibido) FILTER (WHERE p.medio = 'efectivo' AND p.estado = 'aprobado'), 0) AS efectivo_recibido,
        COALESCE(SUM(p.vuelto) FILTER (WHERE p.medio = 'efectivo' AND p.estado = 'aprobado'), 0) AS efectivo_vuelto
      FROM sales s
      LEFT JOIN payments p ON p.sale_id = s.id
      WHERE ${conditions.join(' AND ')}
    `;

    const summaryResult = await pool.query(summarySql, values);
    const summaryRow = summaryResult.rows[0];

    // Resumen y lista de devoluciones / reintegros en el mismo período
    const refundConditions: string[] = ['1=1'];
    const refundValues: any[] = [];
    let rIdx = 1;

    if (query.desde) {
      refundConditions.push(`r.fecha >= $${rIdx++}`);
      refundValues.push(query.desde);
    }
    if (query.hasta) {
      refundConditions.push(`r.fecha <= $${rIdx++}`);
      refundValues.push(query.hasta);
    }

    const refundSummarySql = `
      SELECT 
        COUNT(r.id)::int AS total_devoluciones,
        COALESCE(SUM(r.importe), 0) AS total_reintegros,
        COALESCE(SUM(r.importe) FILTER (WHERE r.medio = 'efectivo'), 0) AS reintegros_efectivo,
        COALESCE(SUM(r.importe) FILTER (WHERE r.medio = 'transferencia'), 0) AS reintegros_transferencia,
        COALESCE(SUM(r.importe) FILTER (WHERE r.medio = 'cambio'), 0) AS cambios_prendas
      FROM refunds r
      WHERE ${refundConditions.join(' AND ')}
    `;

    const refundSummaryResult = await pool.query(refundSummarySql, refundValues);
    const refundSummaryRow = refundSummaryResult.rows[0];

    // Consulta detallada de devoluciones con ítems y prendas
    const refundListSql = `
      SELECT 
        r.id, r.sale_id, r.importe, r.medio, r.referencia_externa, r.motivo, r.fecha,
        s.numero_operacion,
        u.nombre AS registrado_por_nombre,
        ua.nombre AS autorizado_por_nombre,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'variant_id', pv.id,
                'cantidad', (elem->>'cantidad')::int,
                'precio_unitario', (elem->>'precio_unitario')::numeric,
                'subtotal', (elem->>'subtotal')::numeric,
                'producto_nombre', p.nombre,
                'sku', pv.sku,
                'codigo', pv.codigo,
                'talle', pv.talle,
                'color', pv.color
              )
            )
            FROM jsonb_array_elements(r.items) elem
            LEFT JOIN product_variants pv ON pv.id = (elem->>'variant_id')::uuid
            LEFT JOIN products p ON pv.product_id = p.id
          ),
          '[]'::json
        ) AS items
      FROM refunds r
      INNER JOIN sales s ON r.sale_id = s.id
      INNER JOIN users u ON r.registrado_por = u.id
      LEFT JOIN users ua ON r.autorizado_por = ua.id
      WHERE ${refundConditions.join(' AND ')}
      ORDER BY r.fecha DESC
    `;

    const refundListResult = await pool.query(refundListSql, refundValues);
    const devoluciones = refundListResult.rows.map((r) => ({
      ...r,
      importe: parseFloat(r.importe),
      items: (r.items || []).map((it: any) => ({
        ...it,
        precio_unitario: parseFloat(it.precio_unitario),
        subtotal: parseFloat(it.subtotal),
      })),
    }));

    // Consulta principal de ventas con detalle de prendas y pagos
    const sql = `
      SELECT 
        s.id, s.numero_operacion, s.canal, s.subtotal, s.total, s.moneda, s.estado,
        s.carga_diferida, s.fecha_real, s.created_at, s.entregada_en,
        u.nombre AS vendedor_nombre,
        c.nombre AS customer_nombre,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', si.id,
                'descripcion', si.descripcion_historica,
                'sku', si.sku_historico,
                'cantidad', si.cantidad,
                'precio_unitario', si.precio_unitario,
                'subtotal', si.subtotal,
                'codigo_variante', pv.codigo,
                'talle', pv.talle,
                'color', pv.color
              )
            )
            FROM sale_items si
            LEFT JOIN product_variants pv ON si.variant_id = pv.id
            WHERE si.sale_id = s.id
          ),
          '[]'::json
        ) AS items,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', p.id,
                'medio', p.medio,
                'importe', p.importe,
                'importe_recibido', p.importe_recibido,
                'vuelto', p.vuelto,
                'referencia_externa', p.referencia_externa,
                'estado', p.estado,
                'fecha', p.fecha
              )
            )
            FROM payments p
            WHERE p.sale_id = s.id
          ),
          '[]'::json
        ) AS pagos
      FROM sales s
      LEFT JOIN users u ON s.vendedor_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.fecha_real DESC
      LIMIT $${idx++} OFFSET $${idx}
    `;

    const salesValues = [...values, query.limit, query.offset];
    const { rows } = await pool.query(sql, salesValues);

    const totalGeneralVentas = parseFloat(summaryRow?.total_general || 0);
    const totalEfectivoVentas = parseFloat(summaryRow?.total_efectivo || 0);
    const totalTransferenciaVentas = parseFloat(summaryRow?.total_transferencia || 0);
    const totalPosnetVentas = parseFloat(summaryRow?.total_posnet || 0);
    const efectivoRecibido = parseFloat(summaryRow?.efectivo_recibido || 0);
    const efectivoVuelto = parseFloat(summaryRow?.efectivo_vuelto || 0);

    const totalDevoluciones = refundSummaryRow?.total_devoluciones || 0;
    const totalReintegros = parseFloat(refundSummaryRow?.total_reintegros || 0);
    const reintegrosEfectivo = parseFloat(refundSummaryRow?.reintegros_efectivo || 0);
    const reintegrosTransferencia = parseFloat(refundSummaryRow?.reintegros_transferencia || 0);
    const cambiosPrendas = parseFloat(refundSummaryRow?.cambios_prendas || 0);

    const totalNeto = totalGeneralVentas - totalReintegros;
    const efectivoNetoCaja = totalEfectivoVentas - reintegrosEfectivo;
    const transferenciaNeta = totalTransferenciaVentas - reintegrosTransferencia;

    return {
      ventas: rows.map((r) => ({
        ...r,
        subtotal: parseFloat(r.subtotal),
        total: parseFloat(r.total),
        items: (r.items || []).map((it: any) => ({
          ...it,
          precio_unitario: parseFloat(it.precio_unitario),
          subtotal: parseFloat(it.subtotal),
        })),
        pagos: (r.pagos || []).map((p: any) => ({
          ...p,
          importe: parseFloat(p.importe),
          importe_recibido: p.importe_recibido ? parseFloat(p.importe_recibido) : null,
          vuelto: parseFloat(p.vuelto || 0),
        })),
      })),
      devoluciones,
      cierre_caja: {
        total_operaciones: summaryRow?.total_operaciones || 0,
        total_general: totalGeneralVentas,
        total_efectivo: totalEfectivoVentas,
        total_transferencia: totalTransferenciaVentas,
        total_posnet: totalPosnetVentas,
        efectivo_recibido: efectivoRecibido,
        efectivo_vuelto: efectivoVuelto,
        // Devoluciones y Reintegros
        total_devoluciones: totalDevoluciones,
        total_reintegros: totalReintegros,
        reintegros_efectivo: reintegrosEfectivo,
        reintegros_transferencia: reintegrosTransferencia,
        cambios_prendas: cambiosPrendas,
        // Saldos Netos
        total_neto: totalNeto,
        efectivo_neto_caja: efectivoNetoCaja,
        transferencia_neta: transferenciaNeta,
      },
    };
  }

  // ===================== PEDIDOS DE CLIENTES (RF-07, RF-09, RF-25) =====================
  private static customerOrders = new Map<string, any>();

  static saveCustomerOrder(order: any) {
    this.customerOrders.set(order.orderNumber.toUpperCase(), order);
    // Limpieza de pedidos viejos (> 2 horas)
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    for (const [key, val] of this.customerOrders.entries()) {
      if (new Date(val.createdAt).getTime() < twoHoursAgo) {
        this.customerOrders.delete(key);
      }
    }
    return order;
  }

  static getCustomerOrder(orderNumber: string) {
    return this.customerOrders.get(orderNumber.trim().toUpperCase()) || null;
  }
}
