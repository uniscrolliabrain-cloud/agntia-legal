import { z } from 'zod';
import { LegalError } from '../domain/errors.js';
import { isoDateSchema, opaqueIdSchema } from '../domain/ids.js';
import { parseStrict } from '../domain/validate.js';
import { editOpSchema } from '../domain/entities.js';

export interface LegalTool {
  name: string;
  capability: string;
  method: 'GET' | 'POST';
  /** Path template; `{param}` segments are filled by the SDK. */
  path: string;
  description: string;
  input: z.ZodTypeAny;
}

const matterIdInput = z.object({ matterId: opaqueIdSchema }).strict();

/**
 * Closed catalog. There is deliberately no approve, send, export_all, admin,
 * SQL, HTTP or shell tool, and no tool accepts tenantId or actorId: those are
 * resolved from the verified principal on the server.
 */
export const LEGAL_TOOLS: readonly LegalTool[] = [
  {
    name: 'legal_matter_read',
    capability: 'legal.matter.read',
    method: 'GET',
    path: '/v1/legal/matters/{matterId}',
    description: 'Read a matter within the verified tenant scope.',
    input: matterIdInput,
  },
  {
    name: 'legal_matter_intake',
    capability: 'legal.intake.propose',
    method: 'POST',
    path: '/v1/legal/matters',
    description: 'Register an engagement intake; the scope is never assumed complete.',
    input: z
      .object({
        title: z.string().min(1).max(256),
        purpose: z.string().min(1).max(512),
        territory: z.string().min(2).max(16),
        applicableDate: isoDateSchema,
        requestedAction: z.string().min(1).max(512),
        scopeComplete: z.boolean().optional(),
      })
      .strict(),
  },
  {
    name: 'legal_conflict_record',
    capability: 'legal.conflicts.preview',
    method: 'POST',
    path: '/v1/legal/matters/{matterId}/conflicts',
    description: 'Record a conflict check; open conflicts block the matter.',
    input: z
      .object({
        matterId: opaqueIdSchema,
        partyRefs: z.array(z.string().min(1).max(256)).min(1),
        representation: z.string().min(1).max(512),
        result: z.enum(['clear', 'possible_conflict', 'conflict', 'insufficient_data']),
        notes: z.string().max(2000).optional(),
      })
      .strict(),
  },
  {
    name: 'legal_citation_verify',
    capability: 'legal.citation.verify',
    method: 'POST',
    path: '/v1/legal/citations/verify',
    description: 'Verify existence, force and pertinence separately; existence is not a conclusion.',
    input: z
      .object({
        citation: z.string().min(1).max(512),
        jurisdiction: z.string().min(2).max(16),
        applicableDate: isoDateSchema,
        matterId: opaqueIdSchema.nullable().optional(),
      })
      .strict(),
  },
  {
    name: 'legal_deadline_propose',
    capability: 'legal.deadline.propose',
    method: 'POST',
    path: '/v1/legal/deadlines/propose',
    description: 'Propose a deadline from a versioned rule, proven trigger and calendar.',
    input: z
      .object({
        matterId: opaqueIdSchema,
        rule: z
          .object({
            id: opaqueIdSchema,
            version: z.number().int().min(1),
            territory: z.string().min(2).max(16),
            dayCount: z.number().int().min(1).max(3650),
            dayType: z.enum(['business', 'calendar']),
            startRule: z.enum(['same_day', 'next_day']),
          })
          .strict(),
        trigger: z
          .object({
            id: opaqueIdSchema,
            occurredAt: isoDateSchema,
            evidenceRef: opaqueIdSchema.nullable(),
          })
          .strict(),
        calendar: z
          .object({
            territory: z.string().min(2).max(16),
            version: z.string().min(1).max(64),
            holidays: z.array(isoDateSchema).max(1000),
          })
          .strict(),
        reviewRef: opaqueIdSchema.nullable().optional(),
      })
      .strict(),
  },
  {
    name: 'legal_redline_preview',
    capability: 'legal.redline.preview',
    method: 'POST',
    path: '/v1/legal/redlines/preview',
    description: 'Preview a redline; the original document is never modified.',
    input: z
      .object({
        contractRevisionId: opaqueIdSchema,
        baseHash: z.string().regex(/^[a-f0-9]{64}$/),
        expectedVersion: z.number().int().min(1),
        currentVersion: z.number().int().min(1),
        original: z.array(z.object({ id: opaqueIdSchema, text: z.string().max(20000) }).strict()).min(1),
        editOps: z.array(editOpSchema).min(1),
      })
      .strict(),
  },
  {
    name: 'legal_report_create',
    capability: 'legal.report.read',
    method: 'POST',
    path: '/v1/legal/reports',
    description: 'Create a report snapshot with pending items and limitations.',
    input: z.object({ matterId: opaqueIdSchema, limitations: z.array(z.string().max(512)).max(50).optional() }).strict(),
  },
];

export function getTool(name: string): LegalTool {
  const tool = LEGAL_TOOLS.find((candidate) => candidate.name === name);
  if (!tool) {
    throw new LegalError('FORBIDDEN', 'Unknown tool', {
      details: { reason: 'UNKNOWN_TOOL', name },
    });
  }
  return tool;
}

export function parseToolInput(tool: LegalTool, input: unknown): unknown {
  return parseStrict(tool.input, input, `input for ${tool.name}`);
}
