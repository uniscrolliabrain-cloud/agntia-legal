import { describe, expect, it } from 'vitest';
import {
  NotConfiguredModelGateway,
  type ModelGateway,
} from '../../src/adapters/external.js';
import { createRuntime } from '../../src/container.js';
import { LegalError } from '../../src/domain/errors.js';
import { createBackupManifest, verifyBackupManifest } from '../../src/ops/backup.js';
import { createPostgresRepositories } from '../../src/persistence/postgres.js';
import { buildTenantArchive } from '../../src/services/export-service.js';
import { CompetenceRegistry, assessApplicableLaw } from '../../src/services/jurisdiction-service.js';
import { renderReportMarkdown } from '../../src/services/report-render.js';
import { REPORT_DISCLAIMER, type LegalReport } from '../../src/services/reports.js';
import { ModelService, UsageService } from '../../src/services/usage-service.js';
import { eur, TENANT_A, TENANT_B } from '../helpers/fixtures.js';

const NOW = new Date('2026-03-01T10:00:00.000Z');

async function expectReason(
  run: () => Promise<unknown> | unknown,
  code: string,
  reason: string,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(LegalError);
    const legal = error as LegalError;
    expect(legal.code).toBe(code);
    expect(legal.details).toMatchObject({ reason });
    return;
  }
  throw new Error(`Expected ${code}/${reason}`);
}

describe('uso de modelos y coste', () => {
  const gateway: ModelGateway = {
    id: 'model.test',
    status: 'configured',
    async complete() {
      return {
        providerRef: 'model.test',
        outputRef: 'store://output/1',
        outputHash: 'a'.repeat(64),
        cost: eur('0.42'),
        usage: { inputTokens: 900, outputTokens: 120 },
      };
    },
  };

  it('registra uso una sola vez por clave de operación', async () => {
    const usage = new UsageService();
    const service = new ModelService(gateway, usage);
    const input = {
      tenantId: TENANT_A,
      operationKey: 'op_1',
      model: 'model-x',
      purpose: 'summarise',
      promptRef: 'store://prompt/1',
      promptHash: 'b'.repeat(64),
      maxOutputTokens: 500,
      estimatedCost: eur('0.50'),
    };

    await service.run(input, NOW);
    await service.run(input, NOW);

    const totals = usage.totals(TENANT_A);
    expect(totals.calls).toBe(1);
    expect(totals.inputTokens).toBe(900);
    expect(totals.cost?.amount).toBe('0.42');
    expect(usage.totals(TENANT_B).calls).toBe(0);
  });

  it('falla cerrado sin gateway y rechaza coste negativo', async () => {
    const service = new ModelService(new NotConfiguredModelGateway(), new UsageService());
    await expectReason(
      () =>
        service.run(
          {
            tenantId: TENANT_A,
            operationKey: 'op_1',
            model: 'model-x',
            purpose: 'summarise',
            promptRef: 'store://prompt/1',
            promptHash: 'b'.repeat(64),
            maxOutputTokens: 500,
            estimatedCost: eur('0.50'),
          },
          NOW,
        ),
      'CAPABILITY_NOT_VERIFIED',
      'PROVIDER_NOT_CONFIGURED',
    );

    const usage = new UsageService();
    expect(() =>
      usage.record(
        {
          tenantId: TENANT_A,
          operationKey: 'op_2',
          model: 'model-x',
          purpose: 'summarise',
          inputTokens: 1,
          outputTokens: 1,
          cost: eur('-1.00'),
        },
        NOW,
      ),
    ).toThrow(LegalError);
  });
});

