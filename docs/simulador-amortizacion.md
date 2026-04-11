# Simulador de Amortización de Crédito — Documentación

## Descripción General

El módulo de simulación de crédito permite calcular tablas de amortización usando dos métodos:

- **Francés** (cuota fija): el cliente paga la misma cuota cada mes.
- **Alemán** (capital constante): el abono a capital es fijo y la cuota disminuye cada mes.

Incluye un sistema extensible de **cobros indirectos** que agrega automáticamente el seguro obligatorio SOLCA (contexto ecuatoriano).

---

## Arquitectura del Módulo

```
lib/credit/
├── types.ts          # Tipos TypeScript del dominio
├── charges.ts        # Sistema de cobros indirectos (SOLCA + extensibles)
├── amortization.ts   # Motor de cálculo (Francés + Alemán)
└── index.ts          # Barrel exports
```

### Flujo de datos

```
                ┌──────────────┐
                │  Formulario  │  (app/simulate/credit/page.tsx)
                │  del usuario │
                └──────┬───────┘
                       │ POST /api/simulate/credit
                       ▼
               ┌───────────────┐
               │   API Route   │  (app/api/simulate/credit/route.ts)
               │  Validación   │  Usa Zod para validar parámetros
               │    (Zod)      │
               └──────┬────────┘
                       │ simulate(request)
                       ▼
          ┌────────────────────────┐
          │   Motor de Cálculo     │  (lib/credit/amortization.ts)
          │                        │
          │  1. Combina cobros     │
          │     obligatorios +     │
          │     adicionales        │
          │                        │
          │  2. Calcula tabla de   │
          │     amortización       │
          │     (Francés o Alemán) │
          │                        │
          │  3. Retorna resultado  │
          │     con totales        │
          └────────────────────────┘
```

---

## Métodos de Amortización

### Método Francés (Cuota Fija)

La cuota mensual es constante durante toda la vida del crédito. Al inicio se paga más interés y menos capital; al final se invierte.

**Fórmula de la cuota:**

```
C = P × [ i(1+i)^n ] / [ (1+i)^n − 1 ]
```

Donde:
- `P` = monto del crédito
- `i` = tasa de interés mensual (tasa anual / 100 / 12)
- `n` = número de cuotas (meses)

**Ubicación:** función `simulateFrench()` en `lib/credit/amortization.ts`

### Método Alemán (Capital Constante)

El abono a capital es fijo cada mes. Como el saldo disminuye, los intereses bajan y la cuota total también.

**Fórmulas:**

```
Amortización de capital fija:  A = P / n
Interés del período k:         I_k = saldo_k × i
Cuota del período k:           C_k = A + I_k + cobros
```

**Ubicación:** función `simulateGerman()` en `lib/credit/amortization.ts`

### Redondeo

Todos los valores se redondean a **2 decimales** usando:

```typescript
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
```

En la última cuota se ajusta automáticamente el capital para cubrir exactamente el saldo restante (evita desbalances por redondeo acumulado).

---

## Sistema de Cobros Indirectos

### Concepto

Los cobros indirectos son cargos adicionales que se suman a cada cuota del crédito. Pueden ser:

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `FIXED` | Monto fijo mensual en USD | $5.00/mes por seguro |
| `PERCENTAGE` | Porcentaje anual sobre el monto del crédito | 0.5% anual (SOLCA) |

### Seguro SOLCA (Obligatorio)

En Ecuador, todo crédito formal incluye una contribución a la Sociedad de Lucha Contra el Cáncer. Se cobra el **0.5% anual** sobre el monto del crédito, prorrateado mensualmente.

```typescript
// lib/credit/charges.ts
export const SOLCA_CHARGE: IndirectChargeInput = {
  name: "Seguro SOLCA (0.5% anual)",
  type: "PERCENTAGE",
  value: 0.5,
  mandatory: true,
};
```

### Cálculo de cobros

Para cobros tipo `PERCENTAGE`, la fórmula del monto mensual es:

```
monthlyAmount = (monto × porcentaje / 100) / 12
```

