# CONTEXT-FRONTEND.md — Guía de colaboración SIAM Frontend

Este documento es la fuente de verdad para el desarrollo colaborativo del frontend de SIAM.
Pasalo completo a la IA al inicio de cada sesión de trabajo de frontend.
Actualizalo cada vez que se implementen nuevas funcionalidades.

> Para contexto del backend ver `CONTEXT.md`

---

## ¿Qué es SIAM Frontend?

Interfaz web del Sistema Integral de Administración y Mercadería. Consume la API REST del backend SIAM corriendo en `localhost:3000`.

---

## Stack tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| React | 18+ | Framework UI |
| TypeScript | 5.x | Lenguaje |
| Vite | 6.x | Bundler y dev server |
| React Router | 6.x | Navegación |
| Axios | 1.x | Cliente HTTP |
| SCSS/Sass | - | Estilos |
| pnpm | 10.x | Package manager |

---

## Estructura de carpetas

```
src/
├── api/
│   └── axios.ts          # Cliente HTTP con interceptores
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

## Configuración del cliente HTTP

```typescript
// src/api/axios.ts
// URL base: /api (proxy hacia localhost:3000 via vite.config.ts)
// Interceptor request: inyecta JWT desde localStorage automáticamente
// Interceptor response: redirige a /login si recibe 401
```

El proxy en `vite.config.ts` redirige `/api/*` a `http://localhost:3000` — nunca hardcodear la URL del backend en los componentes.

---

## Autenticación

- Token JWT guardado en `localStorage` con key `token`
- Usuario guardado en `localStorage` con key `usuario` (JSON)
- `AuthContext` provee: `usuario`, `token`, `login()`, `logout()`, `isAuthenticated`
- `PrivateRoute` redirige a `/login` si no hay token
- Token expira en 8 horas (definido en el backend)

### Payload del JWT
```typescript
{
  cod_usu: string;    // '0000001'
  alias: string;      // 'bladyd'
  nombre: string;     // 'BLADIMIR'
  apellido: string;   // 'PAZ MAMANI'
  rol: string | null; // 'Administrador' | null
  id_rol: number | null;
}
```

---

## Tipos TypeScript — alineados con el backend

```typescript
// src/types/index.ts

interface Usuario { cod_usu, alias, nombre, apellido, rol, id_rol }
interface AuthResponse { access_token, usuario }
interface Rol { id, nombre, descripcion, activo, createdAt, updatedAt }
interface PerfilCliente { cod_cli, razon_social, num_ci_nit, telefono, celular, domicilio, activo, extension }
interface GananciaNeta { rango, ingresos_brutos, costo_mercancia, ganancia_neta, margen_porcentaje }
```

---

## Rutas configuradas

| Ruta | Componente | Protegida |
|---|---|---|
| `/login` | `Login` | No |
| `/dashboard` | `Dashboard` | Sí |
| `*` | Redirect a `/login` | — |

---

## Endpoints del backend disponibles

| Método | Ruta | Descripción |
|---|---|---|
| POST | /api/auth/login | Login → devuelve JWT |
| GET | /api/roles | Listar roles |
| POST | /api/roles | Crear rol |
| PUT | /api/roles/:id | Actualizar rol |
| DELETE | /api/roles/:id | Desactivar rol |
| POST | /api/roles/asignar | Asignar rol a usuario |
| GET | /api/roles/usuario/:cod_usu | Ver rol de usuario |
| GET | /api/productos/search | Búsqueda básica |
| GET | /api/productos/search/codigo | Búsqueda por código |
| GET | /api/productos/search/advanced | Búsqueda avanzada con paginación |
| GET | /api/productos/:id/stock | Stock por sucursal |
| GET | /api/productos/:id/ingresos | Historial de ingresos |
| GET | /api/productos/:id/salidas | Historial de salidas |
| GET | /api/productos/:id/kardex | Kardex unificado |
| GET | /api/clientes/:cod_cli/perfil | Perfil combinado del cliente |
| PUT | /api/clientes/:cod_cli/extension | Actualizar extensión del cliente |
| GET | /api/clientes/:cod_cli/historial-compras | Historial de compras |
| GET | /api/reportes/ingresos | Ingresos totales por rango |
| GET | /api/reportes/costos | Costos de mercancía por rango |
| GET | /api/reportes/ganancia | Ganancia neta por rango |

---

## Convenciones de desarrollo

- Componentes en PascalCase: `LoginForm.tsx`
- Carpetas en kebab-case: `user-profile/`
- Hooks personalizados con prefijo `use`: `useAuth`, `useProductos`
- Llamadas HTTP siempre a través de `src/api/axios.ts`, nunca fetch directo
- Tipos siempre en `src/types/index.ts`
- No hardcodear URLs — usar siempre el cliente axios configurado
- Estilos en SCSS — un archivo `.scss` por componente/página
- No usar `any`

---

## Épicas y estado actual

### ÉPICA F1 — Infraestructura y configuración ✅

**HU-F1.01 — Inicialización y enrutamiento** ✅
- Proyecto Vite + React + TypeScript creado
- React Router configurado con rutas `/login`, `/dashboard` y redirect `*`
- `PrivateRoute` implementado
- Estructura de carpetas definida

**HU-F1.02 — Cliente HTTP e interceptores** ✅
- Axios configurado con base URL `/api`
- Proxy en `vite.config.ts` hacia `localhost:3000`
- Interceptor de request: inyecta JWT automáticamente
- Interceptor de response: redirige a `/login` en 401
- `AuthContext` con `login()`, `logout()`, `isAuthenticated`

---

## Cómo usar este documento con la IA

Al iniciar una sesión de trabajo frontend, pegá este documento y decile:

> "Este es el contexto completo del frontend SIAM. [descripción de lo que querés hacer]"

Si también necesitás contexto del backend (para saber qué endpoints usar o qué devuelven), pegá también el `CONTEXT.md` del backend.

Al terminar una sesión, pedile a la IA:

> "Actualizá el CONTEXT-FRONTEND.md con lo que implementamos hoy"

---

## Comandos útiles

```powershell
pnpm dev          # levantar en desarrollo (localhost:5173)
pnpm build        # compilar para producción
pnpm preview      # previsualizar build
pnpm approve-builds  # aprobar build scripts si pnpm los bloquea
```

---

## Problemas frecuentes

**pnpm dev falla con ERR_PNPM_IGNORED_BUILDS**
Ejecutá `pnpm approve-builds`, aprobá todos y volvé a correr `pnpm dev`.

**CORS error al llamar al backend**
Verificar que en `siam-api/src/main.ts` esté `app.enableCors({ origin: 'http://localhost:5173' })` y que el backend esté corriendo.

**Token no se envía en los requests**
Verificar que el token esté guardado en `localStorage` con la key exacta `token`.
