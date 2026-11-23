-- Migración 001: Esquema Inicial para Etapa 1 (Local Operativo)
-- Cumple con PostgreSQL 16+, ERS v1.3 y reglas de GEMINI.md

BEGIN;

-- 1. ROLES Y USUARIOS
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Roles del sistema
INSERT INTO roles (nombre, descripcion) VALUES
    ('admin', 'Administrador con acceso completo al catálogo, usuarios, alertas y reportes'),
    ('vendedor', 'Operador de venta asistida, verificación de entrega y cobro manual')
ON CONFLICT (nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id INT NOT NULL REFERENCES roles(id),
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 2. CATÁLOGO: CATEGORÍAS, PRODUCTOS Y VARIANTES
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    estado BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    imagenes JSONB NOT NULL DEFAULT '[]'::jsonb,
    estado BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    sku VARCHAR(100) NOT NULL UNIQUE,
    codigo VARCHAR(100) NOT NULL UNIQUE,
    modelo VARCHAR(50),
    talle VARCHAR(30),
    color VARCHAR(30),
    precio NUMERIC(12, 2) NOT NULL CHECK (precio >= 0),
    stock_actual INT NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo INT NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0),
    etiqueta_desactualizada BOOLEAN NOT NULL DEFAULT false,
    estado BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_codigo ON product_variants(codigo);

-- 3. CLIENTES (INVITADOS)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(120),
    email VARCHAR(150),
    telefono VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 4. VENTAS Y LÍNEAS DE VENTA
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_operacion VARCHAR(30) NOT NULL UNIQUE,
    canal VARCHAR(20) NOT NULL CHECK (canal IN ('autoservicio', 'venta_asistida')),
    vendedor_id UUID REFERENCES users(id),
    customer_id UUID REFERENCES customers(id),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    moneda VARCHAR(3) NOT NULL DEFAULT 'ARS',
    estado VARCHAR(25) NOT NULL CHECK (estado IN (
        'pendiente_pago', 'pagada', 'pagada_sin_stock', 'entregada', 'cancelada', 'devuelta'
    )),
    entregada_por UUID REFERENCES users(id),
    entregada_en TIMESTAMPTZ,
    carga_diferida BOOLEAN NOT NULL DEFAULT false,
    cargada_por UUID REFERENCES users(id),
    cargada_en TIMESTAMPTZ,
    fecha_real TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_sales_estado ON sales(estado);
CREATE INDEX IF NOT EXISTS idx_sales_fecha_real ON sales(fecha_real);
CREATE INDEX IF NOT EXISTS idx_sales_vendedor ON sales(vendedor_id);

CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    descripcion_historica VARCHAR(255) NOT NULL,
    sku_historico VARCHAR(100) NOT NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(12, 2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_variant ON sale_items(variant_id);

-- 5. PAGOS Y AUDITORÍA DE PAGOS
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('manual', 'pasarela')),
    medio VARCHAR(30) NOT NULL CHECK (medio IN ('efectivo', 'transferencia', 'posnet', 'billetera_virtual')),
    referencia_externa VARCHAR(100),
    importe NUMERIC(12, 2) NOT NULL CHECK (importe > 0),
    importe_recibido NUMERIC(12, 2) CHECK (importe_recibido >= importe),
    vuelto NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (vuelto >= 0),
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('aprobado', 'anulado')),
    registrado_por UUID NOT NULL REFERENCES users(id),
    anulado_por UUID REFERENCES users(id),
    motivo_anulacion TEXT,
    fecha TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    respuesta_resumida_proveedor JSONB
);

CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_vendedor ON payments(registrado_por);

-- 6. DEVOLUCIONES (RN-09, RN-17, RN-19)
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    importe NUMERIC(12, 2) NOT NULL CHECK (importe > 0),
    medio VARCHAR(30) NOT NULL,
    referencia_externa VARCHAR(100),
    motivo TEXT NOT NULL,
    items JSONB NOT NULL,
    registrado_por UUID NOT NULL REFERENCES users(id),
    autorizado_por UUID REFERENCES users(id),
    fecha TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 7. AUDITORÍA DE MOVIMIENTOS DE STOCK (RF-19, RN-10)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN (
        'venta', 'ingreso', 'egreso', 'devolucion', 'rotura', 'ajuste', 'inventario_inicial'
    )),
    cantidad INT NOT NULL CHECK (cantidad <> 0),
    stock_anterior INT NOT NULL CHECK (stock_anterior >= 0),
    stock_nuevo INT NOT NULL CHECK (stock_nuevo >= 0),
    motivo TEXT,
    referencia VARCHAR(100),
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    usuario_id UUID NOT NULL REFERENCES users(id),
    fecha TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON stock_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_fecha ON stock_movements(fecha);

-- 8. ALERTAS DE STOCK BAJO (RF-14, RF-15, RN-08)
CREATE TABLE IF NOT EXISTS stock_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    stock_detectado INT NOT NULL,
    umbral INT NOT NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('activa', 'resuelta')) DEFAULT 'activa',
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    fecha_resolucion TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_alert ON stock_alerts(variant_id) WHERE estado = 'activa';

-- 9. TRABAJOS DE IMPRESIÓN DE ETIQUETAS Y CARGA MASIVA
CREATE TABLE IF NOT EXISTS label_print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    formato VARCHAR(50) NOT NULL DEFAULT 'A4_24_LABELS_70x37',
    posicion_inicial INT NOT NULL DEFAULT 1 CHECK (posicion_inicial BETWEEN 1 AND 24),
    items JSONB NOT NULL,
    usuario_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_archivo VARCHAR(255) NOT NULL,
    filas_totales INT NOT NULL DEFAULT 0,
    filas_correctas INT NOT NULL DEFAULT 0,
    filas_con_error INT NOT NULL DEFAULT 0,
    detalle_errores JSONB DEFAULT '[]'::jsonb,
    usuario_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

COMMIT;
