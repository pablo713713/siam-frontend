# contextCredito.md — Guía de colaboración SIAM (Módulo Créditos)

Este documento complementa a CONTEXT.md. Pasalo completo a la IA / al equipo de
frontend al iniciar trabajo sobre el módulo de créditos.

---

## ¿Qué es este módulo?

Gestión de ventas a crédito (a plazo) sobre la misma base `BDSIAM`, reutilizando
las tablas legacy `CREDITO`, `DET_CREDITO`, `PAGO_CREDITO`, `DEVOLUCION_CREDITO`,
`DET_DEVOLUCION_CREDITO`. No se crearon tablas satélite nuevas — el tope de
crédito usa la columna legacy `CLIENTE.CREDITO_MAXIMO`, que ya existía.

---

## Tablas legacy involucradas

| Tabla | Rol |
|---|---|
| `CREDITO` | Cabecera del crédito (`COD_CRE` PK, cliente, usuario, fechas, total, saldo, estado) |
| `DET_CREDITO` | Ítems del crédito (por `ID_FAB`, igual que `DET_VENTA`) |
| `PAGO_CREDITO` | Cabecera de cada abono/pago parcial |
| `DEVOLUCION_CREDITO` | Cabecera de una devolución sobre un crédito |
| `DET_DEVOLUCION_CREDITO` | Ítems devueltos de un crédito |
| `CLIENTE.CREDITO_MAXIMO` | Tope de crédito propio de cada cliente (columna ya existente, sin tabla nueva) |

---

## Estados reales de `CREDITO.ESTADO` (confirmado con datos de producción)

⚠️ El CONTEXT.md original tenía esto mal documentado. La tabla real:

| Estado | Significado | ¿Lo usa el sistema nuevo? |
|---|---|---|
| `A` | Activo — saldo pendiente > 0 | ✅ Sí, es el estado principal |
| `C` | Pagado / cerrado — saldo = 0 | ✅ Sí, se setea automático al saldar |
| `N`, `AC` | Estados transicionales legacy (proforma→crédito) | ❌ No se generan desde el módulo nuevo |
| `CD`, `D`, `DC`, `DD` | Variantes legacy de cierre con devolución | ❌ Solo aparecen en créditos históricos |

**El sistema nuevo solo trabaja con dos estados: `A` (activo) y `C` (pagado).**
Un crédito nuevo se crea directo en `A` (sin pasos intermedios tipo proforma).

---

## Formato de códigos (IMPORTANTE para debug)

- **`COD_CRE`**: `{COD_USU(7)}{YY(2)}{secuencial(4)}` = 13 caracteres.
  Ejemplo: `1010220260001` → usuario `1010220`, año `26`, secuencial `0001`.
- **`N_PAGO`**: `{COD_CRE(13)}{secuencial_del_pago(2)}` = 15 caracteres.
  Ejemplo: `201012026000401` → crédito `2010120260004`, es el pago número `01`
  de ese crédito (el segundo pago, ya que empieza en `00`).

---

## Reglas de negocio implementadas

1. **Tope de crédito por cliente**: cada cliente tiene su propio
   `CREDITO_MAXIMO`. El cupo disponible = `CREDITO_MAXIMO - SUM(SALDO)` de
   todos sus créditos con `ESTADO='A'`. Un cliente puede tener **múltiples
   créditos abiertos simultáneamente**, mientras la suma de sus saldos no
   supere su tope individual.
2. **Cliente habilitado para crédito** = `CREDITO_MAXIMO IS NOT NULL AND
   CREDITO_MAXIMO > 0`.
3. **Validación de stock**: igual que en venta contado, valida por `ID_FAB`
   y sucursal antes de descontar (soporta distribución multi-almacén).
4. **Plazo de pago**: default 4 semanas desde la fecha de creación, editable
   por el usuario al crear el crédito (`semanasPlazo` en el DTO).
5. **Semáforo de vencimiento** (campo `alerta` en las respuestas):
   - `ok` (verde claro) → `diasRestantes >= 14`
   - `proximo` (amarillo) → `0 <= diasRestantes < 14`
   - `vencido` (rojo) → `diasRestantes < 0`
6. **NO implementado en esta entrega**: prórrogas de plazo (`PRORROGA_CREDITO`)
   — queda pendiente para una siguiente iteración.
