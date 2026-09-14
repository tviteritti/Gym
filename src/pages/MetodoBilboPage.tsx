import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { useAuthStore } from '../store/authStore';
import { bilboService } from '../services/bilboService';
import { ejercicioService } from '../services/ejercicioService';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
import { getMuscleColorWithDefault } from '../constants/muscleColors';
import { formatFechaNumericaEs, parseDecimal, parseIntegerInput } from '../utils/formatters';
import { calcularProximoPesoBilbo } from '../utils/bilbo';
import type { EjercicioMetodoBilbo, ProgresoMetodoBilbo, Ejercicio } from '../types';

interface EjercicioBilboConProgreso extends EjercicioMetodoBilbo {
  ultimoProgreso?: ProgresoMetodoBilbo | null;
  repsProximoPeso?: number | null;
}

export const MetodoBilboPage = () => {
  const { usuario } = useAuthStore();
  const [ejerciciosBilbo, setEjerciciosBilbo] = useState<EjercicioBilboConProgreso[]>([]);
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [selectedEjercicio, setSelectedEjercicio] = useState<EjercicioMetodoBilbo | null>(null);
  const [historial, setHistorial] = useState<ProgresoMetodoBilbo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCargarProgreso, setShowCargarProgreso] = useState(false);
  const [fechaProgreso, setFechaProgreso] = useState('');
  const [pesoProgreso, setPesoProgreso] = useState<number>(0);
  const [repsProgreso, setRepsProgreso] = useState<number>(0);
  const [savingProgreso, setSavingProgreso] = useState(false);
  const [errorProgreso, setErrorProgreso] = useState('');
  const [showEditConfig, setShowEditConfig] = useState(false);
  const [editPesoInicial, setEditPesoInicial] = useState(0);
  const [editIncremento, setEditIncremento] = useState(2.5);
  const [savingEdit, setSavingEdit] = useState(false);
  const [errorEdit, setErrorEdit] = useState('');
  const [reiniciando, setReiniciando] = useState(false);
  const navigate = useNavigate();
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    
    if (usuario) {
      loadEjerciciosBilbo();
    }
  }, [usuario]);

  const loadEjerciciosBilbo = async (opts?: { silent?: boolean }) => {
    if (!usuario) return;
    try {
      if (!opts?.silent) setLoading(true);
      const [data, ejerciciosData] = await Promise.all([
        bilboService.getAll(usuario.id),
        ejercicioService.getAll(),
      ]);
      
      setEjercicios(ejerciciosData);
      
      // Cargar último progreso y reps del próximo peso para cada ejercicio
      const ejerciciosConProgreso = await Promise.all(
        data.map(async (ejercicio) => {
          const ultimoProgreso = await bilboService
            .getUltimoProgreso(usuario.id, ejercicio.ejercicioId)
            .catch(() => null);
          
          const proximoPeso = calcularProximoPesoBilbo(ejercicio, ultimoProgreso) ?? ejercicio.pesoInicial;
          
          // Buscar registro anterior con ese peso (ignorar reinicios con 0 reps)
          let repsProximoPeso: number | null = null;
          if (ultimoProgreso) {
            try {
              const historialCompleto = await bilboService.getHistorialProgreso(usuario.id, ejercicio.ejercicioId);
              const registroAnterior = historialCompleto.find(
                p => p.pesoActual === proximoPeso && p.id !== ultimoProgreso.id && p.repeticiones > 0
              );
              if (registroAnterior) {
                repsProximoPeso = registroAnterior.repeticiones;
              }
            } catch (error) {
              // Ignorar errores
            }
          }
          
          return { ...ejercicio, ultimoProgreso, repsProximoPeso };
        })
      );
      
      setEjerciciosBilbo(ejerciciosConProgreso);
    } catch (error) {
      console.error('Error al cargar ejercicios del método Bilbo:', error);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const handleViewHistorial = async (ejercicio: EjercicioMetodoBilbo) => {
    if (!usuario) return;
    try {
      const historialData = await bilboService.getHistorialProgreso(usuario.id, ejercicio.ejercicioId);
      setHistorial(historialData);
      setSelectedEjercicio(ejercicio);
      setShowEditConfig(false);
      setShowCargarProgreso(false);
      setErrorEdit('');
      setErrorProgreso('');
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  };

  const getPesoSiguiente = (ejercicio: EjercicioMetodoBilbo): number => {
    const ultimoProgreso = historial.length > 0 ? historial[0] : null;
    return calcularProximoPesoBilbo(ejercicio, ultimoProgreso) ?? ejercicio.pesoInicial;
  };

  const puedeReiniciar = (ejercicio: EjercicioMetodoBilbo): boolean => {
    return getPesoSiguiente(ejercicio) !== ejercicio.pesoInicial;
  };

  const startEditConfig = () => {
    if (!selectedEjercicio) return;
    setEditPesoInicial(selectedEjercicio.pesoInicial);
    setEditIncremento(selectedEjercicio.incremento);
    setShowEditConfig(true);
    setErrorEdit('');
  };

  const handleGuardarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !selectedEjercicio || editPesoInicial <= 0 || editIncremento <= 0) {
      setErrorEdit('Por favor completa todos los campos correctamente');
      return;
    }

    setSavingEdit(true);
    setErrorEdit('');

    try {
      await bilboService.update(usuario.id, selectedEjercicio.ejercicioId, {
        pesoInicial: editPesoInicial,
        incremento: editIncremento,
      });

      const actualizado: EjercicioMetodoBilbo = {
        ...selectedEjercicio,
        pesoInicial: editPesoInicial,
        incremento: editIncremento,
      };
      setSelectedEjercicio(actualizado);
      setShowEditConfig(false);
      await loadEjerciciosBilbo({ silent: true });
    } catch (err) {
      setErrorEdit(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleReiniciarCiclo = async () => {
    if (!usuario || !selectedEjercicio) return;
    if (!confirm(
      '¿Reiniciar el ciclo? El próximo peso volverá al peso inicial. El historial se conserva; solo se marca el fin del ciclo actual.'
    )) {
      return;
    }

    setReiniciando(true);
    try {
      await bilboService.reiniciarCiclo(usuario.id, selectedEjercicio.ejercicioId);
      const historialData = await bilboService.getHistorialProgreso(
        usuario.id,
        selectedEjercicio.ejercicioId
      );
      setHistorial(historialData);
      await loadEjerciciosBilbo({ silent: true });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al reiniciar el ciclo');
    } finally {
      setReiniciando(false);
    }
  };

  // Agrupar historial por peso para vista comparativa
  const historialAgrupadoPorPeso = () => {
    if (!selectedEjercicio || historial.length === 0) return [];

    // Agrupar por peso
    const agrupado = new Map<number, ProgresoMetodoBilbo[]>();
    
    historial.forEach((progreso) => {
      const peso = progreso.pesoActual;
      if (!agrupado.has(peso)) {
        agrupado.set(peso, []);
      }
      agrupado.get(peso)!.push(progreso);
    });

    // Convertir a array y ordenar por peso (de mayor a menor)
    return Array.from(agrupado.entries())
      .map(([peso, progresos]) => ({
        peso,
        progresos: progresos.sort((a, b) => b.fecha.localeCompare(a.fecha)), // Más reciente primero
      }))
      .sort((a, b) => b.peso - a.peso); // Peso mayor primero
  };

  const handleCargarProgreso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !selectedEjercicio || !fechaProgreso || pesoProgreso <= 0 || repsProgreso <= 0) {
      setErrorProgreso('Por favor completa todos los campos correctamente');
      return;
    }

    setSavingProgreso(true);
    setErrorProgreso('');

    try {
      await bilboService.guardarProgresoHistorico(
        usuario.id,
        selectedEjercicio.ejercicioId,
        pesoProgreso,
        repsProgreso,
        fechaProgreso
      );
      
      // Recargar historial
      const historialData = await bilboService.getHistorialProgreso(usuario.id, selectedEjercicio.ejercicioId);
      setHistorial(historialData);
      await loadEjerciciosBilbo({ silent: true });
      
      // Limpiar formulario
      setFechaProgreso('');
      setPesoProgreso(0);
      setRepsProgreso(0);
      setShowCargarProgreso(false);
    } catch (err) {
      setErrorProgreso(err instanceof Error ? err.message : 'Error al guardar progreso');
    } finally {
      setSavingProgreso(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-dark-text-muted">Cargando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-dark-bg p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Método Bilbo
            </h1>
            <Button onClick={() => navigate('/bilbo/configurar')} variant="outline">
              Configurar Ejercicios
            </Button>
          </div>

          {selectedEjercicio ? (
            <div>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedEjercicio(null);
                  setHistorial([]);
                  setShowEditConfig(false);
                  setShowCargarProgreso(false);
                }}
                className="mb-4"
              >
                ← Volver
              </Button>
              <Card 
                className="mb-6"
                style={(() => {
                  const ejercicio = ejercicios.find(e => e.id === selectedEjercicio.ejercicioId);
                  const color = ejercicio ? getMuscleColorWithDefault(ejercicio.musculoPrincipal) : 'transparent';
                  return {
                    borderLeftColor: color !== 'transparent' ? color : undefined,
                    borderLeftWidth: color !== 'transparent' ? '4px' : undefined,
                  };
                })()}
              >
                <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                  <h2 className="text-2xl font-bold text-dark-text">
                    {selectedEjercicio.ejercicioNombre}
                  </h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={startEditConfig}>
                      Editar
                    </Button>
                    {puedeReiniciar(selectedEjercicio) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReiniciarCiclo}
                        disabled={reiniciando}
                      >
                        {reiniciando ? 'Reiniciando...' : 'Reiniciar peso'}
                      </Button>
                    )}
                  </div>
                </div>

                {showEditConfig ? (
                  <form onSubmit={handleGuardarConfig} className="mb-4 p-4 bg-dark-surface rounded-lg border border-dark-border space-y-4">
                    <h4 className="font-semibold text-dark-text">Editar configuración</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <NumberInput
                        label="Peso Inicial (kg) *"
                        value={editPesoInicial}
                        onChange={(e) => setEditPesoInicial(parseDecimal(e.target.value) ?? 0)}
                        min={0}
                        step={0.5}
                        required
                        fullWidth
                      />
                      <div>
                        <label className="block text-sm font-medium text-dark-text mb-2">
                          Incremento (kg) *
                        </label>
                        <select
                          value={editIncremento}
                          onChange={(e) => setEditIncremento(parseFloat(e.target.value))}
                          required
                          className="w-full px-4 py-3 bg-white border border-dark-border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-dark-accent"
                        >
                          <option value={2.5}>2.5 kg</option>
                          <option value={5}>5 kg</option>
                        </select>
                      </div>
                    </div>
                    {errorEdit && (
                      <div className="p-3 bg-red-600/20 border border-red-600/30 rounded-lg text-red-400 text-sm">
                        {errorEdit}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={savingEdit}>
                        {savingEdit ? 'Guardando...' : 'Guardar'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEditConfig(false)}
                        disabled={savingEdit}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                    <div>
                      <p className="text-sm text-dark-text-muted">Peso Inicial</p>
                      <p className="text-2xl font-bold text-dark-text">
                        {selectedEjercicio.pesoInicial} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-dark-text-muted">Incremento</p>
                      <p className="text-2xl font-bold text-dark-text">
                        +{selectedEjercicio.incremento} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-dark-text-muted">Último Peso</p>
                      <p className="text-2xl font-bold text-dark-text">
                        {historial.length > 0 && historial[0].repeticiones > 0
                          ? `${historial[0].pesoActual} kg`
                          : historial.length > 1
                          ? `${historial[1].pesoActual} kg`
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-dark-text-muted">Próximo Peso</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {getPesoSiguiente(selectedEjercicio)} kg
                      </p>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-dark-text">Historial de Progreso</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCargarProgreso(!showCargarProgreso)}
                  >
                    {showCargarProgreso ? 'Cancelar' : '+ Cargar Progreso'}
                  </Button>
                </div>

                {showCargarProgreso && (
                  <form onSubmit={handleCargarProgreso} className="mb-6 p-4 bg-dark-surface rounded-lg border border-dark-border space-y-4">
                    <h4 className="font-semibold text-dark-text mb-2">Cargar Progreso Histórico</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-dark-text mb-2">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        value={fechaProgreso}
                        onChange={(e) => setFechaProgreso(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-white border border-dark-border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-dark-accent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <NumberInput
                        label="Peso (kg) *"
                        value={pesoProgreso}
                        onChange={(e) => setPesoProgreso(parseDecimal(e.target.value) ?? 0)}
                        min={0}
                        step={0.5}
                        required
                        fullWidth
                      />

                      <NumberInput
                        label="Repeticiones *"
                        value={repsProgreso}
                        onChange={(e) => setRepsProgreso(parseIntegerInput(e.target.value) ?? 0)}
                        min={1}
                        step={1}
                        required
                        fullWidth
                      />
                    </div>

                    {errorProgreso && (
                      <div className="p-3 bg-red-600/20 border border-red-600/30 rounded-lg text-red-400 text-sm">
                        {errorProgreso}
                      </div>
                    )}

                    <Button type="submit" fullWidth disabled={savingProgreso}>
                      {savingProgreso ? 'Guardando...' : 'Guardar Progreso'}
                    </Button>
                  </form>
                )}
              </Card>

              <Card>
                <h3 className="text-xl font-bold mb-4 text-dark-text">Historial de Progreso (Vista Comparativa)</h3>
                {historial.length === 0 ? (
                  <p className="text-center text-dark-text-muted py-8">
                    No hay registros de progreso aún.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {historialAgrupadoPorPeso().map((grupo) => {
                      const esPesoInicial = grupo.peso === selectedEjercicio.pesoInicial;
                      const progresosConReps = grupo.progresos.filter(p => p.repeticiones > 0);
                      const mejorReps = progresosConReps.length > 0
                        ? Math.max(...progresosConReps.map(p => p.repeticiones))
                        : 0;
                      const primeraFecha = grupo.progresos[grupo.progresos.length - 1].fecha;
                      const ultimaFecha = grupo.progresos[0].fecha;
                      
                      return (
                        <div
                          key={grupo.peso}
                          className="p-4 rounded-lg border border-dark-border bg-dark-surface"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="text-lg font-bold text-dark-text mb-1">
                                {grupo.peso} kg
                                {esPesoInicial && (
                                  <span className="ml-2 text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                                    Peso Inicial
                                  </span>
                                )}
                              </h4>
                              <p className="text-sm text-dark-text-muted">
                                {grupo.progresos.length} {grupo.progresos.length === 1 ? 'registro' : 'registros'}
                                {grupo.progresos.length > 1 && (
                                  <span className="ml-2">
                                    ({formatFechaNumericaEs(primeraFecha, { day: '2-digit', month: '2-digit' })} - {formatFechaNumericaEs(ultimaFecha, { day: '2-digit', month: '2-digit' })})
                                  </span>
                                )}
                              </p>
                            </div>
                            {mejorReps > 0 && (
                              <div className="text-right">
                                <p className="text-sm text-dark-text-muted">Mejor</p>
                                <p className="text-xl font-bold text-green-400">
                                  {mejorReps} reps
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-dark-text-muted mb-2 flex-wrap">
                              <span>Evolución:</span>
                              {grupo.progresos.map((progreso, idx) => {
                                const esReinicio = progreso.repeticiones === 0;
                                const esMejor = !esReinicio && progreso.repeticiones === mejorReps;
                                const esUltimo = idx === 0;
                                const mejoraAnterior =
                                  !esReinicio &&
                                  idx > 0 &&
                                  grupo.progresos[idx - 1].repeticiones > 0 &&
                                  progreso.repeticiones > grupo.progresos[idx - 1].repeticiones;
                                
                                return (
                                  <div
                                    key={progreso.id}
                                    className={`flex items-center gap-1 px-2 py-1 rounded ${
                                      esReinicio
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : esMejor
                                        ? 'bg-green-500/20 text-green-400 font-bold'
                                        : progreso.repeticiones < 15
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-dark-hover text-dark-text'
                                    }`}
                                    title={
                                      esReinicio
                                        ? `${formatFechaNumericaEs(progreso.fecha)}: Reinicio de ciclo`
                                        : `${formatFechaNumericaEs(progreso.fecha)}: ${progreso.repeticiones} reps`
                                    }
                                  >
                                    <span>{esReinicio ? 'Reinicio' : progreso.repeticiones}</span>
                                    {mejoraAnterior && <span className="text-green-400">↑</span>}
                                    {esUltimo && <span className="text-xs ml-1">(último)</span>}
                                  </div>
                                );
                              })}
                            </div>
                            
                            <details className="mt-3">
                              <summary className="cursor-pointer text-sm text-dark-text-muted hover:text-dark-text">
                                Ver detalles por fecha
                              </summary>
                              <div className="mt-2 space-y-2 pl-4 border-l-2 border-dark-border">
                                {grupo.progresos.map((progreso) => {
                                  const esReinicio = progreso.repeticiones === 0;
                                  return (
                                    <div
                                      key={progreso.id}
                                      className="flex justify-between items-center text-sm"
                                    >
                                      <span className="text-dark-text-muted">
                                        {formatFechaNumericaEs(progreso.fecha)}
                                      </span>
                                      <span
                                        className={`font-semibold ${
                                          esReinicio
                                            ? 'text-amber-400'
                                            : progreso.repeticiones < 15
                                            ? 'text-red-400'
                                            : progreso.repeticiones === mejorReps
                                            ? 'text-green-400'
                                            : 'text-dark-text'
                                        }`}
                                      >
                                        {esReinicio ? 'Reinicio' : `${progreso.repeticiones} reps`}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </details>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          ) : (
            <div>
              {ejerciciosBilbo.length === 0 ? (
                <Card>
                  <div className="text-center py-12">
                    <p className="text-dark-text-muted mb-4">
                      No tienes ejercicios configurados para el método Bilbo.
                    </p>
                    <Button onClick={() => navigate('/bilbo/configurar')}>
                      Configurar Ejercicios
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {ejerciciosBilbo.map((ejercicio) => {
                    const ultimoProgreso = ejercicio.ultimoProgreso;
                    const ejercicioInfo = ejercicios.find(e => e.id === ejercicio.ejercicioId);
                    const color = ejercicioInfo ? getMuscleColorWithDefault(ejercicioInfo.musculoPrincipal) : 'transparent';
                    
                    // Calcular próximo peso
                    const proximoPeso = calcularProximoPesoBilbo(ejercicio, ultimoProgreso ?? null) ?? ejercicio.pesoInicial;
                    
                    const repsAnteriores = ejercicio.repsProximoPeso;
                    
                    return (
                      <div
                        key={ejercicio.id}
                        onClick={() => handleViewHistorial(ejercicio)}
                        className="cursor-pointer"
                      >
                        <Card
                          className="hover:border-dark-accent transition-colors"
                          style={{
                            borderLeftColor: color !== 'transparent' ? color : undefined,
                            borderLeftWidth: color !== 'transparent' ? '4px' : undefined,
                          }}
                        >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-dark-text mb-2">
                              {ejercicio.ejercicioNombre}
                            </h3>
                            <div className="flex items-center gap-4 text-sm">
                              <div>
                                <p className="text-dark-text-muted">Próximo Peso</p>
                                <p className="text-lg font-bold text-blue-400">
                                  {proximoPeso} kg
                                </p>
                                {repsAnteriores !== null && repsAnteriores !== undefined && (
                                  <p className="text-xs text-dark-text-muted mt-1">
                                    Anterior: {repsAnteriores} reps
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="ml-4"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewHistorial(ejercicio);
                            }}
                          >
                            Ver Historial
                          </Button>
                        </div>
                      </Card>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
