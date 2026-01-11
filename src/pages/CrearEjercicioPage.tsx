import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { ejercicioService } from '../services/ejercicioService';
import { musculoService } from '../services/musculoService';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import type { Musculo } from '../types';

export const CrearEjercicioPage = () => {
  const [nombre, setNombre] = useState('');
  const [musculoPrincipalId, setMusculoPrincipalId] = useState('');
  const [musculosSecundariosIds, setMusculosSecundariosIds] = useState<string[]>([]);
  const [descripcion, setDescripcion] = useState('');
  const [musculos, setMusculos] = useState<Musculo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadMusculos();
  }, []);

  const loadMusculos = async () => {
    try {
      const data = await musculoService.getAll();
      setMusculos(data);
    } catch (error) {
      console.error('Error al cargar músculos:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await ejercicioService.create({
        nombre,
        musculoPrincipalId,
        musculosSecundariosIds: musculosSecundariosIds.length > 0 ? musculosSecundariosIds : undefined,
        descripcion: descripcion || undefined,
      });
      navigate('/ejercicios');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear ejercicio');
    } finally {
      setLoading(false);
    }
  };

  const toggleMusculoSecundario = (musculoId: string) => {
    setMusculosSecundariosIds((prev) =>
      prev.includes(musculoId)
        ? prev.filter((id) => id !== musculoId)
        : [...prev, musculoId]
    );
  };

  return (
    <Layout>
      <div className="min-h-screen bg-dark-bg p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Crear Ejercicio
            </h1>
            <Button variant="outline" onClick={() => navigate('/ejercicios')}>
              Cancelar
            </Button>
          </div>

          <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Nombre del Ejercicio"
                placeholder="Ej: Press de Banca, Curl de Bíceps..."
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                fullWidth
              />

              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Músculo Principal *
                </label>
                <select
                  value={musculoPrincipalId}
                  onChange={(e) => setMusculoPrincipalId(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-dark-border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-dark-accent"
                >
                  <option value="">Selecciona un músculo</option>
                  {musculos.map((musculo) => (
                    <option key={musculo.id} value={musculo.id}>
                      {musculo.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Músculos Secundarios
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {musculos.map((musculo) => (
                    <label
                      key={musculo.id}
                      className="flex items-center gap-3 p-3 bg-dark-surface rounded-lg cursor-pointer hover:bg-dark-hover transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={musculosSecundariosIds.includes(musculo.id)}
                        onChange={() => toggleMusculoSecundario(musculo.id)}
                        className="w-5 h-5 rounded border-dark-border text-dark-accent focus:ring-dark-accent"
                      />
                      <span className="text-dark-text">{musculo.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Input
                label="Descripción (opcional)"
                placeholder="Descripción del ejercicio..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                fullWidth
              />

              {error && (
                <div className="p-3 bg-red-600/20 border border-red-600/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" fullWidth size="lg" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Ejercicio'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
