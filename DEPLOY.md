# Guía de Despliegue a GitHub Pages

Esta guía explica cómo desplegar la aplicación Gym Tracker a GitHub Pages.

## Requisitos Previos

1. Un repositorio en GitHub
2. Las credenciales de Supabase (URL y Anon Key)

## Pasos para Desplegar

### 1. Configurar GitHub Secrets

Las variables de entorno no deben estar en el repositorio. En su lugar, se configuran como **Secrets** en GitHub:

1. Ve a tu repositorio en GitHub
2. Haz clic en **Settings** (Configuración)
3. En el menú lateral, haz clic en **Secrets and variables** > **Actions**
4. Haz clic en **New repository secret**
5. Agrega los siguientes secrets:

   - **Nombre**: `VITE_SUPABASE_URL`
     **Valor**: Tu URL de Supabase (ej: `https://abcdefghijklmnop.supabase.co`)

   - **Nombre**: `VITE_SUPABASE_ANON_KEY`
     **Valor**: Tu clave anónima de Supabase

### 2. Habilitar GitHub Pages

1. En tu repositorio, ve a **Settings** > **Pages**
2. En **Source**, selecciona **GitHub Actions**
3. Guarda los cambios

### 3. Configurar el Branch Principal

El workflow está configurado para ejecutarse en los branches `main` o `master`. Asegúrate de que tu repositorio use uno de estos nombres.

Si tu repositorio usa otro nombre de branch:
1. Edita el archivo `.github/workflows/deploy.yml`
2. Cambia `main` o `master` por el nombre de tu branch

### 4. Si tu Repositorio NO es `usuario.github.io`

Si tu repositorio tiene un nombre diferente a `usuario.github.io`, GitHub Pages servirá la aplicación desde una subruta (ej: `/nombre-repo/`).

En ese caso, necesitas configurar el `base` en `vite.config.ts`:

```typescript
export default defineConfig({
  base: '/nombre-de-tu-repositorio/',
  plugins: [
    // ...
  ],
})
```

**Importante**: Reemplaza `nombre-de-tu-repositorio` con el nombre real de tu repositorio.

### 5. Hacer Push de los Cambios

Una vez configurado todo:

```bash
git add .
git commit -m "Configurar deploy a GitHub Pages"
git push
```

El workflow de GitHub Actions se ejecutará automáticamente y desplegará la aplicación.

### 6. Verificar el Deploy

1. Ve a la pestaña **Actions** en tu repositorio
2. Verifica que el workflow se haya ejecutado correctamente
3. Una vez completado, ve a **Settings** > **Pages** para ver la URL de tu aplicación desplegada

## Estructura de Archivos Creados

- `.github/workflows/deploy.yml`: Workflow de GitHub Actions para deploy automático
- `.env.example`: Ejemplo de variables de entorno (para referencia local)
- `.gitignore`: Actualizado para ignorar archivos `.env`

## Solución de Problemas

### El deploy falla con "Missing environment variable"

- Verifica que hayas creado los secrets en GitHub (Settings > Secrets and variables > Actions)
- Verifica que los nombres de los secrets sean exactamente: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`

### La aplicación no carga correctamente

- Si tu repositorio NO es `usuario.github.io`, asegúrate de haber configurado el `base` en `vite.config.ts`
- Verifica que la URL de GitHub Pages sea correcta

### El workflow no se ejecuta

- Verifica que hayas hecho push al branch `main` o `master`
- Verifica que GitHub Pages esté habilitado (Settings > Pages > Source: GitHub Actions)
