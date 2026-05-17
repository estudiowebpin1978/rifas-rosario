-- =============================================
-- MIGRACION: Nuevo schema para productos
-- =============================================

DO $$
BEGIN
  -- Agregar nuevas columnas si no existen
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='title') THEN
    ALTER TABLE productos ADD COLUMN title TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='description') THEN
    ALTER TABLE productos ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='image') THEN
    ALTER TABLE productos ADD COLUMN image TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='price') THEN
    ALTER TABLE productos ADD COLUMN price NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='raffle_price') THEN
    ALTER TABLE productos ADD COLUMN raffle_price NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='numbers_total') THEN
    ALTER TABLE productos ADD COLUMN numbers_total INTEGER DEFAULT 100;
  END IF;
END $$;

-- Copiar datos existentes a nuevas columnas (usando COALESCE para columnas que pueden no existir)
UPDATE productos SET title = COALESCE(title, nombre, '');
UPDATE productos SET description = COALESCE(description, descripcion, '');
UPDATE productos SET image = COALESCE(image, imagen, '');

-- Convertir precio (texto como "$ 3500-") a numeric para raffle_price
UPDATE productos SET raffle_price = COALESCE(raffle_price, CAST(REGEXP_REPLACE(COALESCE(precio, '0'), '[^\d.,]', '', 'g') AS NUMERIC), 0);
-- price se puede actualizar manualmente, por defecto igual a raffle_price * 100
UPDATE productos SET price = COALESCE(price, raffle_price * 100);

-- Hacer que NOT NULL después de migrar
ALTER TABLE productos ALTER COLUMN title SET NOT NULL;
ALTER TABLE productos ALTER COLUMN numbers_total SET DEFAULT 100;

-- Indices
CREATE INDEX IF NOT EXISTS idx_productos_title ON productos(title);
