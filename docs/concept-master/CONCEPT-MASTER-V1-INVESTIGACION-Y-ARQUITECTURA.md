# AGNTIA LEGAL — CONCEPT MASTER V1
## Legal Intelligence, Evidence & Obligations Operating System
**15 noviembre 2026 · Investigación arquitectónica · No implementado**

> **Misión:** construir una oficina jurídica agéntica para empresas y profesionales que transforme documentación dispersa en hechos comprobables, investigación normativa con vigencia, contratos revisables, obligaciones controladas y expedientes auditables. El valor no es «un LLM que sabe leyes»: es **un sistema que demuestra qué fuente se consultó, qué afirmación sostiene, para qué fecha y territorio, qué incertidumbre subsiste y qué profesional autorizó cada conclusión o actuación**.

## 0. Auditoría del estado y alcance de la investigación

**Repositorio inspeccionado:** `README.md`, `AGENTS.md`, `docs/README.md`, `docs/01-producto.md`, `docs/02-investigacion.md`, `docs/03-referentes-y-brechas.md`, `docs/04-adaptadores.md`, `docs/architecture/01-arquitectura.md`, `docs/research/sources.json`, `docs/research/repositories.json`. **Estado real:** `DOCUMENTATION_ONLY`; 42 campañas `NOT_STARTED`, pruebas de producto `NOT_EXECUTED`; sin API, SDK, conectores, motor de citas, repositorio de expedientes o despliegue. El Concept Master `docs/concept-master/CONCEPT-MASTER.md` no existía en la lectura. Se conserva la documentación anterior.

**Investigación heredada:** tres papers examinados selectivamente —Legal Research Bench, Who Checks the Citations?, LegalCiteBench—, tres empresas —Harvey, CoCounsel, Lexis Protégé, esta última con acceso 403— y cinco repositorios —OpenContracts, docassemble, eyecite, LexNLP, Marker— con SHA de lectura. No son auditorías completas ni benchmarks reproducidos. **Esta V1 sintetiza las fuentes internas, desarrolla hipótesis y contratos de arquitectura, amplía el mapa competitivo y fija una agenda de investigación verificable. No se afirma haber probado productos comerciales ni leído integralmente todos los papers externos.**

**Clases de afirmación:** `OBSERVADO` si existe evidencia accesible en el repo; `FUENTE_PREVIA` si procede de investigación interna selectiva; `DISEÑO` si es arquitectura propuesta; `HIPÓTESIS` si requiere validación; `NO_VERIFICADO` para compatibilidad, cobertura jurídica, costes y licencias sin prueba. **No usar longitud ni número de capacidades como criterio de validación.**

**Restricciones de producto:** no representar ante juzgados o administraciones, presentar escritos, firmar, negociar vinculantemente, simular colegiación ni afirmar secreto profesional por ser SaaS. No convertir borrador LLM en asesoramiento jurídico definitivo. Todo expediente necesita territorio, fecha de hechos, fecha de consulta, autoridad y responsable. En materias reservadas, escalar a profesional competente. No usar datos reales sin autorización y salvaguardas.

## 1. Tesis: pasar de documentos a decisiones jurídicas auditables

La mayor dificultad de una empresa no es generar cláusulas. Es saber **qué obligaciones tiene**, por qué, desde cuándo, sobre qué hechos, con qué prueba, qué riesgo representa y quién debe actuar. El software jurídico clásico organiza documentos, calendarios y facturación; los copilotos LLM resumen y redactan. Agntia Legal debe conectar ambos con **temporalidad normativa, cadena de evidencia, gobernanza profesional y runtime determinista**.

**Flujo de valor:** `Encargo → Scope/Conflicts → Document Intake → Fact Graph → Source & Law Snapshot → Applicability Analysis → Issue/Options → Draft/Redline → Citation Verification → Professional Review → Approved Deliverable → Obligation Tracking → Change Monitoring → Retention/Closure`.

**Producto inicial realista:** dossier de contrato comercial de una pyme española, con anexos sintéticos, extracción de obligaciones, citas verificadas, redline de riesgo, calendario propuesto y entrega para revisión profesional. Sin firma ni filing. Un resultado marcado `NEEDS_REVIEW` puede ser útil y honesto; una conclusión inventada no.

### Doce innovaciones de destino

1. **Legal Reality Graph:** conecta personas jurídicas, relaciones, documentos, hechos, fuentes, normas, cláusulas, obligaciones y actuaciones con procedencia.
2. **Bitemporal Law Engine:** diferencia cuándo una regla era jurídicamente aplicable y cuándo el sistema conoció su versión.
3. **Citation-to-Claim Proof Graph:** cada proposición jurídica debe sostenerse por fuente identificada, fragmento, vigencia y razonamiento explícito.
4. **Jurisdiction & Applicability Compiler:** reglas de competencia territorial/material, fecha, sujetos, excepciones y fuentes de autoridad.
5. **Matter Digital Twin:** simulación revisable de estado de expediente, hitos, evidencias faltantes, riesgos y escenarios, no predicción de sentencia.
6. **Contract Semantic Diff Engine:** cambios de derechos, obligaciones, plazos, jurisdicción, responsabilidad y datos; no solo diferencias textuales.
7. **Obligation Causality Graph:** norma/contrato → condición → hecho disparador → obligación → plazo → prueba de cumplimiento.
8. **Legal Evidence Chain:** hashes, custodia, transformaciones, anotaciones y controles de confidencialidad; hash no demuestra autenticidad externa.
9. **Professional Authority Governor:** autorización por profesional, materia, territorio, encargo, recurso y acto; un agente no adquiere habilitación.
10. **Regulatory Change Impact Simulator:** detecta cambios en fuentes y propone qué cláusulas, expedientes y procesos revisar.
11. **Legal Operations Decision Ledger:** registra decisiones, opciones descartadas, supuestos, conflictos, revisión, responsabilidad y caducidad.
12. **Evidence-to-Effect Legal Runtime:** convierte propuestas en actos nominados con approvals, idempotencia, receipts y reconciliación; filing bloqueado en P0.

