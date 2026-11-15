# Informe de implementación · agntia-legal

2026-11-15. Entrega de scaffolding sobre el repositorio documental
`uniscrolliabrain-cloud/agntia-legal`. Rama de trabajo:
`freebuff/246885423361cb65a9dade52`. Sin push, sin merge a `main`, sin
despliegue.

## 1. Estado inicial

- Repo con 2 commits y 69 ficheros: solo documentación (42 campañas
  `NOT_STARTED`, 294 tareas, 84 gates `NOT_EXECUTED`).
- Sin `package.json`, sin código, sin tests, sin CI.
- SHA documental base: `b448d7c`; padre observado
  `54b8d5407a8576459448c4d059a877297d18ca7a`.
- Toolchain del entorno: Node 26.13.0, npm 11.20.0. Sin pnpm/corepack.

## 2. Campañas trabajadas

Implementadas y probadas (16): C01, C03, C04, C05, C09, C11, C12, C16, C17,
C20, C21, C25, C28, C30, C35, C40. Parciales (24): C02, C06, C07, C08, C10, C13,
C15, C18, C19, C22, C23, C24, C26, C27, C29, C31, C32, C33, C36, C37, C38, C39,
C41, C42. Stubs con frontera y fallo cerrado (2): C14 (OpenContracts) y C34
(portal/Anam). Sin empezar: ninguna. Detalle en [la matriz](../implementation/README.md)
y en [STUBS.md](../implementation/STUBS.md).

## 3. Código reutilizado y nuevo

- Reutilizado: **ninguno**, el repositorio no contenía código. Se conservaron
  íntegros todos los documentos, campañas y fuentes existentes.
- Nuevo: servicio TypeScript strict con Hono, zod, jose; dominio determinista;
  repos en memoria; SQL de persistencia; adaptadores de capacidad y egress;
  puente de eventos; outbox; API; tests; CI.

## 4. Ficheros y módulos

```
src/domain/      entidades, estados, envelope, evidencia, approvals, errores
src/core/        policy/PDP, mandatos, citas, plazos, redline, intents, hash
src/api/         auth JWT Supabase, app Hono, errores
src/persistence/ repos en memoria, audit append-only
src/services/    matters, approvals, reportes, documentos, hechos, cronología,
                 acceso/privilegio, jurisdicción, revisión, retención, presupuesto,
                 privacidad, memo/borrador/playbook/riesgo/obligación, export/restore,
                 extracción, contratos externos, entrevistas, seguimiento, fuentes,
                 acuerdos, conexiones, partes, handoff, portal, presentación, uso
src/tools/       catálogo cerrado de 7 tools
src/sdk/         cliente TypeScript con allowlist de rutas
src/adapters/    capability, egress SSRF, provider, sources, external (puertos+stubs)
src/workers/     outbox
src/bridge/      mapeo a SystemEvent 1.0
src/ops/         manifiesto de backup verificable
db/migrations/   0001_init.sql, 0002_rls.sql
tests/           26 ficheros, 221 tests
docs/implementation, docs/integration, docs/release
```

## 5. Tests y resultados verificables

```
npx tsc --noEmit   → 0 errores
npx vitest run     → 221 passed / 221 (26 ficheros)
npm run build      → OK
```

`tests/persistence/rls.test.ts` ejecuta las migraciones en PGlite (8 tests).
Inventario en [TESTS.md](../implementation/TESTS.md). Cero tests contra
proveedores, Supabase, un Postgres real o UI.

## 6. Gates superados y pendientes

Superados localmente: DTOs estrictos, envelope, JWT, aislamiento por tenant en
repos y API, approvals ligadas a hash, idempotencia y reconciliación, citas,
plazos, redline, SSRF, capability gating, outbox con ACK, custodia documental,
hechos, cronología, conflictos, privilegio, competencia territorial, retención,
presupuesto, privacidad, salidas propuestas (memo/borrador/playbook/riesgo/
obligación), archivo/restauración, catálogo cerrado de tools, SDK con allowlist,
extracción, entrevistas, seguimiento, acuerdos, conexiones, partes, handoff,
propuesta de presentación, uso/coste de modelos, manifiesto de backup y E2E A/B.
Las migraciones se ejecutaron en PGlite.

Pendientes/`NOT_VERIFIED`: migraciones y RLS en un Postgres real, backup/restore
real, proveedores reales (OCR, OpenContracts, Docassemble, BOE/EUR-Lex, Anam,
firma, modelos), UI de portal, métricas, rate limiting por ruta y publicación del
SDK en npm. Los stubs y su trabajo restante están en
[STUBS.md](../implementation/STUBS.md).

## 7. Integraciones reales y simuladas

- Simuladas explícitamente: `ScriptedProvider` (solo tests) y
  `NotConfiguredProvider` (por defecto, deshabilita efectos).
- Reales: ninguna. No se contactó Supabase, BOE, EUR-Lex, Anam ni ningún
  proveedor.

## 8. Riesgos y deuda técnica

Ver [RISKS.md](../implementation/RISKS.md). Los tres críticos: persistencia solo
en memoria, RLS ejecutada únicamente en PGlite (no en Postgres real) y ausencia
de proveedor real.

## 9. Doppler

Variables y rotación en [DOPPLER.md](../integration/DOPPLER.md). Sin
`LEGAL_JWKS_URL`/`LEGAL_ISSUER`/`LEGAL_AUDIENCE` el servicio responde 401 en
todas las rutas autenticadas; no hay bypass.

## 10. Propuesta de integración con el padre

[PARENT-BRIDGE.md](../integration/PARENT-BRIDGE.md): puertos de identidad,
mandato, approvals, budget, tareas y eventos; catálogo cerrado de 7 tools; sin
cambios en `agente`.

## 10 bis. Stubs y trabajo restante

Cada frontera no implementada (Postgres, OCR, OpenContracts, Docassemble,
fuentes, firma, Anam, modelos, backup) está en
[STUBS.md](../implementation/STUBS.md) con su comportamiento de fallo cerrado y la
verificación necesaria para sustituirla. Ningún stub simula éxito.

## 11. CI y PR

`.github/workflows/ci.yml` ejecuta `npm ci`, typecheck, tests y build. No se ha
abierto PR ni se ha hecho push; los cambios viven en el árbol/rama de trabajo.

## 12. Siguiente paso recomendado

1. Adaptador Postgres real + ejecutar migraciones en proyecto aislado y probar
   RLS con dos tenants y un rol sin BYPASSRLS (C06).
2. Proveedor de efectos con `CapabilityReport` verificado y receipts (C08/C31).
3. Ingesta y snapshots de BOE/EUR-Lex con versionado (C19).
4. UI mínima de revisión/aprobación (C33/C34).
5. Solo después: wiring en el padre con autorización separada.

## Guía de auditoría para Codex Cloud

1. `npm ci && npm run typecheck && npm test && npm run build`.
2. Leer `docs/implementation/README.md` y contrastar cada `IMPLEMENTED` con su
   test citado.
3. Verificar que ningún test usa red, Postgres o credenciales.
4. Comprobar que `NotConfiguredProvider` es el proveedor por defecto y que un
   efecto sin approval devuelve 409/424.
5. Revisar que ningún payload de audit/evento contiene tokens, PII o contenido.
6. Ejecutar las migraciones SQL en un Postgres desechable y reportar
   `NOT_VERIFIED` si no es posible.
7. No aceptar este informe como aceptación de producto: solo acredita lo
   ejecutado y listado aquí.
