# CONCEPT MASTER — AGNTIA LEGAL

**Versión:** 1.0 · **Fecha:** 2026-11-15 · **Serie:** 05/14 · **Estado:** visión y arquitectura documental

> Fuente de visión estratégica y decisiones arquitectónicas. **DOCUMENTATION_ONLY**: ninguna capacidad enumerada implica implementación o habilitación profesional. No sustituye el roadmap existente de 42 campañas.

## 01. Misión y concepto rector

Agntia Legal es un departamento jurídico digital, continuo y verificable: organiza información, investiga derecho aplicable, prepara contratos, analiza riesgos, controla obligaciones y produce expedientes revisables. Su objetivo no es simular un abogado ni sustituir la representación profesional, sino convertir necesidades jurídicas empresariales en flujos de trabajo trazables, con fuentes, fechas, jurisdicción, revisión competente y resultados auditables.

## 02. Estado actual y evidencia

Baseline del README del 2026-11-13: DOCUMENTATION_ONLY; sin aplicación, SDK, proveedores conectados ni pruebas de producto ejecutadas. 42 campañas NOT_STARTED, 294 tareas y 84 escenarios NOT_EXECUTED. Los archivos docs/01-producto.md, docs/architecture/01-arquitectura.md, docs/contracts/01-contratos.md, docs/05-seguridad-privacidad.md, docs/09-evaluacion.md y docs/campaigns/README.md son especificaciones, no evidencias de funcionalidad. No modificar /agente en esta entrega.

## 03. Propuesta de valor y clientes

Atiende autónomos, pymes y empresas medianas con una capa de legal operations y contract lifecycle management; también puede servir a despachos y profesionales habilitados como sistema de apoyo. Valor: menor tiempo de preparación, mejor trazabilidad, vencimientos controlados, búsqueda fiable y menos pérdida de conocimiento documental. No prometer asesoramiento jurídico universal, secreto profesional automático, litigación o cumplimiento garantizado.

## 04. Catálogo objetivo de 72 capacidades

01 intake; 02 clasificación de asunto; 03 alcance de encargo; 04 partes; 05 conflictos; 06 representación; 07 confidencialidad por asunto; 08 permisos granulares; 09 custodia documental; 10 versionado; 11 hash/provenance; 12 OCR; 13 extracción estructurada; 14 detección de contradicciones; 15 cronologías; 16 hechos y alegaciones; 17 evidencia; 18 taxonomía jurídica; 19 jurisdicción; 20 derecho aplicable; 21 fecha de vigencia; 22 BOE; 23 EUR-Lex; 24 jurisprudencia con fuente; 25 verificación de citas; 26 relevancia de fuentes; 27 cambios normativos; 28 memorandos; 29 investigación contradictoria; 30 preguntas pendientes; 31 plantillas; 32 playbooks; 33 cláusulas; 34 borradores; 35 redline; 36 comparación semántica; 37 negociación propuesta; 38 excepciones; 39 revisión humana; 40 opiniones versionadas; 41 riesgos; 42 obligaciones; 43 responsables; 44 plazos; 45 calendarios; 46 alertas; 47 renovaciones; 48 rescisión; 49 due diligence; 50 compliance mapping; 51 políticas internas; 52 evidencias de cumplimiento; 53 privacidad; 54 retención; 55 legal hold; 56 solicitudes de derechos; 57 aprobación; 58 firma propuesta; 59 filing propuesta; 60 expedientes; 61 portal; 62 chat; 63 avatar; 64 SDK; 65 bridge AgntiaPro; 66 SOPs; 67 analítica; 68 reportes; 69 auditoría; 70 observabilidad; 71 continuidad; 72 interoperabilidad. Todas son objetivos sujetos a pruebas y habilitación.

## 05. Arquitectura de referencia

Portal externo o AgntiaPro → autenticación Supabase JWT verificada, membership y ACL → API Hono/TypeScript nominada → core determinista (policy, FSM, verificación de fuentes, deadlines, approvals) → Postgres/Supabase RLS, objetos, versiones, evidencia, outbox e inbox → workers y adaptadores autorizados → recibos y reportes. El LLM propone, redacta y explica; nunca se convierte en fuente normativa ni en autoridad de aprobación.

## 06. Integración con el sistema operativo AgntiaPro