## 2. Papers y evidencia: el problema no es solo alucinar

### P01 — Legal Research Bench (arXiv:2610.00609)
**Fuente previa:** https://arxiv.org/abs/2610.00609. La investigación interna identifica un benchmark de investigación jurídica con evaluación all-pass y autoridades verificadas. **Interpretación de diseño:** evaluar una respuesta por cada proposición, no por impresión global; una sola autoridad inexistente o incorrecta invalida una conclusión que depende de ella. **Protocolo propuesto:** `ResearchTask = {facts, issue, jurisdiction, relevantDate, sourceCorpus, expectedAuthorities, acceptableUncertainty, prohibitedActions}`. Verificar exactitud de cita, existencia, jurisdicción, fecha, soporte y explicación. **Límite:** resultados estadounidenses no acreditan derecho español; no reproducido aquí.

### P02 — Who Checks the Citations? (arXiv:2606.21155)
**Fuente previa:** https://arxiv.org/abs/2606.21155. La investigación señala el problema de citas sutilmente erróneas y acceso limitado. **Decisión:** el verificador no puede ser otro LLM que responde «parece correcta». Debe recuperar fuente primaria y cotejar identidad, fragmento y contexto. Estados: `VERIFIED_SOURCE`, `VERIFIED_QUOTE`, `APPLICABILITY_REVIEWED`, `NOT_FOUND`, `ACCESS_BLOCKED`, `SUPERSEDED`, `CONTRADICTED`, `NEEDS_PROFESSIONAL_REVIEW`. Una cita real no demuestra pertinencia.

### P03 — LegalCiteBench (arXiv:2605.10186)
**Fuente previa:** https://arxiv.org/abs/2605.10186. La investigación previa advierte que recuperar precedentes closed-book o usar prompts como validación es insuficiente. **Decisión:** las referencias se resuelven mediante identificadores y fuentes; un modelo sin acceso a la fuente debe abstenerse. Para España estudiar ECLI, BOE, CENDOJ y fuentes oficiales autonómicas; no asumir que eyecite estadounidense reconoce formatos españoles.

### P04 — Otras líneas de investigación prioritarias
- **LegalBench y LegalBench-RAG:** tareas legales y recuperación; verificar metodología, jurisdicciones y licencias antes de adopción.
- **ContractNLI y CUAD:** inferencia sobre contratos y extracción de cláusulas; examinar sesgos de documentos y etiquetado.
- **CaseHOLD:** razonamiento jurídico basado en holdings, principalmente US; no trasladar sin adaptación.
- **COLIEE:** recuperación de legislación/casos y entailment; estudiar splits y tareas.
- **LexGLUE:** clasificación de texto jurídico multilingüe/europeo; comprobar corpus y aplicabilidad.
- **EUR-Lex/EuroVoc y ECLI:** identificadores, vocabularios y fuentes para Europa.
- **Temporal knowledge graphs, defeasible reasoning y argumentation frameworks:** investigar representación de excepciones, precedencia y conflicto normativo.
- **Document intelligence:** OCR con posiciones y confianza, tablas, anexos, firmas, orden de lectura y redacciones.

**Protocolo para cada paper:** pregunta, dataset y jurisdicción, baseline, método, métricas, fallos, licencias, reproducibilidad, decisión de arquitectura, test falsable. No afirmar que un paper demuestra precisión profesional o cumplimiento regulatorio.

## 3. Benchmark mundial: 20 sistemas y su aprendizaje potencial

| Referente | Especialidad a estudiar | Diferencial propuesto | Evidencia |
|---|---|---|---|
| Harvey | asistentes jurídicos y workflows | provenance + authority governor | fuente previa selectiva |
| Thomson Reuters CoCounsel | investigación, documentos y revisión | citation proof graph | fuente previa selectiva |
| LexisNexis Protégé | investigación jurídica asistida | cobertura/jurisdicción explícita | 403 en revisión previa |
| vLex Vincent AI | investigación multijurisdiccional | vigencia y trazabilidad | candidato, no probado |
| Westlaw Precision | investigación y citadores | source identity + actualización | candidato |
| Lexis+ | investigación y fuentes | cobertura real por territorio | candidato |
| Wolters Kluwer Kleos | gestión de despachos | matter twin y tareas | candidato |
| Clio | legal practice management | matters, calendarios y billing | candidato |
| MyCase | matter management | flujo de expediente | candidato |
| PracticePanther | gestión jurídica | tareas y automatización | candidato |
| iManage | DMS y gobierno | documentos y seguridad | candidato |
| NetDocuments | DMS cloud | versionado y permisos | candidato |
| Ironclad | CLM y approvals | semantic diff + effects | candidato |
| Icertis | CLM enterprise | obligaciones y riesgo contractual | candidato |
| DocuSign CLM | ciclo contractual | aprobaciones y firma delegada | candidato |
| ContractPodAi | CLM + IA | extracción y redline | candidato |
| Luminance | contract review | revisión a escala | candidato |
| Evisort | inteligencia contractual | clause graph | candidato |
| Relativity | e-discovery | cadena de custodia y revisión | candidato |
| Everlaw | e-discovery | búsqueda y review workflows | candidato |
| Legora | trabajo jurídico colaborativo | workspaces y trazabilidad | candidato |
| Tirant lo Blanch | información jurídica España | cobertura normativa española | candidato |
| Aranzadi LA LEY | información y práctica España | fuentes y actualización | candidato |
| Lefebvre | conocimiento jurídico español | explicación de obligaciones | candidato |

