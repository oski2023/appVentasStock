import { pool, withTransaction } from '../../db/index.js';
import { generateVariantCode, generateQrDataUrl } from '../../utils/qr.js';
import { env } from '../../config/env.js';
import {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateProductInput,
  UpdateProductInput,
  CreateVariantInput,
  UpdateVariantInput,
  CatalogSearchQuery,
} from './catalog.schemas.js';

export function getDisponibilidadPublica(stock: number, stockMinimo: number): string {
  if (stock <= 0) return 'Sin stock';
  if (stock <= stockMinimo) return 'Últimas unidades';
  return 'Disponible';
}

export class CatalogService {
  // ===================== CATEGORÍAS =====================
  static async listCategories() {
    const { rows } = await pool.query(
      'SELECT id, nombre, descripcion, estado FROM categories WHERE estado = true ORDER BY nombre ASC'
    );
    return rows;
  }

  static async createCategory(input: CreateCategoryInput) {
    const { rows } = await pool.query(
      'INSERT INTO categories (nombre, descripcion) VALUES ($1, $2) RETURNING *',
      [input.nombre, input.descripcion || null]
    );
    return rows[0];
  }

  static async updateCategory(id: number, input: UpdateCategoryInput) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (input.nombre !== undefined) {
      fields.push(`nombre = $${idx++}`);
      values.push(input.nombre);
    }
    if (input.descripcion !== undefined) {
      fields.push(`descripcion = $${idx++}`);
      values.push(input.descripcion);
    }
    if (input.estado !== undefined) {
      fields.push(`estado = $${idx++}`);
      values.push(input.estado);
    }
    fields.push(`updated_at = clock_timestamp()`);

