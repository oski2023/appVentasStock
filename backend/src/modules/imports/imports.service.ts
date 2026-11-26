import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { pool, withTransaction } from '../../db/index.js';
import { generateVariantCode } from '../../utils/qr.js';
import { importRowSchema, ImportRowInput } from './imports.schemas.js';

export class ImportsService {
  /**
   * Procesa la importación masiva de productos, variantes y stock desde buffer CSV o Excel (RF-31, CA-18).
   */
  static async processImport(
    fileBuffer: Buffer,
    filename: string,
    usuarioId: string
  ) {
    let rowsToProcess: any[] = [];

    // 1. Parsear archivo según formato
    if (filename.endsWith('.csv')) {
      const csvText = fileBuffer.toString('utf-8');
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      });
      rowsToProcess = parsed.data;
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        throw new Error('El archivo Excel no contiene hojas válidas');
      }

      const headers: string[] = [];
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = cell.text.trim().toLowerCase().replace(/\s+/g, '_');
      });

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Omitir encabezados
        const rowData: Record<string, any> = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            rowData[header] = cell.value;
          }
        });
        rowsToProcess.push(rowData);
      });
    } else {
      throw new Error('Formato no soportado. Debe ser un archivo .csv o .xlsx');
    }

    const totalFilas = rowsToProcess.length;
    let filasCorrectas = 0;
    let filasConError = 0;
    const detalleErrores: Array<{ fila: number; motivo: string }> = [];

    // Cache local de categorías y productos para evitar consultas redundantes
    const categoryCache = new Map<string, number>();
    const productCache = new Map<string, string>();
    const processedSkus = new Set<string>();

    for (let i = 0; i < totalFilas; i++) {
      const rowNum = i + 2; // Considerando fila 1 como encabezado
      const rawRow = rowsToProcess[i];

      // 2. Validación de esquema
      const parseResult = importRowSchema.safeParse(rawRow);
      if (!parseResult.success) {
        filasConError++;
        detalleErrores.push({
          fila: rowNum,
          motivo: parseResult.error.errors.map((e) => e.message).join(', '),
        });
        continue;
      }

      const row: ImportRowInput = parseResult.data;
      const cleanSku = row.sku.trim().toUpperCase();

      // Validar SKU duplicado en el mismo archivo
      if (processedSkus.has(cleanSku)) {
        filasConError++;
        detalleErrores.push({
          fila: rowNum,
          motivo: `El SKU "${cleanSku}" aparece duplicado dentro del archivo importado`,
        });
        continue;
      }

      try {
        await withTransaction(async (client) => {
          // Verificar si el SKU ya existe en la base de datos (RN-16)
          const skuCheck = await client.query(
            'SELECT id FROM product_variants WHERE UPPER(sku) = $1',
            [cleanSku]
          );
          if (skuCheck.rows.length > 0) {
            throw new Error(`El SKU "${cleanSku}" ya existe en el sistema`);
          }

          // Obtener o crear categoría
          const cleanCategory = row.categoria.trim();
          let categoryId = categoryCache.get(cleanCategory.toLowerCase());
          if (!categoryId) {
            const catRes = await client.query(
              `INSERT INTO categories (nombre) VALUES ($1)
               ON CONFLICT (nombre) DO UPDATE SET updated_at = clock_timestamp()
               RETURNING id`,
              [cleanCategory]
            );
            categoryId = catRes.rows[0].id;
            categoryCache.set(cleanCategory.toLowerCase(), categoryId!);
          }

          // Obtener o crear producto
          const cleanProduct = row.producto.trim();
          const productKey = `${categoryId}_${cleanProduct.toLowerCase()}`;
          const imagenUrl = (row.imagen || row.imagenes)?.trim();
          const imagenesArr = imagenUrl ? JSON.stringify([imagenUrl]) : '[]';

          let productId = productCache.get(productKey);
          if (!productId) {
            const prodRes = await client.query(
              `SELECT id FROM products WHERE category_id = $1 AND LOWER(nombre) = LOWER($2)`,
              [categoryId, cleanProduct]
            );
            if (prodRes.rows.length > 0) {
              productId = prodRes.rows[0].id;
              if (imagenUrl) {
                await client.query(
                  `UPDATE products SET imagenes = $1::jsonb WHERE id = $2 AND (imagenes = '[]'::jsonb OR imagenes IS NULL)`,
                  [imagenesArr, productId]
                );
              }
            } else {
              const newProdRes = await client.query(
                `INSERT INTO products (category_id, nombre, descripcion, imagenes)
                 VALUES ($1, $2, $3, $4::jsonb)
                 RETURNING id`,
                [categoryId, cleanProduct, row.descripcion || null, imagenesArr]
              );
              productId = newProdRes.rows[0].id;
            }
            productCache.set(productKey, productId!);
          }

          // Generar código único para la variante
          const codigo = generateVariantCode();

          // Insertar variante
          const variantRes = await client.query(
            `INSERT INTO product_variants (
              product_id, sku, codigo, modelo, talle, color, precio, stock_actual, stock_minimo
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id`,
            [
              productId,
              cleanSku,
              codigo,
              row.modelo || null,
              row.talle || null,
              row.color || null,
              row.precio,
              row.stock_actual,
              row.stock_minimo,
            ]
          );
          const variantId = variantRes.rows[0].id;

          // Si tiene stock inicial > 0, registrar movimiento 'inventario_inicial' (RF-31)
          if (row.stock_actual > 0) {
            await client.query(
              `INSERT INTO stock_movements (
                variant_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia, usuario_id
              ) VALUES ($1, 'inventario_inicial', $2, 0, $2, 'Carga inicial por importación masiva', $3, $4)`,
              [variantId, row.stock_actual, filename, usuarioId]
            );
          }

          // Alerta si stock_actual <= stock_minimo
          if (row.stock_actual <= row.stock_minimo) {
            await client.query(
              `INSERT INTO stock_alerts (variant_id, stock_detectado, umbral, estado)
               VALUES ($1, $2, $3, 'activa')
               ON CONFLICT (variant_id) WHERE estado = 'activa'
               DO UPDATE SET stock_detectado = EXCLUDED.stock_detectado`,
              [variantId, row.stock_actual, row.stock_minimo]
            );
          }
        });

        processedSkus.add(cleanSku);
        filasCorrectas++;
      } catch (err: any) {
        filasConError++;
        detalleErrores.push({
          fila: rowNum,
          motivo: err.message || 'Error al persistir la fila',
        });
      }
    }

    // 3. Registrar en import_jobs
    const { rows: jobRows } = await pool.query(
      `INSERT INTO import_jobs (
        nombre_archivo, filas_totales, filas_correctas, filas_con_error, detalle_errores, usuario_id
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)
      RETURNING id, nombre_archivo, filas_totales, filas_correctas, filas_con_error, detalle_errores, created_at`,
      [
        filename,
        totalFilas,
        filasCorrectas,
        filasConError,
        JSON.stringify(detalleErrores),
        usuarioId,
      ]
    );

    return {
      mensaje: `Procesamiento finalizado. Filas correctas: ${filasCorrectas}, con error: ${filasConError}.`,
      job: jobRows[0],
    };
  }

  /**
   * Consulta el historial de importaciones realizadas
   */
  static async listImportJobs() {
    const query = `
      SELECT j.id, j.nombre_archivo, j.filas_totales, j.filas_correctas, j.filas_con_error,
             j.detalle_errores, j.created_at, u.nombre AS usuario_nombre
      FROM import_jobs j
      INNER JOIN users u ON j.usuario_id = u.id
      ORDER BY j.created_at DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
  }
}