**No declarar auditoría de 24 productos.** La tabla es una agenda de benchmarking con patrones conocidos; cada ficha debe incluir fuente oficial, fecha, edición, jurisdicción, API, coste, prueba autorizada, límites, seguridad, retención, derechos, funcionalidad real y evidencia. Prioridad para pymes españolas: fuentes BOE/CENDOJ/EUR-Lex, investigación jurídica fiable, CLM, expediente, firma, calendarios y revisión profesional; no competir desde P0 con todo e-discovery enterprise.

## 4. Repositorios abiertos y decisiones de adopción

| Proyecto | Función | Licencia/estado de fuente | Decisión |
|---|---|---|---|
| OpenContracts | extracción, anotación, búsqueda y contratos | MIT según metadata interna | laboratorio de contratos |
| docassemble | entrevistas guiadas y documentos | MIT según metadata interna | intake/automatización opcional |
| eyecite | parseo de citas judiciales US | BSD-2-Clause según metadata | no usar para ECLI sin adaptación |
| LexNLP | NLP jurídico | AGPL-3.0 según metadata | evaluar obligaciones y calidad |
| Marker | PDF/OCR → texto estructurado | código Apache-2.0; modelos con condiciones distintas | proceso aislado y licencia por pesos |
| Open Law Library / Akoma Ntoso | legislación estructurada | verificar repo/licencia por componente | norma versionada |
| LegalRuleML | representación de reglas | estándar, implementación por verificar | motor de reglas |
| OpenFisca | reglas parametrizadas | licencia por paquete a verificar | inspiración para obligaciones calculables |
| spaCy | NLP y entidades | licencia/versiones a verificar | extracción no decisoria |
| Presidio | detección/redacción PII | licencia/versiones a verificar | minimización de documentos |
| Apache Tika | parsing documental | licencia/versiones a verificar | ingestión segura |
| Unstructured | particionado de documentos | licencia/versiones a verificar | evaluar coste y límites |
| Tesseract OCR | OCR | licencia/versiones a verificar | fallback local |
| Documenso | firma y workflow | licencia/edición por verificar | adaptador, no firma por defecto |
| LibreOffice headless | DOCX/ODT/PDF conversion | licencia/versiones por revisar | worker aislado |
| OpenSearch | búsqueda | licencia/versión a verificar | índice tenant-scoped |
| PostgreSQL/pgvector | estado, evidencia y búsqueda | versión/licencia a verificar | preferencia inicial |
| OpenTelemetry | observabilidad | componentes/licencias por verificar | trazabilidad |
| Open Policy Agent | evaluación de políticas | licencia/versiones a verificar | policy engine opcional |
| TheHive | casos/incidentes | licencia/edición por verificar | referencia para expedientes, no core |

**SHAs de lectura previos:** OpenContracts `2263a19de73d95889a31b07e75bc9948a8cffe1c`; docassemble `36d7bd4d27324a3cde2ea92ebd5afe074cdcfe2d`; eyecite `b70a146d20f70b366baf150a1cc9e82229ef5a0d`; LexNLP `330b4e113c9bced0cc06f2c864c5015bb5ed2199`; Marker `f20c54a81bf8b1a8bd12fd954be1aaa4b7015203`. Son **referencias de README/metadata**, no releases aprobadas. No instalar todas las herramientas: primero pipeline mínimo de documentos y fuentes, luego ADR por coste/licencia/riesgo.

## 5. Fuentes jurídicas y territorio

**España:** BOE legislación consolidada y publicación oficial, CENDOJ para resoluciones cuando sea accesible, OEPM en marcas, registros y organismos competentes por materia; normativa autonómica y local según alcance. **UE:** EUR-Lex, ECLI, eIDAS, RGPD, AI Act, reglamentos/directivas y transposición nacional. **Otros territorios:** adaptadores solo con corpus, versión, derechos, cobertura y revisor habilitado. No asumir que la consolidación del BOE es idéntica al texto oficial de publicación ni que una directiva impone obligaciones iguales sin analizar transposición.

**Modelo de autoridad:** `SourceRegistry = {publisher, sourceType, canonicalUri, jurisdiction, language, accessTerms, updatePolicy, reliability, lastCheckedAt}`. `LawSnapshot = {sourceId, instrumentId, articleId?, publishedAt, effectiveFrom, effectiveTo?, knownAt, supersededBy?, textHash, retrievedAt, officialStatus}`. La vigencia puede ser compleja: entrada en vigor escalonada, transitorios, derogación parcial, disposiciones finales, consolidación y aplicación retroactiva excepcional. Si no se puede determinar, devolver `TEMPORAL_AMBIGUITY` y revisión.

## 6. Arquitectura: trece planos