    values.push(id);
    const query = `UPDATE categories SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  }

  // ===================== PRODUCTOS =====================
  static async listProducts(search: CatalogSearchQuery, isInternalUser: boolean = false) {
    const conditions: string[] = ['p.estado = true'];
    const values: any[] = [];
    let idx = 1;

    if (search.category_id) {
      conditions.push(`p.category_id = $${idx++}`);
      values.push(search.category_id);
    }

    if (search.query) {
      conditions.push(`(
        p.nombre ILIKE $${idx} OR 
        p.descripcion ILIKE $${idx} OR 
        v.sku ILIKE $${idx} OR 
        v.codigo ILIKE $${idx}
      )`);
      values.push(`%${search.query}%`);
      idx++;
    }

    const query = `
      SELECT DISTINCT
        p.id,
        p.nombre,
        p.descripcion,
        p.imagenes,
        p.category_id,
        c.nombre AS categoria_nombre,
        MIN(v.precio) AS precio_desde,
        MAX(v.precio) AS precio_hasta,
        COUNT(v.id) AS total_variantes,
        SUM(v.stock_actual) AS stock_total
      FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants v ON p.id = v.product_id AND v.estado = true
      WHERE ${conditions.join(' AND ')}
      GROUP BY p.id, c.nombre
      ORDER BY p.nombre ASC
      LIMIT $${idx++} OFFSET $${idx}
    `;

    values.push(search.limit, search.offset);
    const { rows } = await pool.query(query, values);

    return rows.map((p) => {
      const stockTotal = parseInt(p.stock_total || '0', 10);
      return {
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        imagenes: p.imagenes,
        category_id: p.category_id,
        categoria_nombre: p.categoria_nombre,
        precio_desde: p.precio_desde ? parseFloat(p.precio_desde) : null,
        precio_hasta: p.precio_hasta ? parseFloat(p.precio_hasta) : null,
        total_variantes: parseInt(p.total_variantes, 10),
        disponibilidad: isInternalUser
          ? { stock_exacto: stockTotal }
          : { estado: stockTotal > 0 ? 'Disponible' : 'Sin stock' },
      };
    });
  }

  static async getProductById(id: string, isInternalUser: boolean = false) {
    const productQuery = `
      SELECT p.id, p.nombre, p.descripcion, p.imagenes, p.estado, p.category_id, c.nombre AS categoria_nombre
      FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `;
    const { rows: productRows } = await pool.query(productQuery, [id]);
    if (productRows.length === 0) return null;

    const product = productRows[0];

    const variantsQuery = `
      SELECT id, sku, codigo, modelo, talle, color, precio, stock_actual, stock_minimo, etiqueta_desactualizada, estado
      FROM product_variants
      WHERE product_id = $1 ${isInternalUser ? '' : 'AND estado = true'}
      ORDER BY talle ASC, color ASC
    `;
    const { rows: variantRows } = await pool.query(variantsQuery, [id]);

    const variants = await Promise.all(
      variantRows.map(async (v) => {
        const qrUrl = `${env.APP_BASE_URL}/ficha/${v.codigo}`;
        const qrDataUrl = await generateQrDataUrl(qrUrl);
        const stock = parseInt(v.stock_actual, 10);
        const stockMinimo = parseInt(v.stock_minimo, 10);

        return {
          id: v.id,
          sku: v.sku,
          codigo: v.codigo,
          modelo: v.modelo,
          talle: v.talle,
          color: v.color,
          precio: parseFloat(v.precio),
          qr_code: qrDataUrl,
          qr_content: qrUrl,
          ...(isInternalUser
            ? {
                stock_actual: stock,
                stock_minimo: stockMinimo,
                etiqueta_desactualizada: v.etiqueta_desactualizada,
                estado: v.estado,
              }
            : {
                disponibilidad: getDisponibilidadPublica(stock, stockMinimo),
              }),
        };
      })
    );

    return {
      ...product,
      variantes: variants,
    };
  }

  static async createProduct(input: CreateProductInput) {
    let categoryId = input.category_id;

    if (!categoryId && input.categoria_nombre) {
      const cleanCat = input.categoria_nombre.trim();
      const catRes = await pool.query(
        `INSERT INTO categories (nombre) VALUES ($1)
         ON CONFLICT (nombre) DO UPDATE SET updated_at = clock_timestamp()
         RETURNING id`,
        [cleanCat]
      );
      categoryId = catRes.rows[0].id;
    }

    if (!categoryId) {
      throw new Error('Debe especificar una categoría válida');
    }

    const { rows } = await pool.query(
      `INSERT INTO products (category_id, nombre, descripcion, imagenes)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING *`,
      [categoryId, input.nombre, input.descripcion || null, JSON.stringify(input.imagenes || [])]
    );
    return rows[0];
  }

  static async updateProduct(id: string, input: UpdateProductInput) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (input.category_id !== undefined) {
      fields.push(`category_id = $${idx++}`);
      values.push(input.category_id);
    }
    if (input.nombre !== undefined) {
      fields.push(`nombre = $${idx++}`);
      values.push(input.nombre);
    }
    if (input.descripcion !== undefined) {
      fields.push(`descripcion = $${idx++}`);
      values.push(input.descripcion);
    }
    if (input.imagenes !== undefined) {
      fields.push(`imagenes = $${idx++}::jsonb`);
      values.push(JSON.stringify(input.imagenes));
    }
    if (input.estado !== undefined) {
      fields.push(`estado = $${idx++}`);
      values.push(input.estado);
    }
    fields.push(`updated_at = clock_timestamp()`);

    values.push(id);
    const query = `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  }

  // ===================== VARIANTES Y CÓDIGOS QR =====================
  static async createVariant(productId: string, input: CreateVariantInput, userId: string) {
    return withTransaction(async (client) => {
      // Verificar que el producto exista
      const prodCheck = await client.query('SELECT id FROM products WHERE id = $1', [productId]);
      if (prodCheck.rows.length === 0) {
        throw new Error('El producto especificado no existe');
      }

      // Generar código único para la variante (RF-29)
      let codigo = generateVariantCode();
      let exists = true;
      while (exists) {
        const check = await client.query('SELECT id FROM product_variants WHERE codigo = $1', [codigo]);
        if (check.rows.length === 0) exists = false;
        else codigo = generateVariantCode();
      }

      const insertVariantQuery = `
        INSERT INTO product_variants (
          product_id, sku, codigo, modelo, talle, color, precio, stock_actual, stock_minimo, etiqueta_desactualizada
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)
        RETURNING *
      `;

      const { rows } = await client.query(insertVariantQuery, [
        productId,
        input.sku.trim().toUpperCase(),
        codigo,
        input.modelo || null,
        input.talle || null,
        input.color || null,
        input.precio,
        input.stock_actual,
        input.stock_minimo,
      ]);

      const variant = rows[0];

      // Si se crea con stock inicial > 0, registrar auditoría en stock_movements (RF-19)
      if (input.stock_actual > 0) {
        await client.query(
          `INSERT INTO stock_movements (
            variant_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia, usuario_id
          ) VALUES ($1, 'inventario_inicial', $2, 0, $2, 'Carga inicial de variante', 'Alta de variante', $3)`,
          [variant.id, input.stock_actual, userId]
        );
      }

      const qrUrl = `${env.APP_BASE_URL}/ficha/${variant.codigo}`;
      const qrDataUrl = await generateQrDataUrl(qrUrl);

      return {
        ...variant,
        precio: parseFloat(variant.precio),
        qr_code: qrDataUrl,
        qr_content: qrUrl,
      };
    });
  }

  static async updateVariant(id: string, input: UpdateVariantInput) {
    const client = await pool.connect();
    try {
      const currentQuery = 'SELECT precio FROM product_variants WHERE id = $1';
      const { rows: currentRows } = await client.query(currentQuery, [id]);
      if (currentRows.length === 0) return null;

      const currentPrice = parseFloat(currentRows[0].precio);
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (input.modelo !== undefined) {
        fields.push(`modelo = $${idx++}`);
        values.push(input.modelo);
      }
      if (input.talle !== undefined) {
        fields.push(`talle = $${idx++}`);
        values.push(input.talle);
      }
      if (input.color !== undefined) {
        fields.push(`color = $${idx++}`);
        values.push(input.color);
      }
      if (input.stock_minimo !== undefined) {
        fields.push(`stock_minimo = $${idx++}`);
        values.push(input.stock_minimo);
      }
      if (input.estado !== undefined) {
        fields.push(`estado = $${idx++}`);
        values.push(input.estado);
      }

      // Si cambia el precio, marcar etiqueta_desactualizada = true automáticamente (RN-15)
      if (input.precio !== undefined) {
        fields.push(`precio = $${idx++}`);
        values.push(input.precio);
        if (input.precio !== currentPrice) {
          fields.push(`etiqueta_desactualizada = true`);
        }
      } else if (input.etiqueta_desactualizada !== undefined) {
        fields.push(`etiqueta_desactualizada = $${idx++}`);
        values.push(input.etiqueta_desactualizada);
      }

      fields.push(`updated_at = clock_timestamp()`);
      values.push(id);

      const query = `UPDATE product_variants SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
      const { rows } = await client.query(query, values);
      return rows[0] || null;
    } finally {
      client.release();
    }
  }

  // ===================== FICHA POR CÓDIGO QR / SKU (RF-04) =====================
  static async getVariantByCodeOrSku(codeOrSku: string, isInternalUser: boolean = false) {
    const query = `
      SELECT 
        v.id, v.sku, v.codigo, v.modelo, v.talle, v.color, v.precio, 
        v.stock_actual, v.stock_minimo, v.etiqueta_desactualizada, v.estado,
        p.id AS producto_id, p.nombre AS producto_nombre, p.descripcion AS producto_descripcion,
        p.imagenes AS producto_imagenes, c.nombre AS categoria_nombre,
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
      WHERE (v.codigo = $1 OR UPPER(v.sku) = UPPER($1))
      ${isInternalUser ? '' : 'AND v.estado = true AND p.estado = true'}
    `;

    const { rows } = await pool.query(query, [codeOrSku.trim()]);
    if (rows.length === 0) return null;

    const row = rows[0];
    const stock = parseInt(row.stock_actual, 10);
    const stockMinimo = parseInt(row.stock_minimo, 10);
    const qrUrl = `${env.APP_BASE_URL}/ficha/${row.codigo}`;
    const qrDataUrl = await generateQrDataUrl(qrUrl);

    return {
      id: row.id,
      sku: row.sku,
      codigo: row.codigo,
      modelo: row.modelo,
      talle: row.talle,
      color: row.color,
      precio: parseFloat(row.precio),
      producto: {
        id: row.producto_id,
        nombre: row.producto_nombre,
        descripcion: row.producto_descripcion,
        imagenes: row.producto_imagenes,
        categoria: row.categoria_nombre,
      },
      qr_code: qrDataUrl,
      qr_content: qrUrl,
      ...(isInternalUser
        ? {
            stock_actual: stock,
            stock_minimo: stockMinimo,
            etiqueta_desactualizada: row.etiqueta_desactualizada,
            estado: row.estado,
            ultimo_movimiento: row.ultimo_movimiento,
          }
        : {
            disponibilidad: getDisponibilidadPublica(stock, stockMinimo),
          }),
    };
  }
}
