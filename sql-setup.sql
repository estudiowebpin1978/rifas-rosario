-- =============================================
-- MERCADO RIFAS - SQL COMPLETO
-- Ejecutar en Supabase Dashboard > SQL Editor
-- =============================================

-- Agregar columnas faltantes a productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS sorteo_notificado BOOLEAN DEFAULT FALSE;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS winner_num INTEGER;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS winner_nombre TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS finalizado BOOLEAN DEFAULT FALSE;

-- Actualizar RLS para permitir todas las operaciones
DROP POLICY IF EXISTS select_productos ON productos;
DROP POLICY IF EXISTS insert_productos ON productos;
DROP POLICY IF EXISTS update_productos ON productos;

CREATE POLICY select_productos ON productos FOR SELECT USING (true);
CREATE POLICY insert_productos ON productos FOR INSERT WITH CHECK (true);
CREATE POLICY update_productos ON productos FOR UPDATE USING (true) WITH CHECK (true);

-- Actualizar RLS para boletos
DROP POLICY IF EXISTS select_boletos ON boletos;
DROP POLICY IF EXISTS insert_boletos ON boletos;
DROP POLICY IF EXISTS update_boletos ON boletos;

CREATE POLICY select_boletos ON boletos FOR SELECT USING (true);
CREATE POLICY insert_boletos ON boletos FOR INSERT WITH CHECK (true);
CREATE POLICY update_boletos ON boletos FOR UPDATE USING (true) WITH CHECK (true);

-- Tablas sociales (user_profiles y reels)
CREATE TABLE IF NOT EXISTS user_profiles (
  whatsapp TEXT PRIMARY KEY,
  nombre TEXT DEFAULT 'Usuario',
  foto_url TEXT,
  wins_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  tipo TEXT DEFAULT 'promo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profiles_read ON user_profiles;
DROP POLICY IF EXISTS reels_read ON reels;
DROP POLICY IF EXISTS user_profiles_all ON user_profiles;
DROP POLICY IF EXISTS reels_all ON reels;

CREATE POLICY user_profiles_read ON user_profiles FOR SELECT USING (true);
CREATE POLICY reels_read ON reels FOR SELECT USING (true);
CREATE POLICY user_profiles_all ON user_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY reels_all ON reels FOR ALL USING (true) WITH CHECK (true);

-- Verificar estructura
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'productos';