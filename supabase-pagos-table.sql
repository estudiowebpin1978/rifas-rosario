-- Tabla de pagos para registrar cada transacción
CREATE TABLE IF NOT EXISTS pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boleto_id INTEGER,
  producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  numero INTEGER,
  nombre TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  monto NUMERIC DEFAULT 0,
  alias_usado TEXT DEFAULT '',
  comprobante_url TEXT DEFAULT '',
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'cancelado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pagos_all" ON pagos FOR ALL USING (true) WITH CHECK (true);
