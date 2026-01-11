import { useState, useEffect } from 'react';
import { NumberInput } from '../ui/NumberInput';

interface SerieInputProps {
  numeroSerie: number;
  pesoInicial?: number;
  repsInicial?: number;
  onUpdate: (peso: number | undefined, reps: number | undefined) => void;
  disabled?: boolean;
}

export const SerieInput = ({
  numeroSerie,
  pesoInicial,
  repsInicial,
  onUpdate,
  disabled = false,
}: SerieInputProps) => {
  const [peso, setPeso] = useState<number | undefined>(pesoInicial);
  const [reps, setReps] = useState<number | undefined>(repsInicial);

  const handlePesoChange = (val: string) => {
    const nuevoPeso = val ? parseFloat(val) : undefined;
    setPeso(nuevoPeso);
    onUpdate(nuevoPeso, reps);
  };

  const handleRepsChange = (val: string) => {
    const nuevasReps = val ? parseInt(val) : undefined;
    setReps(nuevasReps);
    onUpdate(peso, nuevasReps);
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-dark-surface rounded-lg border border-dark-border">
      <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-dark-accent text-white rounded-full font-bold text-sm sm:text-base">
        {numeroSerie}
      </div>
      <div className="flex-1 grid grid-cols-2 gap-2 sm:gap-3 min-w-0">
        <NumberInput
          placeholder="Peso"
          value={peso ?? ''}
          onChange={(e) => handlePesoChange(e.target.value)}
          step="0.5"
          min="0"
          disabled={disabled}
          className="text-center text-sm sm:text-base max-w-full"
        />
        <NumberInput
          placeholder="Reps"
          value={reps ?? ''}
          onChange={(e) => handleRepsChange(e.target.value)}
          step="1"
          min="0"
          disabled={disabled}
          className="text-center text-sm sm:text-base max-w-full"
        />
      </div>
    </div>
  );
};

