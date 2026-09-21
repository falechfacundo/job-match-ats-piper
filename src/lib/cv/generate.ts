import { CVGenerationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { consumeCredits, grantCredits } from "@/lib/credits";
import { uploadGeneratedPdf } from "@/lib/storage";
import { compileCvPdf } from "@/lib/typst/compile";
import type { ScrapedJob } from "@/lib/scrapers";
import { cvMasterSchema, type CvMaster } from "./schema";
import { tailorCvForJob, type TailoredCvContent } from "./tailor";

const GENERATION_COST = 1;

export class GenerationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "GenerationError";
  }
}

function mergeCvWithTailoring(cvMaster: CvMaster, tailored: TailoredCvContent) {
  const bulletsByExperienceId = new Map(tailored.experienceBullets.map((e) => [e.experienceId, e.bullets]));

  return {
    personal: cvMaster.personal,
    summary: tailored.tailoredSummary,
    experience: cvMaster.experience.map((exp) => ({
      company: exp.company,
      role: exp.role,
      location: exp.location,
      startDate: exp.startDate,
      endDate: exp.endDate,
      bullets: bulletsByExperienceId.get(exp.id) ?? exp.bullets,
    })),
    education: cvMaster.education,
    skills: Array.from(new Set([...cvMaster.skills, ...tailored.emphasizedKeywords])),
    languages: cvMaster.languages,
  };
}

/**
 * Orchestrates one tailored CV generation: debits a credit, runs the LLM
 * tailoring pass, compiles the PDF via Typst, uploads it, and records the
 * result. Any failure after the debit refunds the credit automatically.
 */
export async function generateTailoredCv(params: {
  userId: string;
  jobOpportunityId: string;
  templateId: string;
}) {
  const { userId, jobOpportunityId, templateId } = params;

  const [user, jobOpportunity, template] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.jobOpportunity.findFirstOrThrow({ where: { id: jobOpportunityId, userId } }),
    prisma.cVTemplate.findFirstOrThrow({ where: { id: templateId, userId } }),
  ]);

  const cvMasterParsed = cvMasterSchema.safeParse(user.cvMaster);
  if (!cvMasterParsed.success) {
    throw new GenerationError("CV Master is missing or incomplete — finish it in the dashboard before generating");
  }
  const cvMaster = cvMasterParsed.data;

  // Created before the credit debit so consumeCredits has a row to link to.
  const generation = await prisma.cVGeneration.create({
    data: {
      userId,
      jobOpportunityId,
      templateId,
      cvMasterSnapshot: cvMaster,
      status: CVGenerationStatus.PENDING,
      creditsCost: GENERATION_COST,
    },
  });

  try {
    await consumeCredits({
      userId,
      amount: GENERATION_COST,
      reason: `Generación de CV para "${jobOpportunity.title}" en ${jobOpportunity.company}`,
      relatedGenerationId: generation.id,
    });
  } catch (err) {
    await prisma.cVGeneration.update({
      where: { id: generation.id },
      data: { status: CVGenerationStatus.FAILED, errorMessage: "insufficient_credits" },
    });
    throw err;
  }

  try {
    await prisma.cVGeneration.update({
      where: { id: generation.id },
      data: { status: CVGenerationStatus.PROCESSING },
    });

    const scrapedJob: ScrapedJob = {
      sourcePortal: jobOpportunity.sourcePortal,
      sourceUrl: jobOpportunity.sourceUrl,
      title: jobOpportunity.title,
      company: jobOpportunity.company,
      location: jobOpportunity.location,
      descriptionRaw: jobOpportunity.descriptionRaw,
      requirements: jobOpportunity.requirements,
      keywords: jobOpportunity.keywords,
    };

    const tailored = await tailorCvForJob(cvMaster, scrapedJob);
    const mergedData = mergeCvWithTailoring(cvMaster, tailored);
    const pdf = compileCvPdf(template.typstSource, mergedData);
    const pdfUrl = await uploadGeneratedPdf({ userId, generationId: generation.id, pdf });

    return await prisma.cVGeneration.update({
      where: { id: generation.id },
      data: {
        status: CVGenerationStatus.COMPLETED,
        tailoredContent: tailored,
        pdfUrl,
      },
    });
  } catch (err) {
    await prisma.cVGeneration.update({
      where: { id: generation.id },
      data: { status: CVGenerationStatus.FAILED, errorMessage: (err as Error).message },
    });
    await grantCredits({
      userId,
      amount: GENERATION_COST,
      type: "REFUND",
      reason: "Reintegro por generación de CV fallida",
      relatedGenerationId: generation.id,
    });
    throw err;
  }
}
