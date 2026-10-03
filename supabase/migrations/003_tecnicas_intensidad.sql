-- Técnicas de intensidad (drop-set, rest-pause, FST-7)
-- Las series de la técnica se registran aparte (es_compleja) y no cuentan como series normales.

ALTER TABLE ejercicios_planificados
ADD COLUMN IF NOT EXISTS tecnica_intensidad text DEFAULT NULL
    CHECK (tecnica_intensidad IN ('dropset', 'restpause', 'fst7')),
ADD COLUMN IF NOT EXISTS tecnica_series integer DEFAULT NULL
    CHECK (tecnica_series BETWEEN 1 AND 20);

ALTER TABLE series_ejecutadas
ADD COLUMN IF NOT EXISTS es_compleja boolean NOT NULL DEFAULT false;

ALTER TABLE series_ejecutadas
DROP CONSTRAINT IF EXISTS series_ejecutadas_ejercicio_ejecutado_id_numero_serie_key;

ALTER TABLE series_ejecutadas
ADD CONSTRAINT series_ejecutadas_ejecutado_compleja_numero_key
    UNIQUE (ejercicio_ejecutado_id, es_compleja, numero_serie);

DROP TRIGGER IF EXISTS on_serie_ejecutada_insert ON series_ejecutadas;
CREATE TRIGGER on_serie_ejecutada_insert
    AFTER INSERT ON series_ejecutadas
    FOR EACH ROW
    WHEN (NOT NEW.es_compleja)
    EXECUTE FUNCTION public.update_records_on_serie_insert();
