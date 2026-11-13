# Pipeline — preparación, meta-auditoría y futura ejecución

**Actual:** ChatGPT (arquitectura) + founder (decisión) crean PREP y boilerplate. **Después:** Astra audita libremente conceptos, diseño, mercado y arquitectura, sin imponerle rubric ni exigir código inexistente. **Después:** reconciliación del founder y arquitecto. **Más adelante:** campañas ultr granulares, Freebuff implementa, Codex revisa SHA congelado, arquitecto arbitra, founder autoriza.

## Estados
`PREP → META_AUDIT_PENDING → META_AUDIT_REVIEWED → ARCHITECTURE_RECONCILED → CAMPAIGNS_GRANULARIZED → READY_PER_CAMPAIGN → IMPLEMENTING → REVIEWING → ARCH_REVIEW → FOUNDER_APPROVAL → MERGED`. No fabricar informes Astra ni declarar tests.

## Reglas futuras
Una rama por campaña, writer exclusivo por superficie, dependencias versionadas. Freebuff entrega patchsets y evidencias; Codex no modifica su rama, prueba de forma independiente; arquitecto reconcilia identidad/autoridad/eventos; founder aprueba merge, accesos, gastos y deploy. Los handoffs generales están en `docs/factory/`; los específicos por campaña se crearán solo tras la meta-auditoría y granularización.
