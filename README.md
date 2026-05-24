# SIAM Frontend

Interfaz web del Sistema Integral de Administración y Mercadería, construida con React + Vite + TypeScript + SCSS.

---

## Stack

- React 18
- TypeScript 5
- Vite 6
- React Router 6
- Axios
- SCSS/Sass
- pnpm

---

## Requisitos previos

- **Node.js** v18 o superior → https://nodejs.org
- **pnpm** → ver instrucciones de instalación abajo
- **siam-api** corriendo en `localhost:3000` → ver README del backend

---

## Paso 1 — Instalar pnpm

Abrí PowerShell **como Administrador** y ejecutá:

```powershell
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

Cerrá y abrí una terminal nueva. Verificá:

```powershell
pnpm -v
```

---

## Paso 2 — Clonar e instalar

```powershell
git clone https://github.com/TU_USUARIO/siam-frontend.git
cd siam-frontend
pnpm install
```

Si pnpm pide aprobar build scripts:

```powershell
pnpm approve-builds
```

Seleccioná todos con espacio y confirmá con Enter.

---

## Paso 3 — Verificar que el backend está corriendo

El frontend consume la API en `localhost:3000`. Antes de levantar el frontend asegurate de que `siam-api` esté corriendo:

```powershell
# En la carpeta siam-api
pnpm start:dev
```

---

## Paso 4 — Levantar el frontend

```powershell
pnpm dev
```

Abrí el navegador en `http://localhost:5173`.

---

## Paso 5 — Verificar que funciona

En la pantalla de login ingresá con cualquier usuario de la tabla `USUARIO` de la BD:

- **Alias:** `bladyd`
- **Contraseña:** `pmb`

Si el login redirige al dashboard, todo está funcionando.

---

## Scripts disponibles

```powershell
pnpm dev        # desarrollo con hot reload
pnpm build      # compilar para producción
pnpm preview    # previsualizar el build
pnpm lint       # linter
```

---

## Estructura del proyecto

```
src/
├── api/
│   └── axios.ts          # Cliente HTTP con interceptores JWT
├── components/           # Componentes reutilizables
├── context/
│   └── AuthContext.tsx   # Estado global de autenticación
├── pages/                # Páginas/vistas
│   ├── Login.tsx
│   └── Dashboard.tsx
├── routes/
│   └── PrivateRoute.tsx  # Guard de rutas protegidas
├── types/
│   └── index.ts          # Tipos TypeScript alineados con el backend
├── App.tsx               # Router principal
└── main.tsx
```

---

## Cómo funciona la autenticación

1. El usuario ingresa alias y contraseña en `/login`
2. El frontend llama a `POST /api/auth/login` en el backend
3. El backend devuelve un JWT con los datos del usuario y su rol
4. El token se guarda en `localStorage` con la key `token`
5. Axios inyecta el token automáticamente en cada request siguiente
6. Si el token expira (8 horas), el interceptor redirige automáticamente a `/login`

---

## Conexión con el backend

El proxy de Vite redirige todas las llamadas a `/api/*` hacia `http://localhost:3000`. Esto significa que en el código nunca se hardcodea la URL del backend — solo se usa `/api/...`.

Configuración en `vite.config.ts`:

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
}
```

---

## Reglas del proyecto

- Todas las llamadas HTTP van a través de `src/api/axios.ts`
- Los tipos van en `src/types/index.ts`
- Estilos en SCSS — un archivo por componente/página
- No usar `any`
- Componentes en PascalCase
- Carpetas en kebab-case
- Ver `CONTEXT-FRONTEND.md` para guía completa de arquitectura y colaboración

---

## Problemas frecuentes

**pnpm dev falla con ERR_PNPM_IGNORED_BUILDS**
Ejecutá `pnpm approve-builds`, aprobá todos y volvé a correr `pnpm dev`.

**Pantalla en blanco o error de CORS**
Verificá que el backend esté corriendo en `localhost:3000` y que tenga CORS habilitado para `localhost:5173`.

**El login no redirige al dashboard**
Abrí DevTools → Network y verificá que el request a `/api/auth/login` devuelva 200 con el token.

**pnpm no se reconoce después de instalar**
Cerrá y abrí una terminal nueva para recargar el PATH.
