-- Cada aparición del ejercicio en el día es un registro propio.
-- ejercicio_planificado_id ata la carga al slot de la rutina (aunque se reemplace el ejercicio).
-- es_adicional marca los agregados a mano, para no mezclarlos con el plan.

ALTER TABLE ejercicios_ejecutados
  ADD COLUMN IF NOT EXISTS ejercicio_planificado_id UUID REFERENCES ejercicios_planificados(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS es_adicional BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS orden INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ejercicios_ejecutados_planificado
  ON ejercicios_ejecutados (entrenamiento_id, ejercicio_planificado_id)
  WHERE ejercicio_planificado_id IS NOT NULL;
