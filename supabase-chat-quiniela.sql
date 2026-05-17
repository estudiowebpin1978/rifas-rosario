-- =============================================
-- RIFAS ROSARIO - CHAT + QUINIELA SORTEO
-- Ejecuta este SQL en tu Supabase SQL Editor
-- =============================================

-- Tabla de mensajes del chat publico
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  user_name TEXT NOT NULL DEFAULT 'Anónimo',
  message TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar columnas para sorteo por Quiniela
ALTER TABLE productos ADD COLUMN IF NOT EXISTS metodo_sorteo TEXT DEFAULT 'aleatorio';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS sorteo_programado BOOLEAN DEFAULT FALSE;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS sorteo_fecha TIMESTAMPTZ;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS quiniela_numero TEXT;

-- Habilitar RLS en chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Borrar policies existentes
DROP POLICY IF EXISTS "chat_messages_read" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;

-- Policies para chat_messages
CREATE POLICY "chat_messages_read" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT WITH CHECK (true);

-- Indices para mejor performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_productos_metodo_sorteo ON productos(metodo_sorteo);

SELECT 'Listo! Tablas de chat y quiniela creadas correctamente.' as resultado;