La identidad canónica de agentes, supervisión, rotas y SOP empresariales reside en /agente. El repositorio Legal implementa capacidades jurídicas específicas y twins vinculados, no otro OS empresarial. DelegationMandate conserva originatingActor, tenant de origen, targetTenant, WorkOrder, recursos, propósito, presupuesto, expiración, prueba y revocación. AuthorityMap por encargo asigna custodio y responsable único de cada efecto, incluso cuando Legal coopera con Gestoría, Finanzas, RRHH, Ciberseguridad o Comunicación.

## 07. Modelo de datos y autoridad

LegalMatter, EngagementScope, ConflictCheck, DocumentVersion, EvidenceRef, FactAssertion, Jurisdiction, LawSnapshot, CitationVerification, LegalIssue, ClausePlaybook, ContractRevision, Redline, Obligation, DeadlineProposal, ReviewOpinion, FilingProposal, RetentionHold, ApprovalBinding, OperationIntent, Receipt y AuditEvent. El original conserva hash/custodio; los snapshots normativos guardan fuente, fecha y estado de consolidación; la opinión humana referencia exactamente los materiales revisados. Nunca convertir una inferencia LLM en hecho probado.

## 08. Contratos y endpoints

Envelope schemaVersion, operationId, tenantId resuelto por servidor, actor verificado, capability nominada, correlationId, idempotencyKey, expectedVersion, approvalRef, dryRun y payload validado. DTOs cerrados con límites de tamaño y rechazo de campos inesperados. Operaciones separadas: legal.intake.propose, legal.conflicts.preview, legal.document.stage, legal.citation.resolve, legal.citation.verify, legal.memo.propose, legal.draft.propose, legal.redline.preview, legal.deadline.propose, legal.review.record, legal.filing.propose. Sin endpoint de SQL, shell, HTTP o proveedor genérico.

## 09. Investigación jurídica con verificación de vigencia

El motor distingue: 1) identificación de la norma/sentencia, 2) autenticidad y procedencia, 3) texto y versión, 4) vigencia temporal, 5) ámbito territorial/material, 6) pertinencia para hechos concretos, 7) excepciones y fuentes contrarias, 8) conclusión revisada. Una cita existente no demuestra su aplicabilidad. Si no hay fuente oficial verificable, resultado PENDING/UNVERIFIED. No fabricar artículos, jurisprudencia, ECLI ni fechas.

## 10. Contratos y redline

CLM orientado a la evidencia: plantilla aprobada, datos del asunto, cláusulas de playbook, versiones y hash del original, cambios estructurados, diff semántico, excepciones, revisión y aceptación. Un redline jamás altera silenciosamente el original. Firma, envío a contraparte y negociación vinculante son efectos distintos, cada uno con su mandato y aprobación específica. Cambios concurrentes invalidan el diff anterior.

## 11. Plazos y obligaciones

DeadlineProposal requiere hecho desencadenante demostrado, norma/regla versionada, territorio, calendario de días hábiles e inhábiles, zona horaria, excepciones y revisión competente. Una fecha inferida del chat no puede activar un plazo jurídico confirmado. Obligation registra fuente, parte responsable, condición de inicio, periodicidad, evidencia y estado; un contrato sin firmar no genera por sí mismo obligación vigente.

## 12. SOPs legales prioritarios

SOP-L01 intake y conflicto; L02 confidencialidad y alcance; L03 custodia y extracción; L04 cronología y contradicciones; L05 investigación de fuentes; L06 verificación de citas; L07 memo; L08 contrato; L09 redline; L10 revisión profesional; L11 obligaciones y plazos; L12 seguimiento normativo; L13 retención/hold; L14 cierre y reporte. Cada SOP: inputs, precondiciones, permisos, fuente, FSM, revisiones, evidencia, idempotencia, rollback/reconciliación y criterios de aceptación.

## 13. Seguridad, privacidad y secreto

Deny-by-default, RLS por tenant y ACL por matter/campo, aislamiento de búsqueda/vector, Storage, Realtime, exports y backups. Confidencialidad profesional no se presume por utilizar SaaS; evaluar custodia, roles, contratos, proveedores y secreto aplicable. Defensas frente a prompt injection documental, exfiltración, SSRF, macros, CSV injection, documentos maliciosos y OCR erróneo. Retención/hold y solicitudes de supresión con conflictos jurídicos revisados, sin borrado indiscriminado. No datos reales en fixtures.