Para cobros tipo `FIXED`, el valor ya es el monto mensual.

**Ubicación:** función `calculateCharges()` en `lib/credit/charges.ts`

---

## Tipos TypeScript Principales

### `SimulationRequest` — Entrada del simulador

```typescript
interface SimulationRequest {
  amount: number;              // Monto en USD
  termMonths: number;          // Plazo en meses
  annualInterestRate: number;  // Tasa anual (ej: 16.77)
  amortizationMethod: "FRENCH" | "GERMAN";
  creditTypeName?: string;     // Nombre informativo
  additionalCharges?: IndirectChargeInput[];
}
```

### `SimulationResult` — Salida del simulador

```typescript
interface SimulationResult {
  method: "FRENCH" | "GERMAN";
  creditType: string;
  amount: number;
  termMonths: number;
  annualInterestRate: number;
  monthlyRate: number;       // Tasa mensual como porcentaje
  totalPayment: number;      // Total a pagar
  totalInterest: number;     // Total intereses
  totalCharges: number;      // Total cobros indirectos
  schedule: PaymentRow[];    // Tabla de amortización
  charges: CalculatedCharge[]; // Detalle de cobros
}
```

### `PaymentRow` — Fila de la tabla

```typescript
interface PaymentRow {
  period: number;    // Número de cuota
  payment: number;   // Cuota total
  principal: number; // Abono a capital
  interest: number;  // Interés
  charges: number;   // Cobros indirectos
  balance: number;   // Saldo después del pago
}
```

---

## API Endpoint

### `POST /api/simulate/credit`

**Request body:**

```json
{
  "amount": 10000,
  "termMonths": 12,
  "annualInterestRate": 16.77,
  "amortizationMethod": "FRENCH",
  "creditTypeName": "Consumo",
  "additionalCharges": []
}
```

**Response (200):**

Retorna un objeto `SimulationResult` completo con la tabla de amortización.

**Response (400):**

```json
{
  "error": "Datos de entrada inválidos",
  "detalles": [
    { "campo": "amount", "mensaje": "El monto debe ser mayor a 0" }
  ]
}
```

**Validación:** se usa **Zod** para validar todos los campos. Ver `app/api/simulate/credit/route.ts`.

---

## Guía de Integración con Módulos Futuros

### 1. Conectar tipos de crédito desde la base de datos

Actualmente los tipos de crédito están definidos como constantes en el frontend. Para conectar con la tabla `CreditType` de Supabase:

```typescript
// Ejemplo: servicio para obtener tipos de crédito
// lib/services/creditTypes.ts

import { supabase } from "@/lib/supabase";

export async function getCreditTypes() {
  const { data, error } = await supabase
    .from("CreditType")
    .select("id, name, minAmount, maxAmount, annualInterestRate, amortizationSystems")
    .order("name");

  if (error) throw error;
  return data;
}
```

Luego, reemplazar el array `CREDIT_TYPES` en `page.tsx` por una llamada a este servicio.

### 2. Conectar cobros indirectos desde la base de datos

La tabla `IndirectCharge` ya tiene la estructura necesaria. Para reemplazar los cobros estáticos:

```typescript
// Ejemplo: obtener cobros de la BD
// lib/services/charges.ts

import { supabase } from "@/lib/supabase";
import type { IndirectChargeInput } from "@/lib/credit/types";

export async function getChargesByCreditType(
  creditTypeId: string
): Promise<IndirectChargeInput[]> {
  const { data, error } = await supabase
    .from("IndirectCharge")
    .select("name, type, value, mandatory")
    .eq("creditTypeId", creditTypeId);

  if (error) throw error;

  // El formato ya es compatible con IndirectChargeInput
  return data as IndirectChargeInput[];
}
```

Luego, en `lib/credit/charges.ts`, modificar `getDefaultCharges()`:

