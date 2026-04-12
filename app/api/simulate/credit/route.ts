// ============================================================
// POST /api/simulate/credit
// ============================================================
//
// Endpoint para simular la tabla de amortización de un crédito.
//
// Acepta ambos métodos:
//   - FRENCH (Francés / cuota fija)
//   - GERMAN (Alemán / capital constante)
//
// Incluye automáticamente el seguro SOLCA (obligatorio en Ecuador).
// Acepta cobros adicionales opcionales via additionalCharges[].
// ============================================================

import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { simulate } from "@/lib/credit";

// ------------------------------------------------------------
// Esquema de validación (Zod)
// ------------------------------------------------------------

const IndirectChargeSchema = z.object({
  name: z.string().min(1, "El nombre del cobro es requerido"),
  type: z.enum(["FIXED", "PERCENTAGE"]),
  value: z.number().positive("El valor del cobro debe ser positivo"),
  mandatory: z.boolean().default(false),
});

const SimulationRequestSchema = z.object({
  amount: z
    .number()
    .positive("El monto debe ser mayor a 0"),
  termMonths: z
    .number()
    .int("El plazo debe ser un número entero")
    .min(1, "El plazo mínimo es 1 mes")
    .max(600, "El plazo máximo es 600 meses (50 años)"),
  annualInterestRate: z
    .number()
    .min(0, "La tasa de interés no puede ser negativa")
    .max(100, "La tasa de interés no puede superar el 100%"),
  amortizationMethod: z.enum(["FRENCH", "GERMAN"], {
    message: "El método debe ser FRENCH o GERMAN",
  }),
  creditTypeName: z.string().optional().default("General"),
  additionalCharges: z.array(IndirectChargeSchema).optional().default([]),
});

// ------------------------------------------------------------
// Handler POST
// ------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar entrada
    const parseResult = SimulationRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((issue) => ({
        campo: issue.path.join("."),
        mensaje: issue.message,
      }));

      return Response.json(
        {
          error: "Datos de entrada inválidos",
          detalles: errors,
        },
        { status: 400 }
      );
    }

    // Ejecutar simulación
    const result = simulate(parseResult.data);

    return Response.json(result);
  } catch (error) {
    console.error("Error en simulación de crédito:", error);

    // Si es un error conocido del motor de cálculo
    if (error instanceof Error) {
      return Response.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
