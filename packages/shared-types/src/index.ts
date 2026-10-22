import { z } from 'zod';

// Roles del sistema (PRD Sección 2)
export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  EDITOR = 'EDITOR',
  OPERATOR = 'OPERATOR',
  AUDITOR = 'AUDITOR',
}

// Estados del flujo editorial (PRD Sección 4 - M06)
export enum DraftStatus {
  DISCOVERED = 'DISCOVERED',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  PUBLISHING = 'PUBLISHING',
  PUBLISHED = 'PUBLISHED',
  FAILED_RETRYABLE = 'FAILED_RETRYABLE',
  FAILED_FINAL = 'FAILED_FINAL',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

// Banderas de riesgo editorial (PRD Sección 3 punto 6)
export enum RiskFlag {
  HEALTH = 'HEALTH',
  EMERGENCY = 'EMERGENCY',
  CRIME = 'CRIME',
  REPUTATION = 'REPUTATION',
  MARKETS = 'MARKETS',
  ELECTIONS_POLITICS = 'ELECTIONS_POLITICS',
  VIOLENCE = 'VIOLENCE',
  MINORS = 'MINORS',
  DISASTERS = 'DISASTERS',
  UNCONFIRMED = 'UNCONFIRMED',
}

// Estado de corroboración y verificación
export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  SINGLE_SOURCE = 'SINGLE_SOURCE',
  CORROBORATED = 'CORROBORATED',
  DISPUTED = 'DISPUTED',
}

// Tipos de fuentes de noticias
export enum NewsSourceType {
  RSS = 'RSS',
  LICENSED_API = 'LICENSED_API',
}

// Esquemas de validación Zod

// Auth DTOs
export const LoginDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginDto = z.infer<typeof LoginDtoSchema>;

export const RegisterDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(3),
  role: z.nativeEnum(UserRole).default(UserRole.EDITOR),
});
export type RegisterDto = z.infer<typeof RegisterDtoSchema>;

// News Source DTOs
export const CreateNewsSourceDtoSchema = z.object({
  name: z.string().min(2),
  type: z.nativeEnum(NewsSourceType).default(NewsSourceType.RSS),
  url: z.string().url(),
  locale: z.string().default('es-CO'),
  category: z.string().default('General'),
  licenseNotes: z.string().optional(),
  enabled: z.boolean().default(true),
  pollingIntervalMinutes: z.number().int().min(5).max(1440).default(30),
});
export type CreateNewsSourceDto = z.infer<typeof CreateNewsSourceDtoSchema>;

// Editorial LLM Output Schema (PRD Sección 4 - M05)
export const EditorialOutputSchema = z.object({
  headline: z.string().min(10).max(150),
  summary: z.string().min(50).max(1000),
  source_attribution: z.string().min(2),
  source_url: z.string().url(),
  verification_notes: z.string(),
  uncertainties: z.string().optional(),
  hashtags: z.array(z.string()).default([]),
  risk_flags: z.array(z.nativeEnum(RiskFlag)).default([]),
  suggested_publish_at: z.string().datetime().optional(),
});
export type EditorialOutput = z.infer<typeof EditorialOutputSchema>;

// Draft Update & Approval DTOs
export const UpdateDraftDtoSchema = z.object({
  title: z.string().min(5).optional(),
  body: z.string().min(20).optional(),
  sourceUrl: z.string().url().optional(),
  sourceAttribution: z.string().optional(),
  riskLevel: z.string().optional(),
  reason: z.string().min(3).optional(), // Razón del cambio para auditoría
});
export type UpdateDraftDto = z.infer<typeof UpdateDraftDtoSchema>;

export const ScheduleDraftDtoSchema = z.object({
  pageId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
});
export type ScheduleDraftDto = z.infer<typeof ScheduleDraftDtoSchema>;

// Group Bookmark & Manual Share DTOs (PRD M08)
export const CreateGroupBookmarkDtoSchema = z.object({
  name: z.string().min(2),
  url: z.string().url(),
  rulesNotes: z.string().optional(),
});
export type CreateGroupBookmarkDto = z.infer<typeof CreateGroupBookmarkDtoSchema>;

export const MarkManualShareDtoSchema = z.object({
  groupId: z.string().uuid(),
  draftId: z.string().uuid(),
  notes: z.string().optional(),
});
export type MarkManualShareDto = z.infer<typeof MarkManualShareDtoSchema>;

// Interfaces de Respuestas Sanitizadas de Publicación Meta
export interface MetaPostPublishResult {
  success: boolean;
  remotePostId?: string;
  errorMessage?: string;
  errorCode?: number;
  isRetryable: boolean;
}
