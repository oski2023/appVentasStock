import { pool, withTransaction } from '../../db/index.js';
import { CreateAdjustmentInput, InventoryMovementsQuery, InventoryStockQuery } from './inventory.schemas.js';

export class InventoryService {
  /**
   * Registra un ajuste de stock manual (ingreso, egreso, rotura o ajuste) con auditoría (RF-18, RN-10).
   */
  static async createAdjustment(input: CreateAdjustmentInput, usuarioId: string) {
    return withTransaction(async (client) => {
      // Bloquear fila de la variante
      const { rows: variantRows } = await client.query(
        `SELECT v.id, v.sku, v.stock_actual, v.stock_minimo, p.nombre AS producto_nombre
         FROM product_variants v
         INNER JOIN products p ON v.product_id = p.id
         WHERE v.id = $1 FOR UPDATE`,
        [input.variant_id]
      );

      if (variantRows.length === 0) {
        throw new Error('La variante seleccionada no existe');
      }

      const variant = variantRows[0];
      const stockAnterior = parseInt(variant.stock_actual, 10);
      const stockMinimo = parseInt(variant.stock_minimo, 10);
      let cantidadMovimiento = input.cantidad;
      let stockNuevo = stockAnterior;

      if (input.tipo === 'ingreso') {
        stockNuevo = stockAnterior + input.cantidad;
        cantidadMovimiento = input.cantidad;
      } else if (input.tipo === 'egreso' || input.tipo === 'rotura') {
        if (stockAnterior < input.cantidad) {
          throw new Error(
            `No es posible descontar ${input.cantidad} unidades. Stock disponible actual: ${stockAnterior}`
          );
        }
        stockNuevo = stockAnterior - input.cantidad;
        cantidadMovimiento = -input.cantidad;
      } else if (input.tipo === 'ajuste') {
        // En ajuste, se define la diferencia necesaria para llegar a la cantidad informada
        // Por consistencia, si se envía cantidad como nuevo stock absoluto o relativo
        // Aquí input.cantidad se toma como la cantidad a sumar/restar según motivo
        // Para evitar ambigüedades: si es ajuste hacia abajo o arriba
        stockNuevo = input.cantidad; // Cantidad física real contada
        cantidadMovimiento = stockNuevo - stockAnterior;
        if (stockNuevo < 0) {
          throw new Error('El stock resultante no puede ser negativo');
        }
      }

      // 1. Actualizar stock en product_variants (RN-02)
      await client.query(
        `UPDATE product_variants
         SET stock_actual = $1, updated_at = clock_timestamp()
         WHERE id = $2`,
        [stockNuevo, variant.id]
      );

      // 2. Registrar en historial de movimientos (RF-19, RN-10)
      const { rows: movRows } = await client.query(
        `INSERT INTO stock_movements (
          variant_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia, usuario_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          variant.id,
          input.tipo,
          cantidadMovimiento,
          stockAnterior,
          stockNuevo,
          input.motivo,
          input.referencia || null,
          usuarioId,
        ]
      );

      // 3. Evaluar o resolver alertas de stock bajo (RF-14, RN-08)
      if (stockNuevo <= stockMinimo) {
        await client.query(
          `INSERT INTO stock_alerts (variant_id, stock_detectado, umbral, estado)
           VALUES ($1, $2, $3, 'activa')
           ON CONFLICT (variant_id) WHERE estado = 'activa'
           DO UPDATE SET stock_detectado = EXCLUDED.stock_detectado, fecha_creacion = clock_timestamp()`,
          [variant.id, stockNuevo, stockMinimo]
        );
      } else {
        // Si superó el stock mínimo, resolver la alerta si estaba activa
        await client.query(
          `UPDATE stock_alerts
           SET estado = 'resuelta', fecha_resolucion = clock_timestamp()
           WHERE variant_id = $1 AND estado = 'activa'`,
          [variant.id]
        );
      }

      return {
        mensaje: 'Ajuste de inventario registrado exitosamente',
        movimiento: movRows[0],
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
      };
    });
  }

  /**
   * Consulta el panel de alertas de bajo stock (RF-14, RF-15).
   */
  static async listAlerts(estado: 'activa' | 'resuelta' = 'activa') {
    const query = `
      SELECT 
        a.id, a.stock_detectado, a.umbral, a.estado, a.fecha_creacion, a.fecha_resolucion,
        v.id AS variant_id, v.sku, v.codigo, v.modelo, v.talle, v.color, v.precio, v.stock_actual,
        p.id AS product_id, p.nombre AS producto_nombre
      FROM stock_alerts a
      INNER JOIN product_variants v ON a.variant_id = v.id
      INNER JOIN products p ON v.product_id = p.id
      WHERE a.estado = $1
      ORDER BY a.fecha_creacion DESC
    `;

    const { rows } = await pool.query(query, [estado]);
    return rows.map((r) => ({
      id: r.id,
      estado: r.estado,
      stock_detectado: parseInt(r.stock_detectado, 10),
      stock_actual: parseInt(r.stock_actual, 10),
      umbral: parseInt(r.umbral, 10),
      fecha_creacion: r.fecha_creacion,
      fecha_resolucion: r.fecha_resolucion,
      variante: {
        id: r.variant_id,
        sku: r.sku,
        codigo: r.codigo,
        modelo: r.modelo,
        talle: r.talle,
        color: r.color,
        precio: parseFloat(r.precio),
        producto_nombre: r.producto_nombre,
      },
    }));
  }

  /**
   * Consulta el historial auditable de movimientos de stock (RF-19).
   */
  static async listMovements(query: InventoryMovementsQuery) {
    const conditions: string[] = ['1=1'];
    const values: any[] = [];
    let idx = 1;

    if (query.variant_id) {
      conditions.push(`m.variant_id = $${idx++}`);
      values.push(query.variant_id);
    }
    if (query.tipo) {
      conditions.push(`m.tipo = $${idx++}`);
      values.push(query.tipo);
    }
    if (query.desde) {
      conditions.push(`m.fecha >= $${idx++}`);
      values.push(query.desde);
    }
    if (query.hasta) {
      conditions.push(`m.fecha <= $${idx++}`);
      values.push(query.hasta);
    }

    const sql = `
      SELECT 
        m.id, m.tipo, m.cantidad, m.stock_anterior, m.stock_nuevo, m.motivo, m.referencia, m.fecha,
        v.sku, v.codigo, v.modelo, v.talle, v.color,
        p.nombre AS producto_nombre,
        u.nombre AS usuario_nombre,
        s.numero_operacion AS venta_numero
      FROM stock_movements m
      INNER JOIN product_variants v ON m.variant_id = v.id
      INNER JOIN products p ON v.product_id = p.id
      INNER JOIN users u ON m.usuario_id = u.id
      LEFT JOIN sales s ON m.sale_id = s.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY m.fecha DESC
      LIMIT $${idx++} OFFSET $${idx}
    `;

    values.push(query.limit, query.offset);
    const { rows } = await pool.query(sql, values);

    return rows.map((r) => ({
      ...r,
      cantidad: parseInt(r.cantidad, 10),
      stock_anterior: parseInt(r.stock_anterior, 10),
      stock_nuevo: parseInt(r.stock_nuevo, 10),
    }));
  }

  /**
   * Consulta el listado de inventario consolidado (RF-13).
   */
  static async getStock(query: InventoryStockQuery) {
    const conditions: string[] = ['v.estado = true'];
    const values: any[] = [];
    let idx = 1;

    if (query.bajo_stock) {
      conditions.push(`v.stock_actual <= v.stock_minimo`);
    }

    if (query.query) {
      conditions.push(`(p.nombre ILIKE $${idx} OR v.sku ILIKE $${idx} OR v.codigo ILIKE $${idx})`);
      values.push(`%${query.query}%`);
      idx++;
    }

    const sql = `
      SELECT 
        v.id, v.sku, v.codigo, v.modelo, v.talle, v.color, v.precio,
        v.stock_actual, v.stock_minimo, v.etiqueta_desactualizada,
        p.id AS producto_id, p.nombre AS producto_nombre, c.nombre AS categoria_nombre,
        (
          SELECT json_build_object(
            'tipo', sm.tipo,
            'cantidad', sm.cantidad,
            'motivo', sm.motivo,
            'fecha', sm.fecha
          )
          FROM stock_movements sm
          WHERE sm.variant_id = v.id
          ORDER BY sm.fecha DESC
          LIMIT 1
        ) AS ultimo_movimiento
      FROM product_variants v
      INNER JOIN products p ON v.product_id = p.id
      INNER JOIN categories c ON p.category_id = c.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY (v.stock_actual <= v.stock_minimo) DESC, p.nombre ASC
      LIMIT $${idx++} OFFSET $${idx}
    `;

    values.push(query.limit, query.offset);
    const { rows } = await pool.query(sql, values);

    return rows.map((r) => ({
      ...r,
      precio: parseFloat(r.precio),
      stock_actual: parseInt(r.stock_actual, 10),
      stock_minimo: parseInt(r.stock_minimo, 10),
      alerta_bajo_stock: parseInt(r.stock_actual, 10) <= parseInt(r.stock_minimo, 10),
      ultimo_movimiento: r.ultimo_movimiento,
    }));
  }
}
