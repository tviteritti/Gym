import { useEffect, useState, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Layout } from "../components/layout/Layout"
import { useAuthStore } from "../store/authStore"
import { rutinaService } from "../services/rutinaService"
import { ejercicioService } from "../services/ejercicioService"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"
import type { Rutina, Ejercicio } from "../types"
import { getMuscleColorWithDefault } from "../constants/muscleColors"

export const RutinasPage = () => {
  const { usuario } = useAuthStore()
  const [rutinas, setRutinas] = useState<Rutina[]>([])
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRutinaId, setExpandedRutinaId] = useState<string | null>(null)
  const navigate = useNavigate()
  const loadedUsuarioIdRef = useRef<string | null>(null)

  const loadEjercicios = useCallback(async () => {
    try {
      const data = await ejercicioService.getAll()
      setEjercicios(data)
    } catch (error) {
      console.error("Error al cargar ejercicios:", error)
    }
  }, [])

  const loadRutinas = useCallback(async () => {
    if (!usuario) return
    try {
      setLoading(true)
      const data = await rutinaService.getAll(usuario.id)
      setRutinas(data)
    } catch (error) {
      console.error("Error al cargar rutinas:", error)
    } finally {
      setLoading(false)
    }
  }, [usuario])

  useEffect(() => {
    if (!usuario) {
      navigate("/login")
      return
    }
    
    // Evitar ejecuciones duplicadas para el mismo usuario
    if (loadedUsuarioIdRef.current === usuario.id) return
    loadedUsuarioIdRef.current = usuario.id
    
    loadEjercicios()
    loadRutinas()
  }, [usuario, navigate, loadRutinas, loadEjercicios])

  const handleActivate = async (rutinaId: string) => {
    if (!usuario) return
    try {
      await rutinaService.activate(rutinaId, usuario.id)
      await loadRutinas()
    } catch (error) {
      console.error("Error al activar rutina:", error)
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
              Rutinas
            </h1>
          </div>
          <div className="mb-6">
            <Button
              onClick={() => navigate("/rutinas/crear")}
              size="lg"
              fullWidth
            >
              Crear Nueva Rutina
            </Button>
          </div>

          {rutinas.length === 0 ? (
            <Card>
              <p className="text-center text-dark-text-muted py-8">
                No tienes rutinas creadas. Crea una para comenzar.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {rutinas.map((rutina) => {
                const isExpanded = expandedRutinaId === rutina.id
                return (
                  <Card key={rutina.id}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-dark-text">
                          {rutina.nombre}
                        </h3>
                        <p className="text-sm text-dark-text-muted">
                          {rutina.diasDeRutina.length} días •{" "}
                          {rutina.activa ? (
                            <span className="text-green-400 font-semibold">
                              Activa
                            </span>
                          ) : (
                            <span className="text-dark-text-muted">Inactiva</span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedRutinaId(isExpanded ? null : rutina.id)}
                        >
                          {isExpanded ? "Ocultar" : "Ver Detalle"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/rutinas/${rutina.id}/editar`)}
                        >
                          Editar
                        </Button>
                        {!rutina.activa && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleActivate(rutina.id)}
                          >
                            Activar
                          </Button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-dark-border">
                        <h4 className="text-lg font-semibold text-dark-text mb-3">
                          Días de la Rutina
                        </h4>
                        <div className="space-y-4">
                          {rutina.diasDeRutina.map((dia) => (
                            <div
                              key={dia.id}
                              className="p-3 bg-dark-surface rounded-lg border border-dark-border"
                            >
                              <h5 className="font-semibold text-dark-text mb-2">
                                {dia.diaSemanaNombre}
                              </h5>
                              {dia.ejerciciosPlanificados.length === 0 ? (
                                <p className="text-sm text-dark-text-muted">
                                  No hay ejercicios planificados
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {dia.ejerciciosPlanificados.map((ejercicio) => {
                                    const ejercicioInfo = ejercicios.find(e => e.id === ejercicio.ejercicioId)
                                    const color = ejercicioInfo ? getMuscleColorWithDefault(ejercicioInfo.musculoPrincipal) : 'transparent'
                                    return (
                                      <div
                                        key={ejercicio.id}
                                        className="p-2 bg-dark-bg rounded border border-dark-border"
                                        style={{
                                          borderLeftColor: color !== 'transparent' ? color : undefined,
                                          borderLeftWidth: color !== 'transparent' ? '4px' : undefined,
                                        }}
                                      >
                                        <div className="flex justify-between items-start mb-1">
                                          <span className="font-medium text-dark-text">
                                            {ejercicio.orden}. {ejercicio.ejercicioNombre}
                                          </span>
                                        </div>
                                        {ejercicio.seriesPlanificadas.length > 0 && (
                                          <div className="mt-2 text-sm text-dark-text-muted">
                                            <span className="font-medium">Series:</span>{" "}
                                            {ejercicio.seriesPlanificadas
                                              .map(
                                                (s) =>
                                                  `${s.numeroSerie}${s.pesoPlanificado ? ` (${s.pesoPlanificado}kg)` : ""}`
                                              )
                                              .join(", ")}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
