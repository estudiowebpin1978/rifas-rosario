-- Schema para RIFA SMART con productos y categorias

-- Tabla: categorias
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: productos
CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  precio TEXT NOT NULL,
  descripcion TEXT,
  imagen TEXT,
  categoria_id INTEGER REFERENCES categorias(id),
  telefono TEXT DEFAULT '5493410000000',
  finalizado BOOLEAN DEFAULT FALSE,
  ganador_num INTEGER,
  ganador_nombre TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: boletos (ahora con producto_id)
CREATE TABLE IF NOT EXISTS boletos (
  id SERIAL PRIMARY KEY,
  numero INTEGER NOT NULL,
  producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
  estado TEXT DEFAULT 'disponible' CHECK (estado IN ('disponible', 'vendido')),
  nombre TEXT,
  whatsapp TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(numero, producto_id)
);

-- Tabla: comentarios
CREATE TABLE IF NOT EXISTS comentarios (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: rifa_config (opcional, para config global)
CREATE TABLE IF NOT EXISTS rifa_config (
  id SERIAL PRIMARY KEY,
  titulo TEXT DEFAULT 'RIFA SMART ROSARIO',
  alias_mp TEXT DEFAULT 'rifas.rosario',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE boletos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE rifa_config ENABLE ROW LEVEL SECURITY;

-- Policies para lectura publica
DROP POLICY IF EXISTS "Public read categorias" ON categorias;
CREATE POLICY "Public read categorias" ON categorias FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read productos" ON productos;
CREATE POLICY "Public read productos" ON productos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read boletos" ON boletos;
CREATE POLICY "Public read boletos" ON boletos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read comentarios" ON comentarios;
CREATE POLICY "Public read comentarios" ON comentarios FOR SELECT USING (true);

-- Policies para escritura (solo autenticados)
DROP POLICY IF EXISTS "Auth write productos" ON productos;
CREATE POLICY "Auth write productos" ON productos FOR INSERT WITH CHECK (auth_role() = 'authenticated');
DROP POLICY IF EXISTS "Auth write boletos" ON boletos;
CREATE POLICY "Auth write boletos" ON boletos FOR UPDATE USING (auth_role() = 'authenticated');
DROP POLICY IF EXISTS "Auth write categorias" ON categorias;
CREATE POLICY "Auth write categorias" ON categorias FOR INSERT WITH CHECK (auth_role() = 'authenticated');

-- Insertar categorias de ejemplo
INSERT INTO categorias (nombre) VALUES 
  ('Electronica'),
  ('Hogar'),
  ('Deportes'),
  ('Vehiculos')
ON CONFLICT DO NOTHING;

-- Insertar config
INSERT INTO rifa_config (titulo) VALUES ('RIFA SMART ROSARIO') ON CONFLICT DO NOTHING;