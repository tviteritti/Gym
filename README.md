# Gym Tracker - Frontend

Aplicación PWA para seguimiento de entrenamientos de gimnasio, desarrollada con React + TypeScript, Vite, y Tailwind CSS.

## Características

- ✅ PWA (Progressive Web App) - Instalable en móviles
- ✅ Autenticación JWT
- ✅ Entrenamiento del día con ejercicios planificados
- ✅ Registro de series ejecutadas (peso y repeticiones)
- ✅ Historial de ejercicios con cálculo de RM
- ✅ Gestión de rutinas
- ✅ Diseño mobile-first y responsive
- ✅ Inputs grandes y fáciles de usar

## Stack Tecnológico

- **React 19** + **TypeScript**
- **Vite** - Build tool
- **React Router v7** - Routing
- **Zustand** - Estado global
- **Axios** - Cliente HTTP
- **Tailwind CSS** - Estilos
- **Vite PWA Plugin** - Configuración PWA

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
```

Editar `.env` y configurar la URL de la API:
```
VITE_API_BASE_URL=https://localhost:5001/api
```

3. Ejecutar en desarrollo:
```bash
npm run dev
```

4. Build para producción:
```bash
npm run build
```

## Estructura del Proyecto

```
src/
├── pages/              # Páginas principales
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── HomePage.tsx
│   ├── RutinasPage.tsx
│   └── EjerciciosPage.tsx
├── components/         # Componentes
│   ├── ui/            # Componentes base
│   ├── features/      # Componentes de features
│   └── layout/         # Componentes de layout
├── services/          # Servicios API
│   ├── apiClient.ts
│   ├── authService.ts
│   ├── ejercicioService.ts
│   ├── rutinaService.ts
│   └── entrenamientoService.ts
├── store/             # Estado global (Zustand)
│   ├── authStore.ts
│   └── entrenamientoStore.ts
├── types/             # Tipos TypeScript
├── utils/             # Utilidades
└── config/            # Configuración
```

## Rutas

- `/login` - Iniciar sesión
- `/register` - Registrarse
- `/home` - Entrenamiento del día (protegida)
- `/rutinas` - Gestión de rutinas (protegida)
- `/ejercicios` - Listado y historial de ejercicios (protegida)

## Características UX

### Diseño Mobile-First
- Inputs grandes (py-3, text-lg) para fácil uso en móvil
- Botones con tamaño adecuado para touch
- Navegación clara y accesible

### Feedback Visual
- Estados de carga en botones
- Mensajes de error claros
- Indicadores visuales de progreso

### Flujo de Entrenamiento
1. Seleccionar día de la semana
2. Ver ejercicios planificados
3. Iniciar entrenamiento
4. Completar series (peso y reps)
5. Guardar ejercicio
6. Continuar con siguiente ejercicio

## PWA

La aplicación está configurada como PWA:
- Instalable en dispositivos móviles
- Funciona offline (con service worker)
- Iconos y manifest configurados

Para generar los iconos PWA, crear:
- `public/pwa-192x192.png` (192x192px)
- `public/pwa-512x512.png` (512x512px)

## Próximos Pasos

- [ ] Implementar creación de rutinas
- [ ] Implementar creación de ejercicios
- [ ] Agregar gráficos de progreso
- [ ] Implementar notificaciones
- [ ] Mejorar soporte offline
- [ ] Agregar modo oscuro
