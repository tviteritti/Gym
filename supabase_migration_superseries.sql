-- Migración: Agregar soporte para superseries y biseries
-- Ejecutar en Supabase SQL Editor

ALTER TABLE ejercicios_planificados
ADD COLUMN IF NOT EXISTS tipo_agrupacion text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS grupo_agrupacion integer DEFAULT NULL;
