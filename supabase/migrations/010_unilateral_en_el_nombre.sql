-- El nombre ya dice unilateral. No hace falta el selector sí/no.

UPDATE ejercicios
SET usa_unilateral = false
WHERE nombre IN ('Curl scot unilateral', 'Curl unilateral mancuernas');
