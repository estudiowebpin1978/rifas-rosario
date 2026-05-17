-- =============================================
-- MIGRACION: Nuevo schema para productos
-- =============================================

-- Agregar nuevas columnas
ALTER TABLE productos ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS raffle_price NUMERIC DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS numbers_total INTEGER DEFAULT 100;

-- Copiar datos existentes a nuevas columnas
UPDATE productos SET title = COALESCE(nombre, '');
UPDATE productos SET description = COALESCE(descripcion, '');
UPDATE productos SET image = COALESCE(imagen, '');

-- Convertir precio (texto como "$ 3500-") a numeric para raffle_price
UPDATE productos SET raffle_price = CAST(REGEXP_REPLACE(COALESCE(precio, '0'), '[^\d.,]', '', 'g') AS NUMERIC);
-- price se puede actualizar manualmente, por defecto igual a raffle_price * 100
UPDATE productos SET price = raffle_price * 100;

-- Hacer que NOT NULL después de migrar
ALTER TABLE productos ALTER COLUMN title SET NOT NULL;
ALTER TABLE productos ALTER COLUMN numbers_total SET DEFAULT 100;

-- Indices
CREATE INDEX IF NOT EXISTS idx_productos_title ON productos(title);
