# EGC Ingeniería · Panel de sitios

React / Express / tRPC / Drizzle starter, adapted from the Sandbox web-db-user template.

- `pnpm dev`: development server; honors `PORT` (default 3000).
- `pnpm build` / `pnpm start`: build and serve `dist/index.js` and `dist/public/`.
- `pnpm db:migrate`: apply checked-in migrations. `pnpm db:push`: generate and apply new schema changes.
- `pnpm check` / `pnpm test`: types and application tests.

Start with the Webdev skill's default-template guide. Platform login, storage, payments and service contracts live in its shared references; read the relevant capability before extending its helper.

`server/_core/publicConfig.ts` exposes only named public runtime values. Private keys stay server-side. The platform serves managed `/manus-storage/` assets; the application does not register a second proxy.

Platform configuration is readable and editable through `webdev.config`. Default settings are initial settings, not enforced constraints. The agent may modify the files, commands and configuration or follow the flexible guide for another stack.

## Demo funcional persistente EGC

La demo funcional usa el servidor Express + Drizzle sobre la base MySQL-compatible administrada del proyecto. Al consultar `/api/demo/snapshot` se crea un seed idempotente con sitios ficticios como `0388 · Lomas Norte`, `0431 · Valle Sur` y `0420 · Santa Rosa`. Los registros de fotografías, croquis, informe y plano se almacenan como metadatos ficticios en `siteFiles`; no se requiere Google Drive ni acceso a carpetas externas.

El flujo backend validado es: `Recibido → Visita programada → Visitado → Informe cargado → En dibujo → Plano listo → En revisión → Aprobado → Entregado → Facturado`. Las transiciones se validan en servidor según estado, rol, pertenencia del sitio y requisitos. Una observación del revisor devuelve el sitio a `Visitado` para corregir y cargar nuevamente las evidencias. La API `/api/demo` es un modo demostrativo público para la interfaz estática; antes de producción debe conectarse a autenticación real y endurecerse el control de acceso.

Comandos principales: `pnpm db:migrate`, `pnpm dev`, `pnpm check`, `pnpm test`, `pnpm build` y `GITHUB_ACTIONS=true pnpm build:static`.

## Mapa operativo y clima

El Panel de sitios incorpora un mapa Leaflet con puntos geolocalizados por antena. El color del punto representa el tramo de avance del sitio. Al seleccionar un punto se muestran coordenadas, elevación, fecha programada y una ficha climatológica para esa fecha. La recomendación considera código meteorológico WMO, probabilidad de precipitación y viento máximo; si las condiciones no son convenientes, el jefe puede reagendar la visita desde la misma ficha y la nueva fecha queda registrada en `sites.visitaProgramada` y `siteHistory`.

El mapa base usa OpenStreetMap con atribución visible y el pronóstico diario usa Open-Meteo sin clave para esta demo. Para operación productiva deberán revisarse las políticas y límites de los proveedores, además de definir umbrales de seguridad aprobados por prevención de riesgos.
