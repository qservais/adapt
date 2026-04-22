import { customFetch } from "./custom-fetch";

export interface ProgramTemplate {
  id: string;
  name: string;
  description?: string | null;
  durationWeeks: number;
  sessionCount: number;
  isTemplate: boolean;
  createdAt: string | null;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  durationWeeks: number;
}

export interface ApplyTemplateRequest {
  athleteId: string;
  startDate?: string;
}

export async function getTemplates(): Promise<ProgramTemplate[]> {
  return customFetch<ProgramTemplate[]>("/api/programs/templates");
}

export async function createTemplate(data: CreateTemplateRequest): Promise<ProgramTemplate> {
  return customFetch<ProgramTemplate>("/api/programs/templates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteTemplate(templateId: string): Promise<{ success: boolean }> {
  return customFetch<{ success: boolean }>(`/api/programs/templates/${templateId}`, {
    method: "DELETE",
  });
}

export async function duplicateForAthlete(programId: string, data: ApplyTemplateRequest): Promise<{
  id: string;
  name: string;
  athleteId: string | null;
  athleteName: string;
  durationWeeks: number;
  startDate: string | null;
  isActive: boolean | null;
  createdAt: string | null;
}> {
  return customFetch(`/api/programs/${programId}/duplicate-for-athlete`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function saveAsTemplate(programId: string): Promise<ProgramTemplate> {
  return customFetch<ProgramTemplate>(`/api/programs/${programId}/save-as-template`, {
    method: "POST",
  });
}

export async function applyTemplate(templateId: string, data: ApplyTemplateRequest): Promise<{
  id: string;
  name: string;
  athleteId: string | null;
  athleteName: string;
  durationWeeks: number;
  startDate: string | null;
  isActive: boolean | null;
  createdAt: string | null;
}> {
  return customFetch(`/api/programs/templates/${templateId}/apply`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
