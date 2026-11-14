# LEG-C33 — Reportes, dashboard e infografías

**DESIGN_ONLY · NOT_STARTED · 33/42.** [Campaña original](../../../campaigns/33-reportes-dashboard-e-infografias.md). No confundir documentación con código ni verificación jurídica.

## Objetivo y límites
Construir/verificar reportes, dashboard e infografías para Operaciones jurídicas, contratos y cumplimiento, preservando: No inventar cifras/fechas/estado completado.

**Operación nominada:** `report.snapshot`. **Campos:** snapshotId, metricDefinition, sourceRefs, coverage, hash. **Invariante:** No inventar cifras/fechas/estado completado. **Dependencias:** LEG-C32.

## Superficies de implementación propuestas
- Dominio principal: `apps/web/src/views/LegalDashboard.tsx` (validar en checkout; ruta propuesta).
- DTO Zod: `packages/contracts/src/33.ts` solo si procede.
- API Hono: `apps/api/src/routes/33.ts` solo si hay capability autorizada.
- Tests: `tests/campaigns/033.test.ts`, fixtures `tests/fixtures/033/`.
- Evidencia original: `docs/implementation/c33/README.md`, `docs/implementation/c33/EVIDENCE.md`, `docs/implementation/c33/TESTS.md`, `docs/implementation/c33/RISKS.md`. Reporte Freebuff en este documento.

## Patchsets secuenciales
### 033.01 — LEG-C33-T01: Congelar fuentes, ámbito y autoridad
**Acción:** Cotejar snapshotId, metricDefinition, sourceRefs, coverage, hash con originales, contrato del tenant y versiones de fuente/proveedor. Registrar qué es hecho, declaración, inferencia o desconocido; revisar alcance territorial/temporal y reglas del módulo.

**Superficie:** `apps/web/src/views/LegalDashboard.tsx`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** AuthorityMap y fixture explícitos; No inventar cifras/fechas/estado completado. La ausencia de fuente genera pendiente, no un valor plausible.

**Dependencia:** inicio. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.

### 033.02 — LEG-C33-T02: Definir DTO y frontera de datos
**Acción:** Diseñar esquema runtime para snapshotId, metricDefinition, sourceRefs, coverage, hash: tipos, límites, IDs opacos, enums, fechas y versión. Conservar los campos nativos aplicables y declarar nuevos los del servicio. Aislar tenant/proyecto/recurso y minimizar PII.

**Superficie:** `apps/web/src/views/LegalDashboard.tsx`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** Round-trip y rechazo de extra/valor inválido; referencias cruzadas no son posibles; source/actor/updatedAt y EvidenceRef preservados donde correspondan.

**Dependencia:** LEG-C33-T01. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.

### 033.03 — LEG-C33-T03: Aplicar lógica determinista y revisión
**Acción:** Implementar o documentar el paso `report.snapshot` mediante guards, estados y expectedVersion/CAS. Separar propuesta del modelo de cálculo/decisión verificables. CitationVerifier separa resolver fuente/identidad, fragmento, fecha de vigencia y pertinencia; existencia no implica conclusión. DeadlineProposal necesita regla versionada, evento inicial probado, calendario/territorio/inhábiles y revisión, sin fecha inferida por chat. Redline conserva original/versión/operaciones y diff semántico revisable; no modificar original ni ocultar cambios.

**Superficie:** `apps/web/src/views/LegalDashboard.tsx`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** El estado final, el protegido y los motivos de bloqueo son comprobables; Dato tardío cambia revisión, no informe aceptado silenciosamente. No eval/SQL/shell/HTTP genérico del LLM.

**Dependencia:** LEG-C33-T02. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.

### 033.04 — LEG-C33-T04: Adaptar con permisos mínimos
**Acción:** Comprobar versión/edición/ACL de backend si esta fase lo usa; fields/métodos allowlist y binding de servidor. Si es fase local/documental no añadir HTTP. Normalizar errores y limitar IO/tamaño/tiempo/coste de `report.snapshot`.

**Superficie:** `apps/web/src/views/LegalDashboard.tsx`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** Unknown/unsupported/forbidden no se simulan como éxito; cero HTTP con principal o conexión no autorizados; prueba fake no habilita capability real.

