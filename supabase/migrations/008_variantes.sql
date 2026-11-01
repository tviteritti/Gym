-- Unifica ejercicios que solo cambian de accesorio, postura, altura o unilateral.
-- Borra trasnuca unilateral y el bloque de hombro, con sus sesiones.

ALTER TABLE ejercicios
  ADD COLUMN IF NOT EXISTS usa_postura BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS usa_altura BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS usa_unilateral BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agarres TEXT[],
  ADD COLUMN IF NOT EXISTS accesorios TEXT[],
  ADD COLUMN IF NOT EXISTS maquina_si TEXT[];

ALTER TABLE ejercicios_planificados
  ADD COLUMN IF NOT EXISTS postura TEXT CHECK (postura IS NULL OR postura IN ('parado', 'sentado')),
  ADD COLUMN IF NOT EXISTS altura TEXT CHECK (altura IS NULL OR altura IN ('alto', 'medio', 'bajo')),
  ADD COLUMN IF NOT EXISTS accesorio TEXT,
  ADD COLUMN IF NOT EXISTS unilateral BOOLEAN;

ALTER TABLE ejercicios_ejecutados
  ADD COLUMN IF NOT EXISTS postura TEXT CHECK (postura IS NULL OR postura IN ('parado', 'sentado')),
  ADD COLUMN IF NOT EXISTS altura TEXT CHECK (altura IS NULL OR altura IN ('alto', 'medio', 'bajo')),
  ADD COLUMN IF NOT EXISTS accesorio TEXT,
  ADD COLUMN IF NOT EXISTS unilateral BOOLEAN;

ALTER TABLE ejercicios_metodo_bilbo
  ADD COLUMN IF NOT EXISTS postura TEXT,
  ADD COLUMN IF NOT EXISTS altura TEXT,
  ADD COLUMN IF NOT EXISTS accesorio TEXT;

ALTER TABLE progreso_metodo_bilbo
  ADD COLUMN IF NOT EXISTS postura TEXT,
  ADD COLUMN IF NOT EXISTS altura TEXT,
  ADD COLUMN IF NOT EXISTS accesorio TEXT;

DROP INDEX IF EXISTS ejercicios_metodo_bilbo_usuario_ej_agarre;

DELETE FROM ejercicios_ejecutados
WHERE ejercicio_id IN (SELECT id FROM ejercicios WHERE nombre IN ('Trasnuca unilateral', 'Bloque hombro (histórico)'));
DELETE FROM ejercicios_planificados
WHERE ejercicio_id IN (SELECT id FROM ejercicios WHERE nombre IN ('Trasnuca unilateral', 'Bloque hombro (histórico)'));
DELETE FROM ejercicios WHERE nombre IN ('Trasnuca unilateral', 'Bloque hombro (histórico)');

UPDATE ejercicios_ejecutados x SET agarre = 'corto'
FROM ejercicios e
WHERE e.id = x.ejercicio_id AND e.nombre = 'Remo gironda' AND x.agarre IS NULL;
UPDATE ejercicios_planificados p SET agarre = 'corto'
FROM ejercicios e
WHERE e.id = p.ejercicio_id AND e.nombre = 'Remo gironda' AND p.agarre IS NULL;
UPDATE ejercicios_metodo_bilbo b SET agarre = 'corto'
FROM ejercicios e
WHERE e.id = b.ejercicio_id AND e.nombre = 'Remo gironda' AND b.agarre IS NULL;
UPDATE progreso_metodo_bilbo g SET agarre = 'corto'
FROM ejercicios e
WHERE e.id = g.ejercicio_id AND e.nombre = 'Remo gironda' AND g.agarre IS NULL;

DO $$
DECLARE
  keeper uuid;
  src uuid;
  rec record;