7. Correcciones deliberadas sobre el legacy: se ignora el chequeo hardcodeado
   de sucursales que empiezan con `'1'` (no es una regla de negocio real,
   aplica el tope de crédito a todas las sucursales por igual), y no se
   replica el `CHECK(PRECIO_CRE >= -50)` — el DTO valida `precio_cre >= 0`.

---

## Endpoints disponibles

### `POST /creditos`
Crea un crédito nuevo (valida stock + cupo, descuenta stock, activa directo
en `ESTADO='A'`).

**Body** (`CreateCreditoDto`):
```typescript
{
  cod_cli: number;
  cod_suc: string;
  semanasPlazo?: number;      // default 4
  descuento?: number;         // %, default 0
  dolar?: number;
  obs?: string;
  cod_usu: string;
  items: [{
    id_fab: number;
    cod_fab: string;
    cantidad: number;
    precio_cre: number;
    distribucion?: [{ cod_suc: string; cantidad: number }]; // opcional, multi-almacén
  }]
}
```

**Respuesta:**
```typescript
{ cod_cre, total, fecFin, items, message }
```

**Errores esperados:** `400` si el cliente no tiene crédito habilitado, si no
hay stock suficiente, o si el monto excede el cupo disponible del cliente.

---

### `GET /creditos/activos`
Apartado 1: lista todos los créditos con `ESTADO='A'` (aún no cancelados).

**Respuesta:** array de:
```typescript
{
  codCre, codCli, nomCliente, apeCliente, razonSocial,
  fecInicio, fecFin, total, saldo, diasRestantes,
  alerta: 'ok' | 'proximo' | 'vencido'
}
```

---

### `GET /creditos/clientes-habilitados`
Apartado 2, panel izquierdo: **todos** los clientes con crédito habilitado
(no solo los que tienen créditos abiertos actualmente).

**Respuesta:** array de:
```typescript
{
  codCli, nomCliente, apeCliente, razonSocial, creditoMaximo, usado, disponible,
  alerta: 'ok' | 'proximo' | 'vencido' | null
}
```

⚠️ **Semáforo por cliente (para pintar la fila en el panel izquierdo)**: el
frontend debe pintar cada cliente según sus créditos activos:
- verde muy claro → sus créditos activos vencen en ≥ 14 días
- amarillo → tiene al menos un crédito activo que vence en < 14 días
- rojo → tiene al menos un crédito activo ya vencido

Como un cliente puede tener varios créditos activos con distinto
`diasRestantes`, el backend calcula `alerta` como el **peor caso** entre
todos sus créditos activos (mismas reglas de `ok/proximo/vencido` ya
definidas más arriba: `vencido` gana sobre `proximo`, que gana sobre `ok`).
`alerta: null` si el cliente no tiene ningún crédito activo (no se pinta).

---

### `GET /creditos/cliente/:cod_cli`
Apartado 2, panel derecho: créditos activos de un cliente puntual.

**Respuesta:**
```typescript
{
  creditos: [{ codCre, fecInicio, fecFin, total, saldo, diasRestantes, alerta }],
  totalSaldos: number   // suma de TODOS los saldos activos de ese cliente
}
```

