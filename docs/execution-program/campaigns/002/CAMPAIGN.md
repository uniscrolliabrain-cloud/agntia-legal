# LEG-C02 — Autoridad por dominio y contrato SaaS

**DESIGN_ONLY · NOT_STARTED · 2/42.** [Campaña original](../../../campaigns/02-autoridad-por-dominio-y-contrato-saas.md). No confundir documentación con código ni verificación jurídica.

## Objetivo y límites
Construir/verificar autoridad por dominio y contrato saas para Operaciones jurídicas, contratos y cumplimiento, preservando: Solapamiento permitido, responsable único por efecto.

**Operación nominada:** `authority.define`. **Campos:** operatorTenant, targetTenant, WorkOrder, AuthorityMap. **Invariante:** Solapamiento permitido, responsable único por efecto. **Dependencias:** LEG-C01.

## Superficies de implementación propuestas
- Dominio principal: `packages/domain/src/authority-map.ts` (validar en checkout; ruta propuesta).
- DTO Zod: `packages/contracts/src/02.ts` solo si procede.
- API Hono: `apps/api/src/routes/02.ts` solo si hay capability autorizada.
- Tests: `tests/campaigns/002.test.ts`, fixtures `tests/fixtures/002/`.
- Evidencia original: `docs/implementation/c02/README.md`, `docs/implementation/c02/EVIDENCE.md`, `docs/implementation/c02/TESTS.md`, `docs/implementation/c02/RISKS.md`. Reporte Freebuff en este documento.

## Patchsets secuenciales
### 002.01 — LEG-C02-T01: Congelar fuentes, ámbito y autoridad
**Acción:** Cotejar operatorTenant, targetTenant, WorkOrder, AuthorityMap con originales, contrato del tenant y versiones de fuente/proveedor. Registrar qué es hecho, declaración, inferencia o desconocido; revisar alcance territorial/temporal y reglas del módulo.

**Superficie:** `packages/domain/src/authority-map.ts`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** AuthorityMap y fixture explícitos; Solapamiento permitido, responsable único por efecto. La ausencia de fuente genera pendiente, no un valor plausible.

**Dependencia:** inicio. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.

### 002.02 — LEG-C02-T02: Definir DTO y frontera de datos
**Acción:** Diseñar esquema runtime para operatorTenant, targetTenant, WorkOrder, AuthorityMap: tipos, límites, IDs opacos, enums, fechas y versión. Conservar los campos nativos aplicables y declarar nuevos los del servicio. Aislar tenant/proyecto/recurso y minimizar PII.

**Superficie:** `packages/domain/src/authority-map.ts`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** Round-trip y rechazo de extra/valor inválido; referencias cruzadas no son posibles; source/actor/updatedAt y EvidenceRef preservados donde correspondan.

**Dependencia:** LEG-C02-T01. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.

### 002.03 — LEG-C02-T03: Aplicar lógica determinista y revisión
**Acción:** Implementar o documentar el paso `authority.define` mediante guards, estados y expectedVersion/CAS. Separar propuesta del modelo de cálculo/decisión verificables. CitationVerifier separa resolver fuente/identidad, fragmento, fecha de vigencia y pertinencia; existencia no implica conclusión. DeadlineProposal necesita regla versionada, evento inicial probado, calendario/territorio/inhábiles y revisión, sin fecha inferida por chat. Redline conserva original/versión/operaciones y diff semántico revisable; no modificar original ni ocultar cambios.

**Superficie:** `packages/domain/src/authority-map.ts`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** El estado final, el protegido y los motivos de bloqueo son comprobables; Dos servicios con mismo encargo no ejecutan dos veces. No eval/SQL/shell/HTTP genérico del LLM.

**Dependencia:** LEG-C02-T02. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.

### 002.04 — LEG-C02-T04: Adaptar con permisos mínimos
**Acción:** Comprobar versión/edición/ACL de backend si esta fase lo usa; fields/métodos allowlist y binding de servidor. Si es fase local/documental no añadir HTTP. Normalizar errores y limitar IO/tamaño/tiempo/coste de `authority.define`.

**Superficie:** `packages/domain/src/authority-map.ts`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** Unknown/unsupported/forbidden no se simulan como éxito; cero HTTP con principal o conexión no autorizados; prueba fake no habilita capability real.

**Dependencia:** LEG-C02-T03. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.

