/**
 * Lightweight heuristic extraction from a job description's plain text.
 * This is intentionally simple — it's what gets stored on JobOpportunity
 * for search/display. The real tailoring intelligence (matching the CV
 * Master against this posting) happens via the LLM in EPIC 3.
 */

const SECTION_HEADINGS =
  /^(requisitos|requerimientos|se requiere|buscamos|skills requeridos|qu[eé] buscamos|perfil requerido|conocimientos requeridos)/i;

const BULLET_LINE = /^\s*(?:[-•*▪●]|\d+[.)])\s*(.+)$/;

export function extractRequirements(descriptionRaw: string): string[] {
  const lines = descriptionRaw.split("\n").map((l) => l.trim());
  const requirements: string[] = [];
  let inRequirementsSection = false;

  for (const line of lines) {
    if (!line) continue;

    if (SECTION_HEADINGS.test(line)) {
      inRequirementsSection = true;
      continue;
    }
    // A short line with no bullet that isn't the requirements heading
    // itself likely starts a new (different) section — stop collecting.
    if (inRequirementsSection && !BULLET_LINE.test(line) && line.length < 40 && /:$/.test(line)) {
      inRequirementsSection = false;
    }

    const bulletMatch = BULLET_LINE.exec(line);
    if (inRequirementsSection && bulletMatch) {
      requirements.push(bulletMatch[1].trim());
    }
  }

  // Fallback: no headed section found — just take every bulleted line in
  // the whole description, which is usually the requirements/qualifications
  // list on these portals even without an explicit heading.
  if (requirements.length === 0) {
    for (const line of lines) {
      const bulletMatch = BULLET_LINE.exec(line);
      if (bulletMatch) requirements.push(bulletMatch[1].trim());
    }
  }

  return requirements;
}

// Common stack/skill tokens across AR tech + generic office job postings.
// Matched case-insensitively as whole words against the description text.
const KEYWORD_DICTIONARY = [
  "javascript", "typescript", "react", "next.js", "node.js", "node", "python",
  "java", "c#", ".net", "php", "ruby", "go", "golang", "rust", "kotlin", "swift",
  "sql", "postgresql", "mysql", "mongodb", "redis", "graphql", "rest api",
  "aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "git", "linux",
  "scrum", "agile", "kanban", "jira", "figma", "excel", "power bi", "sap",
  "salesforce", "hubspot", "seo", "sem", "google ads", "marketing digital",
  "inglés avanzado", "inglés intermedio", "portugués", "atención al cliente",
  "contabilidad", "recursos humanos", "logística", "ventas", "negociación",
];

export function extractKeywords(descriptionRaw: string): string[] {
  const haystack = descriptionRaw.toLowerCase();
  const found = new Set<string>();

  for (const keyword of KEYWORD_DICTIONARY) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(?<![\\w])${escaped}(?![\\w])`, "i");
    if (pattern.test(haystack)) found.add(keyword);
  }

  return Array.from(found);
}
