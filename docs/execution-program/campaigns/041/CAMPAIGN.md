# LEG-C41 — Operaciones, CI, backup y release

**DESIGN_ONLY · NOT_STARTED · 41/42.** [Campaña original](../../../campaigns/41-operaciones-ci-backup-y-release.md). No confundir documentación con código ni verificación jurídica.

## Objetivo y límites
Construir/verificar operaciones, ci, backup y release para Operaciones jurídicas, contratos y cumplimiento, preservando: No producción, compras o wiring de padre por terminar fases.

**Operación nominada:** `release.prepare`. **Campos:** releaseVersion, digests, recovery, featureFlags, runbook. **Invariante:** No producción, compras o wiring de padre por terminar fases. **Dependencias:** LEG-C40.

## Superficies de implementación propuestas
- Dominio principal: `.github/workflows/ci.yml` (validar en checkout; ruta propuesta).
- DTO Zod: `packages/contracts/src/41.ts` solo si procede.
- API Hono: `apps/api/src/routes/41.ts` solo si hay capability autorizada.
- Tests: `tests/campaigns/041.test.ts`, fixtures `tests/fixtures/041/`.
- Evidencia original: `docs/implementation/c41/README.md`, `docs/implementation/c41/EVIDENCE.md`, `docs/implementation/c41/TESTS.md`, `docs/implementation/c41/RISKS.md`. Reporte Freebuff en este documento.

## Patchsets secuenciales
### 041.01 — LEG-C41-T01: Congelar fuentes, ámbito y autoridad
**Acción:** Cotejar releaseVersion, digests, recovery, featureFlags, runbook con originales, contrato del tenant y versiones de fuente/proveedor. Registrar qué es hecho, declaración, inferencia o desconocido; revisar alcance territorial/temporal y reglas del módulo.

**Superficie:** `.github/workflows/ci.yml`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** AuthorityMap y fixture explícitos; No producción, compras o wiring de padre por terminar fases. La ausencia de fuente genera pendiente, no un valor plausible.

**Dependencia:** inicio. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.

### 041.02 — LEG-C41-T02: Definir DTO y frontera de datos
**Acción:** Diseñar esquema runtime para releaseVersion, digests, recovery, featureFlags, runbook: tipos, límites, IDs opacos, enums, fechas y versión. Conservar los campos nativos aplicables y declarar nuevos los del servicio. Aislar tenant/proyecto/recurso y minimizar PII.

**Superficie:** `.github/workflows/ci.yml`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** Round-trip y rechazo de extra/valor inválido; referencias cruzadas no son posibles; source/actor/updatedAt y EvidenceRef preservados donde correspondan.

**Dependencia:** LEG-C41-T01. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.

### 041.03 — LEG-C41-T03: Aplicar lógica determinista y revisión
**Acción:** Implementar o documentar el paso `release.prepare` mediante guards, estados y expectedVersion/CAS. Separar propuesta del modelo de cálculo/decisión verificables. CitationVerifier separa resolver fuente/identidad, fragmento, fecha de vigencia y pertinencia; existencia no implica conclusión. DeadlineProposal necesita regla versionada, evento inicial probado, calendario/territorio/inhábiles y revisión, sin fecha inferida por chat. Redline conserva original/versión/operaciones y diff semántico revisable; no modificar original ni ocultar cambios.

**Superficie:** `.github/workflows/ci.yml`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** El estado final, el protegido y los motivos de bloqueo son comprobables; Restore reaplica restricciones y no reenvía efectos confirmados. No eval/SQL/shell/HTTP genérico del LLM.

**Dependencia:** LEG-C41-T02. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.

### 041.04 — LEG-C41-T04: Adaptar con permisos mínimos
**Acción:** Comprobar versión/edición/ACL de backend si esta fase lo usa; fields/métodos allowlist y binding de servidor. Si es fase local/documental no añadir HTTP. Normalizar errores y limitar IO/tamaño/tiempo/coste de `release.prepare`.

**Superficie:** `.github/workflows/ci.yml`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** Unknown/unsupported/forbidden no se simulan como éxito; cero HTTP con principal o conexión no autorizados; prueba fake no habilita capability real.