BEGIN
  CREATE TEMP TABLE variantes (
    keeper_nombre TEXT,
    nombre TEXT,
    accesorio TEXT,
    postura TEXT,
    altura TEXT,
    agarre TEXT,
    unilateral BOOLEAN
  ) ON COMMIT DROP;

  INSERT INTO variantes VALUES
    ('Tríceps en polea', 'Barra V', 'barra_v', NULL, NULL, NULL, NULL),
    ('Tríceps en polea', 'Tríceps polea soga', 'soga', NULL, NULL, NULL, NULL),
    ('Tríceps en polea', 'Tríceps polea unilateral', 'unilateral', NULL, NULL, NULL, NULL),
    ('Tríceps en polea', 'Polea tríceps', 'barra', NULL, NULL, NULL, NULL),
    ('Trasnuca', 'Trasnuca', 'mancuerna', NULL, NULL, NULL, NULL),
    ('Trasnuca', 'Polea barra trasnuca', 'barra', NULL, NULL, NULL, NULL),
    ('Trasnuca', 'Polea soga trasnuca', 'soga', NULL, NULL, NULL, NULL),
    ('Anterior', 'Elevación frontal polea', 'soga', NULL, NULL, NULL, NULL),
    ('Anterior', 'Elevación frontal polea unilateral', 'soga_unilateral', NULL, NULL, NULL, NULL),
    ('Anterior', 'Elevación frontal mancuernas', 'mancuerna', NULL, NULL, NULL, NULL),
    ('Anterior', 'Elevación frontal con disco', 'disco', NULL, NULL, NULL, NULL),
    ('Laterales', 'Laterales mancuernas', 'mancuerna', NULL, NULL, NULL, NULL),
    ('Laterales', 'Laterales polea', 'polea', NULL, NULL, NULL, NULL),
    ('Posterior', 'Posterior polea', 'polea', 'parado', NULL, NULL, NULL),
    ('Posterior', 'Posterior mancuerna', 'mancuerna', 'sentado', NULL, NULL, NULL),
    ('Press militar', 'Press militar máquina', 'maquina', 'sentado', NULL, NULL, NULL),
    ('Press militar', 'Press militar mancuerna', 'mancuerna', 'sentado', NULL, NULL, NULL),
    ('Press militar', 'Press militar barra', 'barra', 'sentado', NULL, NULL, NULL),
    ('Cruce', 'Cruce medio', NULL, NULL, 'medio', NULL, NULL),
    ('Cruce', 'Cruce alto', NULL, NULL, 'alto', NULL, NULL),
    ('Cruce', 'Cruce bajo', NULL, NULL, 'bajo', NULL, NULL),
    ('Cruce', 'Cruce polea', NULL, NULL, NULL, NULL, NULL),
    ('Dominada', 'Dominada prona', NULL, NULL, NULL, 'prono', NULL),
    ('Dominada', 'Dominada supino', NULL, NULL, NULL, 'supino', NULL),
    ('Pullover', 'Pullover', NULL, NULL, NULL, NULL, false),
    ('Pullover', 'Pullover unilateral', NULL, NULL, NULL, NULL, true),
    ('Curl martillo', 'Curl martillo', NULL, 'parado', NULL, NULL, NULL),
    ('Curl martillo', 'Curl martillo sentado', NULL, 'sentado', NULL, NULL, NULL),
    ('Curl en polea', 'Curl polea martillo', 'martillo', NULL, NULL, NULL, NULL),
    ('Curl en polea', 'Curl polea barra', 'barra', NULL, NULL, NULL, NULL),
    ('Press inclinado', 'Press inclinado mancuernas', 'mancuernas', NULL, NULL, NULL, NULL),
    ('Press inclinado', 'Press inclinado barra', 'barra', NULL, NULL, NULL, NULL);

  FOR rec IN SELECT * FROM variantes ORDER BY keeper_nombre, nombre LOOP
    SELECT id INTO keeper FROM ejercicios WHERE nombre = rec.keeper_nombre;
    IF keeper IS NULL THEN
      SELECT id INTO keeper FROM ejercicios WHERE nombre = (
        SELECT nombre FROM variantes WHERE keeper_nombre = rec.keeper_nombre ORDER BY nombre LIMIT 1
      );
    END IF;
    IF keeper IS NULL THEN
      RAISE EXCEPTION 'Sin base para %', rec.keeper_nombre;
    END IF;

    SELECT id INTO src FROM ejercicios WHERE nombre = rec.nombre;
    IF src IS NULL THEN
      RAISE EXCEPTION 'No está %', rec.nombre;
    END IF;

    UPDATE ejercicios_ejecutados SET
      ejercicio_id = keeper,
      accesorio = COALESCE(rec.accesorio, accesorio),
      postura = COALESCE(rec.postura, postura),
      altura = COALESCE(rec.altura, altura),
      agarre = COALESCE(rec.agarre, agarre),
      unilateral = COALESCE(rec.unilateral, unilateral)
    WHERE ejercicio_id = src;

    UPDATE ejercicios_planificados SET
      ejercicio_id = keeper,
      accesorio = COALESCE(rec.accesorio, accesorio),
      postura = COALESCE(rec.postura, postura),
      altura = COALESCE(rec.altura, altura),
      agarre = COALESCE(rec.agarre, agarre),
      unilateral = COALESCE(rec.unilateral, unilateral)
    WHERE ejercicio_id = src;

    UPDATE dias_de_rutina SET ejercicio_bilbo_id = keeper WHERE ejercicio_bilbo_id = src AND src <> keeper;

    UPDATE ejercicios_metodo_bilbo SET
      ejercicio_id = keeper,
      accesorio = COALESCE(rec.accesorio, accesorio),
      postura = COALESCE(rec.postura, postura),
      altura = COALESCE(rec.altura, altura),
      agarre = COALESCE(rec.agarre, agarre)
    WHERE ejercicio_id = src;

    UPDATE progreso_metodo_bilbo SET
      ejercicio_id = keeper,
      accesorio = COALESCE(rec.accesorio, accesorio),
      postura = COALESCE(rec.postura, postura),
      altura = COALESCE(rec.altura, altura),
      agarre = COALESCE(rec.agarre, agarre)
    WHERE ejercicio_id = src;

    IF src <> keeper THEN
      DELETE FROM ejercicios WHERE id = src;
    END IF;

    UPDATE ejercicios SET nombre = rec.keeper_nombre WHERE id = keeper;
  END LOOP;
