# Reglas y Contexto del Proyecto: Sistema Web de Ventas y Control de Stock

## 1. Idioma y Comunicación
- Responde, razona y documenta todo el código, comentarios y mensajes de commit de Git estrictamente en **español**.
- Antes de ejecutar comandos destructivos, migraciones de base de datos o crear múltiples archivos de estructura, presenta un breve plan y espera confirmación.

## 2. Fuente de Verdad Funcional
- La especificación oficial del sistema se encuentra en `@docs/Especificacion_Requerimientos_Ventas_Stock_v1.3.md`.
- Antes de diseñar tablas, endpoints, interfaces o lógica de negocio, consulta dicho documento y respeta estrictamente los Requerimientos Funcionales (`RF-01` a `RF-33`), Reglas de Negocio (`RN-01` a `RN-19`) y Criterios de Aceptación (`CA-01` a `CA-20`).

## 3. Alcance y Restricciones de Negocio (v1)
- **Modalidad:** Venta presencial en un único local físico. No hay venta online con envío ni retiro diferido.
- **Identificación:** Exclusivamente mediante código **QR** único por variante/SKU generado por el sistema (`RN-01`, `RN-16`). No implementar códigos de barras, EAN ni soporte para lectores USB.
- **Dispositivos:** Interfaz web responsive (mobile-first) pensada para que los vendedores operen desde tablets o celulares leyendo QR con la cámara (`RNF-13`).
- **Precios y Facturación:** Precios finales en pesos argentinos (ARS) con IVA incluido, sin descuentos ni recargos (`RF-08`). El sistema **no** emite facturas fiscales; todo comprobante debe incluir la leyenda `"Documento no válido como factura"` (`RF-21`).
- **Control de Stock:**
  - El stock se gestiona por variante/SKU (`product_variants`) y nunca puede quedar en negativo (`RN-02`).
  - Umbral de alerta (`stock_minimo`): valor por defecto `5` por variante (`RN-08`).
  - Devoluciones: plazo máximo de **3 días corridos** desde la compra; el stock se repone en el momento (`RN-09`, `RN-17`).
  - Cortes de internet: soporte para carga diferida de ventas anotadas en planilla, conservando fecha/hora real y marcándolas como `"Carga diferida"` (`RF-33`, `RN-18`).

## 4. Arquitectura y Estándares Técnicos
- **Base de datos:** PostgreSQL 16+.
  - Usar `NUMERIC/DECIMAL` para todos los importes monetarios (nunca `FLOAT`).
  - Usar `TIMESTAMPTZ` almacenado en UTC para todas las fechas y horas.
  - Garantizar transacciones ACID y bloqueo de filas (`SELECT ... FOR UPDATE` o equivalente) en reservas y confirmaciones de venta para evitar sobreventa simultánea (`RNF-07`, `CA-08`).
- **Seguridad y Auditoría:**
  - Contraseñas hasheadas con Argon2id o bcrypt.
  - Webhooks de Mercado Pago (API de Orders) validados mediante firma `x-signature` y procesados de forma idempotente (`RN-05`, Sección 10).
  - Registrar auditoría de movimientos de stock (`stock_movements`), pagos manuales y anulaciones (`RF-19`, `RF-24`).

## 5. Orden de Desarrollo
- Seguir las etapas definidas en la sección **13.1**:
  1. **Etapa 1 (Local operativo):** Catálogo, variantes, QR, etiquetas PDF en hoja A4 (24 etiquetas de 70×37 mm), importación CSV/Excel, inventario con historial, venta asistida con pago manual, verificación de entrega, devoluciones manuales y ventas diferidas.
  2. **Etapa 2 (Pago integrado):** Mercado Pago QR dinámico, reservas temporales (10 min por defecto), webhooks, pagos fuera de término y tarea programada de liberación.
  3. **Etapa 3 (Cierre):** Reintegros por API, resumen de cobros, reportes y auditoría completa.