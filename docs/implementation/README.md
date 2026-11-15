# Legal — implementación por campaña

42 campañas, 294 tareas y 84 gates preservados del manifest. Cada campaña tiene
ahora un contrato en código; ninguna queda `NOT_STARTED`. Carpetas de trabajo:
[Originales](../campaigns/README.md) · [PREP](../prep/README.md) ·
[Factory](../factory/00-README.md) · [Léxico](../factory/02-LEXICO.md) ·
[ADTC](../factory/03-TRACE-OBSERVABILITY.md) ·
[Producto Legal](../factory/04-PRODUCTO-LEGAL.md).

## Vocabulario

| Estado | Significado |
|---|---|
| `IMPLEMENTED` | El contrato central existe en código y tiene pruebas ejecutadas en verde. |
| `PARTIAL` | El contrato central existe y está probado; falta integración real, UI o una parte declarada. |
| `STUBBED` | Solo existe la frontera (puerto/contrato) con fallo cerrado y prueba; no hay integración. |
| `NOT_VERIFIED` | Código escrito pero no ejecutado contra el sistema real (Postgres, proveedores). |

## Evidencia de baseline (ejecutada)

```
npx tsc --noEmit         → 0 errores
npx vitest run           → 26 ficheros, 221 tests, 221 passed
npm run build            → dist/ generado
```

`tests/persistence/rls.test.ts` ejecuta `0001_init.sql` y `0002_rls.sql` en PGlite
(8 tests). Un Postgres/Supabase real sigue **NOT_VERIFIED**. Los stubs y lo que
falta para sustituirlos están en [STUBS.md](STUBS.md).

## Matriz

