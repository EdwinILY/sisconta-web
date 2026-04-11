# Descarga en PDF — Documentación

## Descripción General

La funcionalidad de descarga en PDF permite al usuario generar un documento profesional con los resultados de la simulación de crédito. Se ofrece tres opciones:

- **Solo Francés** — PDF con tabla de amortización del método Francés.
- **Solo Alemán** — PDF con tabla de amortización del método Alemán.
- **Ambos métodos** — PDF comparativo con ambas tablas en un mismo documento.

---

## Tecnología

Se utiliza **`@react-pdf/renderer`** (v4.4.0) para generar el PDF completamente en el **navegador del cliente**. No se requiere un endpoint del servidor.

### ¿Por qué en el cliente?

- Evita carga en el servidor.
- El PDF se genera instantáneamente sin latencia de red.
- Los datos ya están disponibles en el estado del componente.

---

## Arquitectura del Módulo

```
lib/pdf/
├── company.ts            # Datos estáticos de la empresa
├── CreditReportPDF.tsx   # Componente @react-pdf/renderer
├── download.ts           # Utilidad de descarga (genera blob + descarga)
└── index.ts              # Barrel exports
```

### Flujo de generación

```
  Usuario clic en         Se seleccionan          Se genera el PDF
  "Descargar PDF"    →    los resultados     →    como blob en el    →  Descarga
   (dropdown)             (French/German/Both)    cliente                automática
```

---

## Estructura del PDF

El documento PDF incluye las siguientes secciones:

### 1. Encabezado de empresa

| Campo | Fuente actual | Fuente futura |
|-------|--------------|---------------|
| Nombre | `COMPANY_INFO.name` | `Institution.name` |
| Razón social | `COMPANY_INFO.legalName` | `Institution.name` |
| RUC | `COMPANY_INFO.ruc` | `Institution.ruc` |
| Dirección | `COMPANY_INFO.address` | `Institution.contact` |
| Teléfono | `COMPANY_INFO.phone` | `Institution.contact` |
| Email | `COMPANY_INFO.email` | `Institution.contact` |
| Logo | _(no implementado)_ | `Institution.logoUrl` |

### 2. Título del reporte

Muestra el método de amortización y la fecha/hora de generación.

### 3. Parámetros del crédito

Grid con: tipo de crédito, monto, plazo, tasa anual, tasa mensual, método.

### 4. Cobros indirectos

Lista de cobros aplicados con badge "Obligatorio" para SOLCA y cobros mandatorios.

### 5. Resumen financiero

4 tarjetas: cuota mensual, total a pagar, total intereses, total cobros.

### 6. Tabla de amortización

Tabla completa con columnas: N°, Cuota, Capital, Interés, Cobros, Saldo. Incluye fila de totales.

### 7. Pie de página

Nombre de empresa, sitio web, número de página.

> **Nota:** cuando se selecciona "Ambos métodos", se generan dos secciones completas (resumen + tabla) separadas por un salto de página.

---

## Datos Estáticos de Empresa

Los datos de la empresa están centralizados en `lib/pdf/company.ts`:

```typescript
export const COMPANY_INFO: CompanyInfo = {
  name: "SisConta",
  legalName: "SisConta S.A.",
  ruc: "1791234567001",
  address: "Av. República E7-123, Quito, Ecuador",
  phone: "(02) 256-7890",
  email: "info@sisconta.ec",
  website: "www.sisconta.ec",
  tagline: "Sistema Contable Financiero",
};
```

### Puntos editables

| Dato | Ubicación | Descripción |
|------|-----------|-------------|
| `name` | `lib/pdf/company.ts` | Nombre comercial de la empresa |
| `legalName` | `lib/pdf/company.ts` | Razón social |
| `ruc` | `lib/pdf/company.ts` | RUC ecuatoriano |
| `address` | `lib/pdf/company.ts` | Dirección principal |
| `phone` | `lib/pdf/company.ts` | Teléfono de contacto |
| `email` | `lib/pdf/company.ts` | Email corporativo |
| `website` | `lib/pdf/company.ts` | Sitio web |
| `tagline` | `lib/pdf/company.ts` | Slogan de la empresa |

### Migración a datos dinámicos

Para obtener los datos de la tabla `Institution` de Supabase:

