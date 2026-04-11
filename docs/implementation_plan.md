
Kevin - Recomiendo usar la extensión de Markdown Preview Enhanced para ver mejor https://open-vsx.org/vscode/item?itemName=shd101wyy.markdown-preview-enhanced

# Simulador de Amortización de Crédito — Plan de Implementación

## Contexto

El proyecto **sisconta-web** es una app Next.js 16 recién creada con Tailwind CSS v4. Se necesita un simulador de crédito que soporte los métodos de amortización **Francés** (cuota fija) y **Alemán** (amortización constante), con cobros indirectos extensibles y el seguro obligatorio SOLCA (contexto ecuatoriano).

### Esquema de BD relevante

| Tabla | Campos clave |
|---|---|
| `CreditType` | `name`, `minAmount`, `maxAmount`, `annualInterestRate`, `amortizationSystems[]` |
| `IndirectCharge` | `name`, `type` (FIXED/PERCENTAGE), `value`, `mandatory`, `creditTypeId` |
| `CreditSimulation` | `paymentSchedule` (JSON), `totalPayment`, `totalInterest`, `totalCharges` |

---

## Propuesta de Cambios

### 1. Lógica de negocio — Motor de cálculo

#### [NEW] [types.ts](file:///c:/Users/Kevin/Desktop/Economía/Proyecto%20calculadora/sisconta-web/lib/credit/types.ts)
Tipos TypeScript para todo el dominio:
- `AmortizationMethod` — `'FRENCH' | 'GERMAN'`
- `ChargeType` — `'FIXED' | 'PERCENTAGE'`
- `IndirectChargeInput` — define un cobro indirecto (nombre, tipo, valor, obligatorio)
- `SimulationRequest` — parámetros de entrada del simulador
- `PaymentRow` — fila de la tabla de amortización (nro cuota, capital, interés, cuota, saldo, cobros)
- `SimulationResult` — resultado completo (tabla + totales)

#### [NEW] [charges.ts](file:///c:/Users/Kevin/Desktop/Economía/Proyecto%20calculadora/sisconta-web/lib/credit/charges.ts)
Sistema de cobros indirectos extensible:
- **`SOLCA_CHARGE`** — constante pre-definida: seguro obligatorio SOLCA (0.5% sobre el monto del crédito, `mandatory: true`).
- **`calculateCharges()`** — recibe el monto, la lista de cobros, y retorna el total de cobros por cuota.
- **`getDefaultCharges()`** — retorna los cobros obligatorios por defecto (SOLCA).

> [!TIP]
> Para agregar nuevos cobros en el futuro (seguros de desgravamen, donaciones, comisiones), basta con añadir un nuevo objeto `IndirectChargeInput` al array. La arquitectura es abierta: no se necesita modificar funciones existentes.

#### [NEW] [amortization.ts](file:///c:/Users/Kevin/Desktop/Economía/Proyecto%20calculadora/sisconta-web/lib/credit/amortization.ts)
Motor de cálculo puro (sin dependencias externas):
- **`simulateFrench()`** — Cuota fija usando la fórmula: `C = P * [i(1+i)^n] / [(1+i)^n - 1]`
- **`simulateGerman()`** — Capital constante: `A = P / n`, cuota variable `= A + I_k + cobros`
- **`simulate()`** — Función principal que despacha al método correcto según `amortizationMethod`.
- Todos los valores se redondean a **2 decimales**.

#### [NEW] [index.ts](file:///c:/Users/Kevin/Desktop/Economía/Proyecto%20calculadora/sisconta-web/lib/credit/index.ts)
Barrel export para el módulo.

---

### 2. API Route — Endpoint `/api/simulate/credit`

#### [NEW] [route.ts](file:///c:/Users/Kevin/Desktop/Economía/Proyecto%20calculadora/sisconta-web/app/api/simulate/credit/route.ts)

Endpoint `POST` con validación Zod:

**Request body:**
```json
{
  "amount": 10000,
  "termMonths": 12,
  "annualInterestRate": 15.5,
  "amortizationMethod": "FRENCH",
  "creditTypeName": "Consumo",
  "additionalCharges": [
    { "name": "Seguro de desgravamen", "type": "PERCENTAGE", "value": 0.05 }
  ]
}
```