describe('backup verificable', () => {
  it('detecta un archivo alterado y un tenant distinto', () => {
    const archive = buildTenantArchive({
      tenantId: TENANT_A,
      matters: [],
      facts: [],
      holds: [],
      now: NOW,
    });
    const manifest = createBackupManifest({
      archive,
      storageRef: 's3://backups/2026-03-01.tar.gz',
      now: NOW,
    });

    expect(verifyBackupManifest(manifest, archive).ok).toBe(true);

    const tampered = { ...archive, revokedUserIds: ['user_1'] };
    const tamperedResult = verifyBackupManifest(manifest, tampered);
    expect(tamperedResult.ok).toBe(false);
    expect(tamperedResult.reasons).toContain('ARCHIVE_HASH_MISMATCH');

    const otherTenant = { ...archive, tenantId: TENANT_B };
    expect(verifyBackupManifest(manifest, otherTenant).reasons).toContain('TENANT_MISMATCH');
  });

  it('exige una referencia de almacenamiento', () => {
    const archive = buildTenantArchive({
      tenantId: TENANT_A,
      matters: [],
      facts: [],
      holds: [],
      now: NOW,
    });
    expect(() => createBackupManifest({ archive, storageRef: ' ', now: NOW })).toThrow(LegalError);
  });
});

describe('adaptador Postgres', () => {
  it('falla cerrado y exige referencia de conexión', () => {
    expect(() =>
      createPostgresRepositories({
        connectionRef: 'postgres://user:pass@localhost/db',
        schema: 'legal',
        poolSize: 5,
        statementTimeoutMs: 5000,
      }),
    ).toThrow(LegalError);

    expect(() =>
      createPostgresRepositories({
        connectionRef: 'vault:legal/postgres',
        schema: 'legal',
        poolSize: 5,
        statementTimeoutMs: 5000,
      }),
    ).toThrow(LegalError);
  });
});

describe('render de informes', () => {
  it('incluye pendientes, limitaciones, disclaimer y escapa tablas', () => {
    const report: LegalReport = {
      id: 'rpt_1',
      tenantId: TENANT_A,
      matterId: 'mat_1',
      matterVersion: 2,
      generatedAt: NOW.toISOString(),
      coverage: { facts: 1, corroboratedFacts: 0, citations: 0, verifiedCitations: 0 },
      pending: ['FACT_1_UNVERIFIED', 'CITATION_A|B_NEEDS_REVIEW'],
      limitations: ['Sin fuentes externas'],
      citations: [],
      sources: [],
      disclaimer: REPORT_DISCLAIMER,
      hash: 'c'.repeat(64),
    };

    const markdown = renderReportMarkdown(report);
    expect(markdown).toContain('## Pendiente');
    expect(markdown).toContain('FACT_1_UNVERIFIED');
    expect(markdown).toContain('CITATION_A\\|B_NEEDS_REVIEW');
    expect(markdown).toContain('Sin fuentes externas');
    expect(markdown).toContain('Borrador asistido por software');
    expect(markdown).toContain(report.hash);
  });
});

describe('retención programada y competencia', () => {
  it('expira holds vencidos sin borrarlos y deja de bloquear', async () => {
    const { services } = createRuntime();
    const hold = await services.retention.place(
      TENANT_A,
      'usr_a',
      {
        retentionRule: 'litigation',
        holdScope: 'matter:mat_1',
        requesterProof: 'proof_1',
        expiresAt: '2026-02-01T00:00:00.000Z',
      },
      NOW,
    );

    const expired = await services.retention.expireDue(TENANT_A, NOW);
    expect(expired.map((entry) => entry.id)).toEqual([hold.id]);
    expect(expired[0]?.status).toBe('expired');
    expect(await services.retention.activeHolds(TENANT_A, NOW)).toHaveLength(0);
    await expect(
      services.retention.assertExportAllowed(TENANT_A, 'matter:mat_1', NOW),
    ).resolves.toBeUndefined();
  });

  it('un registro de competencia confirmado permite concluir el nivel autonómico', () => {
    const registry = new CompetenceRegistry([
      {
        territory: 'ES-CT',
        level: 'subnational',
        instrumentRef: 'competence/es-ct',
        status: 'confirmed',
        verifiedAt: NOW.toISOString(),
      },
    ]);

    const result = assessApplicableLaw({
      territory: 'ES-CT',
      applicableDate: '2026-01-01',
      subnationalCompetence: 'pending',
      registry,
    });
    expect(result.status).toBe('confirmed');
    expect(result.levels).toEqual(['ES-CT', 'ES']);
  });
});
