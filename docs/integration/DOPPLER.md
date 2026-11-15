# Integración con Doppler

Estado: **propuesta operativa**, no configurada. Ningún secreto se ha escrito en
el repositorio ni en este documento.

## Variables

| Nombre | Tipo | Obligatoria | Contenido |
|---|---|---|---|
| `PORT` | público | no (3000) | Puerto HTTP del servicio |
| `LEGAL_JWKS_URL` | público | sí para auth | JWKS del proyecto Supabase autorizado |
| `LEGAL_ISSUER` | público | sí para auth | Issuer exacto (`https://<ref>.supabase.co/auth/v1`) |
| `LEGAL_AUDIENCE` | público | sí para auth | Audience (`authenticated`) |
| `LEGAL_MEMBERSHIPS` | sensible-operativo | sí para auth | JSON de membresías provisionadas (userId, tenantId, roles, status) |

Sin `LEGAL_JWKS_URL`/`LEGAL_ISSUER`/`LEGAL_AUDIENCE`, el servicio arranca en modo
`auth: NOT_CONFIGURED` y **todas** las rutas autenticadas responden 401. No hay
bypass de desarrollo.

Variables futuras (aún no usadas por el código):

| Nombre | Uso | Estado |
|---|---|---|
| `DATABASE_URL` | Postgres/Supabase del servicio | Pendiente C06 |
| `LEGAL_MODEL_API_KEY` | gateway de modelos | Pendiente C38, nunca en cliente |
| `LEGAL_PROVIDER_<NAME>_KEY` | proveedor de efectos | Pendiente, solo `secretRef` en servidor |

## Entornos y ámbitos

- `dev`: proyecto Supabase de desarrollo, membresías sintéticas.
- `preview`: proyecto aislado con datos sintéticos, provider `not_configured`.
- `production`: solo tras aceptación explícita del owner y gates C06/C41.

## Rotación

1. **JWKS**: Supabase rota claves; el servicio usa `createRemoteJWKSet` con caché
   acotada. No se comparte el secreto de firma.
2. **Membresías**: cambios de rol/estado deben invalidar la caché del
   provisioning. Hoy `StaticMembershipProvisioning` es estático: un cambio exige
   reinicio. Deuda registrada en `docs/implementation/RISKS.md`.
3. **Claves de proveedor**: se guardan como `secretRef` de servidor; nunca se
   aceptan desde el modelo, la UI o el payload de dominio.

## Arranque seguro

```bash
# Doppler inyecta las variables; no se versionan
doppler run -- npm start
```

El arranque registra únicamente: puerto, estado de auth (`jurisdiction-verified`
o `NOT_CONFIGURED`) y estado del proveedor. No imprime tokens, claims ni
membresías.

## Pendiente antes de producción

- Sustituir `LEGAL_MEMBERSHIPS` por consulta a la tabla provisionada.
- Añadir `DATABASE_URL` cuando exista adaptador Postgres.
- Definir política de retención de logs y acceso a Doppler por rol.
