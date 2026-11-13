# Campaña de42 fases

Diseño para una implementación futura autorizada. **42 campañas,294 tareas,84 escenarios, NOT_STARTED/NOT_EXECUTED.** No plazo ficticio de siete días. No modificar agente. Fuentes/contratos no equivalen a capacidades probadas.

[Manifest estructurado](campaign.json): IDs/dependencias, campos, operaciones, invariantes, tareas/aceptación, gates, bloqueos y rollback. Rutas de artefactos son propuestas, no archivos existentes.

C01–C08 fundaciones; C09–C32 dominio; C33–C42 exposición/servicio/seguridad/operaciones/aceptación. Avance por gates con capacidades no verificadas deshabilitadas; un fake no pasa gate real. Checkpoints cada 5 y al final de 2.

| Fase | Documento | Estado | Checkpoint |
|---|---|---|---|
| 01 | [Baseline, fuentes y alcance](01-baseline-fuentes-y-alcance.md) | NOT_STARTED | — |
| 02 | [Autoridad por dominio y contrato SaaS](02-autoridad-por-dominio-y-contrato-saas.md) | NOT_STARTED | — |
| 03 | [Supabase JWT y principal](03-supabase-jwt-y-principal.md) | NOT_STARTED | — |
| 04 | [Twins y nomenclatura canónica](04-twins-y-nomenclatura-canonica.md) | NOT_STARTED | — |
| 05 | [DTOs, esquemas y errores](05-dtos-esquemas-y-errores.md) | NOT_STARTED | Informe |
| 06 | [Persistencia, RLS y migraciones](06-persistencia-rls-y-migraciones.md) | NOT_STARTED | — |
| 07 | [Mandatos, finalidad y aprobaciones](07-mandatos-finalidad-y-aprobaciones.md) | NOT_STARTED | — |
| 08 | [Secretos, discovery y aislamiento remoto](08-secretos-discovery-y-aislamiento-remoto.md) | NOT_STARTED | — |
| 09 | [Intake y encargo](09-intake-y-encargo.md) | NOT_STARTED | — |
| 10 | [Conflictos y partes](10-conflictos-y-partes.md) | NOT_STARTED | Informe |
| 11 | [Confidencialidad de materia](11-confidencialidad-de-materia.md) | NOT_STARTED | — |
| 12 | [Custodia documental](12-custodia-documental.md) | NOT_STARTED | — |
| 13 | [OCR y extracción](13-ocr-y-extraccion.md) | NOT_STARTED | — |
| 14 | [OpenContracts adaptador](14-opencontracts-adaptador.md) | NOT_STARTED | — |
| 15 | [Docassemble entrevistas](15-docassemble-entrevistas.md) | NOT_STARTED | Informe |
| 16 | [Hechos y alegaciones](16-hechos-y-alegaciones.md) | NOT_STARTED | — |
| 17 | [Cronología y evidencia](17-cronologia-y-evidencia.md) | NOT_STARTED | — |
| 18 | [Territorio y derecho aplicable](18-territorio-y-derecho-aplicable.md) | NOT_STARTED | — |
| 19 | [Fuentes BOE y EUR-Lex](19-fuentes-boe-y-eur-lex.md) | NOT_STARTED | — |
| 20 | [Resolución de citas](20-resolucion-de-citas.md) | NOT_STARTED | Informe |
| 21 | [Pertinencia y vigencia](21-pertinencia-y-vigencia.md) | NOT_STARTED | — |
| 22 | [Investigación y memo](22-investigacion-y-memo.md) | NOT_STARTED | — |
| 23 | [Playbooks contractuales](23-playbooks-contractuales.md) | NOT_STARTED | — |
| 24 | [Generación de borradores](24-generacion-de-borradores.md) | NOT_STARTED | — |
| 25 | [Redline y negociación propuesta](25-redline-y-negociacion-propuesta.md) | NOT_STARTED | Informe |
| 26 | [Riesgos y excepciones](26-riesgos-y-excepciones.md) | NOT_STARTED | — |
| 27 | [Obligaciones y responsables](27-obligaciones-y-responsables.md) | NOT_STARTED | — |
| 28 | [Calendario de plazos](28-calendario-de-plazos.md) | NOT_STARTED | — |
| 29 | [Seguimiento normativo](29-seguimiento-normativo.md) | NOT_STARTED | — |
| 30 | [Revisión competente](30-revision-competente.md) | NOT_STARTED | Informe |
| 31 | [Firma y presentación propuestas](31-firma-y-presentacion-propuestas.md) | NOT_STARTED | — |
| 32 | [Retención y legal hold](32-retencion-y-legal-hold.md) | NOT_STARTED | — |
| 33 | [Reportes, dashboard e infografías](33-reportes-dashboard-e-infografias.md) | NOT_STARTED | — |
| 34 | [Portal responsive, chat y Anam](34-portal-responsive-chat-y-anam.md) | NOT_STARTED | — |
| 35 | [SDK TypeScript, Hono y tools](35-sdk-typescript-hono-y-tools.md) | NOT_STARTED | Informe |
| 36 | [Bridge de agente y eventos](36-bridge-de-agente-y-eventos.md) | NOT_STARTED | — |
| 37 | [Cooperación y handoff empresarial](37-cooperacion-y-handoff-empresarial.md) | NOT_STARTED | — |
| 38 | [Modelos, coste y observabilidad](38-modelos-coste-y-observabilidad.md) | NOT_STARTED | — |
| 39 | [Privacidad y pruebas adversariales](39-privacidad-y-pruebas-adversariales.md) | NOT_STARTED | — |
| 40 | [Vertical E2E y fallos distribuidos](40-vertical-e2e-y-fallos-distribuidos.md) | NOT_STARTED | Informe |
| 41 | [Operaciones, CI, backup y release](41-operaciones-ci-backup-y-release.md) | NOT_STARTED | — |
| 42 | [Aceptación, evidencia y handoff final](42-aceptacion-evidencia-y-handoff-final.md) | NOT_STARTED | Informe |

Informe: SHA/PR/diff, versiones/entorno, fases PASS/BLOCKED/NOT_VERIFIED, tests realmente ejecutados/pasados/fallidos/skipped, fixtures/receipts/fuentes, costo/riesgos y siguiente dependencia. No contar escenarios planeados como tests. STOP ante fuga, bypass de autorización/revisión, secreto, doble efecto o pérdida de audit. Producción/pagos/firmas/actos regulados fuera de esta entrega.
