-- Schema para RIFAS ROSARIO

DROP TABLE IF EXISTS comentarios CASCADE;
DROP TABLE IF EXISTS boletos CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS rifa_config CASCADE;

CREATE TABLE categorias (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL
);

CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  precio TEXT NOT NULL,
  descripcion TEXT,
  imagen TEXT,
  categoria_id INTEGER REFERENCES categorias(id),
  telefono TEXT DEFAULT '5493416971479',
  finalizado BOOLEAN DEFAULT FALSE,
  ganador_num INTEGER,
  ganador_nombre TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE boletos (
  id SERIAL PRIMARY KEY,
  numero INTEGER NOT NULL,
  producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
  estado TEXT DEFAULT 'disponible' CHECK (estado IN ('disponible', 'vendido')),
  nombre TEXT,
  whatsapp TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(numero, producto_id)
);

CREATE TABLE comentarios (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE rifa_config (
  id SERIAL PRIMARY KEY,
  titulo TEXT DEFAULT 'RIFAS ROSARIO',
  alias_mp TEXT DEFAULT 'rifas.rosario'
);

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE boletos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON categorias FOR SELECT USING (true);
CREATE POLICY "Public read" ON productos FOR SELECT USING (true);
CREATE POLICY "Public read" ON boletos FOR SELECT USING (true);
CREATE POLICY "Public write" ON boletos FOR UPDATE USING (true);

INSERT INTO categorias (nombre) VALUES 
  ('Tecnologia'),
  ('Hogar y Muebles'),
  ('Electrodomesticos'),
  ('Herramientas'),
  ('Deportes'),
  ('Indumentaria'),
  ('Juegos y Juguetes'),
  ('Belleza y Cuidado Personal'),
  ('Servicios');

INSERT INTO rifa_config (titulo) VALUES ('RIFAS ROSARIO');