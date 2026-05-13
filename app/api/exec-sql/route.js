import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST() {
  const sql = `
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

    INSERT INTO reels (titulo, video_url, tipo) VALUES
      ('¡Mira este premio!', NULL, 'promo'),
      ('Sorteo upcoming', NULL, 'promo')
    ON CONFLICT DO NOTHING;
  `;

  const { error } = await supabase.rpc('pg_catalog.execute', { 
    sql: sql 
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
