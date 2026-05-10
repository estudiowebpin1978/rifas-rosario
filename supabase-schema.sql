-- Schema para RIFA SMART en Supabase

-- Tabla: rifa_config (configuracion de la rifa)
CREATE TABLE rifa_config (
  id SERIAL PRIMARY KEY,
  titulo TEXT DEFAULT 'RIFA ROSARIO',
  valor_boleto TEXT DEFAULT '$5000',
  alias_mp TEXT DEFAULT 'rifas.rosario',
  telefono_whatsapp TEXT DEFAULT '5493410000000',
  vendido_por TEXT DEFAULT 'RIFA SMART',
  finalizado BOOLEAN DEFAULT FALSE,
  ganador_num INTEGER,
  ganador_nombre TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: boletos (numeros de rifa)
CREATE TABLE boletos (
  id SERIAL PRIMARY KEY,
  numero INTEGER UNIQUE NOT NULL,
  estado TEXT DEFAULT 'disponible' CHECK (estado IN ('disponible', 'reservado', 'vendido')),
  nombre TEXT,
  whatsapp TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: comentarios (muro de actividad)
CREATE TABLE comentarios (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE rifa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE boletos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;

-- Policies para lectura publica
CREATE POLICY "Public read config" ON rifa_config FOR SELECT USING (true);
CREATE POLICY "Public read boletos" ON boletos FOR SELECT USING (true);
CREATE POLICY "Public read comentarios" ON comentarios FOR SELECT USING (true);

-- Policies para escritura
CREATE POLICY "Public insert comentarios" ON comentarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update boletos" ON boletos FOR UPDATE USING (true);

-- Insertar config inicial
INSERT INTO rifa_config (titulo, valor_boleto, alias_mp) VALUES ('RIFA ROSARIO', '$5000', 'rifas.rosario');

-- Generar 100 boletos si no existen
INSERT INTO boletos (numero, estado) 
SELECT generate_series(0, 99), 'disponible'
ON CONFLICT (numero) DO NOTHING;