import type { TecnicaIntensidad } from "../../types"
import { TECNICAS_INTENSIDAD, TECNICAS_ORDEN, esTecnicaIntensidad, seriesTecnica } from "../../utils/tecnicaIntensidad"

interface TecnicaIntensidadSelectProps {
  tecnica?: TecnicaIntensidad
  series?: number
  onChange: (tecnica: TecnicaIntensidad | undefined, series: number | undefined) => void
  controlClassName: string
}

export const TecnicaIntensidadSelect = ({
  tecnica,
  series,
  onChange,
  controlClassName,
}: TecnicaIntensidadSelectProps) => {
  const activa = Boolean(tecnica)
  const cantidad = tecnica ? seriesTecnica({ tecnicaIntensidad: tecnica, tecnicaSeries: series }) : undefined
  const opciones = tecnica ? TECNICAS_INTENSIDAD[tecnica].opcionesSeries : []
  const opcionesConActual =
    cantidad != null && !opciones.includes(cantidad) ? [...opciones, cantidad].sort((a, b) => a - b) : opciones

  return (
    <div className="flex gap-1.5 shrink-0 items-center">
      <select
        value={tecnica ?? ""}
        title={tecnica ? TECNICAS_INTENSIDAD[tecnica].descripcion : "Técnica de intensidad"}
        onChange={(e) => {
          const valor = e.target.value
          if (!esTecnicaIntensidad(valor)) {
            onChange(undefined, undefined)
            return
          }
          onChange(valor, TECNICAS_INTENSIDAD[valor].seriesPorDefecto)
        }}
        className={`${controlClassName} max-w-[112px] text-xs ${
          activa ? "border-orange-500/60 bg-orange-500/10 text-orange-300" : ""
        }`}
      >
        <option value="">Técnica…</option>
        {TECNICAS_ORDEN.map((t) => (
          <option key={t} value={t}>
            {TECNICAS_INTENSIDAD[t].label}
          </option>
        ))}
      </select>
      {tecnica ? (
        <select
          value={cantidad}
          title="Series extra"
          onChange={(e) => onChange(tecnica, parseInt(e.target.value, 10))}
          className={`w-14 ${controlClassName} px-1 text-xs text-center border-orange-500/60 bg-orange-500/10 text-orange-300`}
        >
          {opcionesConActual.map((n) => (
            <option key={n} value={n}>
              ×{n}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  )
}
