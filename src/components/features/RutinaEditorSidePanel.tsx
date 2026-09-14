import { useEffect, useMemo, useState } from "react"
import { Card } from "../ui/Card"
import { Input } from "../ui/Input"
import { Button } from "../ui/Button"
import { NumberInput } from "../ui/NumberInput"
import { useAuthStore } from "../../store/authStore"
import { ejercicioService } from "../../services/ejercicioService"
import { bilboService } from "../../services/bilboService"
import { musculoService } from "../../services/musculoService"
import { calcularSeriesPorMusculoDesdeDias } from "../../utils/rutinaVolumen"
import { getMuscleColorWithDefault } from "../../constants/muscleColors"
import { parseDecimal } from "../../utils/formatters"
import type { DiaRutinaRequest, Ejercicio, EjercicioMetodoBilbo, Musculo } from "../../types"

const selectCompactClass =
  "h-9 w-full px-2 text-sm bg-dark-bg border border-dark-border rounded-md text-dark-text focus:outline-none focus:ring-2 focus:ring-violet-500/40"

interface RutinaEditorSidePanelProps {
  dias: DiaRutinaRequest[]
  ejercicios: Ejercicio[]
  onEjerciciosActualizados: (lista: Ejercicio[]) => void
}

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()

export const RutinaEditorSidePanel = ({
  dias,
  ejercicios,
  onEjerciciosActualizados,
}: RutinaEditorSidePanelProps) => {
  const { usuario } = useAuthStore()
  const [musculos, setMusculos] = useState<Musculo[]>([])
  const [ejerciciosBilbo, setEjerciciosBilbo] = useState<EjercicioMetodoBilbo[]>([])

  const [nombreBusqueda, setNombreBusqueda] = useState("")
  const [musculoPrincipalId, setMusculoPrincipalId] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [creando, setCreando] = useState(false)
  const [errorCrear, setErrorCrear] = useState("")
  const [okCrear, setOkCrear] = useState("")

  const [nombreBilbo, setNombreBilbo] = useState("")
  const [musculoBilboId, setMusculoBilboId] = useState("")
  const [pesoInicialBilbo, setPesoInicialBilbo] = useState(0)
  const [incrementoBilbo, setIncrementoBilbo] = useState(2.5)
  const [creandoBilbo, setCreandoBilbo] = useState(false)
  const [errorBilbo, setErrorBilbo] = useState("")
  const [okBilbo, setOkBilbo] = useState("")

  const { total, porMusculo } = useMemo(
    () => calcularSeriesPorMusculoDesdeDias(dias, ejercicios),
    [dias, ejercicios]
  )

  const bilboIds = useMemo(
    () => new Set(ejerciciosBilbo.map((b) => b.ejercicioId)),
    [ejerciciosBilbo]
  )

  const coincidencias = useMemo(() => {
    const q = normalizar(nombreBusqueda)
    if (!q) return []
    return ejercicios
      .filter((e) => normalizar(e.nombre).includes(q))
      .slice(0, 12)
  }, [ejercicios, nombreBusqueda])

  const hayCoincidenciaExacta = useMemo(() => {
    const q = normalizar(nombreBusqueda)
    if (!q) return false
    return ejercicios.some((e) => normalizar(e.nombre) === q)
  }, [ejercicios, nombreBusqueda])

  const coincidenciasBilbo = useMemo(() => {
    const q = normalizar(nombreBilbo)
    if (!q) return []
    return ejercicios
      .filter((e) => normalizar(e.nombre).includes(q))
      .slice(0, 12)
  }, [ejercicios, nombreBilbo])

  const ejercicioExactoBilbo = useMemo(() => {
    const q = normalizar(nombreBilbo)
    if (!q) return null
    return ejercicios.find((e) => normalizar(e.nombre) === q) ?? null
  }, [ejercicios, nombreBilbo])

  const yaEsBilbo = ejercicioExactoBilbo
    ? bilboIds.has(ejercicioExactoBilbo.id)
    : false

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await musculoService.getAll()
        if (!cancelled) setMusculos(data)
      } catch {
        if (!cancelled) setMusculos([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!usuario) {
      setEjerciciosBilbo([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const data = await bilboService.getAll(usuario.id)
        if (!cancelled) setEjerciciosBilbo(data)
      } catch {
        if (!cancelled) setEjerciciosBilbo([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [usuario])

  const refrescarEjercicios = async () => {
    const lista = await ejercicioService.getAll()
    onEjerciciosActualizados(lista)
  }

  const refrescarBilbo = async () => {
    if (!usuario) return
    const data = await bilboService.getAll(usuario.id)
    setEjerciciosBilbo(data)
  }

  const handleCrearEjercicio = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorCrear("")
    setOkCrear("")
    const nombre = nombreBusqueda.trim()
    if (!nombre) {
      setErrorCrear("Indicá un nombre para el ejercicio.")
      return
    }
    if (!musculoPrincipalId) {
      setErrorCrear("Elegí un músculo principal.")
      return
    }
    if (hayCoincidenciaExacta) {
      setErrorCrear("Ya existe un ejercicio con ese nombre en el catálogo.")
      return
    }
    setCreando(true)
    try {
      await ejercicioService.create({
        nombre,
        musculoPrincipalId,
        descripcion: descripcion.trim() || undefined,
      })
      setOkCrear(`«${nombre}» se agregó al catálogo.`)
      setDescripcion("")
      await refrescarEjercicios()
    } catch (err) {
      setErrorCrear(err instanceof Error ? err.message : "No se pudo crear el ejercicio.")
    } finally {
      setCreando(false)
    }
  }

  const handleCrearBilbo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuario) {
      setErrorBilbo("Tenés que estar logueado.")
      return
    }
    setErrorBilbo("")
    setOkBilbo("")
    const nombre = nombreBilbo.trim()
    if (!nombre) {
      setErrorBilbo("Indicá un nombre para el ejercicio.")
      return
    }
    if (!(pesoInicialBilbo > 0)) {
      setErrorBilbo("El peso inicial debe ser mayor a 0.")
      return
    }
    if (!(incrementoBilbo > 0)) {
      setErrorBilbo("El incremento debe ser mayor a 0.")
      return
    }
    if (yaEsBilbo) {
      setErrorBilbo("Ese ejercicio ya está configurado para el método Bilbo.")
      return
    }

    setCreandoBilbo(true)
    try {
      let ejercicioId = ejercicioExactoBilbo?.id

      if (!ejercicioId) {
        if (!musculoBilboId) {
          setErrorBilbo("Elegí un músculo principal para crear el ejercicio.")
          setCreandoBilbo(false)
          return
        }
        ejercicioId = await ejercicioService.create({
          nombre,
          musculoPrincipalId: musculoBilboId,
        })
        await refrescarEjercicios()
      }

      await bilboService.create(usuario.id, {
        ejercicioId,
        pesoInicial: pesoInicialBilbo,
        incremento: incrementoBilbo,
      })
      await refrescarBilbo()

      setOkBilbo(
        ejercicioExactoBilbo
          ? `«${nombre}» se configuró para Bilbo.`
          : `«${nombre}» se creó y se configuró para Bilbo.`
      )
      setPesoInicialBilbo(0)
      setIncrementoBilbo(2.5)
      setMusculoBilboId("")
    } catch (err) {
      setErrorBilbo(err instanceof Error ? err.message : "No se pudo configurar Bilbo.")
    } finally {
      setCreandoBilbo(false)
    }
  }

  return (
    <aside className="flex flex-col gap-4">
      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dark-text-muted mb-3">
          Series por músculo
        </h2>
        {total === 0 ? (
          <p className="text-sm text-dark-text-muted">
            Cuando agregues ejercicios con series, acá verás el reparto por músculo.
          </p>
        ) : (
          <>
            <p className="text-xs text-dark-text-muted mb-2">
              Total semanal: <span className="font-semibold text-dark-text">{total}</span> series
            </p>
            <div className="overflow-x-auto rounded-md border border-dark-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border bg-dark-surface/80 text-left text-dark-text-muted">
                    <th className="px-2 py-1.5 font-medium">Músculo</th>
                    <th className="px-2 py-1.5 font-medium text-right w-16">Series</th>
                  </tr>
                </thead>
                <tbody>
                  {porMusculo.map((row) => {
                    const color = getMuscleColorWithDefault(row.musculo)
                    return (
                      <tr key={row.musculo} className="border-b border-dark-border/60 last:border-0">
                        <td className="px-2 py-1.5">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: color === "transparent" ? "#64748b" : color }}
                              aria-hidden
                            />
                            <span className="text-dark-text">{row.musculo}</span>
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-dark-text">{row.series}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dark-text-muted mb-1">
          Ejercicio rápido
        </h2>
        <p className="text-xs text-dark-text-muted mb-3">
          Buscá en el catálogo; si no está, completá músculo y creá uno sin salir de la rutina.
        </p>

        <div className="space-y-3">
          <Input
            label="Buscar o nombre nuevo"
            placeholder="Ej: remo con barra…"
            value={nombreBusqueda}
            onChange={(e) => {
              setNombreBusqueda(e.target.value)
              setOkCrear("")
              setErrorCrear("")
            }}
            fullWidth
            className="py-2 text-base"
          />

          {nombreBusqueda.trim() ? (
            <div className="rounded-md border border-dark-border bg-dark-surface/40 p-2">
              <p className="text-xs font-medium text-dark-text-muted mb-1.5">Coincidencias</p>
              {coincidencias.length === 0 ? (
                <p className="text-xs text-dark-text-muted">Ningún ejercicio coincide con la búsqueda.</p>
              ) : (
                <ul className="max-h-36 space-y-1 overflow-y-auto text-xs">
                  {coincidencias.map((ej) => (
                    <li
                      key={ej.id}
                      className="flex justify-between gap-2 rounded px-1 py-0.5 text-dark-text hover:bg-dark-bg/80"
                    >
                      <span className="min-w-0 truncate font-medium">{ej.nombre}</span>
                      <span className="shrink-0 text-dark-text-muted">{ej.musculoPrincipal}</span>
                    </li>
                  ))}
                </ul>
              )}
              {hayCoincidenciaExacta ? (
                <p className="mt-2 text-xs text-amber-400/90">Ya existe un ejercicio con ese nombre exacto.</p>
              ) : null}
            </div>
          ) : null}

          <form onSubmit={handleCrearEjercicio} className="space-y-3 border-t border-dark-border pt-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-dark-text">Músculo principal (nuevo)</label>
              <select
                value={musculoPrincipalId}
                onChange={(e) => {
                  setMusculoPrincipalId(e.target.value)
                  setErrorCrear("")
                }}
                className={selectCompactClass}
                required
              >
                <option value="">Elegir…</option>
                {musculos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-dark-text">Descripción (opcional)</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={2}
                placeholder="Notas breves…"
                className="w-full resize-none rounded-md border border-dark-border bg-dark-bg px-2 py-1.5 text-sm text-dark-text placeholder:text-dark-text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>
            {errorCrear ? <p className="text-xs text-red-400">{errorCrear}</p> : null}
            {okCrear ? <p className="text-xs text-emerald-400/90">{okCrear}</p> : null}
            <Button type="submit" variant="secondary" size="sm" fullWidth disabled={creando || hayCoincidenciaExacta}>
              {creando ? "Creando…" : "Crear y sumar al catálogo"}
            </Button>
          </form>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dark-text-muted mb-1">
          Bilbo rápido
        </h2>
        <p className="text-xs text-dark-text-muted mb-3">
          Buscá un ejercicio; si ya está en Bilbo lo vas a ver. Si existe en el catálogo, solo configurá peso e
          incremento. Si no existe, crealo y configuralo acá.
        </p>

        <div className="space-y-3">
          <Input
            label="Buscar o nombre nuevo"
            placeholder="Ej: press banca…"
            value={nombreBilbo}
            onChange={(e) => {
              setNombreBilbo(e.target.value)
              setOkBilbo("")
              setErrorBilbo("")
            }}
            fullWidth
            className="py-2 text-base"
          />

          {nombreBilbo.trim() ? (
            <div className="rounded-md border border-dark-border bg-dark-surface/40 p-2">
              <p className="text-xs font-medium text-dark-text-muted mb-1.5">Coincidencias</p>
              {coincidenciasBilbo.length === 0 ? (
                <p className="text-xs text-dark-text-muted">Ningún ejercicio coincide con la búsqueda.</p>
              ) : (
                <ul className="max-h-36 space-y-1 overflow-y-auto text-xs">
                  {coincidenciasBilbo.map((ej) => {
                    const esBilbo = bilboIds.has(ej.id)
                    const config = ejerciciosBilbo.find((b) => b.ejercicioId === ej.id)
                    return (
                      <li
                        key={ej.id}
                        className="flex justify-between gap-2 rounded px-1 py-0.5 text-dark-text hover:bg-dark-bg/80"
                      >
                        <span className="min-w-0 truncate font-medium">
                          {ej.nombre}
                          {esBilbo ? (
                            <span className="ml-1 text-[10px] text-purple-300">Bilbo</span>
                          ) : null}
                        </span>
                        <span className="shrink-0 text-dark-text-muted">
                          {esBilbo && config
                            ? `${config.pesoInicial} kg / +${config.incremento}`
                            : ej.musculoPrincipal}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
              {yaEsBilbo ? (
                <p className="mt-2 text-xs text-amber-400/90">
                  Ya está configurado para el método Bilbo.
                </p>
              ) : ejercicioExactoBilbo ? (
                <p className="mt-2 text-xs text-emerald-400/80">
                  Existe en el catálogo: solo falta configurar Bilbo.
                </p>
              ) : null}
            </div>
          ) : null}

          <form onSubmit={handleCrearBilbo} className="space-y-3 border-t border-dark-border pt-3">
            {!ejercicioExactoBilbo ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-dark-text">
                  Músculo principal (si es nuevo)
                </label>
                <select
                  value={musculoBilboId}
                  onChange={(e) => {
                    setMusculoBilboId(e.target.value)
                    setErrorBilbo("")
                  }}
                  className={selectCompactClass}
                  required={!ejercicioExactoBilbo}
                >
                  <option value="">Elegir…</option>
                  {musculos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <NumberInput
              label="Peso inicial (kg)"
              value={pesoInicialBilbo || ""}
              onChange={(e) => setPesoInicialBilbo(parseDecimal(e.target.value) ?? 0)}
              min={0}
              step={0.5}
              fullWidth
              className="py-2 text-base"
            />

            <div>
              <label className="mb-1 block text-xs font-medium text-dark-text">Incremento (kg)</label>
              <select
                value={incrementoBilbo}
                onChange={(e) => setIncrementoBilbo(parseFloat(e.target.value))}
                className={selectCompactClass}
              >
                <option value={2.5}>2.5 kg</option>
                <option value={5}>5 kg</option>
              </select>
            </div>

            {errorBilbo ? <p className="text-xs text-red-400">{errorBilbo}</p> : null}
            {okBilbo ? <p className="text-xs text-emerald-400/90">{okBilbo}</p> : null}
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              fullWidth
              disabled={creandoBilbo || yaEsBilbo || !usuario}
            >
              {creandoBilbo
                ? "Guardando…"
                : ejercicioExactoBilbo
                  ? "Configurar para Bilbo"
                  : "Crear ejercicio y configurar Bilbo"}
            </Button>
          </form>
        </div>
      </Card>
    </aside>
  )
}
