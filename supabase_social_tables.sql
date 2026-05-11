-- =============================================
-- RIFAS ROSARIO - TABLAS SOCIALES
-- Ejecutar en Supabase Dashboard > SQL Editor
-- =============================================

-- Tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS user_profiles (
  whatsapp TEXT PRIMARY KEY,
  nombre TEXT DEFAULT 'Usuario',
  foto_url TEXT,
  wins_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de reels promocionales
CREATE TABLE IF NOT EXISTS reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  tipo TEXT DEFAULT 'promo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para lectura
CREATE POLICY "user_profiles_read" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "reels_read" ON reels FOR SELECT USING (true);

-- Políticas para escritura con service role (admin)
CREATE POLICY "user_profiles_all" ON user_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "reels_all" ON reels FOR ALL USING (true) WITH CHECK (true);

-- Insertar reels de ejemplo
INSERT INTO reels (titulo, video_url, tipo) VALUES
  ('¡Mira este premio!', NULL, 'promo'),
  ('Sorteo upcoming', NULL, 'promo');