# Aceptación del piloto · pendiente

Todos los puntos **NOT_EXECUTED**; este diseño no acredita producto o aceptación del owner.

| Gate | Evidencia mínima |
|---|---|
| Baseline | SHAs/instrucciones/fuentes/licencias y diferencias |
| Identidad/twin | Supabase JWT, membership/ACL, mandato canónico, scope y revocación |
| Persistencia | FK/RLS/roles reales, CAS/audit/outbox, restore |
| Datos | Fuentes, originales, hash/revisión, missing/stale/conflict explícitos |
| Dominio | Resultado y estado protegido conforme invariantes de cada módulo |
| Revisión | Humano/competencia/representación cuando aplique, approval exacta y vigente |
| Efecto | Intent/key/payloadHash/emisor único, receipt o incertidumbre visible |
| Seguridad | Dos tenants y recursos internos, secretos, prompt injection, SSRF |
| UI/AV | Responsive, accesibilidad/ES-EN-FR, Anam scoped o fallback texto |
| Operación | Backup/restore/rotación/retención/runbooks/costes medidos |
| Integración | Contratos API-SDK-host, fake separado de runtime real, padre intacto |

Vertical: Intake sintético → scope/conflict → documentos → hechos/citas → norma por territorio/fecha → borrador/redline → revisión humana competente → entrega sandbox y reporte con limitaciones; filing no ejecutado.

Límite: Sin presentar escritos, firmar/negociar vinculantemente, representar ante tribunales/administraciones o atribuirse secreto profesional/condición de abogado por ser SaaS. Territorio y fecha siempre explícitos; revisión profesional cuando la actuación lo requiere. Criterio particular: CitationVerifier separa resolver fuente/identidad, fragmento, fecha de vigencia y pertinencia; existencia no implica conclusión. DeadlineProposal necesita regla versionada, evento inicial probado, calendario/territorio/inhábiles y revisión, sin fecha inferida por chat. Redline conserva original/versión/operaciones y diff semántico revisable; no modificar original ni ocultar cambios.

Ejecutar E2E A–I y escenarios de [evaluación](../09-evaluacion.md).0 fuga tenant/recurso,0 secretos centinela,0 approvals/competencia fabricadas,0 duplicado replay y0 efecto fuera de alcance. Un crítico fallido bloquea. p50/p95/coste/calidad/cobertura se miden con entorno/workload/versión; no objetivos ya alcanzados ficticios.

Capacidad opcional sin proveedor/licencia/permiso queda disabled y NOT_VERIFIED; no se oferta como soportada. Un mock PASS no acredita la instalación. Datos reales/producción/compras/wiring en padre necesitan otra autorización. El owner debe poder reconstruir un entregable desde fuente y actor hasta revisión/receipt y entender qué sigue pendiente.