## 14. Revisión humana y actos regulados

Una revisión competente es un acto atribuible a una persona realmente habilitada cuando corresponda; vincula identidad, versión, fuentes, alcance, firma de decisión y fecha. El twin no se autoaprueba. Fuera del piloto: representación ante tribunales/administraciones, presentación de escritos, firma vinculante y negociación autónoma. FilingProposal es una propuesta, no un trámite ejecutado. Verificar normas y competencia según territorio, fecha y servicio concreto antes de ampliar.

## 15. UX y comunicación

Vistas por expediente, documentos, hechos, fuentes, contradicciones, contratos, plazos, riesgos, revisiones y trazabilidad. Chat y avatar Anam explican con citas, fecha, incertidumbre y acciones pendientes; no simulan ser abogado colegiado ni afirman haber presentado documentos. Laia supervisa la experiencia del cliente y coordina handoffs; agentes especializados preparan trabajo con autorización y reportan estado real.

## 16. Adaptadores y proveedores

Primero un vertical con fuentes oficiales BOE/EUR-Lex y custodia documental; evaluar OpenContracts para corpus y extracción, Docassemble para entrevistas, firma electrónica y sistemas documentales solo tras discovery de edición, permisos, licencia, región, costes y APIs. CapabilityReport por despliegue. Sin conexión probada: NOT_VERIFIED. Una fuente externa no sustituye una interpretación competente del derecho.

## 17. Evaluación adversarial y aceptación

Fixtures tenantA/B + operadorP, asuntos de nombres similares, usuarios multiempresa, permisos revocados, conflicto, documento alterado, OCR equivocado, cita derogada, ley de otra jurisdicción, plazo mal calculado, firma no autorizada y caída remota tras commit. Gates: cero fuga de asunto, cero secreto, cero aprobación fabricada, cero presentación sin autorización, cero duplicado por replay. Evaluar resultado y trayectoria completa, no solo respuesta textual. Tests con versión, entorno, evidencias, PASS/FAIL/SKIPPED/BLOCKED.

## 18. Roadmap preservado

Conservar C01–C42 y manifest existentes: C01–C08 fundaciones, C09–C32 dominio jurídico, C33–C42 portal, SDK, bridge, cooperación, observabilidad, seguridad, E2E, operaciones y aceptación. Primer vertical: intake sintético → alcance/conflicto → documentos → hechos/citas → norma por territorio/fecha → borrador/redline → revisión humana → entrega sandbox con límites; sin filing. Checkpoints y reportes con SHA, diff, pruebas y blockers, sin afirmar paridad con productos de referencia.

## 19. Operaciones y aprendizaje

Audit append-only, correlation/causation, intents, outbox, jobs, DLQ, revalidación antes de efecto, reconciliación ante timeout y restore sin resucitar permisos. Métricas: fuentes verificadas, cobertura de cuestiones, citas vigentes y pertinentes, revisiones pendientes, contradicciones, plazos revisados, tiempos de preparación, costes y errores. Aprendizaje a partir de reportes de campañas y decisiones revisadas, no de memorias privadas mezcladas entre clientes.

## 20. Visión evolutiva y límites

Evolucionar hacia un sistema de operaciones jurídicas empresariales que se actualiza al cambiar normas, contratos y riesgos; genera propuestas de adaptación, identifica negocios afectados y coordina cambios con otros departamentos. No prometer vigilancia normativa perfecta ni cumplimiento automático. Las nuevas versiones del Concept Master deben incorporar evidencia de implementación, pilotos autorizados y cambios regulatorios. Separar visión, capacidad construida, capacidad probada y capacidad comercialmente habilitada.

## Fuentes del propio repositorio

- `README.md`, `docs/01-producto.md`, `docs/architecture/01-arquitectura.md`, `docs/contracts/01-contratos.md`, `docs/05-seguridad-privacidad.md`, `docs/09-evaluacion.md`, `docs/campaigns/README.md`.
- Las especificaciones de campañas son planes y no pruebas de software.

## Control de cambios

V1.0: documento rector, 72 capacidades objetivo, 20 secciones, integración de 42 campañas existentes y límites de actuación jurídica. No se modifica `/agente`.