**Response:**
```json
{
  "method": "FRENCH",
  "creditType": "Consumo",
  "amount": 10000,
  "termMonths": 12,
  "annualInterestRate": 15.5,
  "monthlyRate": 1.29,
  "totalPayment": 10856.40,
  "totalInterest": 856.40,
  "totalCharges": 60.00,
  "schedule": [
    {
      "period": 1,
      "payment": 904.70,
      "principal": 775.50,
      "interest": 129.17,
      "charges": 5.00,
      "balance": 9224.50
    }
  ],
  "charges": [
    { "name": "Seguro SOLCA", "type": "PERCENTAGE", "value": 0.5, "monthlyAmount": 4.17 }
  ]
}
```

- Valida rangos (monto > 0, plazo ≥ 1, tasa > 0).
- Siempre incluye SOLCA automáticamente (además de cobros adicionales del request).
- Retorna errores 400 con mensajes descriptivos en español.

---

### 3. Página UI — Simulador visual

#### [NEW] [page.tsx](file:///c:/Users/Kevin/Desktop/Economía/Proyecto%20calculadora/sisconta-web/app/simulate/credit/page.tsx)

Página completa del simulador con diseño premium en Tailwind CSS:

**Secciones:**
1. **Header** — Título "Simulador de Crédito" con gradiente y descripción.
2. **Formulario** — Inputs estilizados para: monto, plazo (meses), tasa anual, método de amortización (selector), tipo de crédito (selector). Sección colapsable para cobros adicionales.
3. **Resumen** — Tarjetas con cuota mensual, total a pagar, total intereses, total cobros.
4. **Tabla de amortización** — Tabla completa scrollable con todas las columnas (periodo, capital, interés, cobros, cuota, saldo).
5. **Detalle de cobros** — Lista de cobros indirectos aplicados (SOLCA + adicionales).

**Diseño visual:**
- Modo oscuro/claro respetando las variables CSS existentes.
- Gradientes, glassmorphism en las tarjetas de resumen.
- Hover effects y transiciones suaves en la tabla.
- Responsive design (mobile-first).
- Animaciones de entrada con `transition` y `transform`.

---

## Estructura de Archivos Final

```
sisconta-web/
├── lib/
│   └── credit/
│       ├── index.ts          # Barrel exports
│       ├── types.ts          # Tipos TypeScript
│       ├── charges.ts        # Sistema de cobros (SOLCA + extensible)
│       └── amortization.ts   # Motor de cálculo (Francés + Alemán)
├── app/
│   ├── api/
│   │   └── simulate/
│   │       └── credit/
│   │           └── route.ts  # POST endpoint
│   └── simulate/
│       └── credit/
│           └── page.tsx      # UI del simulador
```

---

## Extensibilidad para otros desarrolladores

> [!IMPORTANT]
> El sistema está diseñado para que agregar nuevos cobros indirectos sea trivial:

```typescript
// Ejemplo: agregar seguro de desgravamen
const DESGRAVAMEN_CHARGE: IndirectChargeInput = {
  name: "Seguro de Desgravamen",
  type: "PERCENTAGE",
  value: 0.065, // 0.065% mensual sobre saldo
  mandatory: true,
};

// Solo se agrega al array de cobros por defecto
export function getDefaultCharges(): IndirectChargeInput[] {
  return [SOLCA_CHARGE, DESGRAVAMEN_CHARGE];
}
```

El mismo patrón aplica para donaciones a fundaciones, comisiones de apertura, etc.

---

## Verificación

### Pruebas automáticas
- Ejecutar `npm run build` para verificar que no hay errores de compilación.
- Probar el endpoint manualmente con `curl` o desde la UI.

### Verificación visual
- Iniciar el servidor con `npm run dev`.
- Navegar a `/simulate/credit` y verificar el formulario, cálculos y tabla.
- Probar ambos métodos (Francés y Alemán) y comparar resultados.
