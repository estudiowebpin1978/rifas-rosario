-- =============================================
-- RIFAS ROSARIO - MIGRACION COMPLETA
-- Ejecutar en Supabase Dashboard > SQL Editor
-- =============================================

-- 1. Arreglar CHECK constraint de boletos para aceptar 'reservado'
ALTER TABLE boletos DROP CONSTRAINT IF EXISTS boletos_estado_check;
ALTER TABLE boletos ADD CONSTRAINT boletos_estado_check 
  CHECK (estado IN ('disponible', 'reservado', 'vendido'));

-- 2. Agregar categorias faltantes: Zapatillas y Celulares
INSERT INTO categorias (nombre) VALUES 
  ('Zapatillas'),
  ('Celulares')
ON CONFLICT DO NOTHING;

-- 3. Crear tabla user_profiles si no existe
CREATE TABLE IF NOT EXISTS user_profiles (
  whatsapp TEXT PRIMARY KEY,
  nombre TEXT DEFAULT 'Usuario',
  foto_url TEXT,
  wins_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_read" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_all" ON user_profiles;

CREATE POLICY "user_profiles_read" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "user_profiles_all" ON user_profiles FOR ALL USING (true) WITH CHECK (true);

-- 4. Crear tabla reels si no existe
CREATE TABLE IF NOT EXISTS reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  tipo TEXT DEFAULT 'promo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reels_read" ON reels;
DROP POLICY IF EXISTS "reels_all" ON reels;

CREATE POLICY "reels_read" ON reels FOR SELECT USING (true);
CREATE POLICY "reels_all" ON reels FOR ALL USING (true) WITH CHECK (true);

-- 5. Insertar reels de ejemplo si no hay ninguno
INSERT INTO reels (titulo, video_url, tipo)
SELECT 'Bienvenido a RIFAS ROSARIO!', NULL, 'promo'
WHERE NOT EXISTS (SELECT 1 FROM reels LIMIT 1);

SELECT 'Migracion completada exitosamente!' as resultado;
