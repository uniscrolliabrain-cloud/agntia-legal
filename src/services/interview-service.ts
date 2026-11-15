import type { DocassembleProvider, InterviewSession } from '../adapters/external.js';
import { LegalError } from '../domain/errors.js';

export interface InterviewQuestion {
  id: string;
  prompt: string;
  required: boolean;
  evidenceRequired: boolean;
}

export interface InterviewTemplate {
  id: string;
  version: number;
  questions: InterviewQuestion[];
}

export interface InterviewAnswer {
  value: string;
  evidenceRef: string | null;
}

export interface InterviewValidation {
  status: 'blocked' | 'proposed';
  templateId: string;
  answers: Record<string, string>;
  missing: string[];
  unsupported: string[];
  reasons: string[];
}

/**
 * Interview answers are client-provided data. Required answers need a source;
 * the service never fills a blank with a plausible fact and never turns an
 * answer into a legal conclusion.
 */
export class InterviewService {
  constructor(private readonly provider: DocassembleProvider) {}

  get providerStatus(): 'configured' | 'not_configured' {
    return this.provider.status;
  }

  async start(tenantId: string, templateRef: string): Promise<InterviewSession> {
    if (templateRef.trim().length === 0) {
      throw new LegalError('INVALID_INPUT', 'A template reference is required');
    }
    return this.provider.startInterview({ tenantId, templateRef });
  }

  validate(
    template: InterviewTemplate,
    answers: Readonly<Record<string, InterviewAnswer>>,
  ): InterviewValidation {
    if (template.questions.length === 0) {
      throw new LegalError('INVALID_INPUT', 'Interview template has no questions');
    }

    const known = new Set(template.questions.map((question) => question.id));
    for (const id of Object.keys(answers)) {
      if (!known.has(id)) {
        throw new LegalError('INVALID_INPUT', 'Answer for an unknown question', {
          details: { reason: 'UNKNOWN_QUESTION', questionId: id },
        });
      }
    }

    const missing: string[] = [];
    const unsupported: string[] = [];
    const values: Record<string, string> = {};

    for (const question of template.questions) {
      const answer = answers[question.id];
      if (!answer || answer.value.trim().length === 0) {
        if (question.required) missing.push(question.id);
        continue;
      }
      if (question.evidenceRequired && !answer.evidenceRef) {
        unsupported.push(question.id);
        if (question.required) missing.push(question.id);
        continue;
      }
      values[question.id] = answer.value;
    }

    const reasons: string[] = [];
    for (const id of missing) reasons.push(`MISSING_ANSWER:${id}`);
    for (const id of unsupported) reasons.push(`UNSOURCED_ANSWER:${id}`);

    return {
      status: reasons.length === 0 ? 'proposed' : 'blocked',
      templateId: template.id,
      answers: values,
      missing,
      unsupported,
      reasons,
    };
  }
}