### 002.05 — LEG-C02-T05: Vincular autorización y efectos
**Acción:** Crear preview sin efecto remoto, diff/hash de datos y revisión; identificar quién acepta el resultado y quién puede ejecutar. Si hay efecto, exigir policy/approval/mandato vigentes y un único intent durable con idempotency key.

**Superficie:** `packages/domain/src/authority-map.ts`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** Cambiar operatorTenant o materialidad del payload invalida la autorización aplicable. Replay igual no duplica; distinto contenido con misma key da conflicto.

**Dependencia:** LEG-C02-T04. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.

### 002.06 — LEG-C02-T06: Ejecutar pruebas de negocio y fallo
**Acción:** Preparar y ejecutar caso específico: Dos servicios con mismo encargo no ejecutan dos veces. Añadir A/B/P, humano/agente/colaborador, revocación, dato sin fuente, cambio concurrente y crash pertinente a `authority.define`. Verificar ausencia de efectos prohibidos: Una cita falsa/inaplicable o plazo inventado se entrega como dictamen definitivo o desencadena presentación.

**Superficie:** `packages/domain/src/authority-map.ts`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** El contrato estricto exige resultado correcto y trayectoria segura. Test fallido crítico bloquea; sin entorno se registra NOT_VERIFIED, nunca PASS por un mock.

**Dependencia:** LEG-C02-T05. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.

### 002.07 — LEG-C02-T07: Registrar evidencia y cerrar gate
**Acción:** Guardar SHA/diff, versiones, fixture antes/después, actor/mandato/correlación, fuentes y receipts mínimos. Registrar tests reales y coste/latencia cuando existan. Actualizar riesgos, rollback y siguiente dependencia sin escribir en agente.

**Superficie:** `packages/domain/src/authority-map.ts`. Separar contrato/servicio/adaptador/worker/tests según necesidad y registrar imports/exports. No crear endpoints para investigación documental.

**Aceptación:** EVIDENCE/TESTS/RISKS y decisión de gate revisables; ninguna cifra, firma, actividad o integración inventadas. Mantener fuera del repo público PII, credenciales y originales restringidos.

**Dependencia:** LEG-C02-T06. **Test/evidencia:** caso positivo, tenant ajeno, permiso insuficiente, revocación, cita falsa o desactualizada, jurisdicción/fecha incorrecta, cambio concurrente y timeout si hay efecto. Registrar SHA, diff, fixture y resultado.


## Wiring transversal
JWT Supabase+membresía → actor/twin+tenant y mandato → ACL matter/document/partes → Zod DTO → policy/AuthorityMap → hechos vs alegaciones → fuente jurídica con identidad+fragmento+vigencia+territorio → revisión competente → versión/aprobación → Postgres RLS+audit/outbox → adapter allowlist → receipt → bridge padre. Conflictos de interés y confidencialidad antes de acceder; no dictámenes definitivos, firmas ni presentaciones automáticas. DeadlineProposal necesita regla verificable, inhábiles y revisión. Redline conserva original y diff.

## Gates pendientes
- **LEG-C02-G01 / NOT_EXECUTED:** Dos servicios con mismo encargo no ejecutan dos veces. **Esperado:** Resultado y estado protegido coherentes con invariante, revisión/receipt donde correspondan.
- **LEG-C02-G02 / NOT_EXECUTED:** Principal/mandato inválido, recurso o conexión de otro tenant, o versión cambiada intenta authority.define.. **Esperado:** Fail-closed antes de leer/actuar remotamente; sin fuga o ampliación de scope, con intento auditado.

**Bloqueos:** Cross-tenant o secretos expuestos; Approval/mandato/scope ampliados sin autorización; Pérdida de historia o duplicación tras timeout; Conclusión sensible sin fuentes/revisión competente.

**Rollback:** Deshabilitar capacidad o flag y detener efectos nuevos; conservar audit, links, intents, snapshots y receipts. Restore probado con restricciones/supresiones reaplicadas; no borrar efectos remotos para fingir reversión.

## Reporte Freebuff — completar tras ejecución
Estado: PENDING. SHA: PENDING. Archivos/diff: PENDING. Tests/fixtures: PENDING. Gates: PENDING. Incoherencias/decisiones: PENDING. Riesgos/deuda: PENDING. Aprendizajes para futuras campañas: PENDING. Continuar autónomamente; Codex audita después de C42.
