# LEG-C16 — Hechos y alegaciones

**SCAFFOLD CONCEPTUAL / NOT_STARTED / NOT_EXECUTED.** [Campaña original](../../campaigns/16-hechos-y-alegaciones.md). Leer [factory](../../factory/00-README.md), [pipeline](../../factory/01-PIPELINE.md), [léxico](../../factory/02-LEXICO.md), [ADTC](../../factory/03-TRACE-OBSERVABILITY.md), [producto Legal](../../factory/04-PRODUCTO-LEGAL.md), contexto N−1/N/N+1.

## Objetivo
Construir/verificar hechos y alegaciones para Operaciones jurídicas, contratos y cumplimiento, preservando: Distinguir afirmación de parte, inferencia y hecho verificado.

## Alcance propuesto
Campos/refs a resolver: factAssertion, sourceRefs, status, contradictoryEvidence. Operación interna o capacidad nominada propuesta `legal.facts.propose`; no se expone por defecto como endpoint/tool si es tarea de baseline/administración.

Operación `legal.facts.propose`; campos `factAssertion, sourceRefs, status, contradictoryEvidence`; fuentes H01, S01, S02, P01; dependencias LEG-C15.

## Invariante
Distinguir afirmación de parte, inferencia y hecho verificado

## Tareas originales, sin granularizar
- **LEG-C16-T01 Congelar fuentes, ámbito y autoridad:** Cotejar factAssertion, sourceRefs, status, contradictoryEvidence con originales, contrato del tenant y versiones de fuente/proveedor. Registrar qué es hecho, declaración, inferencia o desconocido; revisar alcance territorial/temporal y reglas del módulo. **Criterio:** AuthorityMap y fixture explícitos; Distinguir afirmación de parte, inferencia y hecho verificado. La ausencia de fuente genera pendiente, no un valor plausible.
- **LEG-C16-T02 Definir DTO y frontera de datos:** Diseñar esquema runtime para factAssertion, sourceRefs, status, contradictoryEvidence: tipos, límites, IDs opacos, enums, fechas y versión. Conservar los campos nativos aplicables y declarar nuevos los del servicio. Aislar tenant/proyecto/recurso y minimizar PII. **Criterio:** Round-trip y rechazo de extra/valor inválido; referencias cruzadas no son posibles; source/actor/updatedAt y EvidenceRef preservados donde correspondan.
- **LEG-C16-T03 Aplicar lógica determinista y revisión:** Implementar o documentar el paso `legal.facts.propose` mediante guards, estados y expectedVersion/CAS. Separar propuesta del modelo de cálculo/decisión verificables. CitationVerifier separa resolver fuente/identidad, fragmento, fecha de vigencia y pertinencia; existencia no implica conclusión. DeadlineProposal necesita regla versionada, evento inicial probado, calendario/territorio/inhábiles y revisión, sin fecha inferida por chat. Redline conserva original/versión/operaciones y diff semántico revisable; no modificar original ni ocultar cambios. **Criterio:** El estado final, el protegido y los motivos de bloqueo son comprobables; Hechos contradictorios no se resuelven por último prompt. No eval/SQL/shell/HTTP genérico del LLM.
- **LEG-C16-T04 Adaptar con permisos mínimos:** Comprobar versión/edición/ACL de backend si esta fase lo usa; fields/métodos allowlist y binding de servidor. Si es fase local/documental no añadir HTTP. Normalizar errores y limitar IO/tamaño/tiempo/coste de `legal.facts.propose`. **Criterio:** Unknown/unsupported/forbidden no se simulan como éxito; cero HTTP con principal o conexión no autorizados; prueba fake no habilita capability real.
- **LEG-C16-T05 Vincular autorización y efectos:** Crear preview sin efecto remoto, diff/hash de datos y revisión; identificar quién acepta el resultado y quién puede ejecutar. Si hay efecto, exigir policy/approval/mandato vigentes y un único intent durable con idempotency key. **Criterio:** Cambiar factAssertion o materialidad del payload invalida la autorización aplicable. Replay igual no duplica; distinto contenido con misma key da conflicto.
- **LEG-C16-T06 Ejecutar pruebas de negocio y fallo:** Preparar y ejecutar caso específico: Hechos contradictorios no se resuelven por último prompt. Añadir A/B/P, humano/agente/colaborador, revocación, dato sin fuente, cambio concurrente y crash pertinente a `legal.facts.propose`. Verificar ausencia de efectos prohibidos: Una cita falsa/inaplicable o plazo inventado se entrega como dictamen definitivo o desencadena presentación. **Criterio:** El contrato estricto exige resultado correcto y trayectoria segura. Test fallido crítico bloquea; sin entorno se registra NOT_VERIFIED, nunca PASS por un mock.
- **LEG-C16-T07 Registrar evidencia y cerrar gate:** Guardar SHA/diff, versiones, fixture antes/después, actor/mandato/correlación, fuentes y receipts mínimos. Registrar tests reales y coste/latencia cuando existan. Actualizar riesgos, rollback y siguiente dependencia sin escribir en agente. **Criterio:** EVIDENCE/TESTS/RISKS y decisión de gate revisables; ninguna cifra, firma, actividad o integración inventadas. Mantener fuera del repo público PII, credenciales y originales restringidos.

## Gates diseñados, no ejecutados
- LEG-C16-G01: Hechos contradictorios no se resuelven por último prompt — Resultado y estado protegido coherentes con invariante, revisión/receipt donde correspondan.
- LEG-C16-G02: Principal/mandato inválido, recurso o conexión de otro tenant, o versión cambiada intenta legal.facts.propose. — Fail-closed antes de leer/actuar remotamente; sin fuga o ampliación de scope, con intento auditado.

## Fase futura
Meta-auditoría conceptual → reconciliación → patchsets/handoffs específicos Freebuff, Codex y Arquitecto/Founder, pruebas, evidencia y rollback. No afirmar cumplimiento legal ni actuaciones profesionales. Rollback previsto: Deshabilitar capacidad o flag y detener efectos nuevos; conservar audit, links, intents, snapshots y receipts. Restore probado con restricciones/supresiones reaplicadas; no borrar efectos remotos para fingir reversión.
