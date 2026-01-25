import { useState, useEffect, useRef } from 'react';
import { NumberInput } from '../ui/NumberInput';

interface SerieInputProps {
  numeroSerie: number;
  pesoInicial?: number;
  repsInicial?: number;
  onUpdate: (peso: number | undefined, reps: number | undefined) => void;
  disabled?: boolean;
  hasUserInteracted?: boolean;
}

export const SerieInput = ({
  numeroSerie,
  pesoInicial,
  repsInicial,
  onUpdate,
  disabled = false,
  hasUserInteracted = false,
}: SerieInputProps) => {
  const [peso, setPeso] = useState<number | undefined>(pesoInicial);
  const [reps, setReps] = useState<number | undefined>(repsInicial);
  const [userInteracted, setUserInteracted] = useState(false);
  const isInitialized = useRef(false);

  // Solo inicializar valores una vez o cuando no hay interacción del usuario
  useEffect(() => {
    if (!isInitialized.current) {
      setPeso(pesoInicial);
      setReps(repsInicial);
      isInitialized.current = true;
    } else if (!userInteracted && !hasUserInteracted) {
      // Solo actualizar si el usuario no ha interactuado y no hay cambios externos
      if (pesoInicial !== undefined && peso !== pesoInicial) {
        setPeso(pesoInicial);
      }
      if (repsInicial !== undefined && reps !== repsInicial) {
        setReps(repsInicial);
      }
    }
  }, [pesoInicial, repsInicial, userInteracted, hasUserInteracted]);

  const handlePesoChange = (val: string) => {
    if (!userInteracted) setUserInteracted(true);
    const nuevoPeso = val ? parseFloat(val) : undefined;
    setPeso(nuevoPeso);
    onUpdate(nuevoPeso, reps);
  };

  const handleRepsChange = (val: string) => {
    if (!userInteracted) setUserInteracted(true);
    const nuevasReps = val ? parseInt(val) : undefined;
    setReps(nuevasReps);
    onUpdate(peso, nuevasReps);
  };

  // Resetear el estado de interacción cuando se deshabilita
  useEffect(() => {
    if (disabled) {
      setUserInteracted(false);
    }
  }, [disabled]);

  return (
    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 glass-morphism rounded-xl border border-dark-border/50">
      <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-bold text-sm sm:text-base shadow-glow">
        {numeroSerie}
      </div>
      <div className="flex-1 grid grid-cols-2 gap-2 sm:gap-3 min-w-0">
        <NumberInput
          placeholder="Peso"
          value={peso ?? ''}
          onChange={(e) => handlePesoChange(e.target.value)}
          step={0.5}
          min={0}
          disabled={disabled}
          className="text-center text-sm sm:text-base max-w-full"
        />
        <NumberInput
          placeholder="Reps"
          value={reps ?? ''}
          onChange={(e) => handleRepsChange(e.target.value)}
          step={1}
          min={0}
          disabled={disabled}
          className="text-center text-sm sm:text-base max-w-full"
        />
      </div>
    </div>
  );
};

