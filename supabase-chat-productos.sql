-- Add producto_id and is_winner columns to chat_messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_winner BOOLEAN DEFAULT FALSE;

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public read chat_messages" ON chat_messages;
CREATE POLICY "Public read chat_messages" ON chat_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert chat_messages" ON chat_messages;
CREATE POLICY "Public insert chat_messages" ON chat_messages FOR INSERT TO anon WITH CHECK (true);

-- Index for product filtering
CREATE INDEX IF NOT EXISTS idx_chat_messages_producto_id ON chat_messages(producto_id);
