-- Agregar columna ejercicio_bilbo_id a la tabla dias_de_rutina
ALTER TABLE dias_de_rutina 
ADD COLUMN ejercicio_bilbo_id UUID REFERENCES ejercicios(id);

-- Agregar columnas a ejercicios_planificados
ALTER TABLE ejercicios_planificados 
ADD COLUMN es_bilbo BOOLEAN DEFAULT FALSE,
ADD COLUMN rango_repeticiones_min INTEGER,
ADD COLUMN rango_repeticiones_max INTEGER;

-- Agregar columnas a series_planificadas
ALTER TABLE series_planificadas 
ADD COLUMN rango_repeticiones_min INTEGER,
ADD COLUMN rango_repeticiones_max INTEGER;

-- Crear índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_dias_de_rutina_ejercicio_bilbo_id 
ON dias_de_rutina(ejercicio_bilbo_id);