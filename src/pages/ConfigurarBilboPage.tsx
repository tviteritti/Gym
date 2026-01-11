import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { useAuthStore } from '../store/authStore';
import { bilboService } from '../services/bilboService';
import { ejercicioService } from '../services/ejercicioService';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
import type { Ejercicio, EjercicioMetodoBilbo } from '../types';

export const ConfigurarBilboPage = () => {
  const { usuario } = useAuthStore();
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [ejerciciosBilbo, setEjerciciosBilbo] = useState<EjercicioMetodoBilbo[]>([]);
  const [selectedEjercicioId, setSelectedEjercicioId] = useState('');
  const [pesoInicial, setPesoInicial] = useState<number>(0);
  const [incremento, setIncremento] = useState<number>(2.5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    
    if (usuario) {
      loadData();
    }
  }, [usuario]);

  const loadData = async () => {
    if (!usuario) return;
    try {
      setLoading(true);
      const [ejerciciosData, bilboData] = await Promise.all([
        ejercicioService.getAll(),
        bilboService.getAll(usuario.id),
      ]);
      setEjercicios(ejerciciosData);
      setEjerciciosBilbo(bilboData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !selectedEjercicioId || pesoInicial <= 0 || incremento <= 0) {
      setError('Por favor completa todos los campos correctamente');
      return;
    }

    // Verificar si el ejercicio ya está configurado
    const yaConfigurado = ejerciciosBilbo.some(eb => eb.ejercicioId === selectedEjercicioId);
    if (yaConfigurado) {
      setError('Este ejercicio ya está configurado para el método Bilbo');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await bilboService.create(usuario.id, {
        ejercicioId: selectedEjercicioId,
        pesoInicial,
        incremento,
      });
      
      // Recargar datos
      await loadData();
      
      // Limpiar formulario
      setSelectedEjercicioId('');
      setPesoInicial(0);
      setIncremento(2.5);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar ejercicio');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ejercicioId: string) => {
    if (!usuario) return;
    if (!confirm('¿Estás seguro de que quieres eliminar este ejercicio del método Bilbo?')) {
      return;
    }

    try {
      await bilboService.delete(usuario.id, ejercicioId);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar ejercicio');
    }
  };

  // Obtener ejercicios que no están en el método Bilbo
  const ejerciciosDisponibles = ejercicios.filter(
    ej => !ejerciciosBilbo.some(eb => eb.ejercicioId === ej.id)
  );

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
              Configurar Método Bilbo
            </h1>
            <Button variant="outline" onClick={() => navigate('/bilbo')}>
              ← Volver
            </Button>
          </div>

          {/* Formulario para agregar ejercicio */}
          <Card className="mb-6">
            <h2 className="text-xl font-bold mb-4 text-dark-text">Agregar Ejercicio</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Ejercicio *
                </label>
                <select
                  value={selectedEjercicioId}
                  onChange={(e) => setSelectedEjercicioId(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-dark-border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-dark-accent"
                >
                  <option value="">Selecciona un ejercicio</option>
                  {ejerciciosDisponibles.map((ejercicio) => (
                    <option key={ejercicio.id} value={ejercicio.id}>
                      {ejercicio.nombre}
                    </option>
                  ))}
                </select>
                {ejerciciosDisponibles.length === 0 && (
                  <p className="text-sm text-dark-text-muted mt-2">
                    Todos los ejercicios ya están configurados para el método Bilbo
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NumberInput
                  label="Peso Inicial (kg) *"
                  value={pesoInicial}
                  onChange={(e) => setPesoInicial(parseFloat(e.target.value) || 0)}
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
                    value={incremento}
                    onChange={(e) => setIncremento(parseFloat(e.target.value))}
                    required
                    className="w-full px-4 py-3 bg-white border border-dark-border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-dark-accent"
                  >
                    <option value={2.5}>2.5 kg</option>
                    <option value={5}>5 kg</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-600/20 border border-red-600/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" fullWidth size="lg" disabled={saving || ejerciciosDisponibles.length === 0}>
                {saving ? 'Guardando...' : 'Agregar Ejercicio'}
              </Button>
            </form>
          </Card>

          {/* Lista de ejercicios configurados */}
          <Card>
            <h2 className="text-xl font-bold mb-4 text-dark-text">Ejercicios Configurados</h2>
            {ejerciciosBilbo.length === 0 ? (
              <p className="text-center text-dark-text-muted py-8">
                No hay ejercicios configurados para el método Bilbo.
              </p>
            ) : (
              <div className="space-y-4">
                {ejerciciosBilbo.map((ejercicioBilbo) => (
                  <div
                    key={ejercicioBilbo.id}
                    className="p-4 bg-dark-surface rounded-lg border border-dark-border flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-dark-text mb-2">
                        {ejercicioBilbo.ejercicioNombre}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-dark-text-muted">Peso Inicial</p>
                          <p className="font-semibold text-dark-text">
                            {ejercicioBilbo.pesoInicial} kg
                          </p>
                        </div>
                        <div>
                          <p className="text-dark-text-muted">Incremento</p>
                          <p className="font-semibold text-dark-text">
                            +{ejercicioBilbo.incremento} kg
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(ejercicioBilbo.ejercicioId)}
                      className="ml-4"
                    >
                      Eliminar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
};
