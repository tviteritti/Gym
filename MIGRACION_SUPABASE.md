# Guía de Migración a Supabase

Esta guía explica cómo migrar la aplicación Gym Tracker de la API .NET con SQL Server a Supabase.

## Requisitos Previos

1. Una cuenta de Supabase (gratuita en [supabase.com](https://supabase.com))
2. Un proyecto de Supabase creado
3. Node.js y npm instalados

## Pasos de Migración

### 1. Configurar Supabase

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **SQL Editor**
3. Abre el archivo `supabase/migrations/001_initial_schema.sql`
4. Copia y ejecuta todo el contenido del archivo en el SQL Editor de Supabase
5. Esto creará todas las tablas, índices, políticas RLS y triggers necesarios

### 2. Obtener Credenciales de Supabase

1. En el Dashboard de Supabase, ve a **Settings** > **API**
2. Copia la **URL del proyecto** (Project URL)
3. Copia la **Clave Anónima** (anon/public key)

### 3. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto `gym-tracker` con el siguiente contenido:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima
```

**Ejemplo:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Instalar Dependencias

Las dependencias de Supabase ya están instaladas. Si necesitas reinstalarlas:

```bash
cd gym-tracker
npm install
```

### 5. Verificar Configuración

Asegúrate de que el archivo `src/config/supabase.ts` existe y está configurado correctamente.

### 6. Probar la Aplicación

```bash
npm run dev
```

## Cambios Realizados

### Servicios Migrados

- ✅ **Autenticación**: Ahora usa Supabase Auth en lugar de JWT custom
- ✅ **Músculos**: Migrado a Supabase
- ✅ **Ejercicios**: Migrado a Supabase con relaciones
- ✅ **Rutinas**: Migrado a Supabase con todas las relaciones anidadas
- ✅ **Entrenamientos**: Migrado a Supabase

### Características de Seguridad

- **Row Level Security (RLS)**: Todas las tablas tienen políticas RLS configuradas
- **Políticas de Acceso**: 
  - Los usuarios solo pueden ver/editar sus propios datos
  - Los músculos y ejercicios son de lectura pública pero escritura autenticada
- **Triggers Automáticos**:
  - Creación automática de registro de usuario al registrarse en Supabase Auth
  - Actualización automática de records cuando se ejecutan series

### Estructura de Base de Datos

La estructura de la base de datos se mantiene igual, solo cambia el motor de base de datos:

- **SQL Server** → **PostgreSQL** (Supabase)
- **uniqueidentifier** → **UUID**
- **datetime2** → **TIMESTAMPTZ**
- **nvarchar** → **TEXT**

## Diferencias Importantes

### Autenticación

- **Antes**: JWT tokens almacenados en localStorage
- **Ahora**: Supabase maneja automáticamente la autenticación y sesiones
- El store de autenticación ahora es asíncrono (`initialize()` es async)

### Manejo de Sesiones

- Supabase maneja automáticamente la persistencia de sesiones
- Los tokens se refrescan automáticamente
- Ya no necesitas manejar manualmente los tokens en localStorage

### Queries

- **Antes**: Llamadas REST a la API .NET
- **Ahora**: Queries directas a Supabase usando el cliente JavaScript
- Las relaciones se manejan con `select()` y joins

## Troubleshooting

### Error: "Faltan las variables de entorno"

Asegúrate de que el archivo `.env` existe y tiene las variables correctas. Reinicia el servidor de desarrollo después de crear/actualizar el archivo `.env`.

### Error: "Row Level Security policy violation"

Verifica que:
1. El usuario esté autenticado correctamente
2. Las políticas RLS estén aplicadas correctamente en Supabase
3. El trigger `handle_new_user` esté funcionando (debe crear el registro en `usuarios` cuando se registra un usuario)

### Error: "relation does not exist"

Verifica que hayas ejecutado la migración SQL completa en Supabase.

### Los records no se actualizan automáticamente

Verifica que el trigger `update_records_on_serie_insert` esté creado y activo en Supabase.

## Próximos Pasos

1. **Migrar Datos Existentes**: Si tienes datos en la base de datos SQL Server, necesitarás crear un script de migración
2. **Testing**: Prueba todas las funcionalidades de la aplicación
3. **Despliegue**: Actualiza las variables de entorno en tu plataforma de despliegue (Vercel, Netlify, etc.)

## Eliminación de la API .NET

Una vez que hayas verificado que todo funciona correctamente con Supabase, puedes:

1. Eliminar la carpeta `gym-tracker-api`
2. Eliminar los archivos `src/services/apiClient.ts` y `src/config/api.ts`
3. Remover `axios` de las dependencias si no se usa en otro lugar

## Soporte

Si encuentras problemas durante la migración, revisa:
- Los logs de la consola del navegador
- Los logs de Supabase Dashboard > Logs
- La documentación de Supabase: https://supabase.com/docs