| Campaña | Carpeta | Estado | Evidencia / nota |
|---|---|---|---|
| LEG-C01 | [Baseline, fuentes y alcance](01-baseline-fuentes-y-alcance/README.md) | IMPLEMENTED | [BASELINE](../release/BASELINE.json), SHA congelado y tooling real |
| LEG-C02 | [Autoridad por dominio y contrato SaaS](02-autoridad-por-dominio-y-contrato-saas/README.md) | PARTIAL | PDP + `AgreementService` (capacidades, presupuesto y vigencia); sin persistencia/API |
| LEG-C03 | [Supabase JWT y principal](03-supabase-jwt-y-principal/README.md) | IMPLEMENTED | `src/api/auth.ts` + `tests/api/auth.test.ts` |
| LEG-C04 | [Twins y nomenclatura canónica](04-twins-y-nomenclatura-canonica/README.md) | IMPLEMENTED | mandato con purpose/budget/expiry/revocación |
| LEG-C05 | [DTOs, esquemas y errores](05-dtos-esquemas-y-errores/README.md) | IMPLEMENTED | zod estricto, envelope y error envelope |
| LEG-C06 | [Persistencia, RLS y migraciones](06-persistencia-rls-y-migraciones/README.md) | PARTIAL | repos CAS en memoria, SQL/RLS en PGlite, stub Postgres; real **NOT_VERIFIED** |
| LEG-C07 | [Mandatos, finalidad y aprobaciones](07-mandatos-finalidad-y-aprobaciones/README.md) | PARTIAL | approval binding + mandato + reservas de presupuesto idempotentes |
| LEG-C08 | [Secretos, discovery y aislamiento remoto](08-secretos-discovery-y-aislamiento-remoto/README.md) | PARTIAL | `ConnectionService` (solo `secretRef`), SSRF y capability gating |
| LEG-C09 | [Intake y encargo](09-intake-y-encargo/README.md) | IMPLEMENTED | `MatterService.intake` + API + tests |
| LEG-C10 | [Conflictos y partes](10-conflictos-y-partes/README.md) | PARTIAL | partes con representación evidenciada y revisión de conflictos; sin API de partes |
| LEG-C11 | [Confidencialidad de materia](11-confidencialidad-de-materia/README.md) | IMPLEMENTED | privilegio, base obligatoria y shares con caducidad |
| LEG-C12 | [Custodia documental](12-custodia-documental/README.md) | IMPLEMENTED | versiones inmutables, hash original, idempotencia e integridad |
| LEG-C13 | [OCR y extracción](13-ocr-y-extraccion/README.md) | PARTIAL | `ExtractionService` con MIME/límite/hash y revisión; OCR real en stub |
| LEG-C14 | [OpenContracts adaptador](14-opencontracts-adaptador/README.md) | STUBBED | validación de hash/ids; proveedor real en stub |
| LEG-C15 | [Docassemble entrevistas](15-docassemble-entrevistas/README.md) | PARTIAL | entrevistas evidenciadas; instancia real en stub |
| LEG-C16 | [Hechos y alegaciones](16-hechos-y-alegaciones/README.md) | IMPLEMENTED | corroboración con prueba revisada; contradicción prevalece |
| LEG-C17 | [Cronología y evidencia](17-cronologia-y-evidencia/README.md) | IMPLEMENTED | cronología ordenada y trigger probado |
| LEG-C18 | [Territorio y derecho aplicable](18-territorio-y-derecho-aplicable/README.md) | PARTIAL | `CompetenceRegistry` + `assessApplicableLaw`; falta tabla mantenida |
| LEG-C19 | [Fuentes BOE y EUR-Lex](19-fuentes-boe-y-eur-lex/README.md) | PARTIAL | ingesta con allowlist HTTPS y snapshot por hash; fetch real en stub |
| LEG-C20 | [Resolución de citas](20-resolucion-de-citas/README.md) | IMPLEMENTED | `resolveCitation` + tests |
| LEG-C21 | [Pertinencia y vigencia](21-pertinencia-y-vigencia/README.md) | IMPLEMENTED | existencia ≠ fragmento ≠ vigencia ≠ pertinencia |
| LEG-C22 | [Investigación y memo](22-investigacion-y-memo/README.md) | PARTIAL | memo exige autoridades verificadas y cobertura |
| LEG-C23 | [Playbooks contractuales](23-playbooks-contractuales/README.md) | PARTIAL | dentro de playbook vs excepción; catálogo no persistido |
| LEG-C24 | [Generación de borradores](24-generacion-de-borradores/README.md) | PARTIAL | bloquea campos sin evidencia; sin plantillas reales |
| LEG-C25 | [Redline y negociación propuesta](25-redline-y-negociacion-propuesta/README.md) | IMPLEMENTED | base hash, CAS, precondición y original inmutable |
| LEG-C26 | [Riesgos y excepciones](26-riesgos-y-excepciones/README.md) | PARTIAL | sin fuente queda `signal_unverified`; sin motor de excepciones |
| LEG-C27 | [Obligaciones y responsables](27-obligaciones-y-responsables/README.md) | PARTIAL | activa solo con instrumento firmado; sin persistencia/calendario |
| LEG-C28 | [Calendario de plazos](28-calendario-de-plazos/README.md) | IMPLEMENTED | regla versionada, trigger probado y revisión |
| LEG-C29 | [Seguimiento normativo](29-seguimiento-normativo/README.md) | PARTIAL | watch idempotente que solo abre `needs_review`; scheduler en stub |
| LEG-C30 | [Revisión competente](30-revision-competente/README.md) | IMPLEMENTED | revisor distinto, cualificación y decisión firmada |
| LEG-C31 | [Firma y presentación propuestas](31-firma-y-presentacion-propuestas/README.md) | PARTIAL | exige approval y firma verificada; nunca presenta; firma real en stub |
| LEG-C32 | [Retención y legal hold](32-retencion-y-legal-hold/README.md) | PARTIAL | hold, liberación por otro actor y expiración programada |
| LEG-C33 | [Reportes, dashboard e infografías](33-reportes-dashboard-e-infografias/README.md) | PARTIAL | snapshot con hash y render markdown; sin UI |
| LEG-C34 | [Portal responsive, chat y Anam](34-portal-responsive-chat-y-anam/README.md) | STUBBED | contratos de hilos/mensajes/handoff; sin frontend y Anam en stub |
| LEG-C35 | [SDK TypeScript, Hono y tools](35-sdk-typescript-hono-y-tools/README.md) | IMPLEMENTED | catálogo cerrado, entrada estricta y SDK con allowlist |
| LEG-C36 | [Bridge de agente y eventos](36-bridge-de-agente-y-eventos/README.md) | PARTIAL | SystemEvent 1.0 + outbox con ACK; host no verificado |
| LEG-C37 | [Cooperación y handoff empresarial](37-cooperacion-y-handoff-empresarial/README.md) | PARTIAL | permisos acotados, aprobación independiente y revocación; sin transporte |
| LEG-C38 | [Modelos, coste y observabilidad](38-modelos-coste-y-observabilidad/README.md) | PARTIAL | uso/coste por referencia, sin contenido; gateway real en stub |
| LEG-C39 | [Privacidad y pruebas adversariales](39-privacidad-y-pruebas-adversariales/README.md) | PARTIAL | DSAR, retención y suite adversarial; falta suite DSAR completa |
| LEG-C40 | [Vertical E2E y fallos distribuidos](40-vertical-e2e-y-fallos-distribuidos/README.md) | IMPLEMENTED | flujo completo + timeout/reconciliación |
| LEG-C41 | [Operaciones, CI, backup y release](41-operaciones-ci-backup-y-release/README.md) | PARTIAL | archivo/restore y manifiesto verificable; backup real no ejecutado |
| LEG-C42 | [Aceptación, evidencia y handoff final](42-aceptacion-evidencia-y-handoff-final/README.md) | PARTIAL | informe, matriz y stubs; no es aceptación de producto |

Resumen: 16 `IMPLEMENTED`, 24 `PARTIAL`, 2 `STUBBED`, 0 `NOT_STARTED`.

## Próximo paso

Meta-auditoría conceptual Astra aportada por founder → reconciliación →
patchsets, handoffs por campaña, tests y gates. Los handoffs marco están en
`docs/factory/`. No crear informes ficticios ni atribuir ejecución profesional a
un documento.

## Lo que no se debe afirmar

- No hay proveedor real conectado, ni Supabase desplegado, ni Postgres validado.
- No hay UI, portal, Anam, OCR, firma ni presentación de escritos.
- Los tests prueban contratos deterministas locales; no prueban un despliegue.
- `NOT_VERIFIED` no es PASS. Un stub no acredita un proveedor.
