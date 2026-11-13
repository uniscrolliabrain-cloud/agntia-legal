# LEG-C12 — Custodia documental

**SCAFFOLD CONCEPTUAL / NOT_STARTED / NOT_EXECUTED.** [Campaña original](../../campaigns/12-custodia-documental.md). Leer [factory](../../factory/00-README.md), [pipeline](../../factory/01-PIPELINE.md), [léxico](../../factory/02-LEXICO.md), [ADTC](../../factory/03-TRACE-OBSERVABILITY.md), [producto Legal](../../factory/04-PRODUCTO-LEGAL.md), contexto N−1/N/N+1.

## Objetivo
Construir/verificar custodia documental para Operaciones jurídicas, contratos y cumplimiento, preservando: No sobrescribir/eliminar original ni subir a modelo sin permiso.

## Alcance propuesto
Campos/refs a resolver: originalHash, custodian, sourceRef, receivedAt. Operación interna o capacidad nominada propuesta `legal.document.stage`; no se expone por defecto como endpoint/tool si es tarea de baseline/administración.

Operación `legal.document.stage`; campos `originalHash, custodian, sourceRef, receivedAt`; fuentes H01, S01, S02, P01; dependencias LEG-C11.

## Invariante
No sobrescribir/eliminar original ni subir a modelo sin permiso

## Tareas originales, sin granularizar
- **LEG-C12-T01 Congelar fuentes, ámbito y autoridad:** Cotejar originalHash, custodian, sourceRef, receivedAt con originales, contrato del tenant y versiones de fuente/proveedor. Registrar qué es hecho, declaración, inferencia o desconocido; revisar alcance territorial/temporal y reglas del módulo. **Criterio:** AuthorityMap y fixture explícitos; No sobrescribir/eliminar original ni subir a modelo sin permiso. La ausencia de fuente genera pendiente, no un valor plausible.
- **LEG-C12-T02 Definir DTO y frontera de datos:** Diseñar esquema runtime para originalHash, custodian, sourceRef, receivedAt: tipos, límites, IDs opacos, enums, fechas y versión. Conservar los campos nativos aplicables y declarar nuevos los del servicio. Aislar tenant/proyecto/recurso y minimizar PII. **Criterio:** Round-trip y rechazo de extra/valor inválido; referencias cruzadas no son posibles; source/actor/updatedAt y EvidenceRef preservados donde correspondan.
- **LEG-C12-T03 Aplicar lógica determinista y revisión:** Implementar o documentar el paso `legal.document.stage` mediante guards, estados y expectedVersion/CAS. Separar propuesta del modelo de cálculo/decisión verificables. CitationVerifier separa resolver fuente/identidad, fragmento, fecha de vigencia y pertinencia; existencia no implica conclusión. DeadlineProposal necesita regla versionada, evento inicial probado, calendario/territorio/inhábiles y revisión, sin fecha inferida por chat. Redline conserva original/versión/operaciones y diff semántico revisable; no modificar original ni ocultar cambios. **Criterio:** El estado final, el protegido y los motivos de bloqueo son comprobables; Documento alterado conserva dos versiones y cadena de custodia. No eval/SQL/shell/HTTP genérico del LLM.
- **LEG-C12-T04 Adaptar con permisos mínimos:** Comprobar versión/edición/ACL de backend si esta fase lo usa; fields/métodos allowlist y binding de servidor. Si es fase local/documental no añadir HTTP. Normalizar errores y limitar IO/tamaño/tiempo/coste de `legal.document.stage`. **Criterio:** Unknown/unsupported/forbidden no se simulan como éxito; cero HTTP con principal o conexión no autorizados; prueba fake no habilita capability real.
- **LEG-C12-T05 Vincular autorización y efectos:** Crear preview sin efecto remoto, diff/hash de datos y revisión; identificar quién acepta el resultado y quién puede ejecutar. Si hay efecto, exigir policy/approval/mandato vigentes y un único intent durable con idempotency key. **Criterio:** Cambiar originalHash o materialidad del payload invalida la autorización aplicable. Replay igual no duplica; distinto contenido con misma key da conflicto.
- **LEG-C12-T06 Ejecutar pruebas de negocio y fallo:** Preparar y ejecutar caso específico: Documento alterado conserva dos versiones y cadena de custodia. Añadir A/B/P, humano/agente/colaborador, revocación, dato sin fuente, cambio concurrente y crash pertinente a `legal.document.stage`. Verificar ausencia de efectos prohibidos: Una cita falsa/inaplicable o plazo inventado se entrega como dictamen definitivo o desencadena presentación. **Criterio:** El contrato estricto exige resultado correcto y trayectoria segura. Test fallido crítico bloquea; sin entorno se registra NOT_VERIFIED, nunca PASS por un mock.
- **LEG-C12-T07 Registrar evidencia y cerrar gate:** Guardar SHA/diff, versiones, fixture antes/después, actor/mandato/correlación, fuentes y receipts mínimos. Registrar tests reales y coste/latencia cuando existan. Actualizar riesgos, rollback y siguiente dependencia sin escribir en agente. **Criterio:** EVIDENCE/TESTS/RISKS y decisión de gate revisables; ninguna cifra, firma, actividad o integración inventadas. Mantener fuera del repo público PII, credenciales y originales restringidos.

## Gates diseñados, no ejecutados
- LEG-C12-G01: Documento alterado conserva dos versiones y cadena de custodia — Resultado y estado protegido coherentes con invariante, revisión/receipt donde correspondan.
- LEG-C12-G02: Principal/mandato inválido, recurso o conexión de otro tenant, o versión cambiada intenta legal.document.stage. — Fail-closed antes de leer/actuar remotamente; sin fuga o ampliación de scope, con intento auditado.

## Fase futura
Meta-auditoría conceptual → reconciliación → patchsets/handoffs específicos Freebuff, Codex y Arquitecto/Founder, pruebas, evidencia y rollback. No afirmar cumplimiento legal ni actuaciones profesionales. Rollback previsto: Deshabilitar capacidad o flag y detener efectos nuevos; conservar audit, links, intents, snapshots y receipts. Restore probado con restricciones/supresiones reaplicadas; no borrar efectos remotos para fingir reversión.
