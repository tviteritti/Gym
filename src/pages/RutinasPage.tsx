import { useEffect, useState, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Layout } from "../components/layout/Layout"
import { useAuthStore } from "../store/authStore"
import { rutinaService } from "../services/rutinaService"
import { ejercicioService } from "../services/ejercicioService"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"
import { LoadingOverlay } from "../components/ui/LoadingOverlay"
import type { Rutina, Ejercicio } from "../types"
import { getMuscleColorWithDefault } from "../constants/muscleColors"
import { calcularResumenSeriesRutina } from "../utils/rutinaVolumen"

type RutinaAction = "duplicate" | "activate" | "delete"

const actionMessages: Record<RutinaAction, string> = {
  duplicate: "Duplicando rutina…",
  activate: "Activando rutina…",
  delete: "Eliminando rutina…",
}

export const RutinasPage = () => {
  const { usuario } = useAuthStore()
  const [rutinas, setRutinas] = useState<Rutina[]>([])
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRutinaId, setExpandedRutinaId] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState<{
    type: RutinaAction
    rutinaId: string
  } | null>(null)
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

  const loadRutinas = useCallback(async (opts?: { silent?: boolean }) => {
    if (!usuario) return
    try {
      if (!opts?.silent) setLoading(true)
      const data = await rutinaService.getAll(usuario.id)
      setRutinas(data)
    } catch (error) {
      console.error("Error al cargar rutinas:", error)
    } finally {
      if (!opts?.silent) setLoading(false)
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
    if (!usuario || actionBusy) return
    setActionBusy({ type: "activate", rutinaId })
    try {
      await rutinaService.activate(rutinaId, usuario.id)
      await loadRutinas({ silent: true })
    } catch (error) {
      console.error("Error al activar rutina:", error)
      alert(error instanceof Error ? error.message : "Error al activar la rutina")
    } finally {
      setActionBusy(null)
    }
  }

  const handleDelete = async (rutinaId: string, rutinaNombre: string) => {
    if (!usuario || actionBusy) return
    
    const confirmed = window.confirm(
      `¿Estás seguro de que quieres eliminar la rutina "${rutinaNombre}"?\n\nEsta acción no se puede deshacer.`
    )
    
    if (!confirmed) return
    
    setActionBusy({ type: "delete", rutinaId })
    try {
      await rutinaService.delete(rutinaId, usuario.id)
      await loadRutinas({ silent: true })
    } catch (error) {
      console.error("Error al eliminar rutina:", error)
      alert(error instanceof Error ? error.message : "Error al eliminar la rutina")
    } finally {
      setActionBusy(null)
    }
  }

  const handleDuplicate = async (rutinaId: string) => {
    if (!usuario || actionBusy) return
    setActionBusy({ type: "duplicate", rutinaId })
    try {
      await rutinaService.duplicate(rutinaId, usuario.id)
      await loadRutinas({ silent: true })
    } catch (error) {
      console.error("Error al duplicar rutina:", error)
      alert(error instanceof Error ? error.message : "Error al duplicar la rutina")
    } finally {
      setActionBusy(null)
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

  const busy = actionBusy !== null

  return (
    <Layout>
      {actionBusy && <LoadingOverlay message={actionMessages[actionBusy.type]} />}
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
              disabled={busy}
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
                const resumenSeries = calcularResumenSeriesRutina(rutina, ejercicios)
                const isThisBusy = actionBusy?.rutinaId === rutina.id
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
                           disabled={busy}
                           onClick={() => setExpandedRutinaId(isExpanded ? null : rutina.id)}
                         >
                           {isExpanded ? "Ocultar" : "Ver Detalle"}
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           disabled={busy}
                           onClick={() => navigate(`/rutinas/${rutina.id}/editar`)}
                         >
                           Editar
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           disabled={busy}
                           onClick={() => handleDuplicate(rutina.id)}
                         >
                           {isThisBusy && actionBusy?.type === "duplicate"
                             ? "Duplicando…"
                             : "Duplicar"}
                         </Button>
                         {!rutina.activa && (
                           <>
                             <Button
                               variant="primary"
                               size="sm"
                               disabled={busy}
                               onClick={() => handleActivate(rutina.id)}
                             >
                               {isThisBusy && actionBusy?.type === "activate"
                                 ? "Activando…"
                                 : "Activar"}
                             </Button>
                             <Button
                               variant="danger"
                               size="sm"
                               disabled={busy}
                               onClick={() => handleDelete(rutina.id, rutina.nombre)}
                             >
                               {isThisBusy && actionBusy?.type === "delete"
                                 ? "Eliminando…"
                                 : "Eliminar"}
                             </Button>
                           </>
                         )}
                       </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-dark-border">
                        <h4 className="text-lg font-semibold text-dark-text mb-3">
                          Días de la Rutina
                        </h4>
                        <div className="space-y-4">
                          {rutina.diasDeRutina.map((dia) => {
                            const seriesDia = dia.ejerciciosPlanificados.reduce(
                              (acc, ep) => acc + (ep.seriesPlanificadas?.length ?? 0),
                              0
                            )
                            return (
                            <div
                              key={dia.id}
                              className="p-3 bg-dark-surface rounded-lg border border-dark-border"
                            >
                              <div className="flex justify-between items-baseline gap-2 mb-2">
                                <h5 className="font-semibold text-dark-text">
                                  {dia.diaSemanaNombre}
                                </h5>
                                <span className="text-xs text-dark-text-muted tabular-nums">
                                  {seriesDia} {seriesDia === 1 ? "serie" : "series"}
                                </span>
                              </div>
                              {dia.ejerciciosPlanificados.length === 0 ? (
                                <p className="text-sm text-dark-text-muted">
                                  No hay ejercicios planificados
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {dia.ejerciciosPlanificados.map((ejercicio) => {
                                    const ejercicioInfo = ejercicios.find(e => e.id === ejercicio.ejercicioId)
                                    const color = ejercicioInfo ? getMuscleColorWithDefault(ejercicioInfo.musculoPrincipal) : 'transparent'
                                    const nSeries = ejercicio.seriesPlanificadas.length
                                    return (
                                      <div
                                        key={ejercicio.id}
                                        className="p-2 bg-dark-bg rounded border border-dark-border"
                                        style={{
                                          borderLeftColor: color !== 'transparent' ? color : undefined,
                                          borderLeftWidth: color !== 'transparent' ? '4px' : undefined,
                                        }}
                                      >
                                        <div className="flex flex-wrap justify-between items-center gap-1 mb-0.5">
                                          <span className="font-medium text-dark-text text-sm">
                                            {ejercicio.orden}. {ejercicio.ejercicioNombre}
                                          </span>
                                          {ejercicio.esBilbo && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/25 text-purple-300">
                                              Bilbo
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-dark-text-muted">
                                          {nSeries} {nSeries === 1 ? "serie" : "series"}
                                        </p>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                          })}
                        </div>

                        <div className="mt-6 space-y-4">
                          <div>
                            <h4 className="text-lg font-semibold text-dark-text mb-2">
                              Series por día
                            </h4>
                            <div className="overflow-x-auto rounded-lg border border-dark-border">
                              <table className="w-full text-sm text-left">
                                <thead className="bg-dark-surface text-dark-text-muted uppercase text-xs">
                                  <tr>
                                    <th className="px-3 py-2 font-semibold">Día</th>
                                    <th className="px-3 py-2 font-semibold text-right">Series</th>
                                  </tr>
                                </thead>
                                <tbody className="text-dark-text divide-y divide-dark-border">
                                  {resumenSeries.porDia.map((row, idx) => (
                                    <tr key={`${row.diaSemana}-${idx}`} className="bg-dark-bg/50">
                                      <td className="px-3 py-2">{row.diaNombre}</td>
                                      <td className="px-3 py-2 text-right tabular-nums">{row.series}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-dark-text mb-2">
                              Series por grupo muscular (semana)
                            </h4>
                            <p className="text-xs text-dark-text-muted mb-3">
                              Cada serie planificada en la rutina cuenta como 1. Total = suma de todas las series de la semana.
                            </p>
                            <div className="overflow-x-auto rounded-lg border border-dark-border">
                              <table className="w-full text-sm text-left">
                                <thead className="bg-dark-surface text-dark-text-muted uppercase text-xs">
                                  <tr>
                                    <th className="px-3 py-2 font-semibold">Grupo muscular</th>
                                    <th className="px-3 py-2 font-semibold text-right">Series</th>
                                    <th className="px-3 py-2 font-semibold text-right">% del total</th>
                                  </tr>
                                </thead>
                                <tbody className="text-dark-text divide-y divide-dark-border">
                                  {resumenSeries.porMusculo.map((row) => {
                                    const pct =
                                      resumenSeries.totalSemanal > 0
                                        ? Math.round((row.series / resumenSeries.totalSemanal) * 1000) / 10
                                        : 0
                                    return (
                                      <tr key={row.musculo} className="bg-dark-bg/50">
                                        <td className="px-3 py-2">{row.musculo}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{row.series}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{pct}%</td>
                                      </tr>
                                    )
                                  })}
                                  <tr className="bg-dark-surface font-semibold border-t-2 border-dark-border">
                                    <td className="px-3 py-2">Total semanal</td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {resumenSeries.totalSemanal}
                                    </td>
                                    <td className="px-3 py-2 text-right">100%</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
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
