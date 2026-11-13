# Adaptadores y licencias

Todos NOT_IMPLEMENTED/NOT_VERIFIED en runtime. [Repos por SHA](research/repositories.json); lectura de metadatos/README y licencias selectivas, no auditoría completa. No se han clonado/instalado ni usado cuentas demo ajenas. La elección de release/digest estable queda pendiente.

| ID | Repositorio | Licencia metadata | Uso/precaución |
|---|---|---|---|
| R01 | [Open-Source-Legal/OpenContracts](https://github.com/Open-Source-Legal/OpenContracts/tree/2263a19de73d95889a31b07e75bc9948a8cffe1c) | MIT | Candidato de dominio o referencia; capacidades/edición/ACL se verifican por instalación |
| R02 | [jhpyle/docassemble](https://github.com/jhpyle/docassemble/tree/36d7bd4d27324a3cde2ea92ebd5afe074cdcfe2d) | MIT | Candidato de dominio o referencia; capacidades/edición/ACL se verifican por instalación |
| R03 | [freelawproject/eyecite](https://github.com/freelawproject/eyecite/tree/b70a146d20f70b366baf150a1cc9e82229ef5a0d) | BSD-2-Clause | Candidato de dominio o referencia; capacidades/edición/ACL se verifican por instalación |
| R04 | [LexPredict/lexpredict-lexnlp](https://github.com/LexPredict/lexpredict-lexnlp/tree/330b4e113c9bced0cc06f2c864c5015bb5ed2199) | AGPL-3.0 | Candidato de dominio o referencia; capacidades/edición/ACL se verifican por instalación |
| R05 | [datalab-to/marker](https://github.com/datalab-to/marker/tree/f20c54a81bf8b1a8bd12fd954be1aaa4b7015203) | Apache-2.0 | Candidato de dominio o referencia; capacidades/edición/ACL se verifican por instalación |

OpenContracts/docassemble MIT según metadatos, con obligaciones y dependencias por revisar. Eyecite BSD-2-Clause analiza citas de contexto US y no valida ECLI español por defecto. LexNLP AGPL y modelos/datasets necesitan revisión. Marker diferencia licencia de código Apache-2.0 y pesos/modelos OpenRAIL-M según README; no declarar OCR comercial gratuito universal.

La licencia de código no cubre automáticamente pesos/modelos, contenido de cursos, tipografías, plantillas, corpus judiciales, datos actuariales, plugins o servicios cloud. No copiar upstream por comodidad. API/proceso separado es arquitectura recomendada, no excepción jurídica universal. Leer obligaciones de modificación/distribución/servicio en red y compatibilidad antes de incorporar material.

## Registro y discovery

ProviderConnection por tenant/proyecto, endpointRef/secretRef solo servidor, versión/edición y binding remoto. No aceptar URL, base de datos, company/site/course/workspace, token o método libre desde un modelo. Bot mínimo por ámbito, rotación sin perder links y secretos externos. DNS/IP/redirect/tamaño/tiempo/egress protegidos. Public JSON minimizado, no credenciales/nombres internos innecesarios.

CapabilityReport distingue documented, verified_runtime, unknown, unsupported, forbidden y not_configured, con fecha/expiry/evidencia. Un200 con HTML/estructura errónea o empresa equivocada no es healthy. Sin permiso no se cae a admin; no crear registros reales para probar discovery. Unknown deshabilitado y advertencia útil. Cada versión/edición/modulo/rol puede invalidar el report.

## Lectura, staging y sincronización

ExternalLink por tenant/connection/model/externalId/localKind, IDs strings opacos, sourceHash/remoteVersion/mapperVersion. No mapear por nombre o posición. Import preview conserva warnings/campos pendientes/procedencia; aceptación local no fabrica revisión profesional, consentimiento o emisión remota. Repetición idéntica no duplica; cambio legítimo crea nueva revisión/conflicto según AuthorityMap.

Cursores/paginación estables con overlap si hace falta; watermark después de commit local. Barridos detectan archivado/borrado remoto sin destruir historia. Conflicto con dato revisado bloquea overwrite. Dos sistemas que reclaman autoridad por mismo campo/efecto deben acordarlo antes de bidireccionalidad, no last-write-wins silencioso.

## Escritura

Dry-run puro local; preview con diff/alcance/coste y aprobación cuando corresponda. Algunos endpoints llamados test envían o modifican estado: demostrar semántica antes de usarlos. Persistir intent/audit/key/outbox antes de HTTP; cada llamada remota tiene su transacción propia. Si el proveedor acepta y se pierde respuesta, reconciliar por referencia segura; si no existe, bloquear/escalar, no duplicar con otra key/proveedor. No delete/unlink/submit/post/execute genéricos al agente.

El piloto conserva este límite: Sin presentar escritos, firmar/negociar vinculantemente, representar ante tribunales/administraciones o atribuirse secreto profesional/condición de abogado por ser SaaS. Territorio y fecha siempre explícitos; revisión profesional cuando la actuación lo requiere. Un backend faltante queda explícito; un fake útil no se ofrece como conector real. La UI del proveedor puede existir para administración interna, sin ser interfaz obligatoria del cliente. Feature flags detienen nuevas operaciones sin borrar evidencia/links ni simular rollback de efectos externos.