1. **Identity, Confidentiality & Mandate:** JWT Supabase, membresía, asunto, propósito, conflictos, representación y scope de profesional.
2. **Matter & Engagement:** expediente, contrato de servicio, personas, conflicto, recursos y plazos.
3. **Document Custody:** original inmutable, hashes, OCR, redacción, versiones, permisos y retención.
4. **Fact & Evidence Graph:** afirmaciones fácticas, contradicciones, fuentes y confianza.
5. **Legal Source Registry:** BOE/EUR-Lex/CENDOJ, versionado, cobertura y licencias.
6. **Bitemporal Law Engine:** validez jurídica vs fecha de conocimiento, excepciones y territorio.
7. **Research & Argumentation:** issue spotting, autoridades, argumentos a favor/en contra, abstención.
8. **Citation Proof Engine:** identidad de fuente, fragmento, fecha, soporte y revisión.
9. **Contract Intelligence:** cláusulas, obligaciones, redlines, playbooks y semantic diff.
10. **Obligations & Deadlines:** eventos, reglas, calendarios, tareas, recordatorios y pruebas.
11. **Professional Review & Effects:** approvals, actos nominados, autoridad y receipts.
12. **Agent & Interoperability:** LAIA, twins, SOPs, bridge, fuentes, DMS y firma opcional.
13. **Evaluation & Operations:** seguridad, privacidad, adversarial, métricas, coste y restore.

### 6.1 Contratos TypeScript propuestos

```ts
type LegalScope = {
  originTenantId: string; targetTenantId: string; matterId: string;
  jurisdiction: string; governingLaw?: string;
  factDate?: string; researchAsOf: string;
  professionalReviewerRef?: string;
  mandateRef: string; purpose: string; expiresAt: string;
};
type FactAssertion = {
  factId: string; matterId: string; proposition: string;
  evidenceRefs: string[]; disputed: boolean;
  confidence?: number; observedAt?: string;
  status: "SUPPORTED" | "CONTRADICTED" | "UNVERIFIED";
};
type CitationVerification = {
  citationId: string; sourceId: string; canonicalUri: string;
  articleOrSection?: string; quoteHash?: string;
  retrievedAt: string; relevantAsOf: string;
  existence: "VERIFIED" | "NOT_FOUND" | "UNKNOWN";
  quoteMatch: "EXACT" | "PARTIAL" | "UNVERIFIED";
  temporalValidity: "VALID" | "INVALID" | "AMBIGUOUS";
  applicability: "PROPOSED" | "PROFESSIONALLY_REVIEWED" | "REJECTED";
  limitations: string[];
};
type ObligationProposal = {
  matterId: string; obligationId: string; ruleSnapshotRef: string;
  triggerFactRefs: string[]; territorialCalendarRef: string;
  proposedDeadline?: string; deadlineConfidence: "CALCULATED" | "UNCERTAIN";
  reviewStatus: "PENDING" | "APPROVED" | "REJECTED";
};
type LegalEffectAuthorization = {
  matterId: string; tenantId: string; workOrderId: string;
  actorRef: { tenantId: string; roleId: string; runtimeId: string; personaId?: string };
  action: "deliver_draft" | "request_review" | "export_bundle";
  payloadHash: string; approvalRef: string; expiresAt: string;
};
```

**Importante:** son propuestas y no tipos existentes en el padre. Mapear con contratos reales del SHA actual antes de programar. `actorRef.tenantId` indica procedencia del actor, no le concede pertenencia a `targetTenantId`. `professionalReviewerRef` no acredita por sí mismo colegiación o habilitación.

### 6.2 Citation-to-Claim Proof Graph

`Claim → LegalIssue → CitedProvision → SourceSnapshot → TextSpan → TemporalApplicability → JurisdictionApplicability → ReviewerDecision`. Cada vínculo conserva algoritmo, versión, evidencia y estado. Verificador en seis etapas:
1. Normalizar identificador (BOE, ECLI, CELEX, URL oficial).
2. Resolver fuente canónica; registrar 404/403 como incertidumbre.
3. Recuperar texto íntegro o fragmento con checksum, versión y posición.
4. Comparar cita literal y contexto; detectar elipsis y negaciones omitidas.
5. Evaluar fecha de hechos, entrada en vigor, derogación, transitorios y territorio.
6. Solicitar revisión profesional de pertinencia e interpretación; no etiquetar «validado» solo por similitud semántica.

**Estados independientes:** existencia, fidelidad textual, vigencia, ámbito y conclusión. Una norma verdadera puede no resolver el caso. Una cita inventada debe bloquear una conclusión que dependa de ella.

### 6.3 Fact Graph y contradicciones

Ingesta separa **documento** de **hecho alegado**: un email afirma que se pagó, un recibo acredita transferencia, un contrato establece obligación, un extracto puede contradecirlo. Guardar `sourceSpan`, autor declarado, timestamp, custodio, OCR confidence, relación de contradicción y posibilidad de falsificación. No presentar OCR como original ni resolver contradicción por mayoría de embeddings. El abogado puede aceptar/rechazar cada hecho y registrar motivación.

### 6.4 Bitemporal Law Engine

Dos ejes: `valid_time` (cuándo era aplicable la regla) y `transaction_time` (cuándo la registró el sistema). Un cambio normativo posterior no reescribe análisis histórico: crea nueva revisión y marca expedientes afectados como `STALE_REVIEW_REQUIRED`. El sistema conserva el texto consultado y alerta de divergencias. Casos de prueba: derogación parcial, entrada en vigor futura, disposición transitoria, sentencia posterior, norma autonómica y corrección de errores.

### 6.5 Contract Semantic Diff

