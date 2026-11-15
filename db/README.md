# Persistencia SQL

`db/migrations/0001_init.sql` define el esquema v1 y `0002_rls.sql` activa RLS,
políticas de aislamiento por tenant y auditoría append-only.

## Estado real

- SQL **escrito y revisado**, pero **NOT_VERIFIED**: no hay Postgres ni Supabase
  en el entorno de entrega, así que no se ha ejecutado ninguna migración.
- El runtime local usa repositorios en memoria (`src/persistence/memory.ts`) que
  implementan el mismo contrato (tenant obligatorio, CAS por versión).
- La verificación de RLS, FKs compuestas, roles y restore es un gate pendiente
  (campaña C06 / C41). No se declara PASS por tener el fichero.

## Cómo aplicarlo en un proyecto aislado

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0001_init.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0002_rls.sql
```

Requisitos: Postgres 15+, esquema `auth` de Supabase (`auth.uid()`) y
`request.jwt.claims` disponible. `service_role`/`BYPASSRLS` omite RLS y no debe
usarse en rutas de petición.

## Pruebas mínimas antes de producción

1. Dos tenants A/B con membresías distintas: ninguna consulta cruzada devuelve
   filas.
2. Usuario suspendido/revocado: cero filas y cero escrituras.
3. Claim con `tenant_id` no provisionado: rechazo explícito, sin fallback.
4. `user_metadata.tenant_id` hostil: no altera el tenant resuelto.
5. Duplicado de `intent` con la misma `(tenant_id, capability, idempotency_key)`:
   violación de unicidad, un solo efecto.
6. `update`/`delete` sobre `audit_events`: error 42501.
7. Restore en entorno aislado: se reaplican restricciones y no se reactivan
   mandatos caducados.
