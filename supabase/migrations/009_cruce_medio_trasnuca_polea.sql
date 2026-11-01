-- Cruce polea (altura vacía) era medio.
-- Trasnuca en polea (barra o soga) queda como soga. La mancuerna no se toca.

UPDATE ejercicios_ejecutados
SET altura = 'medio'
WHERE altura IS NULL
  AND ejercicio_id = (SELECT id FROM ejercicios WHERE nombre = 'Cruce');

UPDATE ejercicios_planificados
SET altura = 'medio'
WHERE altura IS NULL
  AND ejercicio_id = (SELECT id FROM ejercicios WHERE nombre = 'Cruce');

UPDATE ejercicios_ejecutados SET accesorio = 'soga'
WHERE id IN (
  '590cc27e-3759-47eb-98b4-e06680d9df4e',
  '63fb5279-7706-4443-9c48-49d8165ec00f',
  '534fb067-0183-4107-8adf-21e30bc129db',
  'bd3086e7-67d9-4f4e-bf99-b5fe41b57938',
  'ec20c872-3002-40a4-93b1-36f9f0097ffe',
  'a863597a-4ff1-4432-889c-765fd14c282b',
  'e570174e-0b12-443c-9041-6cfed583ef79',
  '068c7cb9-2406-4989-afe8-ea4c82ec50d6'
);

UPDATE ejercicios_ejecutados SET accesorio = 'soga'
WHERE id IN (
  '9ce9972f-c792-4d08-8e32-4c948722ef27',
  'a5766f37-9ea9-47d7-912c-761e53b3b0f5'
);
