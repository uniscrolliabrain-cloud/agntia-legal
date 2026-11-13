# ADTC — Causalidad y observabilidad distribuida Legal

**Propuesta conceptual v0.1, no desplegada.** Padre posee bus, grafo y auditoría de negocio; Ciberseguridad recibe/proyecta observabilidad transversal de 15 repos y tenants, sin ser paso síncrono obligatorio.

## Envelope lógico propuesto
```json
{"schemaVersion":"adtc/0.1","eventId":"unique-event","eventType":"legal.contract.review_proposed","tenantId":"verified-tenant","actorId":"verified-actor","taskId":"task-ref","correlationId":"stable-workflow","causationId":"parent-event-ref","requestId":"ingress-ref","traceId":"w3c-trace-id","spanId":"current-span-id","idempotencyKey":"effect-scope-key","source":"agntia-legal","resourceRefs":["matter-ref","document-version-ref"],"evidenceRefs":["sanitized-review-ref"],"payloadRef":"restricted-encrypted-ref"}
```
No asumir que coincide con `SystemEvent` real: bridge y schema versionado.

## Reglas
Propagar tenant, correlación, actor y mandato; nuevo eventId por evento, causationId a evento causante, spanId por tramo, attemptId por intento. IdempotencyKey estable por efecto; replay forense no reenvía notificaciones ni presenta escritos. Outbox durable, inbox dedupe, retries acotados, DLQ, reconciliación outcome_unknown. Logs/OTel muestreables, evidencia legal crítica durable y con cadena de custodia.

## Privacidad y secreto
No replicar contratos, datos personales, expedientes, comunicaciones confidenciales ni documentos potencialmente privilegiados en cada evento/repositorio. Solo referencias cifradas, hashes, versiones y metadatos mínimos con ACL por matter, tenant y finalidad. Observabilidad multitenant no otorga a Ciberseguridad acceso automático al contenido de asuntos. Retención, legal holds y supresión requieren políticas por jurisdicción y revisión.

## Reconstrucción ejemplo
Cliente solicita revisión de contrato → padre crea tarea → Legal verifica encargo/conflictos → consulta fuentes normativas versionadas → genera redline → profesional revisa → aprobación y entrega → receipt → bus padre registra resultado → Ciberseguridad reconstruye cadena técnica/causal sin revelar contenido no autorizado.

## Diseño negativo
Tenant B no ve asunto A; empleado de tenant A sin matter ACL tampoco; fuente derogada no se presenta vigente; documento modificado tras approval exige nueva revisión; caída de observabilidad no detiene outbox; notificación con resultado remoto incierto se reconcilia; filing nunca se ejecuta por replay.
