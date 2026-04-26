import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Layout } from "../components/layout/Layout"
import { useAuthStore } from "../store/authStore"
import { rutinaService } from "../services/rutinaService"
import { ejercicioService } from "../services/ejercicioService"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Card } from "../components/ui/Card"
import { RutinaEditorSidePanel } from "../components/features/RutinaEditorSidePanel"
import { getMuscleColorWithDefault } from "../constants/muscleColors"
import {
  seriesDesdeCantidad,
  setDragDataEjercicioRutina,
  getDragDataEjercicioRutina,
} from "../utils/rutinaSeries"
import { contarSeriesDiaRutina } from "../utils/rutinaVolumen"
import type { Ejercicio, DiaRutinaRequest, EjercicioRutinaRequest } from "../types"

export const CrearRutinaPage = () => {
  const { usuario } = useAuthStore()
  const [nombre, setNombre] = useState("")
  const [dias, setDias] = useState<DiaRutinaRequest[]>([])
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  /** Clave `${diaIndex}-${ejIndex}` de la fila bajo el cursor al arrastrar */
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadEjercicios()
  }, [])

  const loadEjercicios = async () => {
    try {
      const data = await ejercicioService.getAll()
      setEjercicios(data)
    } catch (error) {
      console.error("Error al cargar ejercicios:", error)
    }
  }

  const controlRowClass =
    "h-9 px-2 text-sm bg-dark-bg border border-dark-border rounded-md text-dark-text focus:outline-none focus:ring-2 focus:ring-violet-500/40"

  const diasSemana = [
    { value: 1, label: "Lunes" },
    { value: 2, label: "Martes" },
    { value: 3, label: "Miércoles" },
    { value: 4, label: "Jueves" },
    { value: 5, label: "Viernes" },
    { value: 6, label: "Sábado" },
    { value: 7, label: "Domingo" },
  ]

  const agregarDia = () => {
    setDias([...dias, { diaSemana: 1, ejercicios: [] }])
  }

  const eliminarDia = (index: number) => {
    setDias(dias.filter((_, i) => i !== index))
  }

  const actualizarDia = (index: number, diaSemana: number) => {
    const nuevosDias = [...dias]
    nuevosDias[index].diaSemana = diaSemana
    setDias(nuevosDias)
  }

  const agregarEjercicioADia = (diaIndex: number) => {
    const nuevosDias = [...dias]
    nuevosDias[diaIndex].ejercicios.push({
      ejercicioId: "",
      orden: nuevosDias[diaIndex].ejercicios.length + 1,
      esBilbo: false,
      series: seriesDesdeCantidad(1),
    })
    setDias(nuevosDias)
  }

  const eliminarEjercicioDeDia = (diaIndex: number, ejercicioIndex: number) => {
    const nuevosDias = [...dias]
    nuevosDias[diaIndex].ejercicios.splice(ejercicioIndex, 1)
    nuevosDias[diaIndex].ejercicios.forEach((e, i) => {
      e.orden = i + 1
    })
    setDias(nuevosDias)
  }

  const actualizarEjercicio = (
    diaIndex: number,
    ejercicioIndex: number,
    campo: keyof EjercicioRutinaRequest,
    valor: unknown
  ) => {
    const nuevosDias = [...dias]
    ;(nuevosDias[diaIndex].ejercicios[ejercicioIndex] as unknown as Record<string, unknown>)[campo] = valor
    setDias(nuevosDias)
  }

  const actualizarCantidadSeries = (diaIndex: number, ejercicioIndex: number, raw: string) => {
    const n = parseInt(raw, 10)
    const cantidad = Number.isFinite(n) ? Math.max(1, Math.min(99, n)) : 1
    const nuevosDias = [...dias]
    nuevosDias[diaIndex].ejercicios[ejercicioIndex].series = seriesDesdeCantidad(cantidad)
    setDias(nuevosDias)
  }

  const reordenarEjerciciosEnDia = useCallback((diaIndex: number, desde: number, hasta: number) => {
    if (desde === hasta) return
    setDias((prev) => {
      const nuevosDias = prev.map((d, i) =>
        i === diaIndex ? { ...d, ejercicios: [...d.ejercicios] } : d
      )
      const list = nuevosDias[diaIndex].ejercicios
      if (desde < 0 || desde >= list.length || hasta < 0 || hasta > list.length) return prev
      const [movido] = list.splice(desde, 1)
      list.splice(hasta, 0, movido)
      list.forEach((e, i) => {
        e.orden = i + 1
      })
      return nuevosDias
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuario) return

    setError("")
    setLoading(true)

    try {
      const tieneEjerciciosInvalidos = dias.some((dia) =>
        dia.ejercicios.some((ej) => !ej.ejercicioId)
      )

      if (tieneEjerciciosInvalidos) {
        setError("Todos los ejercicios deben estar seleccionados")
        setLoading(false)
        return
      }

      await rutinaService.create({
        usuarioId: usuario.id,
        nombre,
        dias,
      })

      navigate("/rutinas")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la rutina")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-dark-bg p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Crear Rutina
            </h1>
            <Button variant="outline" onClick={() => navigate("/rutinas")}>
              Cancelar
            </Button>
          </div>

          <div className="flex flex-col gap-6">
          <form
            onSubmit={handleSubmit}
            className="min-w-0 lg:mr-[22rem] xl:mr-[24rem]"
          >
            <Card className="mb-6">
              <Input
                label="Nombre de la Rutina"
                placeholder="Ej: Rutina Push/Pull/Legs"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                fullWidth
              />
            </Card>

            {dias.map((dia, diaIndex) => (
              <Card key={diaIndex} className="mb-6">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-xl font-bold text-dark-text">Día {diaIndex + 1}</h3>
                    <p className="text-sm text-dark-text-muted">
                      Volumen del día ={" "}
                      <span className="font-semibold tabular-nums text-dark-text">
                        {contarSeriesDiaRutina(dia)}
                      </span>
                    </p>
                  </div>
                  <Button type="button" variant="danger" size="sm" onClick={() => eliminarDia(diaIndex)}>
                    Eliminar Día
                  </Button>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-dark-text mb-2">Día de la Semana</label>
                  <select
                    value={dia.diaSemana}
                    onChange={(e) => actualizarDia(diaIndex, parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-dark-accent"
                  >
                    {diasSemana.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  {dia.ejercicios.map((ejercicio, ejercicioIndex) => {
                    const ejInfo = ejercicios.find((e) => e.id === ejercicio.ejercicioId)
                    const muscleColor = ejInfo ? getMuscleColorWithDefault(ejInfo.musculoPrincipal) : "transparent"
                    const tinted = Boolean(ejercicio.ejercicioId && muscleColor !== "transparent")
                    const rowKey = `${diaIndex}-${ejercicioIndex}`
                    const isDropOver = dropTargetKey === rowKey
                    return (
                    <div
                      key={ejercicioIndex}
                      className={`flex items-stretch gap-1.5 rounded-lg border border-dark-border p-2 transition-colors ${
                        isDropOver ? "ring-2 ring-violet-400/70 ring-offset-1 ring-offset-dark-bg" : ""
                      }`}
                      style={{
                        borderLeftWidth: tinted ? 4 : undefined,
                        borderLeftColor: tinted ? muscleColor : undefined,
                        backgroundColor: tinted ? `${muscleColor}18` : "rgb(30 41 59 / 0.5)",
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = "move"
                        setDropTargetKey(rowKey)
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          setDropTargetKey(null)
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        setDropTargetKey(null)
                        const data = getDragDataEjercicioRutina(e.dataTransfer)
                        if (!data || data.diaIndex !== diaIndex) return
                        reordenarEjerciciosEnDia(diaIndex, data.ejercicioIndex, ejercicioIndex)
                      }}
                    >
                      <span
                        role="button"
                        tabIndex={0}
                        draggable
                        title="Arrastrar para reordenar"
                        aria-label="Reordenar ejercicio"
                        className="flex h-9 w-7 shrink-0 cursor-grab items-center justify-center self-center rounded border border-dark-border bg-dark-bg text-dark-text-muted hover:border-violet-500/50 hover:text-dark-text active:cursor-grabbing"
                        onDragStart={(e) => {
                          setDragDataEjercicioRutina(e.dataTransfer, diaIndex, ejercicioIndex)
                          e.stopPropagation()
                        }}
                        onDragEnd={() => setDropTargetKey(null)}
                      >
                        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden>
                          <circle cx="3" cy="2.5" r="1.2" />
                          <circle cx="7" cy="2.5" r="1.2" />
                          <circle cx="3" cy="7" r="1.2" />
                          <circle cx="7" cy="7" r="1.2" />
                          <circle cx="3" cy="11.5" r="1.2" />
                          <circle cx="7" cy="11.5" r="1.2" />
                        </svg>
                      </span>
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <div className="flex-1 min-w-[180px]">
                        <label className="sr-only">Ejercicio</label>
                        <select
                          value={ejercicio.ejercicioId}
                          onChange={(e) =>
                            actualizarEjercicio(diaIndex, ejercicioIndex, "ejercicioId", e.target.value)
                          }
                          required
                          className={`w-full ${controlRowClass}`}
                        >
                          <option value="">Ejercicio…</option>
                          {ejercicios.map((ej) => (
                            <option key={ej.id} value={ej.id}>
                              {ej.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-14 shrink-0">
                        <label className="sr-only">Series</label>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={ejercicio.series.length}
                          onChange={(e) =>
                            actualizarCantidadSeries(diaIndex, ejercicioIndex, e.target.value)
                          }
                          className={`w-full ${controlRowClass} tabular-nums`}
                        />
                      </div>
                      <label className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-dark-border bg-dark-bg px-2 text-xs text-dark-text">
                        <input
                          type="checkbox"
                          checked={ejercicio.esBilbo || false}
                          onChange={(e) =>
                            actualizarEjercicio(diaIndex, ejercicioIndex, "esBilbo", e.target.checked)
                          }
                          className="h-3.5 w-3.5 rounded border-dark-border"
                        />
                        Bilbo
                      </label>
                      <div className="flex gap-1.5 shrink-0 items-center">
                        <select
                          value={ejercicio.tipoAgrupacion || ""}
                          onChange={(e) => {
                            const valor = e.target.value || undefined
                            actualizarEjercicio(diaIndex, ejercicioIndex, "tipoAgrupacion", valor)
                            if (!valor) {
                              actualizarEjercicio(diaIndex, ejercicioIndex, "grupoAgrupacion", undefined)
                            }
                          }}
                          className={`${controlRowClass} max-w-[104px] text-xs`}
                        >
                          <option value="">Agrupar…</option>
                          <option value="superserie">Super</option>
                          <option value="biserie">Biserie</option>
                        </select>
                        {ejercicio.tipoAgrupacion ? (
                          <select
                            value={ejercicio.grupoAgrupacion ?? ""}
                            onChange={(e) =>
                              actualizarEjercicio(
                                diaIndex,
                                ejercicioIndex,
                                "grupoAgrupacion",
                                e.target.value ? parseInt(e.target.value, 10) : undefined
                              )
                            }
                            className={`w-12 ${controlRowClass} px-1 text-xs text-center`}
                          >
                            <option value="">#</option>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className="h-9 min-w-[2.25rem] shrink-0 px-0"
                        onClick={() => eliminarEjercicioDeDia(diaIndex, ejercicioIndex)}
                      >
                        ×
                      </Button>
                      </div>
                    </div>
                  )
                  })}

                  <Button type="button" variant="outline" onClick={() => agregarEjercicioADia(diaIndex)} fullWidth>
                    + Agregar ejercicio
                  </Button>
                </div>
              </Card>
            ))}

            <div className="mb-6">
              <Button type="button" variant="outline" onClick={agregarDia} fullWidth size="lg">
                + Agregar Día
              </Button>
            </div>

            {error && (
              <Card className="mb-6 bg-red-600/20 border border-red-600/30">
                <p className="text-red-400">{error}</p>
              </Card>
            )}

            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? "Creando rutina..." : "Crear Rutina"}
            </Button>
          </form>
          <div className="w-full shrink-0 lg:fixed lg:top-24 lg:right-6 lg:z-30 lg:w-80 xl:w-[22rem] lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1">
            <RutinaEditorSidePanel dias={dias} ejercicios={ejercicios} onEjerciciosActualizados={setEjercicios} />
          </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
