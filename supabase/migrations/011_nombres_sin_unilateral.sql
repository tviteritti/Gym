-- El nombre no dice unilateral. El selector sí/no cubre esa variante.

UPDATE ejercicios SET nombre = 'Curl scot', usa_unilateral = true WHERE nombre = 'Curl scot unilateral';
UPDATE ejercicios SET nombre = 'Curl mancuernas', usa_unilateral = true WHERE nombre = 'Curl unilateral mancuernas';
UPDATE ejercicios SET nombre = 'Remo polea sentado', usa_unilateral = true WHERE nombre = 'Remo polea sentado unilateral';

UPDATE ejercicios_ejecutados x SET unilateral = true
FROM ejercicios e
WHERE e.id = x.ejercicio_id AND e.nombre = 'Remo polea sentado' AND x.unilateral IS NULL;

UPDATE ejercicios_planificados p SET unilateral = true
FROM ejercicios e
WHERE e.id = p.ejercicio_id AND e.nombre = 'Remo polea sentado' AND p.unilateral IS NULL;
