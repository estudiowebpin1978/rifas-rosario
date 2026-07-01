-- Agregar métodos de cobro a organizaciones
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS alias_cobro TEXT;
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS mp_alias TEXT;
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS uala_alias TEXT;
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS metodo_cobro_preferido TEXT DEFAULT 'alias';

-- Credenciales Uala (opcional, para los que quieran checkout automático)
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS uala_username TEXT;
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS uala_client_id TEXT;
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS uala_client_secret TEXT;
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS uala_connected BOOLEAN DEFAULT false;

-- Comisión pendiente
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS comision_pendiente NUMERIC DEFAULT 0;
