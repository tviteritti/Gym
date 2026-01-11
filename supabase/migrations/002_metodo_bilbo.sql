-- Migración para agregar soporte del Método Bilbo
-- El método Bilbo permite hacer ejercicios al fallo y progresar automáticamente

-- Tabla para configurar qué ejercicios pertenecen al método Bilbo
CREATE TABLE IF NOT EXISTS ejercicios_metodo_bilbo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ejercicio_id UUID NOT NULL REFERENCES ejercicios(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    peso_inicial NUMERIC(5,2) NOT NULL,
    incremento NUMERIC(5,2) NOT NULL CHECK (incremento > 0),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (ejercicio_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_ejercicios_metodo_bilbo_ejercicio_id ON ejercicios_metodo_bilbo(ejercicio_id);
CREATE INDEX IF NOT EXISTS idx_ejercicios_metodo_bilbo_usuario_id ON ejercicios_metodo_bilbo(usuario_id);

-- Tabla para guardar el progreso del método Bilbo
CREATE TABLE IF NOT EXISTS progreso_metodo_bilbo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ejercicio_id UUID NOT NULL REFERENCES ejercicios(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    entrenamiento_id UUID NOT NULL REFERENCES entrenamientos(id) ON DELETE CASCADE,
    peso_actual NUMERIC(5,2) NOT NULL,
    repeticiones INTEGER NOT NULL,
    fecha DATE NOT NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progreso_metodo_bilbo_ejercicio_id_usuario_id ON progreso_metodo_bilbo(ejercicio_id, usuario_id);
CREATE INDEX IF NOT EXISTS idx_progreso_metodo_bilbo_usuario_id ON progreso_metodo_bilbo(usuario_id);
CREATE INDEX IF NOT EXISTS idx_progreso_metodo_bilbo_entrenamiento_id ON progreso_metodo_bilbo(entrenamiento_id);
CREATE INDEX IF NOT EXISTS idx_progreso_metodo_bilbo_fecha ON progreso_metodo_bilbo(fecha DESC);

-- Habilitar Row Level Security
ALTER TABLE ejercicios_metodo_bilbo ENABLE ROW LEVEL SECURITY;
ALTER TABLE progreso_metodo_bilbo ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para ejercicios_metodo_bilbo
CREATE POLICY "Users can view own bilbo exercises" ON ejercicios_metodo_bilbo
    FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert own bilbo exercises" ON ejercicios_metodo_bilbo
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update own bilbo exercises" ON ejercicios_metodo_bilbo
    FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY "Users can delete own bilbo exercises" ON ejercicios_metodo_bilbo
    FOR DELETE USING (auth.uid() = usuario_id);

-- Políticas de seguridad para progreso_metodo_bilbo
CREATE POLICY "Users can view own bilbo progress" ON progreso_metodo_bilbo
    FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert own bilbo progress" ON progreso_metodo_bilbo
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update own bilbo progress" ON progreso_metodo_bilbo
    FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY "Users can delete own bilbo progress" ON progreso_metodo_bilbo
    FOR DELETE USING (auth.uid() = usuario_id);
