import type { LegalReport } from './reports.js';

export class ReportStore {
  private readonly reports = new Map<string, LegalReport>();

  save(report: LegalReport): LegalReport {
    this.reports.set(`${report.tenantId}::${report.id}`, { ...report });
    return { ...report };
  }

  get(tenantId: string, id: string): LegalReport | null {
    const found = this.reports.get(`${tenantId}::${id}`);
    return found ? { ...found } : null;
  }
}
