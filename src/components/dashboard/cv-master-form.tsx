"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CvMaster } from "@/lib/cv/schema";

type ExperienceDraft = CvMaster["experience"][number];
type EducationDraft = CvMaster["education"][number];
type LanguageDraft = CvMaster["languages"][number];

const EMPTY_CV_MASTER: CvMaster = {
  personal: { fullName: "", email: "" },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  languages: [],
};

function newId() {
  return crypto.randomUUID();
}

export function CvMasterForm() {
  const [data, setData] = useState<CvMaster>(EMPTY_CV_MASTER);
  const [skillsText, setSkillsText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/cv/master")
      .then((res) => res.json())
      .then((res) => {
        if (res.cvMaster) {
          setData(res.cvMaster);
          setSkillsText(res.cvMaster.skills.join(", "));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const payload: CvMaster = {
      ...data,
      skills: skillsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    try {
      const res = await fetch("/api/cv/master", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(resData.details ?? resData.error));
      setData(resData.cvMaster);
      setMessage({ type: "ok", text: "CV Master guardado." });
    } catch {
      setMessage({ type: "error", text: "No se pudo guardar. Revisá los campos obligatorios." });
    } finally {
      setSaving(false);
    }
  }

  function addExperience() {
    const entry: ExperienceDraft = {
      id: newId(),
      company: "",
      role: "",
      startDate: "",
      endDate: null,
      bullets: [""],
    };
    setData((d) => ({ ...d, experience: [...d.experience, entry] }));
  }

  function updateExperience(id: string, patch: Partial<ExperienceDraft>) {
    setData((d) => ({
      ...d,
      experience: d.experience.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }

  function removeExperience(id: string) {
    setData((d) => ({ ...d, experience: d.experience.filter((e) => e.id !== id) }));
  }

  function addEducation() {
    const entry: EducationDraft = { id: newId(), institution: "", degree: "", startDate: "", endDate: null };
    setData((d) => ({ ...d, education: [...d.education, entry] }));
  }

  function updateEducation(id: string, patch: Partial<EducationDraft>) {
    setData((d) => ({
      ...d,
      education: d.education.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }

  function removeEducation(id: string) {
    setData((d) => ({ ...d, education: d.education.filter((e) => e.id !== id) }));
  }

  function addLanguage() {
    const entry: LanguageDraft = { name: "", level: "intermedio" };
    setData((d) => ({ ...d, languages: [...d.languages, entry] }));
  }

  function updateLanguage(index: number, patch: Partial<LanguageDraft>) {
    setData((d) => ({
      ...d,
      languages: d.languages.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    }));
  }

  function removeLanguage(index: number) {
    setData((d) => ({ ...d, languages: d.languages.filter((_, i) => i !== index) }));
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input
              id="fullName"
              value={data.personal.fullName}
              onChange={(e) =>
                setData((d) => ({ ...d, personal: { ...d.personal, fullName: e.target.value } }))
              }
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={data.personal.email}
              onChange={(e) => setData((d) => ({ ...d, personal: { ...d.personal, email: e.target.value } }))}
            />
          </div>
          <div>
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={data.personal.phone ?? ""}
              onChange={(e) => setData((d) => ({ ...d, personal: { ...d.personal, phone: e.target.value } }))}
            />
          </div>
          <div>
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              value={data.personal.location ?? ""}
              onChange={(e) => setData((d) => ({ ...d, personal: { ...d.personal, location: e.target.value } }))}
            />
          </div>
          <div>
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              value={data.personal.linkedin ?? ""}
              onChange={(e) => setData((d) => ({ ...d, personal: { ...d.personal, linkedin: e.target.value } }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen profesional</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            value={data.summary}
            onChange={(e) => setData((d) => ({ ...d, summary: e.target.value }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Experiencia</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {data.experience.map((exp) => (
            <div key={exp.id} className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Cargo"
                  value={exp.role}
                  onChange={(e) => updateExperience(exp.id, { role: e.target.value })}
                />
                <Input
                  placeholder="Empresa"
                  value={exp.company}
                  onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                />
                <Input
                  placeholder="Inicio (YYYY-MM)"
                  value={exp.startDate}
                  onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                />
                <Input
                  placeholder="Fin (YYYY-MM, vacío = actual)"
                  value={exp.endDate ?? ""}
                  onChange={(e) => updateExperience(exp.id, { endDate: e.target.value || null })}
                />
              </div>
              <Textarea
                placeholder="Un logro/responsabilidad por línea"
                rows={3}
                value={exp.bullets.join("\n")}
                onChange={(e) => updateExperience(exp.id, { bullets: e.target.value.split("\n") })}
              />
              <Button variant="ghost" size="sm" className="self-start text-destructive" onClick={() => removeExperience(exp.id)}>
                Quitar
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="self-start" onClick={addExperience}>
            + Agregar experiencia
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Educación</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {data.education.map((edu) => (
            <div key={edu.id} className="grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-2">
              <Input
                placeholder="Título"
                value={edu.degree}
                onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
              />
              <Input
                placeholder="Institución"
                value={edu.institution}
                onChange={(e) => updateEducation(edu.id, { institution: e.target.value })}
              />
              <Input
                placeholder="Inicio"
                value={edu.startDate}
                onChange={(e) => updateEducation(edu.id, { startDate: e.target.value })}
              />
              <Input
                placeholder="Fin (vacío = en curso)"
                value={edu.endDate ?? ""}
                onChange={(e) => updateEducation(edu.id, { endDate: e.target.value || null })}
              />
              <Button
                variant="ghost"
                size="sm"
                className="self-start text-destructive sm:col-span-2"
                onClick={() => removeEducation(edu.id)}
              >
                Quitar
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="self-start" onClick={addEducation}>
            + Agregar educación
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="React, TypeScript, Node.js, ..."
            rows={2}
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Idiomas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {data.languages.map((lang, i) => (
            <div key={i} className="flex gap-3">
              <Input
                placeholder="Idioma"
                value={lang.name}
                onChange={(e) => updateLanguage(i, { name: e.target.value })}
              />
              <Select
                value={lang.level}
                onValueChange={(value) => updateLanguage(i, { level: value as LanguageDraft["level"] })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basico">Básico</SelectItem>
                  <SelectItem value="intermedio">Intermedio</SelectItem>
                  <SelectItem value="avanzado">Avanzado</SelectItem>
                  <SelectItem value="nativo">Nativo</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeLanguage(i)}>
                Quitar
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="self-start" onClick={addLanguage}>
            + Agregar idioma
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando…" : "Guardar CV Master"}
        </Button>
        {message && (
          <span className={message.type === "ok" ? "text-sm text-primary" : "text-sm text-destructive"}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
