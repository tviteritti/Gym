# Arquitectura Frontend - Gym Tracker

## Decisiones Arquitectónicas

### 1. Estructura de Carpetas

```
src/
├── pages/           # Páginas principales (Login, Home, Rutinas, etc.)
├── components/      # Componentes reutilizables
│   ├── ui/         # Componentes base (Button, Input, Card)
│   ├── layout/     # Layout components (Header, Navigation)
│   └── features/   # Componentes específicos de features
├── hooks/          # Custom hooks
├── services/       # Servicios API (desacoplados del UI)
├── store/          # Estado global con Zustand
├── types/          # Tipos e interfaces TypeScript
├── utils/          # Utilidades (formatters, validators)
└── config/           # Configuración (API endpoints, etc.)
```

### 2. Manejo de Estado

**Zustand** para estado global:
- `authStore`: Autenticación (token, usuario)
- `entrenamientoStore`: Estado del entrenamiento actual
- `rutinaStore`: Rutina activa y datos relacionados

**Estado local** con `useState` para:
- Formularios
- UI temporal (modals, dropdowns)
- Estado de componentes específicos

### 3. Servicios API

**Separación clara**:
- `apiClient.ts`: Cliente Axios configurado
- `authService.ts`: Endpoints de autenticación
- `ejercicioService.ts`: Endpoints de ejercicios
- `rutinaService.ts`: Endpoints de rutinas
- `entrenamientoService.ts`: Endpoints de entrenamientos

**Características**:
- Interceptores para agregar token JWT
- Manejo centralizado de errores
- Tipado fuerte con TypeScript

### 4. Routing

**React Router v7**:
- Rutas protegidas con `ProtectedRoute`
- Lazy loading de páginas
- Navegación programática

### 5. UX/UI

**Principios**:
- Mobile First
- Inputs grandes y fáciles de usar
- Feedback visual inmediato
- Pocos clicks para acciones comunes
- Diseño limpio y minimalista

**Componentes clave**:
- `SerieInput`: Input grande para peso/reps
- `EjercicioCard`: Tarjeta de ejercicio con series
- `DaySelector`: Selector de día de la semana
- `ProgressIndicator`: Indicador de progreso

### 6. PWA

**Configuración**:
- Manifest.json
- Service Worker con Workbox
- Offline support básico
- Instalable en móviles

## Flujo de Datos

1. **Usuario interactúa** → Componente
2. **Componente** → Hook o Store
3. **Hook/Store** → Service API
4. **Service** → Backend
5. **Respuesta** → Store actualizado
6. **Store** → Componentes re-renderizados

## Tipado

- Interfaces para todas las entidades (Usuario, Ejercicio, Rutina, etc.)
- Tipos para requests/responses
- Tipos para props de componentes
- Enums para constantes (DiaSemana, etc.)

