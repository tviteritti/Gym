-- Mismo ejercicio, historial separado por agarre.
-- Dorsalera y Remo gironda pasan a un solo nombre.
-- Remo gironda alto se borra con sus sesiones.

ALTER TABLE ejercicios
  ADD COLUMN IF NOT EXISTS usa_agarre BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE ejercicios_planificados
  ADD COLUMN IF NOT EXISTS agarre TEXT
  CHECK (agarre IS NULL OR agarre IN ('unilateral', 'corto', 'neutro', 'prono', 'supino'));

ALTER TABLE ejercicios_ejecutados
  ADD COLUMN IF NOT EXISTS agarre TEXT
  CHECK (agarre IS NULL OR agarre IN ('unilateral', 'corto', 'neutro', 'prono', 'supino'));

ALTER TABLE ejercicios_metodo_bilbo
  ADD COLUMN IF NOT EXISTS agarre TEXT
  CHECK (agarre IS NULL OR agarre IN ('unilateral', 'corto', 'neutro', 'prono', 'supino'));

ALTER TABLE progreso_metodo_bilbo
  ADD COLUMN IF NOT EXISTS agarre TEXT
  CHECK (agarre IS NULL OR agarre IN ('unilateral', 'corto', 'neutro', 'prono', 'supino'));

ALTER TABLE ejercicios_metodo_bilbo
  DROP CONSTRAINT IF EXISTS ejercicios_metodo_bilbo_ejercicio_id_usuario_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS ejercicios_metodo_bilbo_usuario_ej_agarre
  ON ejercicios_metodo_bilbo (usuario_id, ejercicio_id, COALESCE(agarre, ''));

DELETE FROM ejercicios_ejecutados
WHERE ejercicio_id IN (SELECT id FROM ejercicios WHERE nombre = 'Remo gironda alto');

DELETE FROM ejercicios_planificados
WHERE ejercicio_id IN (SELECT id FROM ejercicios WHERE nombre = 'Remo gironda alto');

DELETE FROM ejercicios WHERE nombre = 'Remo gironda alto';

DO $$
DECLARE
  keeper uuid;
  src record;
BEGIN
  SELECT id INTO keeper FROM ejercicios WHERE nombre = 'Dorsalera prono';
  IF keeper IS NULL THEN
    RAISE EXCEPTION 'No está Dorsalera prono';
  END IF;

  UPDATE ejercicios_ejecutados SET agarre = 'prono' WHERE ejercicio_id = keeper AND agarre IS NULL;
  UPDATE ejercicios_planificados SET agarre = 'prono' WHERE ejercicio_id = keeper AND agarre IS NULL;
  UPDATE ejercicios_metodo_bilbo SET agarre = 'prono' WHERE ejercicio_id = keeper AND agarre IS NULL;
  UPDATE progreso_metodo_bilbo SET agarre = 'prono' WHERE ejercicio_id = keeper AND agarre IS NULL;

  FOR src IN
    SELECT id,
      CASE nombre
        WHEN 'Dorsalera corto' THEN 'corto'
        WHEN 'Dorsalera neutro' THEN 'neutro'
        WHEN 'Dorsalera supino' THEN 'supino'
      END AS grip
    FROM ejercicios
    WHERE nombre IN ('Dorsalera corto', 'Dorsalera neutro', 'Dorsalera supino')
  LOOP
    UPDATE dias_de_rutina SET ejercicio_bilbo_id = keeper WHERE ejercicio_bilbo_id = src.id;
    UPDATE ejercicios_ejecutados SET ejercicio_id = keeper, agarre = src.grip WHERE ejercicio_id = src.id;
    UPDATE ejercicios_planificados SET ejercicio_id = keeper, agarre = src.grip WHERE ejercicio_id = src.id;
    UPDATE ejercicios_metodo_bilbo SET ejercicio_id = keeper, agarre = src.grip WHERE ejercicio_id = src.id;
    UPDATE progreso_metodo_bilbo SET ejercicio_id = keeper, agarre = src.grip WHERE ejercicio_id = src.id;
    DELETE FROM ejercicios WHERE id = src.id;
  END LOOP;

  UPDATE ejercicios
  SET nombre = 'Dorsalera', usa_agarre = true, grupo_equipo = 'dorsalera'
  WHERE id = keeper;

  SELECT id INTO keeper FROM ejercicios WHERE nombre = 'Remo gironda';
  IF keeper IS NULL THEN
    RAISE EXCEPTION 'No está Remo gironda';
  END IF;

  FOR src IN
    SELECT id,
      CASE nombre
        WHEN 'Remo gironda supino' THEN 'supino'
        WHEN 'Remo gironda unilateral' THEN 'unilateral'
      END AS grip
    FROM ejercicios
    WHERE nombre IN ('Remo gironda supino', 'Remo gironda unilateral')
  LOOP
    UPDATE dias_de_rutina SET ejercicio_bilbo_id = keeper WHERE ejercicio_bilbo_id = src.id;
    UPDATE ejercicios_ejecutados SET ejercicio_id = keeper, agarre = src.grip WHERE ejercicio_id = src.id;
    UPDATE ejercicios_planificados SET ejercicio_id = keeper, agarre = src.grip WHERE ejercicio_id = src.id;
    UPDATE ejercicios_metodo_bilbo SET ejercicio_id = keeper, agarre = src.grip WHERE ejercicio_id = src.id;
    UPDATE progreso_metodo_bilbo SET ejercicio_id = keeper, agarre = src.grip WHERE ejercicio_id = src.id;
    DELETE FROM ejercicios WHERE id = src.id;
  END LOOP;

  UPDATE ejercicios SET usa_agarre = true WHERE id = keeper;
END $$;
