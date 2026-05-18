-- =============================================
-- MIGRACION: Auto-sorteo con Quiniela
-- Agrega columnas para manejo de sorteo automatico
-- =============================================

ALTER TABLE productos ADD COLUMN IF NOT EXISTS sorteo_notificado BOOLEAN DEFAULT FALSE;

SELECT 'Listo! Columnas de auto-sorteo agregadas correctamente.' as resultado;