```typescript
// lib/pdf/company.ts — versión futura

import { supabase } from "@/lib/supabase";

export async function getCompanyInfo(): Promise<CompanyInfo> {
  const { data, error } = await supabase
    .from("Institution")
    .select("name, ruc, logoUrl, contact")
    .single();

  if (error) throw error;

  return {
    name: data.name,
    legalName: data.name,
    ruc: data.ruc || "",
    address: data.contact || "",  // Parsear del campo contact
    phone: "",                     // Parsear del campo contact
    email: "",                     // Parsear del campo contact
    website: "",
    tagline: "Sistema Contable Financiero",
  };
}
```

### Agregar logo

Para agregar el logo de la empresa al PDF:

1. Agregar `logoUrl` a `CompanyInfo` y `COMPANY_INFO`.
2. En `CreditReportPDF.tsx`, agregar un componente `<Image>` de `@react-pdf/renderer`:

```tsx
import { Image } from "@react-pdf/renderer";

// En el encabezado:
{companyInfo.logoUrl && (
  <Image
    src={companyInfo.logoUrl}
    style={{ width: 60, height: 60 }}
  />
)}
```

---

## Cómo usar en el código

### Descarga simple

```typescript
import { downloadCreditPDF } from "@/lib/pdf";

// Descargar solo Francés
await downloadCreditPDF(frenchResult, germanResult, "FRENCH");

// Descargar solo Alemán
await downloadCreditPDF(frenchResult, germanResult, "GERMAN");

// Descargar comparación
await downloadCreditPDF(frenchResult, germanResult, "BOTH");
```

### Nombre del archivo generado

El nombre sigue el patrón: `simulacion_{método}_{monto}_{plazo}m.pdf`

Ejemplos:
- `simulacion_frances_10000_12m.pdf`
- `simulacion_aleman_25000_36m.pdf`
- `simulacion_comparacion_10000_12m.pdf`

---

## Extensibilidad para Otros Módulos

### Crear un nuevo tipo de reporte PDF

Para agregar un nuevo reporte (ejemplo: certificado de inversión):

**1. Crear el componente PDF:**

```tsx
// lib/pdf/InvestmentCertificatePDF.tsx

import { Document, Page, Text, View } from "@react-pdf/renderer";
import { COMPANY_INFO } from "./company";

export function InvestmentCertificatePDF({ investment }) {
  return (
    <Document>
      <Page>
        {/* Reusar el mismo encabezado de empresa */}
        <View>
          <Text>{COMPANY_INFO.name}</Text>
          {/* ... */}
        </View>
        {/* Contenido específico del certificado */}
      </Page>
    </Document>
  );
}
```

**2. Crear la función de descarga:**

```typescript
// lib/pdf/downloadInvestment.ts

import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { InvestmentCertificatePDF } from "./InvestmentCertificatePDF";

export async function downloadInvestmentPDF(investment) {
  const doc = createElement(InvestmentCertificatePDF, { investment });
  const blob = await pdf(doc).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `certificado_inversion_${investment.id}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

**3. Exportar desde el barrel:**

```typescript
// lib/pdf/index.ts
export { downloadInvestmentPDF } from "./downloadInvestment";
```

### Reusar componentes comunes

Se recomienda extraer el encabezado de empresa y el pie de página como componentes compartidos si se crean múltiples reportes:

```tsx
// lib/pdf/shared/Header.tsx
// lib/pdf/shared/Footer.tsx
```

---

## Dependencias

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `@react-pdf/renderer` | ^4.4.0 | Generación de PDF en el cliente |
| `react` | 19.2.4 | Requerido por @react-pdf/renderer |

### Limitaciones conocidas

- `@react-pdf/renderer` no soporta Tailwind CSS ni HTML estándar. Se deben usar los componentes propios (`View`, `Text`, `Image`) con estilos via `StyleSheet.create()`.
- Los estilos de PDF usan un subconjunto de CSS (flexbox, no grid).
- Las fuentes disponibles por defecto son: Helvetica, Courier, Times-Roman. Para fuentes custom se debe usar `Font.register()`.
- La generación del PDF ocurre en el cliente, por lo que documentos muy grandes (>500 cuotas) pueden tardar unos segundos.
