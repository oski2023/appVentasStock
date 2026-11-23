import PDFDocument from 'pdfkit';
import { pool } from '../../db/index.js';
import { generateQrBuffer } from '../../utils/qr.js';
import { PrintLabelsInput } from './labels.schemas.js';

// Factores de conversión: 1 mm = 72 / 25.4 puntos tipográficos = ~2.83465 pt
const MM_TO_PT = 72 / 25.4;
const LABEL_WIDTH_PT = 70 * MM_TO_PT; // ~198.425 pt
const LABEL_HEIGHT_PT = 37 * MM_TO_PT; // ~104.88 pt
const COLS = 3;
const ROWS = 8;
const LABELS_PER_PAGE = 24;

export class LabelsService {
  /**
   * Genera el PDF con las etiquetas distribuidas en hoja A4 autoadhesiva precortada (RF-30, RNF-13, CP-19).
   */
  static async generateLabelsPdf(input: PrintLabelsInput, usuarioId: string): Promise<Buffer> {
    // 1. Obtener datos de las variantes a imprimir
    const variantIds = input.items.map((it) => it.variant_id);
    const query = `
      SELECT v.id, v.sku, v.codigo, v.modelo, v.talle, v.color, v.precio,
             p.nombre AS producto_nombre
      FROM product_variants v
      INNER JOIN products p ON v.product_id = p.id
      WHERE v.id = ANY($1)
    `;
    const { rows: variants } = await pool.query(query, [variantIds]);
    const variantMap = new Map<string, any>(variants.map((v) => [v.id, v]));

    // 2. Expandir lista de etiquetas según las copias solicitadas
    const labelsQueue: Array<{
      producto: string;
      sku: string;
      codigo: string;
      talle: string;
      color: string;
      precio: number;
      qrBuffer: Buffer;
    }> = [];

    for (const item of input.items) {
      const v = variantMap.get(item.variant_id);
      if (!v) continue;

      const qrUrl = `/ficha/${v.codigo}`;
      const qrBuffer = await generateQrBuffer(qrUrl);
      const precio = parseFloat(v.precio);

      for (let i = 0; i < item.copias; i++) {
        labelsQueue.push({
          producto: v.producto_nombre,
          sku: v.sku,
          codigo: v.codigo,
          talle: v.talle || '-',
          color: v.color || '-',
          precio,
          qrBuffer,
        });
      }
    }

    // 3. Crear documento PDF tamaño A4 sin márgenes automáticos para control milimétrico
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      autoFirstPage: true,
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));

    let currentSlot = input.posicion_inicial - 1; // 0-indexed (0 a 23)

    for (const label of labelsQueue) {
      // Si superamos los 24 slots de la página actual, agregar nueva página
      if (currentSlot >= LABELS_PER_PAGE) {
        doc.addPage({ size: 'A4', margin: 0 });
        currentSlot = 0;
      }

      const col = currentSlot % COLS;
      const row = Math.floor(currentSlot / COLS);

      const cellX = col * LABEL_WIDTH_PT;
      const cellY = row * LABEL_HEIGHT_PT;

      // Dibujar QR (22 mm = ~62 pt, cumple RNF-13: >= 20 mm)
      const qrSize = 22 * MM_TO_PT;
      doc.image(label.qrBuffer, cellX + 6, cellY + 12, {
        width: qrSize,
        height: qrSize,
      });

      // Textos a la derecha del QR
      const textX = cellX + qrSize + 10;
      const textWidth = LABEL_WIDTH_PT - qrSize - 16;

      // Nombre del producto
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#000000')
        .text(label.producto, textX, cellY + 8, {
          width: textWidth,
          height: 18,
          ellipsis: true,
        });

      // Talle y Color
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#333333')
        .text(`Talle: ${label.talle}  |  Color: ${label.color}`, textX, cellY + 28, {
          width: textWidth,
          ellipsis: true,
        });

      // Precio final destacado en ARS (RF-08, RF-30)
      const formattedPrice = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
      }).format(label.precio);

      doc
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .fillColor('#000000')
        .text(formattedPrice, textX, cellY + 44, {
          width: textWidth,
        });

      // Código interno en texto para tipeo manual (RF-30)
      doc
        .font('Helvetica')
        .fontSize(6.5)
        .fillColor('#555555')
        .text(`Cód: ${label.codigo}`, textX, cellY + 68, {
          width: textWidth,
          ellipsis: true,
        });

      // SKU
      doc
        .font('Helvetica')
        .fontSize(6)
        .fillColor('#777777')
        .text(`SKU: ${label.sku}`, textX, cellY + 78, {
          width: textWidth,
          ellipsis: true,
        });

      currentSlot++;
    }

    doc.end();

    // Esperar a que el buffer termine de crearse
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));
    });

    // 4. Registrar en label_print_jobs
    await pool.query(
      `INSERT INTO label_print_jobs (formato, posicion_inicial, items, usuario_id)
       VALUES ('A4_24_LABELS_70x37', $1, $2::jsonb, $3)`,
      [input.posicion_inicial, JSON.stringify(input.items), usuarioId]
    );

    // 5. Si se indicó marcar_impresas, limpiar la bandera etiqueta_desactualizada (RN-15)
    if (input.marcar_impresas) {
      await pool.query(
        `UPDATE product_variants
         SET etiqueta_desactualizada = false, updated_at = clock_timestamp()
         WHERE id = ANY($1)`,
        [variantIds]
      );
    }

    return pdfBuffer;
  }

  /**
   * Consulta las variantes que requieren reimpresión de etiquetas por cambio de precio (RN-15, CP-14).
   */
  static async listOutdatedLabels() {
    const query = `
      SELECT v.id, v.sku, v.codigo, v.modelo, v.talle, v.color, v.precio, v.stock_actual,
             p.nombre AS producto_nombre, c.nombre AS categoria_nombre
      FROM product_variants v
      INNER JOIN products p ON v.product_id = p.id
      INNER JOIN categories c ON p.category_id = c.id
      WHERE v.etiqueta_desactualizada = true AND v.estado = true
      ORDER BY p.nombre ASC, v.talle ASC
    `;

    const { rows } = await pool.query(query);
    return rows.map((r) => ({
      ...r,
      precio: parseFloat(r.precio),
      stock_actual: parseInt(r.stock_actual, 10),
    }));
  }
}
