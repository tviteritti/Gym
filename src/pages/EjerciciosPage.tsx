import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Layout } from '../components/layout/Layout';
import { useAuthStore } from '../store/authStore';
import { ejercicioService } from '../services/ejercicioService';
import { entrenamientoService } from '../services/entrenamientoService';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { SerieInput } from '../components/features/SerieInput';
import type { Ejercicio, HistorialEjercicio, SerieEjecutada } from '../types';
import { calcularRM, formatFechaNumericaEs } from '../utils/formatters';
import { getMuscleColorWithDefault } from '../constants/muscleColors';

const chartTooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#e2e8f0',
};

export const EjerciciosPage = () => {
  const { usuario } = useAuthStore();
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [selectedEjercicio, setSelectedEjercicio] = useState<HistorialEjercicio | null>(null);
  const [loading, setLoading] = useState(true);
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [musculoFiltro, setMusculoFiltro] = useState('');
  const [editingEntrenamientoId, setEditingEntrenamientoId] = useState<string | null>(null);
  const [editSeries, setEditSeries] = useState<SerieEjecutada[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const navigate = useNavigate();
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    loadEjercicios();
  }, []);

  const loadEjercicios = async () => {
    try {
      setLoading(true);
      const data = await ejercicioService.getAll();
      setEjercicios(data);
    } catch (error) {
      console.error('Error al cargar ejercicios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = async (ejercicioId: string) => {
    if (!usuario) return;
    try {
      const historial = await ejercicioService.getHistorial(ejercicioId, usuario.id);
      setSelectedEjercicio(historial);
      setEditingEntrenamientoId(null);
      setEditSeries([]);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  };

  const handleStartEdit = (entrenamientoId: string, series: SerieEjecutada[]) => {
    setEditingEntrenamientoId(entrenamientoId);
    setEditSeries(series.map((s) => ({ ...s })));
  };

  const handleCancelEdit = () => {
    setEditingEntrenamientoId(null);
    setEditSeries([]);
  };

  const handleSerieEditUpdate = (
    numeroSerie: number,
    peso: number | undefined,
    reps: number | undefined
  ) => {
    setEditSeries((prev) =>
      prev.map((s) =>
        s.numeroSerie === numeroSerie
          ? { ...s, pesoReal: peso, repeticiones: reps }
          : s
      )
    );
  };

  const handleSaveEdit = async () => {
    if (!usuario || !selectedEjercicio || !editingEntrenamientoId) return;

    try {
      setSavingEdit(true);
      await entrenamientoService.registerExerciseExecution({
        entrenamientoId: editingEntrenamientoId,
        ejercicioId: selectedEjercicio.ejercicioId,
        series: editSeries.map((s) => ({
          numeroSerie: s.numeroSerie,
          pesoReal: s.pesoReal,
          repeticiones: s.repeticiones,
        })),
      });

      await handleViewHistory(selectedEjercicio.ejercicioId);
    } catch (error) {
      console.error('Error al guardar registro:', error);
      alert(error instanceof Error ? error.message : 'Error al guardar el registro');
    } finally {
      setSavingEdit(false);
    }
  };

  const musculosOpciones = useMemo(() => {
    const set = new Set(ejercicios.map((e) => e.musculoPrincipal).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [ejercicios]);

  const ejerciciosFiltrados = useMemo(() => {
    const q = textoBusqueda.trim().toLowerCase();
    return ejercicios.filter((e) => {
      const matchNombre = !q || e.nombre.toLowerCase().includes(q);
      const matchMusculo = !musculoFiltro || e.musculoPrincipal === musculoFiltro;
      return matchNombre && matchMusculo;
    });
  }, [ejercicios, textoBusqueda, musculoFiltro]);

  const datosGraficoPeso = useMemo(() => {
    if (!selectedEjercicio) return [];
    return [...selectedEjercicio.ejecuciones]
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((e) => {
        let maxP = 0;
        for (const s of e.seriesEjecutadas) {
          if (s.pesoReal != null) maxP = Math.max(maxP, s.pesoReal);
        }
        return {
          fecha: e.fecha,
          label: formatFechaNumericaEs(e.fecha, { day: '2-digit', month: 'short' }),
          kg: maxP,
        };
      })
      .filter((d) => d.kg > 0);
  }, [selectedEjercicio]);

  const datosGraficoRm = useMemo(() => {
    if (!selectedEjercicio) return [];
    return [...selectedEjercicio.ejecuciones]
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((e) => {
        let maxRm = 0;
        for (const s of e.seriesEjecutadas) {
          if (s.pesoReal != null && s.repeticiones != null) {
            maxRm = Math.max(maxRm, calcularRM(s.pesoReal, s.repeticiones));
          }
        }
        return {
          fecha: e.fecha,
          label: formatFechaNumericaEs(e.fecha, { day: '2-digit', month: 'short' }),
          rm: Math.round(maxRm * 10) / 10,
        };
      })
      .filter((d) => d.rm > 0);
  }, [selectedEjercicio]);

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
              Ejercicios
            </h1>
          </div>
          <div className="mb-6">
            <Button onClick={() => navigate('/ejercicios/crear')} size="lg" fullWidth>
              Crear Nuevo Ejercicio
            </Button>
          </div>

          {selectedEjercicio ? (
            <div>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedEjercicio(null);
                  handleCancelEdit();
                }}
                className="mb-4"
              >
                ← Volver
              </Button>
              <Card>
                <h2 className="text-2xl font-bold mb-4 text-dark-text">{selectedEjercicio.ejercicioNombre}</h2>

                {selectedEjercicio.record && (
                  <div className="mb-6 p-4 bg-dark-accent/20 rounded-lg border border-dark-accent/30">
                    <h3 className="font-semibold text-dark-accent mb-2">Record Personal</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-dark-text-muted">Máximo Peso</p>
                        <p className="text-2xl font-bold text-dark-text">{selectedEjercicio.record.maxPeso} kg</p>
                      </div>
                      <div>
                        <p className="text-sm text-dark-text-muted">Máximas Reps</p>
                        <p className="text-2xl font-bold text-dark-text">{selectedEjercicio.record.repsMax}</p>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-xs text-dark-text-muted mb-4">
                  En los gráficos, por sesión: peso = máximo entre series; RM = máximo RM estimado (Epley) entre series con
                  peso y reps.
                </p>

                <div className="grid gap-6 mb-8 md:grid-cols-1">
                  <div>
                    <h4 className="text-sm font-semibold text-dark-text mb-2">Peso máximo por sesión</h4>
                    {datosGraficoPeso.length === 0 ? (
                      <p className="text-sm text-dark-text-muted">No hay datos de peso para graficar.</p>
                    ) : (
                      <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={datosGraficoPeso} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                            <XAxis
                              dataKey="label"
                              stroke="#94a3b8"
                              tick={{ fill: '#94a3b8', fontSize: 11 }}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              stroke="#94a3b8"
                              tick={{ fill: '#94a3b8', fontSize: 11 }}
                              width={40}
                              label={{ value: 'kg', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                            />
                            <Tooltip
                              contentStyle={chartTooltipStyle}
                              formatter={(v) => [`${Number(v)} kg`, 'Máx.']}
                              labelFormatter={(label, payload) => {
                                const fecha = (payload?.[0]?.payload as { fecha?: string })?.fecha;
                                return fecha ? formatFechaNumericaEs(fecha) : String(label);
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="kg"
                              name="Peso (kg)"
                              stroke="#818cf8"
                              strokeWidth={2}
                              dot={{ r: 3, fill: '#818cf8' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-dark-text mb-2">RM máximo por sesión</h4>
                    {datosGraficoRm.length === 0 ? (
                      <p className="text-sm text-dark-text-muted">No hay datos de RM para graficar.</p>
                    ) : (
                      <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={datosGraficoRm} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                            <XAxis
                              dataKey="label"
                              stroke="#94a3b8"
                              tick={{ fill: '#94a3b8', fontSize: 11 }}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              stroke="#94a3b8"
                              tick={{ fill: '#94a3b8', fontSize: 11 }}
                              width={40}
                              label={{ value: 'RM', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                            />
                            <Tooltip
                              contentStyle={chartTooltipStyle}
                              formatter={(v) => [`${Number(v)} kg`, 'RM máx.']}
                              labelFormatter={(label, payload) => {
                                const fecha = (payload?.[0]?.payload as { fecha?: string })?.fecha;
                                return fecha ? formatFechaNumericaEs(fecha) : String(label);
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="rm"
                              name="RM (kg)"
                              stroke="#34d399"
                              strokeWidth={2}
                              dot={{ r: 3, fill: '#34d399' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-4 text-dark-text">Historial</h3>
                <div className="space-y-4">
                  {selectedEjercicio.ejecuciones.map((ejecucion, idx) => {
                    const isEditing = editingEntrenamientoId === ejecucion.entrenamientoId;
                    return (
                      <div
                        key={`${ejecucion.entrenamientoId}-${idx}`}
                        className="border-b border-dark-border pb-4"
                      >
                        <div className="flex justify-between items-center gap-2 mb-2">
                          <p className="text-sm text-dark-text-muted">
                            {formatFechaNumericaEs(ejecucion.fecha)}
                          </p>
                          {!isEditing && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleStartEdit(ejecucion.entrenamientoId, ejecucion.seriesEjecutadas)
                              }
                              disabled={savingEdit || editingEntrenamientoId !== null}
                            >
                              Editar
                            </Button>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="space-y-3">
                            {editSeries.map((serie) => (
                              <SerieInput
                                key={`${ejecucion.entrenamientoId}-${serie.numeroSerie}`}
                                numeroSerie={serie.numeroSerie}
                                pesoInicial={serie.pesoReal}
                                repsInicial={serie.repeticiones}
                                onUpdate={(peso, reps) =>
                                  handleSerieEditUpdate(serie.numeroSerie, peso, reps)
                                }
                                disabled={savingEdit}
                              />
                            ))}
                            <div className="flex gap-2 pt-1">
                              <Button
                                size="sm"
                                onClick={handleSaveEdit}
                                disabled={savingEdit}
                              >
                                {savingEdit ? 'Guardando...' : 'Guardar'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEdit}
                                disabled={savingEdit}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {ejecucion.seriesEjecutadas.map((serie) => (
                              <div
                                key={serie.numeroSerie}
                                className="flex gap-4 text-sm text-dark-text"
                              >
                                <span className="font-semibold">Serie {serie.numeroSerie}:</span>
                                {serie.pesoReal != null && serie.pesoReal > 0 && (
                                  <span>{serie.pesoReal} kg</span>
                                )}
                                {serie.repeticiones != null && serie.repeticiones > 0 && (
                                  <span>{serie.repeticiones} reps</span>
                                )}
                                {serie.pesoReal != null && serie.repeticiones != null && (
                                  <span className="text-dark-accent">
                                    RM: {calcularRM(serie.pesoReal, serie.repeticiones).toFixed(1)} kg
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              {ejercicios.length === 0 ? (
                <Card>
                  <p className="text-center text-dark-text-muted py-8">
                    No hay ejercicios disponibles. Crea uno para comenzar.
                  </p>
                </Card>
              ) : (
                <>
                  <Card className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="flex-1 min-w-0">
                        <label htmlFor="buscar-ejercicio" className="block text-xs font-medium text-dark-text-muted mb-1">
                          Buscar por nombre
                        </label>
                        <input
                          id="buscar-ejercicio"
                          type="search"
                          value={textoBusqueda}
                          onChange={(e) => setTextoBusqueda(e.target.value)}
                          placeholder="Contiene…"
                          className="w-full px-3 py-2 rounded-lg bg-dark-surface border border-dark-border text-dark-text placeholder:text-dark-text-muted focus:outline-none focus:ring-2 focus:ring-dark-accent"
                        />
                      </div>
                      <div className="w-full sm:w-56">
                        <label htmlFor="filtro-musculo" className="block text-xs font-medium text-dark-text-muted mb-1">
                          Músculo
                        </label>
                        <select
                          id="filtro-musculo"
                          value={musculoFiltro}
                          onChange={(e) => setMusculoFiltro(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-dark-surface border border-dark-border text-dark-text focus:outline-none focus:ring-2 focus:ring-dark-accent"
                        >
                          <option value="">Todos los músculos</option>
                          {musculosOpciones.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </Card>

                  {ejerciciosFiltrados.length === 0 ? (
                    <Card>
                      <p className="text-center text-dark-text-muted py-8">No hay ejercicios que coincidan con el filtro.</p>
                    </Card>
                  ) : (
                    ejerciciosFiltrados.map((ejercicio) => {
                      const color = getMuscleColorWithDefault(ejercicio.musculoPrincipal);
                      return (
                        <Card
                          key={ejercicio.id}
                          className="hover:border-dark-accent transition-colors"
                          style={{
                            borderLeftColor: color !== 'transparent' ? color : undefined,
                            borderLeftWidth: color !== 'transparent' ? '4px' : undefined,
                          }}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h3 className="text-xl font-bold text-dark-text">{ejercicio.nombre}</h3>
                              <p className="text-sm text-dark-text-muted">{ejercicio.musculoPrincipal}</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleViewHistory(ejercicio.id)}>
                              Ver Historial
                            </Button>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
