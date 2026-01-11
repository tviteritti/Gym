import { useEffect, useState, useRef } from "react"
import { Layout } from "../components/layout/Layout"
import { musculoService } from "../services/musculoService"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"
import { Input } from "../components/ui/Input"
import type { Musculo } from "../types"
import { getMuscleColorWithDefault } from "../constants/muscleColors"

export const MusculosPage = () => {
  const [musculos, setMusculos] = useState<Musculo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState("")
  const [error, setError] = useState("")
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    // Evitar ejecuciones duplicadas (especialmente en StrictMode)
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    
    loadMusculos()
  }, [])

  const loadMusculos = async () => {
    try {
      setLoading(true)
      const data = await musculoService.getAll()
      setMusculos(data)
    } catch (error) {
      console.error("Error al cargar músculos:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      await musculoService.create({ nombre })
      setNombre("")
      setShowForm(false)
      await loadMusculos()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear músculo")
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-dark-text-muted">Cargando...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-dark-bg p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Músculos
            </h1>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancelar" : "+ Crear Músculo"}
            </Button>
          </div>

          {showForm && (
            <Card className="mb-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Nombre del Músculo"
                  placeholder="Ej: Pectoral, Bíceps, Tríceps..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  fullWidth
                />
                {error && (
                  <div className="p-3 bg-red-600/20 border border-red-600/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <Button type="submit" fullWidth>
                  Crear Músculo
                </Button>
              </form>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {musculos.map((musculo) => {
              const color = getMuscleColorWithDefault(musculo.nombre)
              return (
                <Card
                  key={musculo.id}
                  className="hover:border-dark-accent transition-colors"
                  style={{
                    borderLeftColor: color !== 'transparent' ? color : undefined,
                    borderLeftWidth: color !== 'transparent' ? '4px' : undefined,
                  }}
                >
                  <h3 className="text-xl font-bold text-dark-text">
                    {musculo.nombre}
                  </h3>
                  <p className="text-sm text-dark-text-muted mt-2">
                    Creado:{" "}
                    {new Date(musculo.fechaCreacion).toLocaleDateString("es-ES")}
                  </p>
                </Card>
              )
            })}
          </div>

          {musculos.length === 0 && (
            <Card>
              <p className="text-center text-dark-text-muted py-8">
                No hay músculos creados. Crea uno para comenzar.
              </p>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  )
}
