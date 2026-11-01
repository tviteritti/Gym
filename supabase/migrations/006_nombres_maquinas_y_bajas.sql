-- Nombres reales de máquinas y limpieza de ejercicios pedida a mano.
-- Liviana/Pesada son etiquetas: no había sesiones en esas filas, salvo Discos.

UPDATE maquinas SET nombre = 'Liviana', orden = 1
WHERE grupo = 'dorsalera' AND nombre = 'Dorsalera 1';
UPDATE maquinas SET nombre = 'Pesada', orden = 2
WHERE grupo = 'dorsalera' AND nombre = 'Dorsalera 2';

UPDATE maquinas SET nombre = 'Liviana', orden = 1
WHERE grupo = 'polea' AND nombre = 'Placas';
UPDATE maquinas SET nombre = 'Pesada', orden = 2
WHERE grupo = 'polea' AND nombre = 'Polea 3';
UPDATE maquinas SET orden = 3
WHERE grupo = 'polea' AND nombre = 'Discos';

UPDATE ejercicios SET nombre = 'Antebrazo barra en polea prono' WHERE nombre = 'Antebrazo barra en polea';
UPDATE ejercicios SET nombre = 'Antebrazo rotación barra' WHERE nombre = 'Antebrazo rotación';
UPDATE ejercicios SET nombre = 'Curl scot unilateral' WHERE nombre = 'Curl scott';
UPDATE ejercicios SET nombre = 'Elevaciones de piernas' WHERE nombre = 'Elevaciones';
UPDATE ejercicios SET nombre = 'Gemelos de pie' WHERE nombre = 'Gemelos';
UPDATE ejercicios SET nombre = 'Remo gironda' WHERE nombre = 'Remo shirondo';
UPDATE ejercicios SET nombre = 'Remo gironda alto' WHERE nombre = 'Remo shirondo alto';
UPDATE ejercicios SET nombre = 'Remo gironda supino' WHERE nombre = 'Remo shirondo supino';
UPDATE ejercicios SET nombre = 'Remo gironda unilateral' WHERE nombre = 'Remo shirondo unilateral';

DELETE FROM ejercicios_ejecutados
WHERE ejercicio_id IN (
  SELECT id FROM ejercicios WHERE nombre IN ('Antebrazo', 'Sostener mancuernas', 'Colgarse')
);

DELETE FROM ejercicios_planificados
WHERE ejercicio_id IN (
  SELECT id FROM ejercicios WHERE nombre IN ('Antebrazo', 'Sostener mancuernas', 'Colgarse')
);

DELETE FROM ejercicios
WHERE nombre IN ('Antebrazo', 'Sostener mancuernas', 'Colgarse');
