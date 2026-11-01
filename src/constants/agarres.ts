export const AGARRES = ['unilateral', 'corto', 'neutro', 'prono', 'supino'] as const;

export type Agarre = (typeof AGARRES)[number];

export const ETIQUETA_AGARRE: Record<Agarre, string> = {
  unilateral: 'Unilateral',
  corto: 'Corto',
  neutro: 'Neutro',
  prono: 'Prono',
  supino: 'Supino',
};

export function esAgarre(valor: unknown): valor is Agarre {
  return typeof valor === 'string' && (AGARRES as readonly string[]).includes(valor);
}
