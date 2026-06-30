-- =============================================
-- ECO RIFAS SaaS - Multi-tenant migration
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. TABLA ORGANIZACIONES (cada organizacion es un "tenant")
CREATE TABLE IF NOT EXISTS organizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  cover_url TEXT,
  descripcion TEXT,
  whatsapp TEXT,
  email TEXT,
  ciudad TEXT,
  provincia TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  commission_pct NUMERIC DEFAULT 8,
  stripe_customer_id TEXT,
  mp_player_id TEXT,
  activa BOOLEAN DEFAULT TRUE,
  total_rifas INTEGER DEFAULT 0,
  total_recaudado NUMERIC DEFAULT 0,
  referido_por UUID REFERENCES organizaciones(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA PLANES
CREATE TABLE IF NOT EXISTS planes (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  precio_mensual NUMERIC DEFAULT 0,
  comision_pct NUMERIC DEFAULT 8,
  max_rifas INTEGER DEFAULT 3,
  max_numeros INTEGER DEFAULT 100,
  custom_domain BOOLEAN DEFAULT FALSE,
  soporte_prioritario BOOLEAN DEFAULT FALSE,
  estadisticas_avanzadas BOOLEAN DEFAULT FALSE,
  eliminado BOOLEAN DEFAULT FALSE
);

-- 3. TABLA COMISIONES (ganancias por cada venta)
CREATE TABLE IF NOT EXISTS comisiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  monto_venta NUMERIC NOT NULL,
  comision_pct NUMERIC NOT NULL,
  comision_monto NUMERIC NOT NULL,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'cancelada')),
  pagada_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA PAGOS ORGANIZACION (cuando el organizador cobra)
CREATE TABLE IF NOT EXISTS pagos_organizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  monto NUMERIC NOT NULL,
  metodo TEXT DEFAULT 'mercadopago',
  comprobante_url TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'procesando', 'completado', 'rechazado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completado_en TIMESTAMPTZ
);

-- 5. TABLA GANADORES CON FOTO/VIDEO
CREATE TABLE IF NOT EXISTS ganadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE SET NULL,
  producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  nombre_ganador TEXT NOT NULL,
  ciudad TEXT,
  premio TEXT NOT NULL,
  foto_url TEXT,
  video_url TEXT,
  testimonio TEXT,
  fecha_sorteo TIMESTAMPTZ DEFAULT NOW(),
  verificado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA AFILIADOS
CREATE TABLE IF NOT EXISTS afiliados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo TEXT UNIQUE NOT NULL,
  comision_pct NUMERIC DEFAULT 10,
  total_referidos INTEGER DEFAULT 0,
  total_ganado NUMERIC DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA REFERIDOS (cada organizacion traida por un afiliado)
CREATE TABLE IF NOT EXISTS referidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id UUID REFERENCES afiliados(id) ON DELETE CASCADE,
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'convertido', 'cancelado')),
  comision_ganada NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLA NOTIFICACIONES PUSH
CREATE TABLE IF NOT EXISTS notificaciones_push (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  url TEXT,
  enviada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABLA SUSCRIPCIONES PUSH (para suscribirse a organizaciones)
CREATE TABLE IF NOT EXISTS suscripciones_push (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organizacion_id)
);

-- 10. MERCADO PAGO - Pagos de participantes
CREATE TABLE IF NOT EXISTS pagos_mp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT UNIQUE NOT NULL,
  boleto_id INTEGER,
  producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE SET NULL,
  monto NUMERIC NOT NULL,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'cancelado', 'reembolsado')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 11. HABILITAR RLS
ALTER TABLE organizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_organizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE ganadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE afiliados ENABLE ROW LEVEL SECURITY;
ALTER TABLE referidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones_push ENABLE ROW LEVEL SECURITY;
ALTER TABLE suscripciones_push ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_mp ENABLE ROW LEVEL SECURITY;

-- 12. POLICIES - Lectura publica para tablas publicas
DROP POLICY IF EXISTS "org_public_read" ON organizaciones;
CREATE POLICY "org_public_read" ON organizaciones FOR SELECT USING (true);

DROP POLICY IF EXISTS "org_owner_all" ON organizaciones;
CREATE POLICY "org_owner_all" ON organizaciones FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "planes_public_read" ON planes;
CREATE POLICY "planes_public_read" ON planes FOR SELECT USING (true);

DROP POLICY IF EXISTS "ganadores_public_read" ON ganadores;
CREATE POLICY "ganadores_public_read" ON ganadores FOR SELECT USING (true);

DROP POLICY IF EXISTS "comisiones_owner" ON comisiones;
CREATE POLICY "comisiones_owner" ON comisiones FOR SELECT
  USING (organizacion_id IN (SELECT id FROM organizaciones WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "pagos_organizacion_owner" ON pagos_organizacion;
CREATE POLICY "pagos_organizacion_owner" ON pagos_organizacion FOR SELECT
  USING (organizacion_id IN (SELECT id FROM organizaciones WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "afiliados_own" ON afiliados;
CREATE POLICY "afiliados_own" ON afiliados FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "referidos_own" ON referidos;
CREATE POLICY "referidos_own" ON referidos FOR SELECT
  USING (afiliado_id IN (SELECT id FROM afiliados WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "suscripciones_own" ON suscripciones_push;
CREATE POLICY "suscripciones_own" ON suscripciones_push FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "pagos_mp_insert" ON pagos_mp;
CREATE POLICY "pagos_mp_insert" ON pagos_mp FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "pagos_mp_read_ownership" ON pagos_mp;
CREATE POLICY "pagos_mp_read_ownership" ON pagos_mp FOR SELECT
  USING (true);

-- 13. INSERTAR PLANES DEFAULT
INSERT INTO planes (nombre, slug, precio_mensual, comision_pct, max_rifas, max_numeros, custom_domain, soporte_prioritario, estadisticas_avanzadas)
VALUES
  ('Gratis', 'free', 0, 15, 3, 100, false, false, false),
  ('Pro', 'pro', 14999, 8, 50, 200, false, true, true),
  ('Business', 'business', 39999, 5, 99999, 1000, true, true, true)
ON CONFLICT (slug) DO NOTHING;

-- 14. AGREGAR organization_id a productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizaciones(id) ON DELETE SET NULL;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS commission_applied NUMERIC DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS ganador_foto TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS ganador_video TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS ganador_testimonio TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS ganador_ciudad TEXT;

-- 15. INDEX para slug lookup
CREATE INDEX IF NOT EXISTS idx_productos_slug ON productos(slug);
CREATE INDEX IF NOT EXISTS idx_organizaciones_slug ON organizaciones(slug);
CREATE INDEX IF NOT EXISTS idx_organizaciones_user ON organizaciones(user_id);

SELECT '✅ SaaS schema migrado exitosamente!' as resultado;
