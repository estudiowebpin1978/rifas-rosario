-- Agregar credenciales Uala a organizaciones
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS uala_username TEXT;
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS uala_client_id TEXT;
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS uala_client_secret TEXT;
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS uala_connected BOOLEAN DEFAULT false;

-- Tabla de comisiones pendientes de cobro
CREATE TABLE IF NOT EXISTS comisiones_pendientes (
  id SERIAL PRIMARY KEY,
  organization_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  monto_total NUMERIC NOT NULL,
  monto_comision NUMERIC NOT NULL,
  estado TEXT DEFAULT 'pendiente',
  metodo_pago TEXT,
  creado_at TIMESTAMP DEFAULT NOW(),
  pagado_at TIMESTAMP NULL
);

ALTER TABLE comisiones_pendientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comisiones_pendientes_owner" ON comisiones_pendientes FOR SELECT
  USING (true);
