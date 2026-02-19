-- =====================================================
-- PASO 0: Migración - Agregar columnas de superseries
-- (Solo ejecutar si no se ha hecho antes)
-- =====================================================
ALTER TABLE ejercicios_planificados
ADD COLUMN IF NOT EXISTS tipo_agrupacion text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS grupo_agrupacion integer DEFAULT NULL;

-- =====================================================
-- PASO 1: Crear ejercicios faltantes
-- =====================================================
INSERT INTO ejercicios (id, nombre, musculo_principal_id) VALUES
  ('30000000-0000-0000-0000-000000000007', 'Remo unilateral mancuerna', '00000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000011', 'Frontales mancuernas',      '00000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000004', 'Press corto',               '00000000-0000-0000-0000-000000000006'),
  ('60000000-0000-0000-0000-000000000005', 'Barra V',                   '00000000-0000-0000-0000-000000000006')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PASO 2: Crear la rutina completa
-- =====================================================
DO $$
DECLARE
  v_uid uuid;
  v_rid uuid;
  v_did uuid;
  v_eid uuid;
BEGIN
  SELECT id INTO v_uid FROM usuarios LIMIT 1;

  -- Desactivar rutinas activas
  UPDATE rutinas SET activa = false WHERE usuario_id = v_uid AND activa = true;

  -- Crear la rutina
  INSERT INTO rutinas (nombre, usuario_id, activa)
  VALUES ('Mi Rutina 5 Días', v_uid, true)
  RETURNING id INTO v_rid;

  -- ============================================================
  -- LUNES (1) - Espalda + Trapecio + Antebrazo
  -- ============================================================
  INSERT INTO dias_de_rutina (rutina_id, dia_semana)
  VALUES (v_rid, 1) RETURNING id INTO v_did;

  -- 1. Dorsalera corto x4
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '1cff2050-8433-4a7d-a8e3-e8afb35438d7', 1) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3),(v_eid,4);

  -- 2. Remo T x3 (BISERIE grupo 1)
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden, tipo_agrupacion, grupo_agrupacion)
  VALUES (v_did, '1af5fa8c-5646-4156-afa7-a8984f0b593a', 2, 'biserie', 1) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3);

  -- 3. Remo unilateral mancuerna x3 (BISERIE grupo 1)
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden, tipo_agrupacion, grupo_agrupacion)
  VALUES (v_did, '30000000-0000-0000-0000-000000000007', 3, 'biserie', 1) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3);

  -- 4. Remo shirondo unilateral x3
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '54a667aa-960a-409a-bbb8-a2b5763b934c', 4) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3);

  -- 5. Pullover unilateral x3
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '663ab168-f1f6-418c-a5a4-62ab7bbd33b3', 5) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3);

  -- 6. Posterior polea x3
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '10000000-0000-0000-0000-000000000005', 6) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3);

  -- 7. Trapecio mancuerna x3
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '20000000-0000-0000-0000-000000000001', 7) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3);

  -- 8. Antebrazo x3
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '70000000-0000-0000-0000-000000000001', 8) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3);

  -- ============================================================
  -- MARTES (2) - Hombros + Tríceps
  -- ============================================================
  INSERT INTO dias_de_rutina (rutina_id, dia_semana)
  VALUES (v_rid, 2) RETURNING id INTO v_did;

  -- 1. Press militar máquina x3
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '10000000-0000-0000-0000-000000000001', 1) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3);

  -- 2. Laterales mancuernas x2 (SUPERSERIE grupo 1)
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden, tipo_agrupacion, grupo_agrupacion)
  VALUES (v_did, '10000000-0000-0000-0000-000000000004', 2, 'superserie', 1) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2);

  -- 3. Press militar mancuerna x2 (SUPERSERIE grupo 1)
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden, tipo_agrupacion, grupo_agrupacion)
  VALUES (v_did, '10000000-0000-0000-0000-000000000003', 3, 'superserie', 1) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2);

  -- 4. Posterior mancuerna x2 (SUPERSERIE grupo 1) [vuelos]
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden, tipo_agrupacion, grupo_agrupacion)
  VALUES (v_did, '10000000-0000-0000-0000-000000000010', 4, 'superserie', 1) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2);

  -- 5. Frontales mancuernas x2 (SUPERSERIE grupo 1)
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden, tipo_agrupacion, grupo_agrupacion)
  VALUES (v_did, '10000000-0000-0000-0000-000000000011', 5, 'superserie', 1) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2);

  -- 6. Laterales mancuernas x5 (standalone, aislamiento extra)
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '10000000-0000-0000-0000-000000000004', 6) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3),(v_eid,4),(v_eid,5);

  -- 7. Laterales polea x5
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '10000000-0000-0000-0000-000000000007', 7) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3),(v_eid,4),(v_eid,5);

  -- 8. Press corto x3 (tríceps)
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '60000000-0000-0000-0000-000000000004', 8) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3);

  -- 9. Trasnuca x3
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '60000000-0000-0000-0000-000000000002', 9) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3);

  -- 10. Barra V x3 (tríceps)
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '60000000-0000-0000-0000-000000000005', 10) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3);

  -- ============================================================
  -- MIÉRCOLES (3) - Piernas
  -- ============================================================
  INSERT INTO dias_de_rutina (rutina_id, dia_semana)
  VALUES (v_rid, 3) RETURNING id INTO v_did;

  -- 1. Extensiones cuádriceps 4x15
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden, rango_repeticiones_min, rango_repeticiones_max)
  VALUES (v_did, '80000000-0000-0000-0000-000000000003', 1, 15, 15) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie, rango_repeticiones_min, rango_repeticiones_max)
  VALUES (v_eid,1,15,15),(v_eid,2,15,15),(v_eid,3,15,15),(v_eid,4,15,15);

  -- 2. Prensa inclinada 4x15
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden, rango_repeticiones_min, rango_repeticiones_max)
  VALUES (v_did, '80000000-0000-0000-0000-000000000002', 2, 15, 15) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie, rango_repeticiones_min, rango_repeticiones_max)
  VALUES (v_eid,1,15,15),(v_eid,2,15,15),(v_eid,3,15,15),(v_eid,4,15,15);

  -- 3. Curl femoral tumbado 4x12
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden, rango_repeticiones_min, rango_repeticiones_max)
  VALUES (v_did, '90000000-0000-0000-0000-000000000001', 3, 12, 12) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie, rango_repeticiones_min, rango_repeticiones_max)
  VALUES (v_eid,1,12,12),(v_eid,2,12,12),(v_eid,3,12,12),(v_eid,4,12,12);

  -- 4. Soleo sentado 4x15 (BISERIE grupo 1)
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden, tipo_agrupacion, grupo_agrupacion, rango_repeticiones_min, rango_repeticiones_max)
  VALUES (v_did, 'a0000000-0000-0000-0000-000000000002', 4, 'biserie', 1, 15, 15) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie, rango_repeticiones_min, rango_repeticiones_max)
  VALUES (v_eid,1,15,15),(v_eid,2,15,15),(v_eid,3,15,15),(v_eid,4,15,15);

  -- 5. Tibial 4x15 (BISERIE grupo 1)
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden, tipo_agrupacion, grupo_agrupacion, rango_repeticiones_min, rango_repeticiones_max)
  VALUES (v_did, '99703ae5-a99c-4110-9eea-7cb55ef61871', 5, 'biserie', 1, 15, 15) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie, rango_repeticiones_min, rango_repeticiones_max)
  VALUES (v_eid,1,15,15),(v_eid,2,15,15),(v_eid,3,15,15),(v_eid,4,15,15);

  -- 6. Gemelos 2x15
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden, rango_repeticiones_min, rango_repeticiones_max)
  VALUES (v_did, 'a0000000-0000-0000-0000-000000000001', 6, 15, 15) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie, rango_repeticiones_min, rango_repeticiones_max)
  VALUES (v_eid,1,15,15),(v_eid,2,15,15);

  -- ============================================================
  -- JUEVES (4) - Espalda + Hombros
  -- ============================================================
  INSERT INTO dias_de_rutina (rutina_id, dia_semana)
  VALUES (v_rid, 4) RETURNING id INTO v_did;

  -- 1. Dorsalera corto x4
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '1cff2050-8433-4a7d-a8e3-e8afb35438d7', 1) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3),(v_eid,4);

  -- 2. Máquina remo x3 (BISERIE grupo 1)
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden, tipo_agrupacion, grupo_agrupacion)
  VALUES (v_did, '30e914e7-cfd3-4971-a9e6-2882d8706539', 2, 'biserie', 1) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3);

  -- 3. Remo unilateral mancuerna x3 (BISERIE grupo 1)
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden, tipo_agrupacion, grupo_agrupacion)
  VALUES (v_did, '30000000-0000-0000-0000-000000000007', 3, 'biserie', 1) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3);

  -- 4. Pullover x3
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '30000000-0000-0000-0000-000000000004', 4) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3);

  -- 5. Press militar máquina x3
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '10000000-0000-0000-0000-000000000001', 5) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3);

  -- 6. Laterales mancuernas x4
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '10000000-0000-0000-0000-000000000004', 6) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3),(v_eid,4);

  -- 7. Laterales polea x4
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '10000000-0000-0000-0000-000000000007', 7) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3),(v_eid,4);

  -- 8. Vuelos (Posterior mancuerna) x3
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '10000000-0000-0000-0000-000000000010', 8) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3);

  -- 9. Trapecio mancuerna x3
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '20000000-0000-0000-0000-000000000001', 9) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3);

  -- ============================================================
  -- SÁBADO (6) - Pecho + Bíceps
  -- ============================================================
  INSERT INTO dias_de_rutina (rutina_id, dia_semana)
  VALUES (v_rid, 6) RETURNING id INTO v_did;

  -- 1. Press banca plano barra x4
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '40000000-0000-0000-0000-000000000001', 1) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3),(v_eid,4);

  -- 2. Press inclinado mancuernas x3
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '40000000-0000-0000-0000-000000000002', 2) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3);

  -- 3. Cruce bajo (unilateral) x2
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '40000000-0000-0000-0000-000000000003', 3) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2);

  -- 4. Cruce medio x2
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '40000000-0000-0000-0000-000000000006', 4) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2);

  -- 5. Curl scot (scott unilateral) x4
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '50000000-0000-0000-0000-000000000001', 5) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3),(v_eid,4);

  -- 6. Curl bayesian x3
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, 'd6d81cd8-49fd-49a9-ac2c-503ea0f6bcbd', 6) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3);

  -- 7. Curl martillo x3
  INSERT INTO ejercicios_planificados (dia_de_rutina_id, ejercicio_id, orden)
  VALUES (v_did, '50000000-0000-0000-0000-000000000002', 7) RETURNING id INTO v_eid;
  INSERT INTO series_planificadas (ejercicio_planificado_id, numero_serie)
  VALUES (v_eid,1),(v_eid,2),(v_eid,3);

  RAISE NOTICE 'Rutina creada exitosamente con ID: %', v_rid;
END $$;
