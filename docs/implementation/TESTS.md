# Tests ejecutados

Comando: `npm test` (= `vitest run`). Resultado del 2026-11-15:
**26 ficheros, 221 tests, 221 passed, 0 failed, 0 skipped.**

| Fichero | Tests | Qué demuestra |
|---|---:|---|
| `tests/api/auth.test.ts` | 12 | JWT RS256/JWKS, issuer/audience, exp, HS256 rechazado, membership, tenant explícito, `user_metadata` ignorado |
| `tests/api/app.test.ts` | 12 | 401/404 cross-tenant, 409 de versión/transición, 424 sin proveedor, dry-run, secretos rechazados, audit por tenant |
| `tests/api/domain-routes.test.ts` | 7 | documentos e historial, hechos, revisión de conflictos por otro actor y revisión competente firmada por HTTP |
| `tests/core/intents.test.ts` | 10 | idempotencia, replay, conflicto de key, timeout + reconciliación, proveedor no configurado, approval ligada al payload |
| `tests/core/policy.test.ts` | 13 | deny-by-default, capability no concedida, recurso restringido, cross-tenant, mandato (purpose/budget/expiry/revocación) |
| `tests/core/citation.test.ts` | 9 | existencia ≠ vigencia ≠ pertinencia; unsupported; not_found; snapshot ausente; consolidación pendiente |
| `tests/core/deadline.test.ts` | 9 | días hábiles/festivos, trigger probado, territorio, recálculo, revisión obligatoria |
| `tests/core/redline.test.ts` | 6 | base hash, CAS, precondición de texto, diff, original inmutable |
| `tests/core/approval.test.ts` | 10 | binding a payload/versión/destinatario/canal/scope/policy, expiry, revocación, techo de coste, decimales |
| `tests/domain/states.test.ts` | 10 | FSM de dominio y operación, revisión competente, bloqueo por conflicto, entrega solo con approval |
| `tests/domain/envelope.test.ts` | 6 | envelope estricto, identidad del body no es autoridad, secretos rechazados |
| `tests/adapters/egress.test.ts` | 13 | SSRF: IP privada/link-local/loopback, credenciales en URL, puerto, DNS, redirects revalidados, tamaño |
| `tests/adapters/capability.test.ts` | 4 | solo `verified_runtime` habilita; expiración; proyección pública sin refs |
| `tests/bridge/events.test.ts` | 4 | SystemEvent 1.0, payload mínimo, sin tipos inventados, mapping no verificado |
| `tests/workers/outbox.test.ts` | 4 | emitido ≠ entregado, ACK solo tras claim, aislamiento por tenant |
| `tests/e2e/vertical.test.ts` | 1 | flujo completo A/B con cita, redline, plazo, revisión, informe y efecto único idempotente |
| `tests/persistence/rls.test.ts` | 8 | migraciones reales en PGlite: aislamiento por claims, `WITH CHECK`, membership, FKs compuestos, idempotencia y audit append-only |
| `tests/services/documents-facts-timeline.test.ts` | 14 | custodia y revisiones, integridad, corroboración/contradicción, cronología y trigger probado |
| `tests/services/conflicts-access-jurisdiction.test.ts` | 12 | revisión de conflictos por otro actor, privilegio, shares con caducidad y competencia territorial |
| `tests/services/review-retention-budget-privacy.test.ts` | 7 | revisión firmada, legal hold, reservas de presupuesto y DSAR |
| `tests/services/outputs-export.test.ts` | 10 | memo, borrador, playbook, riesgo, obligación y archivo/restauración |
| `tests/tools/sdk-catalog.test.ts` | 7 | catálogo cerrado sin tenant/actor y SDK con allowlist y mapeo de errores |
| `tests/services/knowledge-pipeline.test.ts` | 12 | extracción, import contractual, entrevistas, seguimiento y snapshots de fuentes |
| `tests/services/governance.test.ts` | 7 | acuerdos/work orders, conexiones, partes, handoff, portal y propuesta de presentación |
| `tests/ops/infra.test.ts` | 8 | uso/coste de modelos, manifiesto de backup, stub Postgres, render de informe, expiración de holds y competencia |
| `tests/security/adversarial.test.ts` | 6 | inyección tratada como dato, hosts parecidos, hashes inválidos, permisos amplios y secretos |

## Cobertura conceptual (no porcentaje de líneas)

Hay 221 tests en 26 ficheros; el recuento incluye los 123 del baseline y los
nuevos bloques de servicios, tools/SDK, rutas de dominio, RLS en PGlite,
infraestructura, seguridad adversarial y los stubs de proveedor.

Cubierto: autenticación, autorización, aislamiento, DTOs, FSM, aprobaciones,
idempotencia, reconciliación, citas, plazos, redline, capabilities, SSRF,
eventos y outbox, custodia documental, hechos, cronología, conflictos,
privilegio, competencia territorial, retención, presupuesto, privacidad,
memo/borrador/playbook, archivo/restauración, tools/SDK y un E2E.

No cubierto: Postgres real (solo PGlite), proveedores externos, UI/Anam, OCR,
firma, presentación, backup real, carga/latencia, i18n, accesibilidad.

## Cómo reproducir

```bash
npm ci
npm run typecheck
npm test
npm run build
```

`npm ci` requiere `package-lock.json`, incluido en el repositorio.