**Objetos:** `Clause = {clauseId, type, parties, obligations, rights, triggers, deadlines, monetaryTerms, liabilityCaps, governingLaw, dataProtectionTerms, sourceSpan, confidence}`. El redline conserva documento original, revisión, operaciones, cambios literales, cambios semánticos y playbook. La detección de «límite de responsabilidad eliminado» exige verificar estructura y contexto, no solo regex. **Pipeline:** parse → segment → clause taxonomy → compare → risk hypotheses → professional review → approved revision → export. El LLM puede proponer un cambio, no firmar ni negociar por sí solo.

### 6.6 Obligations & Deadline Compiler

`LegalSource/ContractClause → ApplicabilityRule → TriggerEvent → Evidence → Calendar → ProposedDeadline → Review → WorkOrder → CompletionEvidence`. **Invariantes:** sin hecho disparador confirmado, no fecha definitiva; calendario territorial y días hábiles explícitos; reglas de cómputo versionadas; suspensiones/interrupciones como eventos; aviso no equivale a cumplimiento; vencimiento calculado puede requerir profesional. No confiar en «30 días» sin definir naturales/hábiles y dies a quo.

### 6.7 Evidence-to-Effect Runtime

`DRAFT → FACT_CHECK → RESEARCH → CITATION_CHECK → PROFESSIONAL_REVIEW → APPROVED_DRAFT → DELIVERY_PREPARED → DELIVERED_CONFIRMED`. Estados `BLOCKED`, `SOURCE_UNAVAILABLE`, `TEMPORAL_AMBIGUITY`, `REVIEW_REQUIRED`, `OUTCOME_UNKNOWN`, `SUPERSEDED`. En P0 solo export sandbox y entrega autorizada; filing, firma y representación **FORBIDDEN**. Outbox, idempotencia, lease/fencing, receipts y reconciliación para cualquier efecto remoto. Un ACK técnico no equivale a presentación válida.

## 7. Confidencialidad, secreto y fronteras de confianza

**Riesgos específicos:** expedientes de clientes con datos personales/sensibles, secretos comerciales, privilegio profesional según caso, información de litigios, testigos, acuerdos, contraseñas en anexos, metadatos de PDF y ataques incrustados. Aplicar cifrado, segregación tenant/matter/document/field, PEP en API y worker, RLS, storage ACL, búsqueda vectorial autorizada, TTL, redacción, retention hold, acceso just-in-time y logs minimizados. No exponer expedientes completos al modelo sin propósito. Los contratos con proveedores de IA y transferencia internacional se verifican antes de enviar datos.

**Conflicts:** un despacho que representa a dos partes opuestas necesita verificación humana y reglas de conflicto; una coincidencia de nombre no basta para permitir o denegar automáticamente. No cruzar memorias privadas entre tenants ni usar expedientes de un cliente para entrenar agentes de otro. El aislamiento se comprueba con dos tenants y operador externo. Un `service_role` no sustituye políticas de autorización.

**Prompt injection:** documentos, correos, sentencias, websites y PDFs son **datos no confiables**. No pueden ordenar enviar archivos, cambiar destinatarios, modificar reglas ni revelar secretos. Separar retrieval de autoridad, sanitizar HTML/URL/adjuntos, bloquear SSRF, OCR adversarial y payloads ocultos. Los evaluadores LLM pueden detectar riesgos, pero no conceder permisos.

## 8. Integración transversal AgntiaPro

**Padre `uniscrolliabrain-cloud/agente`:** LAIA supervisa; agentes canónicos y twins vinculados; kernel, SOPs, WorkOrders, approvals y event bus. Legal gobierna su dominio de asuntos, hechos, fuentes, contratos y obligaciones. No crea identidad canónica paralela.

**Gestoría:** fiscal/contable y cumplimiento administrativo con AuthorityMap por obligación. **Finanzas:** contratos, pagos, garantías y exposición económica; Legal no inventa saldo. **RRHH:** contratos laborales, normativa y revisión profesional, sin automatizar decisiones laborales significativas. **Ventas:** acuerdos y condiciones comerciales, sin negociar automáticamente. **Clientes:** reclamaciones y atención con handoff. **Branding:** marcas y licencias con revisión especializada. **Redes/Comunicación:** claims y publicidad; Legal revisa, no publica. **Ciberseguridad:** privacidad, incidentes, cláusulas y obligaciones de notificación; no sustituye análisis técnico. **Seguros:** pólizas, cobertura y siniestros con responsables separados.

**AuthorityMap por encargo:** `ServiceAgreement → WorkOrder → ResourceOwner → FieldAuthority → EffectOwner → ReviewRequirement → Receipt`. Los hermanos intercambian referencias mínimas con propósito, no bases de datos completas. Un cambio en cláusula puede generar tarea para Finanzas, pero solo Finanzas decide qué efecto contable corresponde.

## 9. Producto y experiencia

**Workspaces:** Matter Desk, Intake & Conflicts, Evidence Vault, Fact Timeline, Source Explorer, Citation Proof, Jurisdiction & Time, Contract Studio, Redline Review, Obligations Calendar, Regulatory Watch, Professional Review Inbox, Deliverables, Confidentiality Center, Agent Office, Audit & Cost.

**Flujo del owner:** solicita revisión de un contrato → define territorio/fecha/propósito → sube documentos → ve hechos extraídos con enlaces al original → consulta normas y vigencia → recibe tabla de cláusulas y riesgos con fuentes → revisa propuestas de redline → profesional competente aprueba → descarga paquete con originales, versión, manifest, fuentes, limitaciones y obligaciones. **No se muestra una firma falsa ni «presentado» sin receipt oficial.**

