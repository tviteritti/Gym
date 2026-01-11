-- Migración inicial del esquema de base de datos para Gym Tracker
-- Adaptado de SQL Server (.NET) a PostgreSQL (Supabase)

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de Usuarios (se integra con Supabase Auth)
-- Nota: La autenticación se manejará con Supabase Auth, pero necesitamos una tabla
-- para almacenar información adicional del usuario si es necesario
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de Músculos
CREATE TABLE IF NOT EXISTS musculos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL UNIQUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_musculos_nombre ON musculos(nombre);

-- Tabla de Ejercicios
CREATE TABLE IF NOT EXISTS ejercicios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL UNIQUE,
    musculo_principal_id UUID NOT NULL REFERENCES musculos(id) ON DELETE RESTRICT,
    descripcion TEXT,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ejercicios_nombre ON ejercicios(nombre);
CREATE INDEX IF NOT EXISTS idx_ejercicios_musculo_principal_id ON ejercicios(musculo_principal_id);

-- Tabla de relación muchos a muchos: Ejercicios - Músculos Secundarios
CREATE TABLE IF NOT EXISTS ejercicio_musculos_secundarios (
    ejercicio_id UUID NOT NULL REFERENCES ejercicios(id) ON DELETE CASCADE,
    musculo_id UUID NOT NULL REFERENCES musculos(id) ON DELETE CASCADE,
    PRIMARY KEY (ejercicio_id, musculo_id)
);

CREATE INDEX IF NOT EXISTS idx_ejercicio_musculos_secundarios_musculo_id ON ejercicio_musculos_secundarios(musculo_id);

-- Tabla de Rutinas
CREATE TABLE IF NOT EXISTS rutinas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    activa BOOLEAN NOT NULL DEFAULT false,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rutinas_usuario_id ON rutinas(usuario_id);

-- Tabla de Días de Rutina
CREATE TABLE IF NOT EXISTS dias_de_rutina (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rutina_id UUID NOT NULL REFERENCES rutinas(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (rutina_id, dia_semana)
);

CREATE INDEX IF NOT EXISTS idx_dias_de_rutina_rutina_id ON dias_de_rutina(rutina_id);

-- Tabla de Ejercicios Planificados
CREATE TABLE IF NOT EXISTS ejercicios_planificados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dia_de_rutina_id UUID NOT NULL REFERENCES dias_de_rutina(id) ON DELETE CASCADE,
    ejercicio_id UUID NOT NULL REFERENCES ejercicios(id) ON DELETE RESTRICT,
    orden INTEGER NOT NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (dia_de_rutina_id, orden)
);

CREATE INDEX IF NOT EXISTS idx_ejercicios_planificados_dia_de_rutina_id ON ejercicios_planificados(dia_de_rutina_id);
CREATE INDEX IF NOT EXISTS idx_ejercicios_planificados_ejercicio_id ON ejercicios_planificados(ejercicio_id);

-- Tabla de Series Planificadas
CREATE TABLE IF NOT EXISTS series_planificadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ejercicio_planificado_id UUID NOT NULL REFERENCES ejercicios_planificados(id) ON DELETE CASCADE,
    numero_serie INTEGER NOT NULL,
    peso_planificado NUMERIC(5,2),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (ejercicio_planificado_id, numero_serie)
);

CREATE INDEX IF NOT EXISTS idx_series_planificadas_ejercicio_planificado_id ON series_planificadas(ejercicio_planificado_id);

-- Tabla de Entrenamientos
CREATE TABLE IF NOT EXISTS entrenamientos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (usuario_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_entrenamientos_usuario_id_fecha ON entrenamientos(usuario_id, fecha);

-- Tabla de Ejercicios Ejecutados
CREATE TABLE IF NOT EXISTS ejercicios_ejecutados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entrenamiento_id UUID NOT NULL REFERENCES entrenamientos(id) ON DELETE CASCADE,
    ejercicio_id UUID NOT NULL REFERENCES ejercicios(id) ON DELETE RESTRICT,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ejercicios_ejecutados_entrenamiento_id ON ejercicios_ejecutados(entrenamiento_id);
CREATE INDEX IF NOT EXISTS idx_ejercicios_ejecutados_ejercicio_id ON ejercicios_ejecutados(ejercicio_id);

-- Tabla de Series Ejecutadas
CREATE TABLE IF NOT EXISTS series_ejecutadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ejercicio_ejecutado_id UUID NOT NULL REFERENCES ejercicios_ejecutados(id) ON DELETE CASCADE,
    numero_serie INTEGER NOT NULL,
    peso_real NUMERIC(5,2),
    repeticiones INTEGER,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (ejercicio_ejecutado_id, numero_serie)
);

