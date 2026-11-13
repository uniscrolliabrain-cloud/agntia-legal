# LEG-C03 — Supabase JWT y principal

**SCAFFOLD CONCEPTUAL / NOT_STARTED / NOT_EXECUTED.** [Campaña original](../../campaigns/03-supabase-jwt-y-principal.md). Leer [factory](../../factory/00-README.md), [pipeline](../../factory/01-PIPELINE.md), [léxico](../../factory/02-LEXICO.md), [ADTC](../../factory/03-TRACE-OBSERVABILITY.md), [producto Legal](../../factory/04-PRODUCTO-LEGAL.md), contexto N−1/N/N+1.

## Objetivo
Construir/verificar supabase jwt y principal para Operaciones jurídicas, contratos y cumplimiento, preservando: JWT válido sin membresía/scope no autoriza; no user_metadata/default.

## Alcance propuesto
Campos/refs a resolver: sub, tenant_id, membership, resourceACL, capability. Operación interna o capacidad nominada propuesta `auth.verify`; no se expone por defecto como endpoint/tool si es tarea de baseline/administración.

Operación `auth.verify`; campos `sub, tenant_id, membership, resourceACL, capability`; fuentes H01, S01, S02, P01; dependencias LEG-C02.

## Invariante
JWT válido sin membresía/scope no autoriza; no user_metadata/default

## Tareas originales, sin granularizar
- **LEG-C03-T01 Congelar fuentes, ámbito y autoridad:** Cotejar sub, tenant_id, membership, resourceACL, capability con originales, contrato del tenant y versiones de fuente/proveedor. Registrar qué es hecho, declaración, inferencia o desconocido; revisar alcance territorial/temporal y reglas del módulo. **Criterio:** AuthorityMap y fixture explícitos; JWT válido sin membresía/scope no autoriza; no user_metadata/default. La ausencia de fuente genera pendiente, no un valor plausible.
- **LEG-C03-T02 Definir DTO y frontera de datos:** Diseñar esquema runtime para sub, tenant_id, membership, resourceACL, capability: tipos, límites, IDs opacos, enums, fechas y versión. Conservar los campos nativos aplicables y declarar nuevos los del servicio. Aislar tenant/proyecto/recurso y minimizar PII. **Criterio:** Round-trip y rechazo de extra/valor inválido; referencias cruzadas no son posibles; source/actor/updatedAt y EvidenceRef preservados donde correspondan.
- **LEG-C03-T03 Aplicar lógica determinista y revisión:** Implementar o documentar el paso `auth.verify` mediante guards, estados y expectedVersion/CAS. Separar propuesta del modelo de cálculo/decisión verificables. CitationVerifier separa resolver fuente/identidad, fragmento, fecha de vigencia y pertinencia; existencia no implica conclusión. DeadlineProposal necesita regla versionada, evento inicial probado, calendario/territorio/inhábiles y revisión, sin fecha inferida por chat. Redline conserva original/versión/operaciones y diff semántico revisable; no modificar original ni ocultar cambios. **Criterio:** El estado final, el protegido y los motivos de bloqueo son comprobables; TokenA con recursoB falla sin revelar metadatos. No eval/SQL/shell/HTTP genérico del LLM.
- **LEG-C03-T04 Adaptar con permisos mínimos:** Comprobar versión/edición/ACL de backend si esta fase lo usa; fields/métodos allowlist y binding de servidor. Si es fase local/documental no añadir HTTP. Normalizar errores y limitar IO/tamaño/tiempo/coste de `auth.verify`. **Criterio:** Unknown/unsupported/forbidden no se simulan como éxito; cero HTTP con principal o conexión no autorizados; prueba fake no habilita capability real.
- **LEG-C03-T05 Vincular autorización y efectos:** Crear preview sin efecto remoto, diff/hash de datos y revisión; identificar quién acepta el resultado y quién puede ejecutar. Si hay efecto, exigir policy/approval/mandato vigentes y un único intent durable con idempotency key. **Criterio:** Cambiar sub o materialidad del payload invalida la autorización aplicable. Replay igual no duplica; distinto contenido con misma key da conflicto.
- **LEG-C03-T06 Ejecutar pruebas de negocio y fallo:** Preparar y ejecutar caso específico: TokenA con recursoB falla sin revelar metadatos. Añadir A/B/P, humano/agente/colaborador, revocación, dato sin fuente, cambio concurrente y crash pertinente a `auth.verify`. Verificar ausencia de efectos prohibidos: Una cita falsa/inaplicable o plazo inventado se entrega como dictamen definitivo o desencadena presentación. **Criterio:** El contrato estricto exige resultado correcto y trayectoria segura. Test fallido crítico bloquea; sin entorno se registra NOT_VERIFIED, nunca PASS por un mock.
- **LEG-C03-T07 Registrar evidencia y cerrar gate:** Guardar SHA/diff, versiones, fixture antes/después, actor/mandato/correlación, fuentes y receipts mínimos. Registrar tests reales y coste/latencia cuando existan. Actualizar riesgos, rollback y siguiente dependencia sin escribir en agente. **Criterio:** EVIDENCE/TESTS/RISKS y decisión de gate revisables; ninguna cifra, firma, actividad o integración inventadas. Mantener fuera del repo público PII, credenciales y originales restringidos.

## Gates diseñados, no ejecutados
- LEG-C03-G01: TokenA con recursoB falla sin revelar metadatos — Resultado y estado protegido coherentes con invariante, revisión/receipt donde correspondan.
- LEG-C03-G02: Principal/mandato inválido, recurso o conexión de otro tenant, o versión cambiada intenta auth.verify. — Fail-closed antes de leer/actuar remotamente; sin fuga o ampliación de scope, con intento auditado.

## Fase futura
Meta-auditoría conceptual → reconciliación → patchsets/handoffs específicos Freebuff, Codex y Arquitecto/Founder, pruebas, evidencia y rollback. No afirmar cumplimiento legal ni actuaciones profesionales. Rollback previsto: Deshabilitar capacidad o flag y detener efectos nuevos; conservar audit, links, intents, snapshots y receipts. Restore probado con restricciones/supresiones reaplicadas; no borrar efectos remotos para fingir reversión.