**Comercial:** servicio jurídico-operativo especializado para empresas compiladas por AgntiaPro y clientes externos con portal propio; precio por encargo o servicio gestionado según costes, revisión y responsabilidad. No vender como sustituto universal de abogado, ni prometer victoria judicial, cobertura completa o cumplimiento garantizado.

## 10. Catálogo de 110 capacidades propuestas


### Intake y asuntos
**LEG001 [DISEÑO]** Intake por propósito y territorio. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG002 [DISEÑO]** Engagement scope y exclusiones. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG003 [DISEÑO]** Conflict check con revisión. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG004 [DISEÑO]** Legal Matter Digital Twin. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG005 [DISEÑO]** Partes y representación verificadas. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG006 [DISEÑO]** WorkOrders y ownership. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG007 [DISEÑO]** Calendario del expediente. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG008 [DISEÑO]** Timeline de hechos y actos. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG009 [DISEÑO]** Risk hypotheses y prioridades. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG010 [DISEÑO]** Cierre y retention hold. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.

### Documentos y custodia
**LEG011 [DISEÑO]** Originales inmutables por hash. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG012 [DISEÑO]** OCR con posiciones y confianza. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG013 [DISEÑO]** Parsing de DOCX/PDF/email. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG014 [DISEÑO]** Anexos y orden de lectura. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG015 [DISEÑO]** Versionado y diff de documentos. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG016 [DISEÑO]** Evidence Chain of Custody. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG017 [DISEÑO]** Redacción de datos sensibles. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG018 [DISEÑO]** Indexación tenant/matter-scoped. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG019 [DISEÑO]** Extracción de tablas y firmas. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG020 [DISEÑO]** Export bundle con manifest. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.

### Hechos y evidencia
**LEG021 [DISEÑO]** Fact Assertion Graph. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG022 [DISEÑO]** Vinculación a source spans. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG023 [DISEÑO]** Contradicciones y evidencias opuestas. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG024 [DISEÑO]** Temporalidad de hechos. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG025 [DISEÑO]** Autoría declarada vs verificada. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG026 [DISEÑO]** Calidad y confianza de OCR. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG027 [DISEÑO]** Evidencia faltante y abstención. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG028 [DISEÑO]** Revisión humana de hechos. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG029 [DISEÑO]** Causal timeline de expediente. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG030 [DISEÑO]** Provenance de inferencias. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.

### Investigación jurídica
**LEG031 [DISEÑO]** Source Registry oficial. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG032 [DISEÑO]** Identificadores BOE/CELEX/ECLI. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG033 [DISEÑO]** Bitemporal Law Engine. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG034 [DISEÑO]** Jurisdiction Applicability Compiler. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG035 [DISEÑO]** Detección de derogación y transitorios. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG036 [DISEÑO]** Citation-to-Claim Proof Graph. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG037 [DISEÑO]** Verificación literal de fragmentos. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG038 [DISEÑO]** Verificación de pertinencia. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG039 [DISEÑO]** Argumentos pro/contra y excepciones. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG040 [DISEÑO]** Dossier con límites de fuentes. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.

### Contratos
**LEG041 [DISEÑO]** Inventario de contratos. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG042 [DISEÑO]** Clause taxonomy y extraction. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG043 [DISEÑO]** Contract Semantic Diff. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG044 [DISEÑO]** Playbooks por riesgo. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG045 [DISEÑO]** Comparación de versiones. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG046 [DISEÑO]** Cláusulas de protección de datos. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG047 [DISEÑO]** Obligaciones monetarias y garantías. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG048 [DISEÑO]** Redline con justificación. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG049 [DISEÑO]** Approval por hash y versión. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG050 [DISEÑO]** Paquete editable y trazable. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.

### Obligaciones y plazos
**LEG051 [DISEÑO]** Obligation Causality Graph. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG052 [DISEÑO]** Trigger fact verification. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG053 [DISEÑO]** Calendario territorial de inhábiles. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG054 [DISEÑO]** Cómputo de plazo versionado. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG055 [DISEÑO]** Suspensión/interrupción de plazos. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG056 [DISEÑO]** Recordatorios con ACK. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG057 [DISEÑO]** Evidence of compliance. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG058 [DISEÑO]** Regulatory Change Observatory. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG059 [DISEÑO]** Impact simulator por materia. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG060 [DISEÑO]** Escalado profesional. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.

### Expedientes y operaciones
**LEG061 [DISEÑO]** Docket y case status. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG062 [DISEÑO]** Checklist de documentación. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG063 [DISEÑO]** Professional Review Queue. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG064 [DISEÑO]** Review Opinion versionada. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG065 [DISEÑO]** Filing proposal bloqueado en P0. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG066 [DISEÑO]** Firma propuesta sin ejecución. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG067 [DISEÑO]** Delivery manifest y receipt. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG068 [DISEÑO]** ExternalLink de proveedores. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG069 [DISEÑO]** Outcome unknown reconciliation. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG070 [DISEÑO]** Cierre con trazabilidad. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.

### Inteligencia agéntica
**LEG071 [DISEÑO]** LAIA supervisora y twin. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG072 [DISEÑO]** Legal research SOPs. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG073 [DISEÑO]** RAG con fuentes autorizadas. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG074 [DISEÑO]** LLM claim uncertainty. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG075 [DISEÑO]** Tool allowlist por acción. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG076 [DISEÑO]** Prompt injection defense. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG077 [DISEÑO]** Matter context budget. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG078 [DISEÑO]** Memory promotion gate. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG079 [DISEÑO]** Reasoning alternatives ledger. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG080 [DISEÑO]** Professional Authority Governor. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.

