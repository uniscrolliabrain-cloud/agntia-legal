# Fronteras de autoridad y adaptadores Legal

## Padre
AgntiaPro conserva kernel, identidades, bus, grafo, policy, SOP, memoria y aprobación. Legal opera por delegación verificada, con matter ACL y recursos restringidos. Duplicación de conocimiento aceptada; una sola autoridad por efecto. Agentes especialistas no son abogados humanos ni empleados dedicados de cada tenant.

## Cooperación
- **Gestoría/RRHH:** expedientes laborales, rotas, nóminas, ausencias y gestión administrativa; Legal revisa cláusulas, obligaciones y controversias.
- **Finanzas:** contratos financieros, riesgos y mandatos; no iniciar pagos ni operar banca desde Legal.
- **Branding/Diseño/Vídeo/Marketing/Redes:** propiedad intelectual, licencias, claims, privacidad y contratos; no publicar campañas por revisión jurídica.
- **Ventas/Clientes:** términos comerciales, reclamaciones, protección al consumidor, CRM y contratos; no duplicar envío/aceptación.
- **Seguros:** pólizas, coberturas, reclamaciones y obligaciones, con separación de autoridad.
- **Ciberseguridad:** incidentes, privacidad, compliance y observabilidad; no acceso indiscriminado a expedientes.
- **Formación:** educación de cumplimiento y capacitación, sin confundir material formativo con asesoría.
- **Comunicación futuro:** alcance pendiente, no reservarle funciones sin definición.

## Puertos conceptuales
`LegalSourcePort`, `LegalMatterStorePort`, `DocumentCustodyPort`, `ContractRedlinePort`, `ConflictCheckPort`, `LegalReviewPort`, `RegulatoryWatchPort`, `FilingPort` (**DISABLED** inicialmente), `AuditEvidencePort`. Integraciones potenciales: BOE, EUR-Lex, OpenContracts, docassemble, sistemas documentales/CRM del cliente, APIs/MCP autorizados. No asumir licencia, acceso o legalidad de una fuente por su mera existencia.

## Adapter contract
Provider/capability, tenant+matterBinding, jurisdiction, source/version, scope, ACL, retention, dataResidency, consent/purpose, cost, rateLimit, idempotency, reconciliation, audit, schemaVersion. Nunca compartir documentos completos entre repos por comodidad. Un MCP no salta policy.
