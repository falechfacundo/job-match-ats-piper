import { z } from "zod";

/**
 * CV Master: the user's canonical resume data, edited in the dashboard
 * (EPIC 5) and stored as JSON on User.cvMaster. Every tailored generation
 * starts from a snapshot of this.
 */
export const experienceEntrySchema = z.object({
  id: z.string(), // stable client-generated id, used to key tailored bullets back to this entry
  company: z.string().min(1),
  role: z.string().min(1),
  location: z.string().optional(),
  startDate: z.string(), // "YYYY-MM"
  endDate: z.string().nullable(), // null = current
  bullets: z.array(z.string().min(1)).min(1),
});

export const educationEntrySchema = z.object({
  id: z.string(),
  institution: z.string().min(1),
  degree: z.string().min(1),
  startDate: z.string(),
  endDate: z.string().nullable(),
});

export const languageEntrySchema = z.object({
  name: z.string().min(1),
  level: z.enum(["basico", "intermedio", "avanzado", "nativo"]),
});

export const cvMasterSchema = z.object({
  personal: z.object({
    fullName: z.string().min(1),
    email: z.email(),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedin: z.url().optional(),
    website: z.url().optional(),
  }),
  summary: z.string().min(1),
  experience: z.array(experienceEntrySchema),
  education: z.array(educationEntrySchema),
  skills: z.array(z.string().min(1)),
  languages: z.array(languageEntrySchema),
});

export type CvMaster = z.infer<typeof cvMasterSchema>;
export type ExperienceEntry = z.infer<typeof experienceEntrySchema>;