### Seguridad y cumplimiento
**LEG081 [DISEÑO]** Supabase JWT y membership. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG082 [DISEÑO]** RLS tenant/matter/document. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG083 [DISEÑO]** Secret vault y scopes. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG084 [DISEÑO]** Purpose-based access. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG085 [DISEÑO]** DLP y export controls. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG086 [DISEÑO]** Retention hold y DSAR. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG087 [DISEÑO]** Audit append-only. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG088 [DISEÑO]** Provider data residency checks. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG089 [DISEÑO]** Backup/restore sin replay. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG090 [DISEÑO]** Cost/latency budgets. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.

### Evaluación y ciencia
**LEG091 [DISEÑO]** Legal Research Bench-inspired tests. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG092 [DISEÑO]** LegalCiteBench-inspired tests. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG093 [DISEÑO]** Citation adversarial corpus. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG094 [DISEÑO]** Temporal law regression suite. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG095 [DISEÑO]** Contract redline evaluation. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG096 [DISEÑO]** Deadline calculation fixtures. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG097 [DISEÑO]** Human reviewer disagreement study. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG098 [DISEÑO]** Two-tenant adversarial tests. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG099 [DISEÑO]** Provider contract verification. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG100 [DISEÑO]** Research evidence registry. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.

### Producto y transversalidad
**LEG101 [DISEÑO]** Portal externo de cliente. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG102 [DISEÑO]** Matter dashboard. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG103 [DISEÑO]** Citation proof UI. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG104 [DISEÑO]** Fact timeline UI. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG105 [DISEÑO]** Contract studio UI. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG106 [DISEÑO]** Obligation calendar UI. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG107 [DISEÑO]** Legal review inbox. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG108 [DISEÑO]** Cross-repo AuthorityMap. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG109 [DISEÑO]** Anam explicador sin firma. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.
**LEG110 [DISEÑO]** Legal Operations Decision Ledger. **Gate mínimo:** tenant/matter/territorio/fecha, evidencia y versión, autoridad y permisos, resultado/abstención, revisión competente cuando proceda, prueba trazable.

## 11. Evaluation Factory: seguridad, fuentes, tiempo y utilidad

**Protocolos:**
- `CitationEval`: fuente existe, texto coincide, vigencia y aplicabilidad; métricas por eje, no score único.
- `LegalResearchEval`: problema, jurisdicción, fecha, autoridades, contraargumentos, abstención y all-pass.
- `ContractEval`: cláusulas, obligaciones, semantic diff, falsos negativos críticos, cambios ocultos.
- `DeadlineEval`: evento probado, regla, territorio, calendario, transitorios, cómputo y revisión.
- `ConfidentialityEval`: tenant/matter, secreto, export, RAG, provider leakage y prompt injection.
- `OperationsEval`: approvals, outbox, replay, unknown outcomes, receipts y restore.
- `HumanEval`: utilidad del dossier, tiempo de revisión, errores graves, carga de verificación y desacuerdo entre revisores.

**32 escenarios adversariales:** 1 JWT inválido; 2 user_metadata concede abogado; 3 tenantB lee asuntoA; 4 abogadoA ve expedienteB; 5 twin sin mandato; 6 mandato revocado; 7 documento con prompt injection; 8 PDF con enlace SSRF; 9 OCR confunde «no»; 10 firma falsa en imagen; 11 cita inexistente; 12 cita real con texto alterado; 13 norma derogada; 14 entrada en vigor futura; 15 disposición transitoria; 16 norma autonómica no aplicable; 17 sentencia sin carácter vinculante; 18 ECLI erróneo; 19 fuente oficial caída; 20 contradicción entre email y recibo; 21 redline oculta cambio de responsabilidad; 22 anexo cambia después de aprobación; 23 cálculo de días naturales vs hábiles; 24 fiesta local no contemplada; 25 plazo sin hecho disparador; 26 solicitud de filing sin habilitación; 27 firma sin mandato; 28 export revela datos de otra materia; 29 proveedor 202 sin confirmación; 30 timeout y retry duplica entrega; 31 restore revive aprobación revocada; 32 modelo inventa dictamen profesional.

**Gates:** cero cita inventada presentada como verificada; cero efecto profesional no autorizado; cero cross-tenant; cero acceso a material confidencial sin propósito; cero deadlines definitivos sin regla y evento; cero «presentado» sin receipt. Las métricas de calidad se estratifican por jurisdicción, materia, periodo, tipo de fuente, idioma y complejidad. Un mock no prueba acceso real a BOE/CENDOJ ni representación profesional.

## 12. Roadmap: 12 olas de implementación

**G0 Research Atlas:** papers completos, fuentes oficiales, competencia, repos por SHA/licencia, limitaciones y ADRs.
**G1 Domain Contracts:** asuntos, scope, conflictos, documentos, hechos, citas, normas, contratos, obligaciones y estados.
**G2 Identity & Confidentiality:** Supabase, membresía, mandatos, RLS, ACL de matter/document, privacidad y tests.
**G3 Evidence Vault:** storage, hashes, parsing, OCR aislado, versionado, redacción y búsqueda con permisos.
**G4 Legal Source Lab:** BOE/EUR-Lex, corpus sintético, identificadores, versionado bitemporal y disponibilidad.
**G5 Citation & Fact Engine:** fact graph, verificador de citas, abstención, contradicciones y evaluation harness.
**G6 Contract Studio:** cláusulas, redline semántico, playbooks y revisión.
**G7 Obligations Engine:** reglas tipadas, calendarios, triggers, propuestas de deadline y monitoreo.
**G8 Professional Review:** rol/competencia, approvals, revision hashes, export sandbox y manifests.
**G9 Agent & Portal:** LAIA, twins, SOPs, Matter Desk, Citation Proof UI, redline y calendario.
**G10 Cross-Domain:** handoffs a Gestoría, Finanzas, Ventas, Clientes, RRHH y Ciberseguridad.
**G11 Operations & V2:** incidentes, adversarial, backup/restore, costes, evaluación humana y revisión de hipótesis.