**Dependencia:** LEG-C41-T03. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.

### 041.05 — LEG-C41-T05: Vincular autorización y efectos
**Acción:** Crear preview sin efecto remoto, diff/hash de datos y revisión; identificar quién acepta el resultado y quién puede ejecutar. Si hay efecto, exigir policy/approval/mandato vigentes y un único intent durable con idempotency key.

**Superficie:** `.github/workflows/ci.yml`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** Cambiar releaseVersion o materialidad del payload invalida la autorización aplicable. Replay igual no duplica; distinto contenido con misma key da conflicto.

**Dependencia:** LEG-C41-T04. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.

### 041.06 — LEG-C41-T06: Ejecutar pruebas de negocio y fallo
**Acción:** Preparar y ejecutar caso específico: Restore reaplica restricciones y no reenvía efectos confirmados. Añadir A/B/P, humano/agente/colaborador, revocación, dato sin fuente, cambio concurrente y crash pertinente a `release.prepare`. Verificar ausencia de efectos prohibidos: Una cita falsa/inaplicable o plazo inventado se entrega como dictamen definitivo o desencadena presentación.

**Superficie:** `.github/workflows/ci.yml`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** El contrato estricto exige resultado correcto y trayectoria segura. Test fallido crítico bloquea; sin entorno se registra NOT_VERIFIED, nunca PASS por un mock.

**Dependencia:** LEG-C41-T05. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.

### 041.07 — LEG-C41-T07: Registrar evidencia y cerrar gate
**Acción:** Guardar SHA/diff, versiones, fixture antes/después, actor/mandato/correlación, fuentes y receipts mínimos. Registrar tests reales y coste/latencia cuando existan. Actualizar riesgos, rollback y siguiente dependencia sin escribir en agente.

**Superficie:** `.github/workflows/ci.yml`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** EVIDENCE/TESTS/RISKS y decisión de gate revisables; ninguna cifra, firma, actividad o integración inventadas. Mantener fuera del repo público PII, credenciales y originales restringidos.

**Dependencia:** LEG-C41-T06. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.


## Wiring transversal
JWT Supabase+membresía → actor/twin+tenant y mandato → ACL matter/document/partes → Zod DTO → policy/AuthorityMap → hechos vs alegaciones → fuente jurídica con identidad+fragmento+vigencia+territorio → revisión competente → versión/aprobación → Postgres RLS+audit/outbox → adapter allowlist → receipt → bridge padre. Conflictos de interés y confidencialidad antes de acceder; no dictámenes definitivos, firmas ni presentaciones automáticas. DeadlineProposal necesita regla verificable, inhábiles y revisión. Redline conserva original y diff.

## Gates pendientes
- **LEG-C41-G01 / NOT_EXECUTED:** Restore reaplica restricciones y no reenvía efectos confirmados. **Esperado:** Resultado y estado protegido coherentes con invariante, revisión/receipt donde correspondan.
- **LEG-C41-G02 / NOT_EXECUTED:** Principal/mandato inválido, recurso o conexión de otro tenant, o versión cambiada intenta release.prepare.. **Esperado:** Fail-closed antes de leer/actuar remotamente; sin fuga o ampliación de scope, con intento auditado.

**Bloqueos:** Cross-tenant o secretos expuestos; Approval/mandato/scope ampliados sin autorización; Pérdida de historia o duplicación tras timeout; Conclusión sensible sin fuentes/revisión competente.

**Rollback:** Deshabilitar capacidad o flag y detener efectos nuevos; conservar audit, links, intents, snapshots y receipts. Restore probado con restricciones/supresiones reaplicadas; no borrar efectos remotos para fingir reversión.

## Reporte Freebuff — completar tras ejecución
Estado: PENDING. SHA: PENDING. Archivos/diff: PENDING. Tests/fixtures: PENDING. Gates: PENDING. Incoherencias/decisiones: PENDING. Riesgos/deuda: PENDING. Aprendizajes para futuras campañas: PENDING. Continuar autónomamente; Codex audita después de C42.
