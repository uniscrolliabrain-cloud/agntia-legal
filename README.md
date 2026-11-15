# agntia-legal

Operaciones jurídicas, contratos y cumplimiento: diseño de empresa SaaS especialista con middleware hacia AgntiaPro/`agente`. Entrega documental de la familia Agntia · 2026-11-13.

**DOCUMENTACION + IMPLEMENTACION LOCAL. La entrega original era documental; el 2026-11-15 el servicio TypeScript/Hono tiene 221 tests ejecutados en verde y un contrato en código para las 42 campañas (16 IMPLEMENTED, 24 PARTIAL, 2 STUBBED, 0 NOT_STARTED). No hay proveedores conectados, ni Supabase/Postgres validados, ni UI: RLS solo en PGlite, backups y efectos externos siguen NOT_VERIFIED. Estado real por campaña: [docs/implementation/README.md](docs/implementation/README.md); fronteras pendientes: [STUBS.md](docs/implementation/STUBS.md).** Aspiración de calidad inspirada en referentes mundiales; no afirmación de paridad, certificación o cumplimiento universal.

Preparar investigación, contratos y expedientes con hechos, citas verificables, vigencia y revisión competente, sin presentar un borrador LLM como actuación profesional realizada.

Se presta servicio a empresas del padre y a clientes externos mediante portal propio. Agentes canónicos en `/agente`, twins vinculados aquí; todos los modos con JWT Supabase, membresía/ACL verificados y aislamiento de datos/jobs/archivos/búsqueda/Realtime/exportaciones. Se permite duplicación de funciones con repos hermanos; un AuthorityMap por encargo fija responsables para evitar doble efecto. **No se modifica agente.**

## Ejecutar

```bash
npm ci
npm run typecheck && npm test && npm run build
```

Sin `LEGAL_JWKS_URL`/`LEGAL_ISSUER`/`LEGAL_AUDIENCE` todas las rutas autenticadas responden 401: no existe bypass de desarrollo. Variables y rotacion en [Doppler](docs/integration/DOPPLER.md); ejemplo no sensible en `.env.example`. El proveedor por defecto es `not_configured`, de modo que ningun efecto se simula como exito.

## Leer en orden

1. [Producto y capacidades](docs/01-producto.md), [investigación](docs/02-investigacion.md), [comparación](docs/03-referentes-y-brechas.md), [repos/licencias](docs/04-adaptadores.md).
2. [Arquitectura](docs/architecture/01-arquitectura.md), [Supabase/twins](docs/architecture/02-identidad-twins.md), [padre](docs/architecture/03-compatibilidad-agente.md), [runtime](docs/architecture/04-runtime.md), [contratos](docs/contracts/01-contratos.md).
3. [Seguridad](docs/05-seguridad-privacidad.md), [UX/Anam](docs/06-ux-anam.md), [SaaS/cooperación](docs/07-servicio.md), [coste](docs/08-costes.md), [evaluación](docs/09-evaluacion.md).
4. [42 campañas](docs/campaigns/README.md), [manifest](docs/campaigns/campaign.json), [handoff](docs/release/HANDOFF.md), [informe](docs/release/INFORME-AL-OWNER.md), [aceptación](docs/release/PILOT-ACCEPTANCE.md), [runbook](docs/operations/RUNBOOK.md).
5. Implementacion: [estado por campaña](docs/implementation/README.md), [evidencia](docs/implementation/EVIDENCE.md), [tests](docs/implementation/TESTS.md), [riesgos](docs/implementation/RISKS.md), [informe tecnico](docs/release/IMPLEMENTATION-REPORT.md), [puente con agente](docs/integration/PARENT-BRIDGE.md).

Vertical propuesta: Intake sintético → scope/conflict → documentos → hechos/citas → norma por territorio/fecha → borrador/redline → revisión humana competente → entrega sandbox y reporte con limitaciones; filing no ejecutado.

Límite inicial: Sin presentar escritos, firmar/negociar vinculantemente, representar ante tribunales/administraciones o atribuirse secreto profesional/condición de abogado por ser SaaS. Territorio y fecha siempre explícitos; revisión profesional cuando la actuación lo requiere.

Fuentes primarias y repos por SHA: [sources](docs/research/sources.json), [repos](docs/research/repositories.json), [mapa padre](docs/research/parent-source-map.json). [Validación](docs/release/document-validation.json) comprueba documentos, no acredita producto. SHA del padre cotejado: `54b8d5407a8576459448c4d059a877297d18ca7a`.