END $$;

UPDATE ejercicios SET
  grupo_equipo = 'polea',
  accesorios = ARRAY['barra', 'barra_v', 'soga', 'unilateral']
WHERE nombre = 'Tríceps en polea';

UPDATE ejercicios SET
  grupo_equipo = NULL,
  accesorios = ARRAY['mancuerna', 'barra', 'soga'],
  maquina_si = ARRAY['barra', 'soga']
WHERE nombre = 'Trasnuca';

UPDATE ejercicios SET
  usa_postura = true,
  accesorios = ARRAY['disco', 'mancuerna', 'barra', 'soga', 'soga_unilateral'],
  maquina_si = ARRAY['barra', 'soga', 'soga_unilateral']
WHERE nombre = 'Anterior';

UPDATE ejercicios SET
  usa_postura = true,
  accesorios = ARRAY['mancuerna', 'polea'],
  maquina_si = ARRAY['polea']
WHERE nombre = 'Laterales';

UPDATE ejercicios SET
  usa_postura = true,
  accesorios = ARRAY['mancuerna', 'polea'],
  maquina_si = ARRAY['polea']
WHERE nombre = 'Posterior';

UPDATE ejercicios SET
  usa_postura = true,
  accesorios = ARRAY['barra', 'mancuerna', 'maquina']
WHERE nombre = 'Press militar';

UPDATE ejercicios SET
  grupo_equipo = 'polea',
  usa_altura = true
WHERE nombre = 'Cruce';

UPDATE ejercicios SET
  usa_agarre = true,
  agarres = ARRAY['prono', 'supino']
WHERE nombre = 'Dominada';

UPDATE ejercicios SET usa_unilateral = true WHERE nombre IN ('Pullover', 'Curl scot unilateral', 'Curl unilateral mancuernas', 'Remo mancuerna', 'Tríceps katana');

UPDATE ejercicios SET usa_postura = true WHERE nombre = 'Curl martillo';

UPDATE ejercicios SET
  grupo_equipo = 'polea',
  accesorios = ARRAY['barra', 'martillo']
WHERE nombre = 'Curl en polea';

UPDATE ejercicios SET accesorios = ARRAY['barra', 'mancuernas'] WHERE nombre = 'Press inclinado';

UPDATE ejercicios_ejecutados x SET unilateral = true
FROM ejercicios e
WHERE e.id = x.ejercicio_id AND e.nombre IN ('Curl scot unilateral', 'Curl unilateral mancuernas') AND x.unilateral IS NULL;
UPDATE ejercicios_planificados p SET unilateral = true
FROM ejercicios e
WHERE e.id = p.ejercicio_id AND e.nombre IN ('Curl scot unilateral', 'Curl unilateral mancuernas') AND p.unilateral IS NULL;

UPDATE ejercicios SET nombre = 'Remo mancuerna', usa_unilateral = true WHERE nombre = 'Remo unilateral mancuerna';
UPDATE ejercicios_ejecutados x SET unilateral = true
FROM ejercicios e WHERE e.id = x.ejercicio_id AND e.nombre = 'Remo mancuerna' AND x.unilateral IS NULL;
UPDATE ejercicios_planificados p SET unilateral = true
FROM ejercicios e WHERE e.id = p.ejercicio_id AND e.nombre = 'Remo mancuerna' AND p.unilateral IS NULL;

UPDATE ejercicios_ejecutados x SET unilateral = false
FROM ejercicios e WHERE e.id = x.ejercicio_id AND e.nombre = 'Tríceps katana' AND x.unilateral IS NULL;
UPDATE ejercicios_planificados p SET unilateral = false
FROM ejercicios e WHERE e.id = p.ejercicio_id AND e.nombre = 'Tríceps katana' AND p.unilateral IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ejercicios_metodo_bilbo_usuario_ej_var
  ON ejercicios_metodo_bilbo (
    usuario_id,
    ejercicio_id,
    COALESCE(agarre, ''),
    COALESCE(accesorio, ''),
    COALESCE(postura, ''),
    COALESCE(altura, '')
  );
