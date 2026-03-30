-- Migración: Agregar monto_pagado para soportar abonos parciales
-- Si monto_pagado < monto del gasto → abono parcial
-- Si monto_pagado >= monto del gasto → pagado completo

ALTER TABLE pagos_deudas ADD COLUMN IF NOT EXISTS monto_pagado NUMERIC(12,2) NOT NULL DEFAULT 0;
