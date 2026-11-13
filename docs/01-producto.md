# Producto, capacidades y límites

## Resultado para el cliente

Preparar investigación, contratos y expedientes con hechos, citas verificables, vigencia y revisión competente, sin presentar un borrador LLM como actuación profesional realizada. El cliente contrata una especialidad con entregables revisables, no una simulación de personas trabajando. El avatar explica datos, fuentes, límites y bloqueos; el owner puede editar propuestas y aprobar el resultado concreto. Humanos y agentes generalistas usan el mismo servicio bajo permisos. Un cliente externo tiene portal propio y Supabase; no debe entrar en AgntiaPro o paneles ERP/LMS/CRM para obtener valor.

| Pilar | Valor previsto | Prueba exigida |
|---|---|---|
| Intake, conflictos y ámbito de encargo | Trabajo específico con datos/objetivos del encargo | Fuentes, revisión, ACL, versión y receipt/artefacto verificables |
| Documentos, hechos y evidencia con custodia | Trabajo específico con datos/objetivos del encargo | Fuentes, revisión, ACL, versión y receipt/artefacto verificables |
| Investigación jurídica por territorio/fecha | Trabajo específico con datos/objetivos del encargo | Fuentes, revisión, ACL, versión y receipt/artefacto verificables |
| Contratos, redline y playbooks revisados | Trabajo específico con datos/objetivos del encargo | Fuentes, revisión, ACL, versión y receipt/artefacto verificables |
| Obligaciones, calendario y seguimiento regulatorio | Trabajo específico con datos/objetivos del encargo | Fuentes, revisión, ACL, versión y receipt/artefacto verificables |
| Informes, escalado y aprobación profesional | Trabajo específico con datos/objetivos del encargo | Fuentes, revisión, ACL, versión y receipt/artefacto verificables |

Estas capacidades son diseño, no features implementadas. Las 24 fases de dominio detallan objetos, invariantes y escenarios; se complementan con ocho fundaciones y diez fases de exposición/seguridad/operaciones hasta completar42. No instalar todos los backends para aparentar cobertura. Elegir un camino P0 funcional, conservar capacidades opcionales deshabilitadas hasta prueba real.

## Actores y datos

Organización operadora emplea al agente canónico del padre; tenant representa empresa cliente del SaaS; proyectos/materias/cohortes/cuentas son recursos internos; personas registradas en datos no se convierten en usuarios autorizados por importarlas. Usuario válido no ve todo el tenant: ACL por recurso/campo, representación y propósito cuando corresponde. Un mismo humano puede trabajar en varios tenants y debe seleccionar ámbito verificado explícitamente.

Entidades propuestas: `LegalMatter EngagementScope ConflictCheck DocumentVersion EvidenceRef FactAssertion Jurisdiction LawSnapshot CitationVerification LegalIssue ClausePlaybook ContractRevision Redline Obligation DeadlineProposal ReviewOpinion FilingProposal RetentionHold`. Sus IDs son del servicio salvo mapeo nativo declarado. El original y su custodio conservan integridad; BOE/EUR-Lex/otros repos oficiales aportan fuentes por versión; el profesional revisa aplicabilidad y conclusión, no el modelo solo. La fuente remota y el snapshot local tienen autoridad/frescura distintas. El modelo no rellena campos desconocidos para completar una pantalla; faltan datos significa pending/blocked, no falso éxito.

## Vertical inicial

Intake sintético → scope/conflict → documentos → hechos/citas → norma por territorio/fecha → borrador/redline → revisión humana competente → entrega sandbox y reporte con limitaciones; filing no ejecutado.

Usar empresas/personas/documentos sintéticos y sink/entorno de prueba, con dos tenants y operador separado. Un borrador no es acto externo ni una certificación. Cualquier conector que falte se indica NOT_VERIFIED, sin presentar mock como instalación real. El piloto puede entregar conocimiento y propuesta útil aunque un efecto sensible quede deliberadamente fuera.

## Límites de efecto

Sin presentar escritos, firmar/negociar vinculantemente, representar ante tribunales/administraciones o atribuirse secreto profesional/condición de abogado por ser SaaS. Territorio y fecha siempre explícitos; revisión profesional cuando la actuación lo requiere.

Una cita real puede ser inaplicable, derogada o de otra jurisdicción; documento recibido puede violar confidencialidad o contener instrucciones adversariales. Las revisiones son actos humanos verificables ligados al payload y versión. No las fabrica un nombre de agente, un sí hablado o un campo approved=true. La aceptación comercial del servicio, el acceso a datos, la revisión editorial y la autorización de efecto son hechos distintos.

## Cooperación y evolución

Se admite duplicación funcional entre los nueve SaaS y el padre. ServiceAgreement/WorkOrder fija alcance, responsable y sistema ejecutor por efecto. Un módulo local acotado puede cubrir una función sin contratar un hermano, pero no inventa autorización profesional, saldo, dictamen o evidencia. Integrar no significa compartir todos los datos: contratos mínimos, propósito, ACK y trazabilidad.

La expansión exige nuevos permisos, pruebas y contratos cuando se habiliten datos reales, proveedores pagados o funciones reguladas. La campaña no garantiza paridad con líderes, precisión universal o disponibilidad jurídica de cada función. Producto completo significa capacidades verificadas en ámbito concreto con operación/recuperación y límites visibles, no una lista de logos.
