# Stubs deliberados y trabajo restante

Actualizado 2026-11-15. Un stub aquí **no simula éxito**: la operación lanza
`CAPABILITY_NOT_VERIFIED`/`DEPENDENCY_UNAVAILABLE` con un motivo estable, y los
tests comprueban ese fallo cerrado. Ningún stub acredita un proveedor real.

## Stubs de proveedor externo

| Campaña | Módulo | Comportamiento actual | Qué falta para sustituirlo | Verificación pendiente |
|---|---|---|---|---|
| C06 | `src/persistence/postgres.ts` | Rechaza la creación de repositorios; exige `connectionRef` de secret store | Driver/pool, migrador, reintentos y adaptadores `Repository` sobre las tablas de `db/migrations` | Migraciones y RLS A/B en Postgres real con rol sin `BYPASSRLS`; restore |
| C13 | `NotConfiguredOcrProvider` (`src/adapters/external.ts`) | `extract()` lanza `PROVIDER_NOT_CONFIGURED` | Motor OCR, almacenamiento real de ficheros, antivirus, límites MIME y extracción de campos | Extracción real con documento fixture y revisión humana |
| C14 | `NotConfiguredOpenContractsProvider` | `importRevision()` lanza `PROVIDER_NOT_CONFIGURED` | Cliente de la API, licencia/contrato y mapeo de revisión/paragraphs | Importación real con hash de contenido verificado |
| C15 | `NotConfiguredDocassembleProvider` | `startInterview()` lanza `PROVIDER_NOT_CONFIGURED` | Instancia, credenciales y plantillas versionadas | Entrevista completa con respuestas evidenciadas |
| C19 | `NotConfiguredSourceSnapshotProvider` | `fetch()` lanza `PROVIDER_NOT_CONFIGURED` | Acceso/condiciones de BOE y EUR-Lex, parser y snapshots versionados | Ingesta real con vigencia y consolidación comprobadas |
| C29 | `NotConfiguredSourceWatchProvider` | `diff()` lanza `PROVIDER_NOT_CONFIGURED` | Scheduler durable, comparación de fuentes y alertas | Cambio real detectado y revisado por persona |
| C31 | `NotConfiguredSignatureProvider` | `sign()` lanza `PROVIDER_NOT_CONFIGURED` | Proveedor de firma cualificada y contrato de custodia | Firma verificable en sandbox y receipt |
| C34 | `NotConfiguredAnamProvider` y portal sin UI | `createSession()` lanza `PROVIDER_NOT_CONFIGURED`; solo existen contratos de hilos/mensajes | Frontend del portal, consentimiento, accesibilidad y presencia Anam (nunca identidad ni firma) | Flujo cliente completo en navegador |
| C38 | `NotConfiguredModelGateway` | `complete()` lanza `PROVIDER_NOT_CONFIGURED`; el uso se contabiliza por referencia | Proveedor de modelos, almacén de prompts por referencia, límites y métricas | Llamada real con coste/tokens y sin PII en logs |
| C41 | `src/ops/backup.ts` | Solo genera y verifica un manifiesto con hash y recuentos | Upload real, cifrado, retención y restauración | Backup y restore ejecutados en entorno aislado |

## Stubs de integración, no de proveedor

| Campaña | Situación | Qué falta |
|---|---|---|
| C36 (bridge con el padre) | Mapeo a `SystemEvent 1.0` y outbox con ACK existen y están probados; el host del padre no está disponible | Handshake real, verificación de versión y entrega con ACK del padre |
| C37 (handoff empresarial) | Paquete con permisos acotados, aprobación independiente y revocación; no hay transporte al padre | Endpoint de intercambio acordado con el padre y prueba con dos organizaciones |
| C42 (aceptación) | Informe y evidencias técnicas | Aceptación del owner y criterios de producto; no se autoatribuye |

## Lo que no es un stub

- Dominio determinista, FSM, PDP, approvals, idempotencia/reconciliación.
- Custodia documental, hechos, cronología, conflictos, privilegio, presupuesto,
  retención, privacidad, memo/borrador/playbook/riesgo/obligación.
- Catálogo cerrado de tools y SDK con allowlist.
- Rutas HTTP de documentos, hechos, revisiones y conflictos.
- SQL y RLS ejecutados en PGlite (no en Postgres real).

## Regla de sustitución

Un stub solo se reemplaza cuando existe proveedor autorizado, contrato,
credenciales por referencia y una prueba ejecutada con receipt. Mientras tanto
la capacidad permanece deshabilitada: no hay fallback a owner/admin, a datos de
ejemplo ni a un resultado inventado.