⚠️ **Nota para frontend**: `totalSaldos` suma *todos* los créditos activos
del cliente. Si el usuario selecciona solo algunos créditos con checkboxes
para sumar (como pediste: "sumar los totales de todos los créditos
seleccionados"), esa suma parcial la calcula el frontend con los `saldo` de
los ítems marcados — el backend no sabe cuáles seleccionó el usuario.

---

### `POST /creditos/cliente/:cod_cli/pago-multiple`
Apartado 2, botón **"Pago crédito"**: paga en su totalidad varios créditos
activos de un mismo cliente en una sola operación. El usuario los marca con
checkboxes en el panel derecho (el frontend va sumando el total a medida que
selecciona/deselecciona, usando `totalSaldos` calculado con los `saldo` de
los ítems marcados — ver nota de `GET /creditos/cliente/:cod_cli`) y confirma
el pago de todos ellos junto.

**Body** (`RegistrarPagoMultipleDto`):
```typescript
{
  cod_cre: string[];   // créditos seleccionados, deben pertenecer al mismo cod_cli
  tipoPago?: string;
  obs?: string;
}
```

Cada crédito de la lista se paga por su `saldo` completo (no admite montos
parciales por crédito individual — para eso ya existe el pago parcial de un
solo crédito, `POST /creditos/:cod_cre/pago`). Todos quedan en
`ESTADO='C'`.

**Respuesta:**
```typescript
{
  resultados: [{ cod_cre, montoAbonado, estado }],
  totalAbonado: number,
  message
}
```

**Errores esperados:** `400` si algún `cod_cre` no está activo, o si alguno
no pertenece al `cod_cli` indicado.

---

### `POST /creditos/:cod_cre/pago`
Registra un pago parcial (o total) sobre un crédito activo.

**Body** (`RegistrarPagoDto`):
```typescript
{ monto: number; tipoPago?: string; obs?: string; }
```

**Respuesta:**
```typescript
{ cod_cre, montoAbonado, nuevoSaldo, estado, message }
```
Si `nuevoSaldo <= 0`, el backend automáticamente pone `estado: 'C'`
(crédito saldado).

**Errores esperados:** `400` si el crédito no está activo, si el monto es
≤ 0, o si el monto supera el saldo pendiente.

---

### `POST /creditos/:cod_cre/devolucion`
Registra devolución parcial o total de ítems de un crédito activo. Repone
stock y descuenta el saldo del crédito proporcionalmente.

**Body** (`CreateDevolucionCreditoDto`):
```typescript
{
  cod_suc: string;
  esTotal?: boolean;
  obs?: string;
  items: [{ id_fab: number; cod_fab: string; cantidad: number; total: number }]
}
```

**Respuesta:**
```typescript
{ cod_devc, cod_cre, totalDevuelto, nuevoSaldo, estado, message }
```

**Errores esperados:** `400` si se intenta devolver más cantidad de la que
queda disponible por ítem (considerando devoluciones previas de ese mismo
`ID_FAB` en ese crédito).

---

### `GET /creditos/:cod_cre`
Detalle completo de un crédito puntual: cabecera + ítems, con la cantidad
disponible para devolver ya calculada por línea (descontando devoluciones
previas). Usar antes de pagar (para mostrar el detalle) y para poblar la
pantalla de devolución (saber qué ítems y cuánto de cada uno se puede
devolver).

⚠️ Ruta dinámica — en el controller debe quedar **después** de `activos`,
`clientes-habilitados` y `cliente/:cod_cli`, o Nest intenta matchear esas
rutas fijas como si fueran un `cod_cre`.

**Respuesta:**
```typescript
{
  codCre, codCli, nomCliente, apeCliente, razonSocial, numCiNit,
  fecInicio, fecFin, total, saldo, estado, codSuc, codUsu, obs,
  diasRestantes, alerta: 'ok' | 'proximo' | 'vencido',
  items: [{
    idFab, codFab, cantidadOriginal, cantidadDisponible, cantidadDevuelta,
    precioCre, descuento, descPro, codPro
  }]
}
```

**Errores esperados:** `404` si el `cod_cre` no existe.

---

## Pendiente / a confirmar

- Prórrogas de plazo (`PRORROGA_CREDITO`): fuera de esta entrega.
- **Auto-distribución de un monto entre varios créditos**: pedido puntual
  (marcado como "pendiente de confirmación" en la nota original) para el
  panel derecho de Apartado 2. La idea: el cajero escribe un monto suelto
  que el cliente quiere pagar (sin saber a cuáles créditos corresponde), y
  el sistema debe seleccionar automáticamente los créditos activos de ese
  cliente que cubren ese monto — priorizando los que vencen primero — y, si
  el monto no alcanza a cubrir el último crédito completo, cortar el pago de
  ese último crédito en la parte proporcional que falte. Esto es distinto
  del pago múltiple (`POST /creditos/cliente/:cod_cli/pago-multiple`), que
  paga créditos ya seleccionados manualmente por el usuario en su totalidad.
  **No implementado todavía** — falta confirmar la regla exacta de
  priorización y si el "corte" del último crédito genera un pago parcial
  normal o requiere un endpoint propio.
- Búsqueda de cliente para el buscador del formulario "nuevo crédito": se
  reutiliza `GET /api/clientes/search` (ya existente en el módulo clientes),
  no hace falta un endpoint nuevo.
- Búsqueda de productos para agregar ítems al crédito: se reutiliza
  `GET /api/productos/search/advanced` (ya existente), mismo flujo que
  "Nueva Venta".