CREATE INDEX IF NOT EXISTS idx_series_ejecutadas_ejercicio_ejecutado_id ON series_ejecutadas(ejercicio_ejecutado_id);

-- Tabla de Records por Ejercicio
CREATE TABLE IF NOT EXISTS records_por_ejercicio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ejercicio_id UUID NOT NULL REFERENCES ejercicios(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    max_peso NUMERIC(5,2) NOT NULL,
    reps_max INTEGER NOT NULL,
    fecha DATE NOT NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (ejercicio_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_records_por_ejercicio_ejercicio_id_usuario_id ON records_por_ejercicio(ejercicio_id, usuario_id);
CREATE INDEX IF NOT EXISTS idx_records_por_ejercicio_usuario_id ON records_por_ejercicio(usuario_id);

-- Habilitar Row Level Security en todas las tablas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE musculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejercicio_musculos_secundarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE rutinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE dias_de_rutina ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejercicios_planificados ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_planificadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrenamientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejercicios_ejecutados ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_ejecutadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE records_por_ejercicio ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad (RLS)
-- Usuarios: solo pueden ver/editar su propio registro
CREATE POLICY "Users can view own data" ON usuarios
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON usuarios
    FOR UPDATE USING (auth.uid() = id);

-- Músculos: lectura pública, escritura autenticada
CREATE POLICY "Muscles are viewable by everyone" ON musculos
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert muscles" ON musculos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Ejercicios: lectura pública, escritura autenticada
CREATE POLICY "Exercises are viewable by everyone" ON ejercicios
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert exercises" ON ejercicios
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Ejercicio músculos secundarios: lectura pública
CREATE POLICY "Exercise secondary muscles are viewable by everyone" ON ejercicio_musculos_secundarios
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage exercise secondary muscles" ON ejercicio_musculos_secundarios
    FOR ALL USING (auth.role() = 'authenticated');

-- Rutinas: solo el propietario puede ver/editar
CREATE POLICY "Users can view own routines" ON rutinas
    FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert own routines" ON rutinas
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update own routines" ON rutinas
    FOR UPDATE USING (auth.uid() = usuario_id);

-- Días de rutina: solo el propietario de la rutina
CREATE POLICY "Users can manage days of own routines" ON dias_de_rutina
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rutinas 
            WHERE rutinas.id = dias_de_rutina.rutina_id 
            AND rutinas.usuario_id = auth.uid()
        )
    );

-- Ejercicios planificados: solo el propietario de la rutina
CREATE POLICY "Users can manage planned exercises of own routines" ON ejercicios_planificados
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM dias_de_rutina
            JOIN rutinas ON rutinas.id = dias_de_rutina.rutina_id
            WHERE dias_de_rutina.id = ejercicios_planificados.dia_de_rutina_id
            AND rutinas.usuario_id = auth.uid()
        )
    );

-- Series planificadas: solo el propietario de la rutina
CREATE POLICY "Users can manage planned series of own routines" ON series_planificadas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM ejercicios_planificados
            JOIN dias_de_rutina ON dias_de_rutina.id = ejercicios_planificados.dia_de_rutina_id
            JOIN rutinas ON rutinas.id = dias_de_rutina.rutina_id
            WHERE ejercicios_planificados.id = series_planificadas.ejercicio_planificado_id
            AND rutinas.usuario_id = auth.uid()
        )
    );

-- Entrenamientos: solo el propietario
CREATE POLICY "Users can view own trainings" ON entrenamientos
    FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert own trainings" ON entrenamientos
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update own trainings" ON entrenamientos
    FOR UPDATE USING (auth.uid() = usuario_id);

