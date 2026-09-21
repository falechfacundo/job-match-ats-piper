"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  location: string | null;
  sourcePortal: string;
  sourceUrl: string;
}

interface Template {
  id: string;
  name: string;
  isDefault: boolean;
}

type GenerationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; pdfUrl: string }
  | { status: "error"; message: string };

export function JobWorkflow() {
  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [generations, setGenerations] = useState<Record<string, GenerationState>>({});

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data) => setJobs(data.jobOpportunities ?? []));

    fetch("/api/cv/templates")
      .then((res) => res.json())
      .then((data) => {
        const templates: Template[] = data.templates ?? [];
        const defaultTemplate = templates.find((t) => t.isDefault) ?? templates[0];
        if (defaultTemplate) setTemplateId(defaultTemplate.id);
      });
  }, []);

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault();
    setScraping(true);
    setScrapeError(null);
    try {
      const res = await fetch("/api/jobs/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? "No se pudo procesar esa oferta");
      }
      setJobs((prev) => [data.jobOpportunity, ...prev.filter((j) => j.id !== data.jobOpportunity.id)]);
      setUrl("");
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setScraping(false);
    }
  }

  async function handleGenerate(jobOpportunityId: string) {
    if (!templateId) return;
    setGenerations((prev) => ({ ...prev, [jobOpportunityId]: { status: "loading" } }));
    try {
      const res = await fetch("/api/cv/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobOpportunityId, templateId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? "No se pudo generar el CV");
      }
      setGenerations((prev) => ({
        ...prev,
        [jobOpportunityId]: { status: "done", pdfUrl: data.generation.pdfUrl },
      }));
    } catch (err) {
      setGenerations((prev) => ({
        ...prev,
        [jobOpportunityId]: {
          status: "error",
          message: err instanceof Error ? err.message : "Error inesperado",
        },
      }));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleScrape} className="flex gap-2">
        <Input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Pegá la URL de la oferta (ZonaJobs, Bumeran, Computrabajo, LinkedIn, EmpleosIT)"
        />
        <Button type="submit" disabled={scraping}>
          {scraping ? "Buscando…" : "Agregar"}
        </Button>
      </form>
      {scrapeError && <p className="text-xs text-destructive">{scrapeError}</p>}

      <div className="flex flex-col gap-3">
        {jobs.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no agregaste ninguna oferta.</p>
        )}
        {jobs.map((job) => {
          const generation = generations[job.id] ?? { status: "idle" };
          return (
            <Card key={job.id}>
              <CardContent className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{job.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {job.company}
                    {job.location ? ` · ${job.location}` : ""} · {job.sourcePortal}
                  </p>
                  {generation.status === "done" && (
                    <a
                      href={generation.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                    >
                      Descargar PDF →
                    </a>
                  )}
                  {generation.status === "error" && (
                    <p className="mt-2 text-xs text-destructive">{generation.message}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="shrink-0"
                  onClick={() => handleGenerate(job.id)}
                  disabled={generation.status === "loading" || !templateId}
                >
                  {generation.status === "loading" ? "Generando…" : "Generar CV"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
