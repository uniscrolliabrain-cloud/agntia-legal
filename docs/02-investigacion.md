# Investigación y decisiones

Fuentes primarias consultadas selectivamente 2026-11-13; no revisión sistemática ni benchmarks reproducidos. El registro separa abstract/README/documentación/anuncio, acceso fallido y validación de runtime. Revalidar al implementar porque versiones, planes y leyes pueden cambiar.

| Paper | Decisión de diseño (inferencia propia) |
|---|---|
| P01: Legal Research Bench · [arXiv](https://arxiv.org/abs/2610.00609) | All-pass con autoridades verificadas inspira tests; benchmark estadounidense no certifica derecho español. |
| P02: Who Checks the Citations? · [arXiv](https://arxiv.org/abs/2606.21155) | Distinguir existencia, citas sutilmente erróneas y acceso limitado; abstener/escalar si falta fuente. |
| P03: LegalCiteBench · [arXiv](https://arxiv.org/abs/2605.10186) | No confiar en recuperación closed-book ni usar prompts como verificador suficiente de precedentes; alcance US no es España. |

No se trasladan scores, porcentajes, tamaños de muestra o eficacia de los autores a Agntia. Leer un abstract no demuestra replicación de método o licencia de sus datasets. Se diseñarán fixtures originales con datos sintéticos y criterios de estado/efecto/proceso; antes de incorporar harness/datos ajenos revisar licencia, splits, dependencia de modelos y términos.

## Conceptos propuestos

Evidence-to-Effect Ledger une fuente, versión, actor, mandato, propuesta, approval y resultado confirmado. Scope-bound Twin conserva una identidad canónica y especialización local por cliente sin memoria global. Reviewable Decision Contract define hechos, estado protegido, resultado y qué requiere humano/competencia. Son propuestas de ingeniería de esta entrega, no afirmación de novedad científica o patente.

Para Operaciones jurídicas, contratos y cumplimiento, la decisión particular es: CitationVerifier separa resolver fuente/identidad, fragmento, fecha de vigencia y pertinencia; existencia no implica conclusión. DeadlineProposal necesita regla versionada, evento inicial probado, calendario/territorio/inhábiles y revisión, sin fecha inferida por chat. Redline conserva original/versión/operaciones y diff semántico revisable; no modificar original ni ocultar cambios.

## Referentes actuales

| Referencia | Patrón estudiado |
|---|---|
| V01: Harvey | Patrón de intake, fuentes, espacios/materias, contratos y seguimiento; no identidad profesional heredada. |
| V02: CoCounsel Thomson Reuters | Referencia de flujos jurídicos con fuentes/revisión; términos y cobertura territorial por verificar. |
| V03: Lexis Protege | Referencia pendiente: página de producto respondió403; no se habilita API/capacidad por esta mención. |

Las páginas oficiales describen oferta y novedades, no se probaron productos ni cuentas. No adoptar sus claims de cumplimiento, seguridad, productividad o certificaciones como propios. API/plan/edición/territorio y coste son gates de implementación. Fuentes no accesibles se registran, no sustituyen con una afirmación de capacidad. Algunas URLs cambian de ruta o versión: conservar el origen/redirect y no fijar un endpoint por memoria.

## Repos públicos

Se consultaron metadatos, SHA y README de los candidatos de [repositories.json](research/repositories.json). No son una auditoría completa ni se han instalado. Rama main/master/develop/hotfix no es un pin de release. Selección posterior por compatibilidad/licencia/recursos/ACL y evidencia con una instancia aislada. OpenContracts/docassemble MIT según metadatos, con obligaciones y dependencias por revisar. Eyecite BSD-2-Clause analiza citas de contexto US y no valida ECLI español por defecto. LexNLP AGPL y modelos/datasets necesitan revisión. Marker diferencia licencia de código Apache-2.0 y pesos/modelos OpenRAIL-M según README; no declarar OCR comercial gratuito universal.

## Fuentes jurídicas y de seguridad

Supabase JWT/RLS y Anam se estudiaron en documentación oficial; nunca credenciales ni sesiones reales. Normativa común y específica en Dxx requiere interpretación contextual, territorio/fecha y revisión humana. No prometer cumplimiento universal por importar una librería o tener un dashboard. Un uso no cubierto debe quedar unsupported/needs_review.

| Fuente específica | Qué exige al diseño |
|---|---|
| D01: [Estatuto Abogacía](https://www.boe.es/buscar/act.php?id=BOE-A-2021-4568) | Ámbito profesional, responsabilidades y encargo requieren revisión competente, no suplantación por software. |
| D02: [eIDAS](https://eur-lex.europa.eu/eli/reg/2014/910/oj) | Firma y representación según acto/territorio; un proveedor de firma no satisface automáticamente todas formalidades. |

Mantener preguntas abiertas: derechos/ediciones, fuente incompleta, verificación real de proveedor, operación humana y coste medido. El mapa del padre conserva lecturas heredadas y nuevas por el mismo SHA; no supone una relectura total. Cualquier divergencia futura se coteja antes del wiring. Nunca modificar el padre para que una prueba propia pase.