```typescript
// ANTES (estático):
export function getDefaultCharges(): IndirectChargeInput[] {
  return [SOLCA_CHARGE];
}

// DESPUÉS (dinámico):
export async function getDefaultCharges(
  creditTypeId?: string
): Promise<IndirectChargeInput[]> {
  const mandatory = [SOLCA_CHARGE]; // Siempre incluir SOLCA

  if (creditTypeId) {
    const dbCharges = await getChargesByCreditType(creditTypeId);
    return [...mandatory, ...dbCharges];
  }

  return mandatory;
}
```

> **Nota:** al hacer `getDefaultCharges` asíncrona, también se debe actualizar `simulate()` en `amortization.ts` para que sea `async`.

### 3. Agregar nuevos tipos de cobros

Para agregar un nuevo cobro obligatorio (ejemplo: seguro de desgravamen):

```typescript
// En lib/credit/charges.ts

export const DESGRAVAMEN_CHARGE: IndirectChargeInput = {
  name: "Seguro de Desgravamen",
  type: "PERCENTAGE",
  value: 0.065, // 0.065% anual
  mandatory: true,
};

export function getDefaultCharges(): IndirectChargeInput[] {
  return [SOLCA_CHARGE, DESGRAVAMEN_CHARGE];
}
```

Para cobros opcionales, se envían desde el frontend via el array `additionalCharges` del request.

### 4. Agregar nuevos métodos de amortización

Si se necesita un nuevo método (ejemplo: americano), los pasos son:

**Paso 1 — Actualizar el tipo:**

```typescript
// En lib/credit/types.ts
export type AmortizationMethod = "FRENCH" | "GERMAN" | "AMERICAN";
```

**Paso 2 — Implementar la función:**

```typescript
// En lib/credit/amortization.ts
function simulateAmerican(
  amount: number,
  termMonths: number,
  monthlyRate: number,
  monthlyChargesTotal: number
): PaymentRow[] {
  // Método americano: solo intereses cada mes, capital al final
  const schedule: PaymentRow[] = [];
  let balance = amount;

  for (let period = 1; period <= termMonths; period++) {
    const interest = round2(balance * monthlyRate);
    const principal = period === termMonths ? amount : 0;
    if (period === termMonths) balance = 0;

    schedule.push({
      period,
      payment: round2(principal + interest + monthlyChargesTotal),
      principal,
      interest,
      charges: monthlyChargesTotal,
      balance,
    });
  }

  return schedule;
}
```

**Paso 3 — Agregar al switch en `simulate()`:**

```typescript
case "AMERICAN":
  schedule = simulateAmerican(amount, termMonths, monthlyRate, monthlyChargesTotal);
  break;
```

**Paso 4 — Agregar opción en la UI** (`page.tsx`): agregar el botón al selector de método.

---

## Esquema de Base de Datos Relacionado

### Tabla `CreditType`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | text | PK |
| `name` | text | Nombre (Consumo, Hipotecario, etc.) |
| `minAmount` | float | Monto mínimo permitido |
| `maxAmount` | float | Monto máximo permitido |
| `annualInterestRate` | float | Tasa de interés anual |
| `amortizationSystems` | array | Métodos soportados (FRENCH, GERMAN) |
| `institutionId` | text | FK → Institution |

### Tabla `IndirectCharge`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | text | PK |
| `name` | text | Nombre del cobro |
| `type` | enum | FIXED o PERCENTAGE |
| `value` | float | Valor del cobro |
| `mandatory` | boolean | Si es obligatorio |
| `creditTypeId` | text | FK → CreditType |

### Tabla `CreditSimulation`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | text | PK |
| `userId` | text | FK → User |
| `creditTypeId` | text | FK → CreditType |
| `amount` | float | Monto simulado |
| `termMonths` | integer | Plazo |
| `amortizationSystem` | text | Método usado |
| `paymentSchedule` | jsonb | Tabla de amortización completa |
| `totalPayment` | float | Total a pagar |
| `totalInterest` | float | Total intereses |
| `totalCharges` | float | Total cobros |

> **Futuro:** cuando se implemente la persistencia, el resultado de `simulate()` se puede guardar directamente en `CreditSimulation` ya que los campos coinciden con `SimulationResult`.
