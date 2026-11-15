# Evidencia de implementación

Fecha: 2026-11-15. Base documental: `b448d7c`. Entorno: Node 26.13.0,
npm 11.20.0, Linux, sin Postgres ni Supabase ni proveedores externos.

## Comandos ejecutados

```
npm install --no-audit --no-fund   → OK (53 paquetes)
npx tsc --noEmit                   → OK, 0 errores
npx vitest run                     → 26 ficheros, 221 tests, 221 passed
npm run build                      → OK, dist/src generado
```

Las migraciones se ejecutaron en PGlite (Postgres WASM) dentro de
`tests/persistence/rls.test.ts`. No se ejecutó nada contra red de proveedores,
un Postgres real, Supabase ni servicios de pago.

## C01 · Baseline

- `docs/release/BASELINE.json`: repositorio, SHA documental, SHA del padre
  (`54b8d5407a8576459448c4d059a877297d18ca7a`), toolchain y comandos.
- El SHA documental original no se reescribe: el scaffolding se añade encima y
  se identifica por el commit de implementación.

## C03 · Supabase JWT y principal

`src/api/auth.ts`, `src/config.ts`, `tests/api/auth.test.ts`.

Probado: firma RS256 con JWKS, issuer/audience, expiración, rechazo de HS256,
membership provisionada, claim de tenant contrastado con membership, selección
explícita con múltiples membresías, `user_metadata` ignorado, membresía
suspendida rechazada.

## C04 · Twins y nomenclatura canónica

`src/core/policy.ts` (`canonicalAgentRefSchema`, `twinBindingSchema`),
`tests/core/policy.test.ts`.

Probado: mandato con `targetTenantId`, purpose, capabilities, expiry,
revocationVersion, presupuesto agotado y tenant distinto. El twin referencia
`runtimeId` del padre; no se crea catálogo local de agentes.

## C05 · DTOs, esquemas y errores

`src/domain/*`, `src/domain/validate.ts`, `tests/domain/*`.

Probado: envelope estricto (campos extra rechazados), tenant/actor del body
deben coincidir con el principal, capacidades nominadas, material secreto
rechazado con rutas, dinero decimal y errores con código HTTP.

## C09 · Intake y encargo

`src/services/matter-service.ts`, `src/api/app.ts`, `tests/api/app.test.ts`,
`tests/e2e/vertical.test.ts`.

Probado: alta en `intake` si el ámbito está incompleto, `scope_pending` si está
completo, versionado optimista, transición ilegal bloqueada con motivos, matter
de otro tenant = 404.

## C20/C21 · Citas

`src/core/citation.ts`, `tests/core/citation.test.ts`.

Probado: `verified` solo con autoridad + fragmento + vigencia + jurisdicción;
`unsupported` para tipos no soportados; `not_found` sin invención; autoridad de
otra jurisdicción `not_applicable`; snapshot ausente y consolidación pendiente
quedan `needs_review`.

## C25 · Redline

`src/core/redline.ts`, `tests/core/redline.test.ts`.

Probado: hash de base obligatorio, `VERSION_CHANGED`, `EDIT_PRECONDITION_FAILED`,
inserciones/borrados, diff semántico y original intacto tras la operación.

## C28 · Plazos

`src/core/deadline.ts`, `tests/core/deadline.test.ts`.

Probado: regla versionada, trigger con prueba obligatoria, territorio del
calendario, días hábiles con fines de semana y festivos, bloqueo si el trigger es
posterior al `asOf`, recálculo al cambiar el trigger, revisión obligatoria.

## C40 · Vertical E2E

`tests/e2e/vertical.test.ts`.

Flujo ejecutado: intake → scope → conflicto → hechos/investigación → cita
verificada → redline → plazo → borrador → revisión competente → entrega →
informe → intent aprobado y confirmado → replay idempotente → aislamiento A/B →
audit por tenant.

## Persistencia y aislamiento

- `src/persistence/memory.ts`: claves `(tenantId, id)`, CAS por versión,
  `NOT_FOUND` para registros de otro tenant.
- `db/migrations/0001_init.sql` y `0002_rls.sql`: ejecutados en PGlite dentro de
  `tests/persistence/rls.test.ts` (8 tests). Comprueban que sin `auth.uid()` no
  hay filas, que un tenant no ve las de otro, que el `WITH CHECK` impide escribir
  para otro tenant, que sin membership no hay acceso, que un FK compuesto impide
  referencias cruzadas, que la unicidad de idempotencia se respeta y que
  `audit_events` es append-only para `app_user`.
- Un Postgres/Supabase real sigue `NOT_VERIFIED`: PGlite no acredita el
  despliegue ni el rol `BYPASSRLS` de producción.

## Servicios de dominio añadidos (2026-11-15)

Probados en `tests/services/*` y `tests/tools/*`: custodia documental con
revisiones e integridad, corroboración/contradicción de hechos, cronología y
trigger de plazo, privilegio y shares con caducidad, revisión independiente de
conflictos, competencia territorial sin simplificar, revisión competente
firmada, legal hold con liberación por otro actor, reservas de presupuesto
idempotentes, DSAR con representación, memo/borrador/playbook/riesgo/obligación
con bloqueo por falta de fuente o firma, archivo/restauración sin resucitar
datos ni permisos, catálogo cerrado de tools y SDK con allowlist de rutas.

## Segunda tanda: las 42 campañas con contrato

Añadidos y probados: extracción OCR con revisión obligatoria y hash verificado
(C13), import de contratos con validación de párrafos e idempotencia (C14),
entrevistas evidenciadas (C15), registro de competencia (C18), ingesta de fuentes
con allowlist HTTPS (C19), seguimiento normativo idempotente que nunca aplica el
cambio (C29), acuerdos y work orders con subconjunto de capacidades/presupuesto
(C02), ciclo de conexiones con `secretRef` (C08), partes y representación
confirmada por otro actor (C10), handoff empresarial acotado (C37), backend de
portal y presencia Anam (C34), propuesta de presentación con firma verificada
(C31), uso/coste de modelos por referencia (C38), manifiesto de backup
verificable (C41), render determinista de informes (C33) y expiración programada
de holds (C32).

Los proveedores externos y la UI están en stubs que fallan cerrados; el detalle
de qué falta para sustituirlos está en [STUBS.md](STUBS.md).

## Qué NO demuestra esta evidencia

- Que un proveedor externo funcione: solo hay `ScriptedProvider` de test y un
  `NotConfiguredProvider` que deshabilita efectos.
- Que las migraciones SQL funcionen en un Postgres real: solo se ejecutaron en
  PGlite.
- Que exista UI, portal, Anam, OCR, firma o presentación: no se implementaron.
- Que haya aceptación del owner: es una entrega técnica, no una aceptación.