-- Ejercicios ejecutados: solo el propietario del entrenamiento
CREATE POLICY "Users can manage executed exercises of own trainings" ON ejercicios_ejecutados
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM entrenamientos
            WHERE entrenamientos.id = ejercicios_ejecutados.entrenamiento_id
            AND entrenamientos.usuario_id = auth.uid()
        )
    );

-- Series ejecutadas: solo el propietario del entrenamiento
CREATE POLICY "Users can manage executed series of own trainings" ON series_ejecutadas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM ejercicios_ejecutados
            JOIN entrenamientos ON entrenamientos.id = ejercicios_ejecutados.entrenamiento_id
            WHERE ejercicios_ejecutados.id = series_ejecutadas.ejercicio_ejecutado_id
            AND entrenamientos.usuario_id = auth.uid()
        )
    );

-- Records: solo el propietario
CREATE POLICY "Users can view own records" ON records_por_ejercicio
    FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert own records" ON records_por_ejercicio
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update own records" ON records_por_ejercicio
    FOR UPDATE USING (auth.uid() = usuario_id);

-- Función para crear automáticamente el registro de usuario cuando se registra en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (id, email, fecha_creacion)
    VALUES (NEW.id, NEW.email, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para ejecutar la función cuando se crea un nuevo usuario en auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función para actualizar records cuando se insertan series ejecutadas
CREATE OR REPLACE FUNCTION public.update_records_on_serie_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id UUID;
    v_ejercicio_id UUID;
    v_peso NUMERIC;
    v_reps INTEGER;
    v_fecha DATE;
    v_existing_record RECORD;
BEGIN
    -- Obtener usuario_id, ejercicio_id y fecha desde las tablas relacionadas
    SELECT 
        e.usuario_id,
        ej_ej.ejercicio_id,
        e.fecha
    INTO 
        v_usuario_id,
        v_ejercicio_id,
        v_fecha
    FROM ejercicios_ejecutados ej_ej
    JOIN entrenamientos e ON e.id = ej_ej.entrenamiento_id
    WHERE ej_ej.id = NEW.ejercicio_ejecutado_id;

    -- Si no se encontró información, salir
    IF v_usuario_id IS NULL OR v_ejercicio_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_peso := NEW.peso_real;
    v_reps := NEW.repeticiones;

    -- Si no hay peso ni repeticiones, no hacer nada
    IF v_peso IS NULL AND v_reps IS NULL THEN
        RETURN NEW;
    END IF;

    -- Buscar si ya existe un record para este ejercicio y usuario
    SELECT * INTO v_existing_record
    FROM records_por_ejercicio
    WHERE ejercicio_id = v_ejercicio_id AND usuario_id = v_usuario_id;

    -- Si no existe record, crear uno
    IF NOT FOUND THEN
        INSERT INTO records_por_ejercicio (ejercicio_id, usuario_id, max_peso, reps_max, fecha)
        VALUES (
            v_ejercicio_id,
            v_usuario_id,
            COALESCE(v_peso, 0),
            COALESCE(v_reps, 0),
            v_fecha
        );
    ELSE
        -- Si existe, actualizar si el nuevo peso o reps son mayores
        IF (v_peso IS NOT NULL AND (v_existing_record.max_peso IS NULL OR v_peso > v_existing_record.max_peso)) OR
           (v_reps IS NOT NULL AND (v_existing_record.reps_max IS NULL OR v_reps > v_existing_record.reps_max)) THEN
            UPDATE records_por_ejercicio
            SET 
                max_peso = GREATEST(COALESCE(v_peso, 0), COALESCE(v_existing_record.max_peso, 0)),
                reps_max = GREATEST(COALESCE(v_reps, 0), COALESCE(v_existing_record.reps_max, 0)),
                fecha = v_fecha
            WHERE ejercicio_id = v_ejercicio_id AND usuario_id = v_usuario_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para actualizar records al insertar series ejecutadas
CREATE TRIGGER on_serie_ejecutada_insert
    AFTER INSERT ON series_ejecutadas
    FOR EACH ROW EXECUTE FUNCTION public.update_records_on_serie_insert();
