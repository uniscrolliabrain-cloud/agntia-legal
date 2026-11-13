# Agntia Engineering Factory — Perfil Legal

**factoryVersion: 0.1.0 | domainProfile: legal | DESIGN/PREP | 2026-11-13**

Meta: dejar diseño conceptual, boilerplate, léxico, contratos y 42 scaffolds al nivel de Marketing, Formación, Branding y Finanzas. **No granularizar campañas ni escribir runtime ahora.** Founder aportará meta-auditoría conceptual libre de Astra; reconciliación antes de profundizar.

## Orden de lectura
`docs/prep/README.md` → `docs/factory/00-README.md` a `06-READINESS-AUDIT.md` → originales de producto/arquitectura/contratos/seguridad/research → `docs/campaigns/campaign.json` y documento original → `docs/implementation/NN-*/README.md` → handoffs marco y N−1/N/N+1.

## Invariantes
Padre `agente` posee kernel, grafo, bus, identidades, agentes canónicos, policy, SOP y aprobaciones. Servicio Legal ofrece capacidades delegadas con twins vinculados; duplicación de conocimiento/funciones permitida, **efecto externo único**. Multi-tenant, ACL por matter/campo/propósito, deny-by-default, datos mínimos, trazabilidad causal, approvals, outbox e idempotencia. LLM propone; sistema autoriza; profesional cualificado revisa donde corresponda. Ningún contrato, filing, representación, notificación oficial o firma vinculante por simple salida del modelo.

## Estado de evidencia
`DOC_ONLY`, `PROPOSED`, `CODE_VERIFIED`, `TEST_VERIFIED`, `STALE`, `UNKNOWN`. Documentación no acredita producto ni cumplimiento. No cambiar padre/main, no conectar proveedores, no desplegar. Factory versionada con especialización Legal.
