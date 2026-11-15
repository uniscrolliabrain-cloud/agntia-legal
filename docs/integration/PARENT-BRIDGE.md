# Puente con `agente` (propuesta)

Estado: **diseño + código local**. El repositorio padre no se ha abierto, ni
modificado, ni ejecutado en esta entrega. Los puertos que falten se registran
como `HOST_BRIDGE_NOT_VERIFIED`.

SHA del padre observado documentalmente:
`54b8d5407a8576459448c4d059a877297d18ca7a`.

## Identidad y delegación

- El agente canónico vive en `agente`. Aquí solo existe `twinBinding` con
  `canonicalAgentRef.runtimeId`, revisión canónica, `targetTenantId`,
  `workOrderId`, capabilities, purpose, budget, expiry y `revocationVersion`.
- Workers/servicios actúan con `kind: 'service'` y **solo** bajo mandato
  verificado; no emiten JWT humano ni reutilizan access tokens.
- El tenant de origen y el `targetTenantId` se mantienen separados. No se
  simula pertenencia del cliente modificando el Actor.

## Superficie API implementada (local)

Prefijo `/v1/legal`. Todas las rutas salvo `/health` exigen `Authorization:
Bearer <Supabase JWT>`.

| Método | Ruta | Capacidad |
|---|---|---|
| GET | `/health` | pública, sin datos |
| GET | `/me` | autenticado |
| POST | `/matters` | `legal.intake.propose` |
| GET | `/matters/:id` | `legal.matter.read` |
| POST | `/matters/:id/transitions` | `legal.matter.transition` |
| POST | `/matters/:id/conflicts` | `legal.conflicts.preview` |
| POST | `/citations/verify` | `legal.citation.verify` |
| POST | `/deadlines/propose` | `legal.deadline.propose` |
| POST | `/redlines/preview` | `legal.redline.preview` |
| POST | `/intents` | capability solicitada + `legal.intent.execute` |
| POST | `/intents/:id/reconcile` | `legal.intent.execute` |
| GET | `/integrations/:id/capabilities` | `legal.report.read` |
| POST/GET | `/reports` | `legal.report.read` |

Códigos: 400 input, 401 auth, 403 capability, 404 recurso ajeno, 409 versión/
conflicto, 422 no soportado, 424 dependencia/capacidad, 429 límite, 502/503/504
proveedor. El envelope de error incluye `code`, `message`, `correlationId`,
`retryable`, `reconciliationRequired`.

## Tools propuestas para el agente

Catálogo cerrado, sin parámetros de tenant/actor libres:

```
legal_matter_read
legal_source_search
legal_citation_verify
legal_clause_propose
legal_redline_preview
legal_deadline_propose
legal_report_read
```

No hay herramientas de approve/send/export_all/admin, ni HTTP/SQL/shell
genéricos. Un MCP o Anam debe pasar por el mismo PEP.

## Eventos

Tipos locales: `legal.proposal.created`, `legal.review.required`,
`legal.resource.changed`, `legal.operation.confirmed`,
`legal.operation.outcome_unknown`, `legal.connection.degraded`.

`toSystemEvent()` solo emite `SystemEvent` con `schemaVersion: "1.0"`, `owner`,
`emittedAt`, `source.kind = "legal"` y un tipo **de la allowlist del host**. Sin
mapeo confirmado devuelve `HOST_MAPPING_NOT_VERIFIED` y el evento queda local.
El payload enviado es un hash y la referencia, nunca el contenido.

## Handoff

Estados propuestos: `proposed → offered → acknowledged → working →
completed/returned`. Emitir un evento no acredita recepción: el outbox solo pasa
a `acknowledged` tras commit del receptor. Sin ACK no se reporta trabajo hecho.

## Rollback

1. Deshabilitar la capability afectada (feature flag) y detener efectos nuevos.
2. Conservar audit, intents, receipts y snapshots.
3. Reconciliar los `outcome_unknown` por referencia remota.
4. No borrar efectos externos para fingir reversión.

## Cambios que requeriría el padre (NO ejecutados)

- Emitir mandatos de delegación verificables por `workOrderId`.
- Publicar la allowlist de tipos de `SystemEvent` aceptados.
- Exponer el puerto de identidad/aprobaciones/budget/tareas.
- Confirmar JWKS, issuer y audience del proyecto Supabase compartido.
- Definir el contrato de recepción de eventos con ACK.

Cualquier cambio en `agente` requiere un encargo separado y autorización propia.
