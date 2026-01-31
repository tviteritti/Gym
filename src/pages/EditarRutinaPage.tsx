import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Layout } from "../components/layout/Layout"
import { useAuthStore } from "../store/authStore"
import { rutinaService } from "../services/rutinaService"
import { ejercicioService } from "../services/ejercicioService"
import { bilboService } from "../services/bilboService"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Card } from "../components/ui/Card"
import { NumberInput } from "../components/ui/NumberInput"
import type {
  Ejercicio,
  DiaRutinaRequest,
  EjercicioRutinaRequest,
} from "../types"

export const EditarRutinaPage = () => {
  const { rutinaId } = useParams<{ rutinaId: string }>()
  const { usuario } = useAuthStore()
  const [nombre, setNombre] = useState("")
  const [dias, setDias] = useState<DiaRutinaRequest[]>([])
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")
  const [ejerciciosBilbo, setEjerciciosBilbo] = useState<any[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    if (rutinaId && usuario) {
      loadData()
      loadEjerciciosBilbo()
    }
  }, [rutinaId, usuario])

  const loadData = async () => {
    if (!rutinaId || !usuario) return
    try {
      setLoadingData(true)
      // Cargar ejercicios disponibles
      const ejerciciosData = await ejercicioService.getAll()
      setEjercicios(ejerciciosData)

      // Cargar rutina existente
      const rutinas = await rutinaService.getAll(usuario.id)
      const rutina = rutinas.find((r) => r.id === rutinaId)

      if (!rutina) {
        setError("Rutina no encontrada")
        return
      }

      // Cargar datos de la rutina
      setNombre(rutina.nombre)
      
      // Convertir la rutina a formato de edición
      const diasEditables: DiaRutinaRequest[] = rutina.diasDeRutina.map((dia) => ({
        diaSemana: dia.diaSemana,
        ejercicioBilboId: dia.ejercicioBilboId,
        ejercicios: dia.ejerciciosPlanificados.map((ej) => ({
          ejercicioId: ej.ejercicioId,
          orden: ej.orden,
          esBilbo: ej.esBilbo,
          rangoRepeticionesMin: ej.seriesPlanificadas[0]?.rangoRepeticionesMin,
          rangoRepeticionesMax: ej.seriesPlanificadas[0]?.rangoRepeticionesMax,
          series: ej.seriesPlanificadas.map((serie) => ({
            numeroSerie: serie.numeroSerie,
            pesoPlanificado: serie.pesoPlanificado,
            rangoRepeticionesMin: serie.rangoRepeticionesMin,
            rangoRepeticionesMax: serie.rangoRepeticionesMax,
          })),
        })),
      }))

      setDias(diasEditables)
    } catch (error) {
      console.error("Error al cargar datos:", error)
      setError("Error al cargar la rutina")
    } finally {
      setLoadingData(false)
    }
  }

  const loadEjerciciosBilbo = async () => {
    if (!usuario) return
    try {
      const data = await bilboService.getAll(usuario.id)
      setEjerciciosBilbo(data)
    } catch (error) {
      console.error("Error al cargar ejercicios bilbo:", error)
    }
  }

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
      rangoRepeticionesMin: undefined,
      rangoRepeticionesMax: undefined,
      series: [{ numeroSerie: 1, pesoPlanificado: undefined }],
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
    valor: any
  ) => {
    const nuevosDias = [...dias]
    ;(nuevosDias[diaIndex].ejercicios[ejercicioIndex] as any)[campo] = valor
    setDias(nuevosDias)
  }

  const agregarSerie = (diaIndex: number, ejercicioIndex: number) => {
    const nuevosDias = [...dias]
    const ejercicio = nuevosDias[diaIndex].ejercicios[ejercicioIndex]
    ejercicio.series.push({
      numeroSerie: ejercicio.series.length + 1,
      pesoPlanificado: undefined,
    })
    setDias(nuevosDias)
  }

  const eliminarSerie = (
    diaIndex: number,
    ejercicioIndex: number,
    serieIndex: number
  ) => {
    const nuevosDias = [...dias]
    nuevosDias[diaIndex].ejercicios[ejercicioIndex].series.splice(serieIndex, 1)
    nuevosDias[diaIndex].ejercicios[ejercicioIndex].series.forEach((s, i) => {
      s.numeroSerie = i + 1
    })
    setDias(nuevosDias)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuario || !rutinaId) return

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

      await rutinaService.update(rutinaId, {
        usuarioId: usuario.id,
        nombre,
        dias,
      })

      navigate("/rutinas")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar la rutina")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-dark-text-muted">Cargando rutina...</p>
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
              Editar Rutina
            </h1>
            <Button variant="outline" onClick={() => navigate("/rutinas")}>
              Cancelar
            </Button>
          </div>

          <form onSubmit={handleSubmit}>
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
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-dark-text">
                    Día {diaIndex + 1}
                  </h3>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => eliminarDia(diaIndex)}
                  >
                    Eliminar Día
                  </Button>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-dark-text mb-2">
                    Día de la Semana
                  </label>
                  <select
                    value={dia.diaSemana}
                    onChange={(e) =>
                      actualizarDia(diaIndex, parseInt(e.target.value))
                    }
                    className="w-full px-4 py-3 bg-white border border-dark-border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-dark-accent"
                  >
                    {diasSemana.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-dark-text mb-2">
                    Ejercicio Bilbo (opcional)
                  </label>
                  <select
                    value={dia.ejercicioBilboId || ""}
                    onChange={(e) => {
                      const nuevosDias = [...dias]
                      nuevosDias[diaIndex].ejercicioBilboId = e.target.value || undefined
                      setDias(nuevosDias)
                    }}
                    className="w-full px-4 py-3 bg-white border border-dark-border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-dark-accent"
                  >
                    <option value="">Selecciona un ejercicio Bilbo</option>
                    {ejerciciosBilbo.map((ej) => (
                      <option key={ej.id} value={ej.ejercicioId}>
                        {ej.ejercicioNombre || ej.ejercicioId}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  {dia.ejercicios.map((ejercicio, ejercicioIndex) => (
                    <div
                      key={ejercicioIndex}
                      className="p-4 bg-dark-surface rounded-lg border border-dark-border"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-dark-text">
                          Ejercicio {ejercicio.orden}
                        </h4>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            eliminarEjercicioDeDia(diaIndex, ejercicioIndex)
                          }
                        >
                          Eliminar
                        </Button>
                      </div>

                      <div className="mb-3">
                        <label className="block text-sm font-medium text-dark-text mb-2">
                          Ejercicio *
                        </label>
                        <select
                          value={ejercicio.ejercicioId}
                          onChange={(e) =>
                            actualizarEjercicio(
                              diaIndex,
                              ejercicioIndex,
                              "ejercicioId",
                              e.target.value
                            )
                          }
                          required
                          className="w-full px-4 py-3 bg-white border border-dark-border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-dark-accent"
                        >
                          <option value="">Selecciona un ejercicio</option>
                          {ejercicios.map((ej) => (
                            <option key={ej.id} value={ej.id}>
                              {ej.nombre} - {ej.musculoPrincipal}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`bilbo-${diaIndex}-${ejercicioIndex}`}
                            checked={ejercicio.esBilbo || false}
                            onChange={(e) =>
                              actualizarEjercicio(
                                diaIndex,
                                ejercicioIndex,
                                "esBilbo",
                                e.target.checked
                              )
                            }
                            className="mr-2"
                          />
                          <label htmlFor={`bilbo-${diaIndex}-${ejercicioIndex}`} className="text-sm text-dark-text">
                            Es ejercicio Bilbo
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-sm font-medium text-dark-text mb-2">
                            Reps Min
                          </label>
                          <NumberInput
                            placeholder="Min"
                            value={ejercicio.rangoRepeticionesMin ?? ""}
                            onChange={(e) =>
                              actualizarEjercicio(
                                diaIndex,
                                ejercicioIndex,
                                "rangoRepeticionesMin",
                                e.target.value ? parseInt(e.target.value) : undefined
                              )
                            }
                            min={1}
                            max={50}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-dark-text mb-2">
                            Reps Max
                          </label>
                          <NumberInput
                            placeholder="Max"
                            value={ejercicio.rangoRepeticionesMax ?? ""}
                            onChange={(e) =>
                              actualizarEjercicio(
                                diaIndex,
                                ejercicioIndex,
                                "rangoRepeticionesMax",
                                e.target.value ? parseInt(e.target.value) : undefined
                              )
                            }
                            min={1}
                            max={50}
                            className="w-full"
                          />
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="block text-sm font-medium text-dark-text mb-2">
                          Series
                        </label>
                        <div className="space-y-2">
                          {ejercicio.series.map((serie, serieIndex) => (
                            <div
                              key={serieIndex}
                              className="flex gap-2 items-center"
                            >
                              <span className="w-20 text-sm font-medium text-dark-text-muted">
                                Serie {serie.numeroSerie}:
                              </span>
                              <NumberInput
                                placeholder="Peso (kg)"
                                value={serie.pesoPlanificado ?? ""}
                                onChange={(e) => {
                                  const nuevosDias = [...dias]
                                  nuevosDias[diaIndex].ejercicios[
                                    ejercicioIndex
                                  ].series[serieIndex].pesoPlanificado = e
                                    .target.value
                                    ? parseFloat(e.target.value)
                                    : undefined
                                  setDias(nuevosDias)
                                }}
                                step={0.5}
                                min={0}
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() =>
                                  eliminarSerie(
                                    diaIndex,
                                    ejercicioIndex,
                                    serieIndex
                                  )
                                }
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              agregarSerie(diaIndex, ejercicioIndex)
                            }
                          >
                            + Agregar Serie
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => agregarEjercicioADia(diaIndex)}
                    fullWidth
                  >
                    + Agregar Ejercicio
                  </Button>
                </div>
              </Card>
            ))}

            <div className="mb-6">
              <Button
                type="button"
                variant="outline"
                onClick={agregarDia}
                fullWidth
                size="lg"
              >
                + Agregar Día
              </Button>
            </div>

            {error && (
              <Card className="mb-6 bg-red-600/20 border border-red-600/30">
                <p className="text-red-400">{error}</p>
              </Card>
            )}

            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? "Actualizando rutina..." : "Actualizar Rutina"}
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  )
}

