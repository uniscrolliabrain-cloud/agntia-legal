# Léxico canónico — Padre / Legal

**v0.1 conceptual.** Verificar código padre por SHA antes de fijar interfaces.

## Identidad, trabajo, causalidad
`tenantId` empresa/ámbito, no `owner`, `sub`, `actorId` ni `matterId`; `HumanActor`/`AgentActor` canónicos del padre; `runtimeId`, `roleId`, `personaId` distintos. `TwinBinding`, `DelegationMandate`, `AuthorityMap` propuestos. `Task` ≠ `SOP` ≠ `ActionProposal` ≠ `Approval` ≠ `Event`. `correlationId` cadena de negocio; `causationId` evento padre; `eventId` evento nuevo; `traceId`/`spanId` telemetría; `requestId` entrada; `idempotencyKey` efecto; `schemaVersion` contrato. No introducir enums nativos en bus por suposición.

## Entidades legales (PROPOSED)
`LegalMatter` = expediente y ACL específica; `EngagementScope` = encargo y límites; `ConflictCheck` = revisión de posibles conflictos, no ausencia garantizada; `DocumentVersion` = versión documental; `EvidenceRef` = referencia con custodia; `FactAssertion` = afirmación con fuente/estado, no hecho probado; `JurisdictionScope` = territorio/competencia; `ApplicableLawSnapshot` = norma y vigencia temporal; `CitationVerification` = resolución de fuente/cita, no aplicabilidad automática; `ContractDraft`/`Redline` = propuesta, no acuerdo firmado; `LegalReviewDecision` = revisión de profesional; `FilingIntent` = intención, no presentación; `FilingReceipt` = acuse oficial; `ObligationRegister` = obligaciones con fundamento y fecha; `ComplianceFinding` = hallazgo, no certificación; `PrivacyAssessment`/`AIActAssessment` = evaluaciones revisables, no garantía de cumplimiento.

## Distinciones
`drafted` ≠ `reviewed` ≠ `signed` ≠ `filed` ≠ `accepted`; `citationFound` ≠ `lawInForce` ≠ `lawApplicable`; `sourceText` ≠ `legalConclusion`; `tenantMembership` ≠ `matterAccess`; `confidential` ≠ `legallyPrivileged`; `approval` ≠ `representationMandate`. Fechas de norma, consulta y aplicabilidad por separado. Provenance/hash/versión/territorio obligatorios en conclusiones sensibles. No etiquetar revisión de IA como revisión por abogado.
