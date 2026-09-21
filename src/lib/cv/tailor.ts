import { generateObject } from "ai";
import { z } from "zod";
import type { CvMaster } from "./schema";
import type { ScrapedJob } from "@/lib/scrapers";

const tailoredResultSchema = z.object({
  tailoredSummary: z
    .string()
    .describe("2-3 sentence professional summary rewritten to foreground the candidate's fit for this specific role."),
  experienceBullets: z
    .array(
      z.object({
        experienceId: z.string().describe("Must match one of the provided experience entry ids exactly."),
        bullets: z
          .array(z.string())
          .describe(
            "Rewritten bullets for this role: same underlying facts/achievements as the original, reworded to surface the vacancy's keywords and quantify impact where the original already implies it. Never invent responsibilities, employers, dates, or metrics not present in the original.",
          ),
      }),
    )
    .describe("One entry per experience item that was provided."),
  emphasizedKeywords: z
    .array(z.string())
    .describe("Keywords from the job posting that genuinely match the candidate's real background, to surface in the skills section."),
});

export type TailoredCvContent = z.infer<typeof tailoredResultSchema>;

const MODEL = process.env.CV_TAILOR_MODEL ?? "anthropic/claude-sonnet-4-5";

/**
 * Asks the LLM to adjust ONLY bullet points and keyword emphasis to fit a
 * specific vacancy — never to invent experience. The prompt explicitly
 * forbids fabrication; downstream this output is merged with the
 * unmodified CV Master facts (dates, employers, degrees) before rendering.
 */
export async function tailorCvForJob(cvMaster: CvMaster, job: ScrapedJob): Promise<TailoredCvContent> {
  const { object } = await generateObject({
    model: MODEL,
    schema: tailoredResultSchema,
    system: `Sos un experto en optimización de CVs para sistemas ATS (Applicant Tracking Systems) en Argentina.
Tu única tarea es reescribir bullet points y el resumen profesional de un CV para maximizar la coincidencia
con una vacante específica, usando el vocabulario y las palabras clave de la oferta.

REGLAS ESTRICTAS:
- NUNCA inventes experiencia, empresas, cargos, fechas, títulos o métricas que no estén en el CV original.
- Solo podés reformular lo que ya existe: cambiar énfasis, orden, y vocabulario para alinear con la vacante.
- Cada bullet reescrito debe seguir siendo una descripción verdadera del bullet original correspondiente.
- Las keywords a destacar deben ser genuinamente respaldadas por la experiencia del candidato.
- Respondé en español (es-AR).`,
    prompt: JSON.stringify({
      vacante: {
        titulo: job.title,
        empresa: job.company,
        descripcion: job.descriptionRaw,
        requisitos: job.requirements,
        keywords: job.keywords,
      },
      cv: {
        resumenActual: cvMaster.summary,
        experiencia: cvMaster.experience.map((e) => ({
          id: e.id,
          empresa: e.company,
          cargo: e.role,
          bulletsActuales: e.bullets,
        })),
        skillsActuales: cvMaster.skills,
      },
    }),
  });

  return object;
}
