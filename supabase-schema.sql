-- =============================================
-- RIFAS ROSARIO - Schema CORREGIDO para Supabase
-- Ejecuta este SQL en tu Supabase SQL Editor
-- =============================================

-- Eliminar tablas existentes
DROP TABLE IF EXISTS comentarios CASCADE;
DROP TABLE IF EXISTS boletos CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS rifa_config CASCADE;

-- Crear tablas
CREATE TABLE categorias (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  precio TEXT NOT NULL,
  descripcion TEXT,
  imagen TEXT,
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  telefono TEXT DEFAULT '5493416971479',
  finalizado BOOLEAN DEFAULT FALSE,
  ganador_num INTEGER,
  ganador_nombre TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE boletos (
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

CREATE TABLE comentarios (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE rifa_config (
  id SERIAL PRIMARY KEY,
  titulo TEXT DEFAULT 'RIFAS ROSARIO',
  alias_mp TEXT DEFAULT 'rifas.rosario',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE boletos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;

-- BORRAR TODAS LAS POLICIES EXISTENTES
DROP POLICY IF EXISTS "Public read" ON categorias;
DROP POLICY IF EXISTS "Public read" ON productos;
DROP POLICY IF EXISTS "Public read" ON boletos;
DROP POLICY IF EXISTS "Public read" ON comentarios;

-- CREAR POLICIES SIMPLES (sin restricciones para testing)
CREATE POLICY "Public read categorias" ON categorias FOR SELECT USING (true);
CREATE POLICY "Public insert categorias" ON categorias FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Public read productos" ON productos FOR SELECT USING (true);
CREATE POLICY "Public insert productos" ON productos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public update productos" ON productos FOR UPDATE TO anon USING (true);

CREATE POLICY "Public read boletos" ON boletos FOR SELECT USING (true);
CREATE POLICY "Public insert boletos" ON boletos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public update boletos" ON boletos FOR UPDATE TO anon USING (true);

CREATE POLICY "Public read comentarios" ON comentarios FOR SELECT USING (true);
CREATE POLICY "Public insert comentarios" ON comentarios FOR INSERT TO anon WITH CHECK (true);

-- Insertar categorias iniciales
INSERT INTO categorias (nombre) VALUES 
  ('Tecnologia'),
  ('Hogar y Muebles'),
  ('Electrodomesticos'),
  ('Herramientas'),
  ('Deportes'),
  ('Indumentaria'),
  ('Juegos y Juguetes'),
  ('Belleza y Cuidado Personal'),
  ('Servicios'),
  ('Bazar');

INSERT INTO rifa_config (titulo) VALUES ('RIFAS ROSARIO');

SELECT 'Listo! Tablas creadas correctamente.' as resultado;