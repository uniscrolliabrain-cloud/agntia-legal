# Evaluación, fixtures y evidencia

Plan pendiente de implementación. Evaluar sistema completo: lenguaje, herramientas, trayectoria, datos/estado protegido, cálculos, revisión y efecto confirmado. Juez LLM ayuda con tono/semántica, pero no reemplaza assertions deterministas de acceso, cantidades, orden, permisos o outcome. No benchmarks reproducidos ni scores propios.

## Fixtures originales

Dos tenantsA/B y operadorP, owner/revisor/colaborador y agentes canónicos/twins con mandatos distintos. Nombres/dominios/archivos parecidos, usuario multiempresa, datos faltantes/stale/contradictorios, representación insuficiente y scope revocado. Dominios.example y backends/sinks aislados. Nunca datos reales, credenciales/demo ajenas o material sin licencia para forzar pruebas.

Vertical de dominio: Intake sintético → scope/conflict → documentos → hechos/citas → norma por territorio/fecha → borrador/redline → revisión humana competente → entrega sandbox y reporte con limitaciones; filing no ejecutado.

Contrato del resultado: CitationVerifier separa resolver fuente/identidad, fragmento, fecha de vigencia y pertinencia; existencia no implica conclusión. DeadlineProposal necesita regla versionada, evento inicial probado, calendario/territorio/inhábiles y revisión, sin fecha inferida por chat. Redline conserva original/versión/operaciones y diff semántico revisable; no modificar original ni ocultar cambios.

## Pruebas funcionales específicas previstas

| Módulo | Escenario observable |
|---|---|
| Intake y encargo | Encargo ambiguo queda scope_pending |
| Conflictos y partes | Posible conflicto bloquea acceso/ampliación hasta revisión |
| Confidencialidad de materia | Colaborador del tenant no ve asunto restringido |
| Custodia documental | Documento alterado conserva dos versiones y cadena de custodia |
| OCR y extracción | Número de cláusula/importe mal leído se marca y no fundamenta conclusión |
| OpenContracts adaptador | DocumentoB en corpus compartido no aparece en retrievalA |
| Docassemble entrevistas | Respuesta sensible no se copia a otro expediente |
| Hechos y alegaciones | Hechos contradictorios no se resuelven por último prompt |
| Cronología y evidencia | Evento sin prueba no inicia plazo confirmado |
| Territorio y derecho aplicable | Derecho autonómico/foral o europeo pendiente bloquea simplificación |
| Fuentes BOE y EUR-Lex | Norma modificada crea stale y tarea de revisión |
| Resolución de citas | ECLI/BOE no soportado devuelve unsupported en vez de valid |
| Pertinencia y vigencia | Sentencia de otra jurisdicción no acredita regla local |
| Investigación y memo | Falta una autoridad clave y memo queda needs_review |
| Playbooks contractuales | Cláusula fuera de ámbito se propone como excepción |
| Generación de borradores | Campo obligatorio sin evidencia queda vacío/bloqueado |
| Redline y negociación propuesta | Cambio concurrente del original invalida el diff aprobado |
| Riesgos y excepciones | Riesgo sin fuente queda señal, no dictamen |
| Obligaciones y responsables | Contrato no firmado no se trata como obligación vigente |
| Calendario de plazos | Cambio de fecha inicial obliga recalcular/revisar |
| Seguimiento normativo | Afectados reciben revisión propuesta, no consejo universal |
| Revisión competente | Autorrevisión del twin no habilita entrega como dictamen |
| Firma y presentación propuestas | Approval de borrador no vale como autorización de presentar |
| Retención y legal hold | Export limita terceros y restore reaplica restricciones |

## E2E y fallos

A: intake→dato→propuesta→preview→approval→sink/artefacto→receipt→reporte, con fuente/actor/mandato recuperables. B: principalA intenta recursos/jobs/search/files/exports deB y colaborador intenta recurso privado de su tenant:0 fugas. C: cambia fuente/policy/representación/importe después de aprobar: invalidación/conﬂicto. D: aceptación remota seguida de timeout/crash antes del ACK: un efecto o incertidumbre bloqueada. E: revocación/suspensión durante cola/Anam: nada de permisos residuales. F: handoff sin ACK o toma humana concurrente: no actividad ficticia/doble respuesta. G: restore/reindexación después de retirada/restricción: no resurrección o replay de efecto. H: portal externo vs contrato integrado: misma policy; fake host no es conexión instalada. I: dato/opción avanzada no aptos: abstención/block útil sin falsa autoridad.

## Métricas y gates

Citas existen/son pertinentes/vigentes por separado; cobertura de cuestiones y hechos, pendientes y contradicciones. Un score LLM o citas válidas no prueban conclusión jurídica correcta. Reportar resultados por idioma/rol/backend/versión y cobertura, no agregado que oculta fallos de un tenant. ES/EN/FR se prueban realmente; no extrapolar del UI o de papers en otro idioma. Varias seeds y escenarios inéditos reducen ajuste al test. Copiar un benchmark o usar judge de otro modelo no elimina sesgos/contaminación.

Criterios críticos:0 fuga tenant/recurso,0 secretos centinela,0 aprobación/competencia fabricada,0 duplicado replay y0 efecto sensible fuera de alcance. Incumplimiento detiene. Un texto final correcto con acción intermedia prohibida falla. Riesgo de dominio explícito: Una cita falsa/inaplicable o plazo inventado se entrega como dictamen definitivo o desencadena presentación.

Registrar tests ejecutados/pasados/fallidos/skipped, versión/entorno/duración y artefactos sanitizados. Mock PASS no prueba despliegue real ni licencia/edición/ACL. Si falta Docker/red/permiso, integración NOT_VERIFIED y capacidad disabled. Medir latencia/coste bajo carga definida, sin porcentajes de cobertura o eficiencia inventados. La única verificación actual es documental.
