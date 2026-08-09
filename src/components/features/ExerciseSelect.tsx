import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react"
import { createPortal } from "react-dom"
import { getMuscleColorWithDefault } from "../../constants/muscleColors"
import type { Ejercicio } from "../../types"

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()

type ExerciseSelectProps = {
  ejercicios: Ejercicio[]
  value: string
  onChange: (ejercicioId: string) => void
  className?: string
  placeholder?: string
  required?: boolean
}

type GrupoMusculo = {
  musculo: string
  color: string
  ejercicios: Ejercicio[]
}

export const ExerciseSelect = ({
  ejercicios,
  value,
  onChange,
  className = "",
  placeholder = "Ejercicio…",
  required = false,
}: ExerciseSelectProps) => {
  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})

  const seleccionado = useMemo(
    () => ejercicios.find((e) => e.id === value) ?? null,
    [ejercicios, value]
  )

  const colorSeleccionado = seleccionado
    ? getMuscleColorWithDefault(seleccionado.musculoPrincipal)
    : "transparent"

  const grupos = useMemo((): GrupoMusculo[] => {
    const q = normalizar(busqueda)
    const filtrados = q
      ? ejercicios.filter(
          (e) =>
            normalizar(e.nombre).includes(q) ||
            normalizar(e.musculoPrincipal || "").includes(q)
        )
      : ejercicios

    const mapa = new Map<string, Ejercicio[]>()
    for (const ej of filtrados) {
      const musculo = ej.musculoPrincipal?.trim() || "Sin músculo"
      if (!mapa.has(musculo)) mapa.set(musculo, [])
      mapa.get(musculo)!.push(ej)
    }

    return [...mapa.entries()]
      .map(([musculo, items]) => ({
        musculo,
        color: getMuscleColorWithDefault(musculo, "#64748b"),
        ejercicios: items.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
      }))
      .sort((a, b) => a.musculo.localeCompare(b.musculo, "es"))
  }, [ejercicios, busqueda])

  const actualizarPosicion = () => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const width = Math.max(rect.width, 260)
    const maxHeight = Math.min(360, window.innerHeight - 24)
    let top = rect.bottom + 6
    if (top + Math.min(maxHeight, 280) > window.innerHeight - 8) {
      top = Math.max(8, rect.top - 6 - Math.min(maxHeight, 280))
    }
    let left = rect.left
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8)
    }
    setPanelStyle({
      position: "fixed",
      top,
      left,
      width,
      maxHeight,
      zIndex: 80,
    })
  }

  useEffect(() => {
    if (!open) return
    actualizarPosicion()
    const onScrollOrResize = () => actualizarPosicion()
    window.addEventListener("resize", onScrollOrResize)
    window.addEventListener("scroll", onScrollOrResize, true)
    return () => {
      window.removeEventListener("resize", onScrollOrResize)
      window.removeEventListener("scroll", onScrollOrResize, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => searchRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
      setBusqueda("")
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        setBusqueda("")
        triggerRef.current?.focus()
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("touchstart", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("touchstart", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const seleccionar = (id: string) => {
    onChange(id)
    setOpen(false)
    setBusqueda("")
  }

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={value}
          onChange={() => {}}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      )}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full items-center gap-2 rounded-md border border-dark-border bg-dark-bg px-2 text-left text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-violet-500/40"
        style={{
          borderLeftWidth: seleccionado && colorSeleccionado !== "transparent" ? 4 : undefined,
          borderLeftColor:
            seleccionado && colorSeleccionado !== "transparent" ? colorSeleccionado : undefined,
        }}
      >
        {seleccionado && colorSeleccionado !== "transparent" && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: colorSeleccionado }}
            aria-hidden
          />
        )}
        <span className={`min-w-0 flex-1 truncate ${seleccionado ? "" : "text-dark-text-muted"}`}>
          {seleccionado ? seleccionado.nombre : placeholder}
        </span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-dark-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={listboxId}
            role="listbox"
            style={panelStyle}
            className="flex flex-col overflow-hidden rounded-lg border border-dark-border bg-dark-surface shadow-xl shadow-black/40"
          >
            <div className="shrink-0 border-b border-dark-border p-2">
              <input
                ref={searchRef}
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar ejercicio o músculo…"
                className="h-9 w-full rounded-md border border-dark-border bg-dark-bg px-3 text-sm text-dark-text placeholder:text-dark-text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    const primero = grupos[0]?.ejercicios[0]
                    if (primero) seleccionar(primero.id)
                  }
                }}
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
              {grupos.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-dark-text-muted">
                  No hay ejercicios que coincidan
                </p>
              ) : (
                grupos.map((grupo) => (
                  <div key={grupo.musculo} className="mb-1">
                    <div
                      className="sticky top-0 z-[1] flex items-center gap-2 border-b border-dark-border/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-dark-text"
                      style={{ backgroundColor: `${grupo.color}22` }}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: grupo.color }}
                        aria-hidden
                      />
                      <span className="truncate">{grupo.musculo}</span>
                      <span className="ml-auto tabular-nums text-dark-text-muted font-normal normal-case tracking-normal">
                        {grupo.ejercicios.length}
                      </span>
                    </div>
                    {grupo.ejercicios.map((ej) => {
                      const activo = ej.id === value
                      return (
                        <button
                          key={ej.id}
                          type="button"
                          role="option"
                          aria-selected={activo}
                          onClick={() => seleccionar(ej.id)}
                          className={`flex w-full items-center gap-2 border-l-4 px-3 py-2 text-left text-sm transition-colors ${
                            activo
                              ? "bg-violet-500/20 text-dark-text"
                              : "text-dark-text hover:bg-dark-hover"
                          }`}
                          style={{ borderLeftColor: grupo.color }}
                        >
                          <span className="min-w-0 flex-1 truncate">{ej.nombre}</span>
                          {activo && (
                            <svg className="h-3.5 w-3.5 shrink-0 text-violet-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                              <path
                                fillRule="evenodd"
                                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