**Dependencia:** LEG-C33-T03. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.

### 033.05 — LEG-C33-T05: Vincular autorización y efectos
**Acción:** Crear preview sin efecto remoto, diff/hash de datos y revisión; identificar quién acepta el resultado y quién puede ejecutar. Si hay efecto, exigir policy/approval/mandato vigentes y un único intent durable con idempotency key.

**Superficie:** `apps/web/src/views/LegalDashboard.tsx`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** Cambiar snapshotId o materialidad del payload invalida la autorización aplicable. Replay igual no duplica; distinto contenido con misma key da conflicto.

**Dependencia:** LEG-C33-T04. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.

### 033.06 — LEG-C33-T06: Ejecutar pruebas de negocio y fallo
**Acción:** Preparar y ejecutar caso específico: Dato tardío cambia revisión, no informe aceptado silenciosamente. Añadir A/B/P, humano/agente/colaborador, revocación, dato sin fuente, cambio concurrente y crash pertinente a `report.snapshot`. Verificar ausencia de efectos prohibidos: Una cita falsa/inaplicable o plazo inventado se entrega como dictamen definitivo o desencadena presentación.

**Superficie:** `apps/web/src/views/LegalDashboard.tsx`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** El contrato estricto exige resultado correcto y trayectoria segura. Test fallido crítico bloquea; sin entorno se registra NOT_VERIFIED, nunca PASS por un mock.

**Dependencia:** LEG-C33-T05. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.

### 033.07 — LEG-C33-T07: Registrar evidencia y cerrar gate
**Acción:** Guardar SHA/diff, versiones, fixture antes/después, actor/mandato/correlación, fuentes y receipts mínimos. Registrar tests reales y coste/latencia cuando existan. Actualizar riesgos, rollback y siguiente dependencia sin escribir en agente.

**Superficie:** `apps/web/src/views/LegalDashboard.tsx`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** EVIDENCE/TESTS/RISKS y decisión de gate revisables; ninguna cifra, firma, actividad o integración inventadas. Mantener fuera del repo público PII, credenciales y originales restringidos.

**Dependencia:** LEG-C33-T06. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.


## Wiring transversal
JWT Supabase+membresía → actor/twin+tenant y mandato → ACL matter/document/partes → Zod DTO → policy/AuthorityMap → hechos vs alegaciones → fuente jurídica con identidad+fragmento+vigencia+territorio → revisión competente → versión/aprobación → Postgres RLS+audit/outbox → adapter allowlist → receipt → bridge padre. Conflictos de interés y confidencialidad antes de acceder; no dictámenes definitivos, firmas ni presentaciones automáticas. DeadlineProposal necesita regla verificable, inhábiles y revisión. Redline conserva original y diff.

## Gates pendientes
- **LEG-C33-G01 / NOT_EXECUTED:** Dato tardío cambia revisión, no informe aceptado silenciosamente. **Esperado:** Resultado y estado protegido coherentes con invariante, revisión/receipt donde correspondan.
- **LEG-C33-G02 / NOT_EXECUTED:** Principal/mandato inválido, recurso o conexión de otro tenant, o versión cambiada intenta report.snapshot.. **Esperado:** Fail-closed antes de leer/actuar remotamente; sin fuga o ampliación de scope, con intento auditado.

**Bloqueos:** Cross-tenant o secretos expuestos; Approval/mandato/scope ampliados sin autorización; Pérdida de historia o duplicación tras timeout; Conclusión sensible sin fuentes/revisión competente.

**Rollback:** Deshabilitar capacidad o flag y detener efectos nuevos; conservar audit, links, intents, snapshots y receipts. Restore probado con restricciones/supresiones reaplicadas; no borrar efectos remotos para fingir reversión.

## Reporte Freebuff — completar tras ejecución
Estado: PENDING. SHA: PENDING. Archivos/diff: PENDING. Tests/fixtures: PENDING. Gates: PENDING. Incoherencias/decisiones: PENDING. Riesgos/deuda: PENDING. Aprendizajes para futuras campañas: PENDING. Continuar autónomamente; Codex audita después de C42.
