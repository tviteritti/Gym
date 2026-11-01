-- Máquina (dorsalera o polea) para trackear el mismo ejercicio con pesos distintos.
-- También estandariza nombres y pliega los duplicados marcados como "discos".

CREATE TABLE IF NOT EXISTS maquinas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    grupo TEXT NOT NULL CHECK (grupo IN ('dorsalera', 'polea')),
    orden INTEGER NOT NULL,
    UNIQUE (grupo, nombre)
);

ALTER TABLE ejercicios
    ADD COLUMN IF NOT EXISTS grupo_equipo TEXT
    CHECK (grupo_equipo IS NULL OR grupo_equipo IN ('dorsalera', 'polea'));

ALTER TABLE ejercicios_ejecutados
    ADD COLUMN IF NOT EXISTS maquina_id UUID REFERENCES maquinas(id) ON DELETE SET NULL;

ALTER TABLE maquinas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Machines are viewable by everyone" ON maquinas;
CREATE POLICY "Machines are viewable by everyone" ON maquinas
    FOR SELECT USING (true);

INSERT INTO maquinas (nombre, grupo, orden) VALUES
    ('Dorsalera 1', 'dorsalera', 1),
    ('Dorsalera 2', 'dorsalera', 2),
    ('Placas', 'polea', 1),
    ('Discos', 'polea', 2),
    ('Polea 3', 'polea', 3)
ON CONFLICT (grupo, nombre) DO NOTHING;

INSERT INTO musculos (nombre) VALUES ('Aductores'), ('Tibial')
ON CONFLICT (nombre) DO NOTHING;

UPDATE ejercicios SET nombre = 'Curl martillo sentado' WHERE nombre = 'curl martillo sentado';
UPDATE ejercicios SET nombre = 'Curl scott' WHERE nombre = 'Curl scot';
UPDATE ejercicios SET nombre = 'Apertura inclinada mancuernas' WHERE nombre = 'apertura inclinado mancuerna';
UPDATE ejercicios SET nombre = 'Mariposa' WHERE nombre = 'pecho mariposa';
UPDATE ejercicios SET nombre = 'Polea soga trasnuca' WHERE nombre = 'polea soga trasnuca';
UPDATE ejercicios SET nombre = 'Tríceps katana' WHERE nombre = 'tricep katana';
UPDATE ejercicios SET nombre = 'Máquina de remo' WHERE nombre = 'Maquina remo';
UPDATE ejercicios SET nombre = 'Sóleo sentado' WHERE nombre = 'Soleo sentado';
UPDATE ejercicios SET nombre = 'Sentadilla hack' WHERE nombre = 'Hack';
UPDATE ejercicios SET nombre = 'Peso muerto rumano' WHERE nombre = 'Rumano';
UPDATE ejercicios SET nombre = 'Remo T contracción' WHERE nombre = 'Remo T contracción ';
UPDATE ejercicios SET nombre = 'Aductores / abductores' WHERE nombre = 'Aductor/Abe ductor';
UPDATE ejercicios SET nombre = 'Elevación frontal polea' WHERE nombre = 'Anterior polea';
UPDATE ejercicios SET nombre = 'Elevación frontal polea unilateral' WHERE nombre = 'Anterior polea unilateral';
UPDATE ejercicios SET nombre = 'Elevación frontal mancuernas' WHERE nombre = 'Frontales mancuernas';
UPDATE ejercicios SET nombre = 'Bloque hombro (histórico)' WHERE nombre = 'Super serie Hombro';
UPDATE ejercicios SET nombre = 'Polea tríceps' WHERE nombre = 'Polea tricep discos';
UPDATE ejercicios SET nombre = 'Cruce polea' WHERE nombre = 'Cruce polea disco';

UPDATE ejercicios
SET musculo_principal_id = (SELECT id FROM musculos WHERE nombre = 'Aductores')
WHERE nombre = 'Aductores / abductores';

UPDATE ejercicios
SET musculo_principal_id = (SELECT id FROM musculos WHERE nombre = 'Tibial')
WHERE nombre = 'Tibial';

-- El ejercicio "discos" es el mismo movimiento en la polea de discos.
DO $$
DECLARE
    disco uuid;
    src uuid;
    dest uuid;
    par record;
BEGIN
    SELECT id INTO disco FROM maquinas WHERE grupo = 'polea' AND nombre = 'Discos';

    FOR par IN
        SELECT * FROM (VALUES
            ('Barra v discos', 'Barra V'),
            ('Tricep soga discos', 'Tríceps polea soga'),
            ('Cruce bajo discos', 'Cruce bajo')
        ) AS t(origen, destino)
    LOOP
        SELECT id INTO src FROM ejercicios WHERE nombre = par.origen;
        SELECT id INTO dest FROM ejercicios WHERE nombre = par.destino;
        IF src IS NULL OR dest IS NULL THEN
            CONTINUE;
        END IF;

        UPDATE ejercicios_planificados SET ejercicio_id = dest WHERE ejercicio_id = src;
        UPDATE ejercicios_ejecutados
        SET ejercicio_id = dest, maquina_id = disco
        WHERE ejercicio_id = src;
        DELETE FROM ejercicios WHERE id = src;
    END LOOP;

    UPDATE ejercicios_ejecutados ee
    SET maquina_id = disco
    FROM ejercicios e
    WHERE ee.ejercicio_id = e.id
      AND e.nombre IN ('Polea tríceps', 'Cruce polea')
      AND ee.maquina_id IS NULL;
END $$;

UPDATE ejercicios SET grupo_equipo = 'dorsalera'
WHERE nombre ILIKE 'Dorsalera %';

UPDATE ejercicios SET grupo_equipo = 'polea'
WHERE grupo_equipo IS NULL
  AND (
    nombre ILIKE '%polea%'
    OR nombre ILIKE 'Cruce %'
    OR nombre IN ('Barra V', 'Trasnuca', 'Trasnuca unilateral', 'Face pull')
  );

DELETE FROM ejercicios e
WHERE e.nombre IN ('Colgarse', 'Press frances')
  AND NOT EXISTS (SELECT 1 FROM ejercicios_planificados p WHERE p.ejercicio_id = e.id)
  AND NOT EXISTS (SELECT 1 FROM ejercicios_ejecutados x WHERE x.ejercicio_id = e.id);
