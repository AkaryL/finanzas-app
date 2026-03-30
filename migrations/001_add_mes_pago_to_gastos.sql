-- Migración: Agregar mes/año específico de pago a gastos
-- Para créditos puntuales (no recurrentes) como Nu Crédito
-- Si mes_pago/anio_pago son NULL, el crédito es recurrente (aparece cada mes)
-- Si están definidos, solo aparece en ese mes específico

ALTER TABLE gastos ADD COLUMN IF NOT EXISTS mes_pago INTEGER CHECK (mes_pago >= 1 AND mes_pago <= 12);
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS anio_pago INTEGER;

-- Ejemplo: Marcar Nu Crédito como deuda de abril 2026
-- UPDATE gastos SET mes_pago = 4, anio_pago = 2026 WHERE nombre = 'Nu Crédito';
