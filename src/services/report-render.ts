import type { LegalReport } from './reports.js';

function cell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

/**
 * Deterministic markdown snapshot. Pending items, limitations and the
 * disclaimer are always rendered; the report hash is printed so a copied file
 * can be compared with the stored one.
 */
export function renderReportMarkdown(report: LegalReport): string {
  const lines: string[] = [];
  lines.push(`# Informe ${cell(report.id)}`);
  lines.push('');
  lines.push(`- Expediente: ${cell(report.matterId)} (v${report.matterVersion})`);
  lines.push(`- Generado: ${cell(report.generatedAt)}`);
  lines.push(
    `- Cobertura: ${report.coverage.facts} hechos (${report.coverage.corroboratedFacts} corroborados), ` +
      `${report.coverage.citations} citas (${report.coverage.verifiedCitations} verificadas)`,
  );
  lines.push(`- Hash: ${cell(report.hash)}`);
  lines.push('');

  lines.push('## Pendiente');
  if (report.pending.length === 0) {
    lines.push('- Sin pendientes registrados en este snapshot.');
  } else {
    for (const item of report.pending) lines.push(`- ${cell(item)}`);
  }
  lines.push('');

  lines.push('## Limitaciones');
  if (report.limitations.length === 0) {
    lines.push('- Ninguna declarada.');
  } else {
    for (const item of report.limitations) lines.push(`- ${cell(item)}`);
  }
  lines.push('');

  lines.push('## Citas');
  if (report.citations.length === 0) {
    lines.push('- Sin citas.');
  } else {
    lines.push('| Cita | Estado | Motivos |');
    lines.push('|---|---|---|');
    for (const citation of report.citations) {
      lines.push(
        `| ${cell(citation.citation)} | ${cell(citation.status)} | ${cell(citation.reasons.join('; '))} |`,
      );
    }
  }
  lines.push('');

  lines.push('## Fuentes');
  if (report.sources.length === 0) {
    lines.push('- Sin fuentes registradas.');
  } else {
    for (const source of report.sources) {
      lines.push(`- ${cell(source.authorityRef)} — ${cell(source.sourceHash)}`);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push(cell(report.disclaimer));
  lines.push('');
  return lines.join('\n');
}
