-- ============================================
-- SCHEMA PARA SUPABASE - FINANZAS PERSONALES
-- Ejecuta esto en el SQL Editor de Supabase
-- ============================================

-- Tabla de configuración general (ingresos, ahorros actuales, saldo)
CREATE TABLE configuracion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingreso_quincenal NUMERIC(12,2) NOT NULL DEFAULT 12500,
  ahorro_actual_auto NUMERIC(12,2) NOT NULL DEFAULT 2000,
  saldo_cuenta NUMERIC(12,2) NOT NULL DEFAULT 5324,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de gastos recurrentes
CREATE TABLE gastos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  dia_pago INTEGER CHECK (dia_pago >= 1 AND dia_pago <= 31),
  quincena INTEGER CHECK (quincena IN (1, 2)), -- 1 = primera quincena (1-15), 2 = segunda (16-31)
  es_mensual BOOLEAN DEFAULT true, -- true = cada mes, false = pago único o anual
  categoria VARCHAR(50) DEFAULT 'fijo', -- fijo, ahorro, transporte, entretenimiento, credito
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de simulaciones de compra (para validar si puedo comprar algo)
CREATE TABLE simulaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  descripcion VARCHAR(200) NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  es_viable BOOLEAN,
  dinero_restante NUMERIC(12,2),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar configuración inicial
INSERT INTO configuracion (ingreso_quincenal, ahorro_actual_auto, saldo_cuenta)
VALUES (12500, 2000, 5324);

-- Insertar gastos iniciales
INSERT INTO gastos (nombre, monto, dia_pago, quincena, categoria, notas) VALUES
  ('Internet', 588, 26, 2, 'fijo', 'Pago mensual de internet'),
  ('Plan Telefónico', 657, 8, 1, 'fijo', 'Plan celular'),
  ('Pago Crédito BBVA', 6488, 25, 2, 'credito', 'Pago mensual crédito BBVA'),
  ('Amazon Prime', 100, 4, 1, 'entretenimiento', 'Suscripción Amazon Prime'),
  ('Ahorro Coche', 1500, 1, 1, 'ahorro', 'Ahorro mensual para el coche'),
  ('ChatGPT', 399, 7, 1, 'entretenimiento', 'Suscripción ChatGPT Plus'),
  ('Nu Crédito', 12822, 20, 2, 'credito', 'Pago tarjeta Nu - se puede modificar'),
  ('Transporte', 1000, 1, 1, 'transporte', 'Apartado mensual para transporte');

-- Tabla de movimientos (registrar pagos, retiros, ingresos extra, etc.)
CREATE TABLE movimientos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('pago_adelantado', 'gasto_extra', 'ingreso_extra', 'retiro_ahorro')),
  descripcion VARCHAR(200) NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  origen VARCHAR(50) DEFAULT 'saldo_cuenta', -- de dónde sale el dinero: saldo_cuenta, ahorro_auto
  destino VARCHAR(100), -- a qué se aplica: ej "Nu Crédito", "BBVA"
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Row Level Security (opcional, si usas auth)
-- ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE simulaciones ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (para uso sin auth)
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on configuracion" ON configuracion FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on gastos" ON gastos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on simulaciones" ON simulaciones FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on movimientos" ON movimientos FOR ALL USING (true) WITH CHECK (true);

-- Tabla de pagos mensuales de deudas (para marcar si ya pagaste el mes)
CREATE TABLE pagos_deudas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gasto_id UUID NOT NULL REFERENCES gastos(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  anio INTEGER NOT NULL,
  cuenta_origen VARCHAR(50) NOT NULL DEFAULT 'saldo_cuenta', -- saldo_cuenta, ahorro_auto, efectivo, otra
  notas TEXT,
  fecha_pago TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(gasto_id, mes, anio) -- solo un pago por deuda por mes
);

ALTER TABLE pagos_deudas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on pagos_deudas" ON pagos_deudas FOR ALL USING (true) WITH CHECK (true);