**Las 42 campañas actuales se preservan**. Crear en fase de ejecución una matriz `LEGxxx → ADR → campaña → fase → task → patchset → archivo → test → reporte → gate`. Freebuff ejecuta por fases y deja reporte; Codex verifica en rama separada; merge con aprobación. No modificar `/agente` ni desplegar en este trabajo.

**Paths propuestos, no existentes:** `packages/domain/src/{matter,facts,law,citations,contracts,obligations}.ts`; `packages/legal-sources/src/{registry,boe,eurlex,temporal}.ts`; `packages/document/src/{ingest,ocr,redaction,custody}.ts`; `packages/evaluation/src/{citations,contracts,deadlines,adversarial}.ts`; `apps/api/src/{auth,matters,reviews,deliverables}.ts`; `apps/worker/src/{outbox,leases,reconcile,monitor}.ts`; `apps/web/src/views/{MatterDesk,FactTimeline,CitationProof,ContractStudio,Obligations}.tsx`; `tests/{unit,integration,e2e,adversarial}/`.

**Dependencias candidatas:** TypeScript/Hono/pnpm, Zod, Postgres/Supabase, pgvector, OpenTelemetry, Python sidecar para OCR/NLP cuando se justifique; librerías de documentos por licencia y benchmark. No importar el servidor padre como SDK. No instalar LexNLP AGPL ni pesos Marker por asumir licencia de código. No usar un LLM como único motor de plazos o verificación.

## 13. Agenda de investigación pendiente

1. Leer PDFs y apéndices completos de los tres papers jurídicos previos y verificar sus datos, jurisdicciones, limitaciones y licencias.
2. Comparar LegalBench, LegalBench-RAG, ContractNLI, CUAD, CaseHOLD, COLIEE y LexGLUE con fixtures españoles.
3. Auditar OpenContracts, docassemble, eyecite, LexNLP y Marker por código, release, dependencias, modelos y licencias.
4. Investigar BOE API, CENDOJ, EUR-Lex, ECLI/CELEX, consolidación, derechos de reutilización y límites.
5. Construir corpus sintético español de normas derogadas, transitorios, citas correctas/incorrectas y plazos.
6. Revisar al menos seis productos con acceso autorizado: Harvey, CoCounsel, Lexis, vLex, Clio, Ironclad y alternativas españolas.
7. Verificar protección de secreto profesional, DPA, data residency, retención y obligaciones de encargados.
8. Comparar contrato editable DOCX vs formatos estructurados y conservación de redlines.
9. Diseñar evaluación humana con profesionales habilitados y protocolo de discrepancias.
10. Medir tiempo/coste por asunto, citas comprobadas, correcciones, fallos críticos y utilidad para pymes.
11. Estudiar eIDAS, firma, representación, presentación telemática y responsabilidad profesional por acto.
12. Ejecutar tests cross-tenant y de inyección documental en infraestructura aislada.

**Plantilla de investigación:** pregunta → fuente primaria → fecha/versión → acceso/alcance → evidencia → incertidumbre → decisión → test falsable → ADR. Nunca llamar «auditado» a un README o anuncio leído.

## 14. Fuentes y procedencia

**Investigación jurídica previa, no reproducida:**
- Legal Research Bench: https://arxiv.org/abs/2610.00609
- Who Checks the Citations?: https://arxiv.org/abs/2606.21155
- LegalCiteBench: https://arxiv.org/abs/2605.10186

**Fuentes normativas y oficiales:**
- BOE: https://www.boe.es/
- EUR-Lex: https://eur-lex.europa.eu/
- CENDOJ: https://www.poderjudicial.es/cgpj/es/Temas/Centro-de-Documentacion-Judicial--CENDOJ-/
- Estatuto General de la Abogacía: https://www.boe.es/buscar/act.php?id=BOE-A-2021-4568
- eIDAS: https://eur-lex.europa.eu/eli/reg/2014/910/oj
- RGPD: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- AI Act: https://eur-lex.europa.eu/eli/reg/2024/1689/oj

**Repositorios a estudiar:**
- https://github.com/Open-Source-Legal/OpenContracts
- https://github.com/jhpyle/docassemble
- https://github.com/freelawproject/eyecite
- https://github.com/LexPredict/lexpredict-lexnlp
- https://github.com/datalab-to/marker

**Documentos internos inspeccionados:** [README](../../README.md), [AGENTS](../../AGENTS.md), [producto](../01-producto.md), [investigación](../02-investigacion.md), [referentes](../03-referentes-y-brechas.md), [adaptadores](../04-adaptadores.md), [arquitectura](../architecture/01-arquitectura.md), [fuentes](../research/sources.json), [repos](../research/repositories.json).

**Advertencia de calidad:** este Concept Master es una propuesta más detallada y falsable, **no una investigación exhaustiva ejecutada** de todas las empresas, papers y repos. No se ha probado un motor jurídico ni obtenido autorización profesional. La próxima versión debe sustituir hipótesis por resultados medidos, no añadir solo texto.
