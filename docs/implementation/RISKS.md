# Riesgos y deuda técnica

| Sev. | Riesgo | Estado actual | Mitigación necesaria |
|---|---|---|---|
| Alta | Persistencia solo en memoria | Repos en proceso; se pierde al reiniciar | Adaptador Postgres + migraciones ejecutadas + RLS probada (C06) |
| Alta | RLS ejecutada solo en PGlite | `0001/0002` pasan 8 tests en PGlite; Postgres real `NOT_VERIFIED` | Proyecto aislado, tests A/B, rol real sin BYPASSRLS, restore |
| Alta | Ningún proveedor real | `NotConfiguredProvider` deshabilita efectos | `CapabilityReport` verificado + contrato + receipt de proveedor |
| Alta | Sin UI/portal | Solo API | C34, revisión de accesibilidad y flujos de aprobación |
| Alta | Sin OCR ni almacenamiento real de ficheros | Custodia/versiones en memoria; `storageRef` es una referencia, no un bucket gestionado | C13 con antivirus, MIME, límites y almacenamiento con cifrado |
| Media | Membership desde configuración estática | `LEGAL_MEMBERSHIPS` | Consulta a tabla provisionada + invalidación de caché |
| Media | Sin rate limiting por ruta | Solo límite de tamaño de body | Límites por principal/capacidad y presupuesto |
| Media | Sin métricas/trazas | Logs mínimos sanitizados | OpenTelemetry + alertas de lag/unknown/coste |
| Media | Auditoría en memoria | `AuditLog` con capacidad | Tabla append-only + export a almacenamiento inmutable |
| Media | Sin cifrado de backups ni restore probado | No implementado | C41 con claves separadas y prueba real |
| Media | Firma/presentación deshabilitadas | `filingProposal` sin ejecución | Gate de representación, approval y proveedor autorizado |
| Baja | Cambio de hora/clock skew | `clockTolerance` 5s en JWT; fechas UTC | NTP y pruebas de límites |
| Baja | Cliente SDK sin publicar | `src/sdk/client.ts` con allowlist y 7 tools; no está en npm | Publicación versionada y ejemplos de integración |
| Baja | Sin i18n de mensajes de error | Mensajes en inglés | Catálogo ES/EN/FR con revisión |

## Decisiones tomadas y su motivo

- **npm en lugar de pnpm**: el entorno no trae corepack/pnpm. Se documenta la
  desviación del diseño original; el lockfile queda fijado.
- **Zod + TypeScript estricto**: validación runtime de DTOs y rechazo de campos
  extra, como exige el contrato v1.
- **jose**: verificación JWKS/RS256/ES256 sin secretos compartidos.
- **Repos en memoria con CAS**: permiten probar invariantes de tenancy y
  concurrencia sin base de datos, sin declarar la persistencia resuelta.
- **Proveedor por defecto `not_configured`**: un efecto jamás se simula como
  éxito; la capacidad queda deshabilitada con error explícito.
