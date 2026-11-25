# Continuar SecureVault desde otra computadora

## Resumen para retomar

Proyecto del laboratorio Node.js + OWASP. La aplicacion local esta implementada y publicada en este repositorio publico:

- Repositorio: https://github.com/kevinob03/Laboratorio_NodeJS_OWASP_Deploy
- Rama: `main`
- Commit de implementacion inicial: `7fb63fd`
- El codigo local esta en la carpeta del repositorio; no hay secretos incluidos.

El objetivo de despliegue es:

1. Render: servicio principal Node/Express.
2. Supabase: PostgreSQL.
3. Vercel: segunda instancia del mismo proyecto.

## Estado actual

- La aplicacion, migracion SQL, `render.yaml`, `vercel.json`, GitHub Actions y guias estan en el repositorio.
- Verificaciones locales ejecutadas anteriormente: 9 pruebas aprobadas, `npm audit --audit-level=high` con 0 vulnerabilidades y chequeo local de `/health` correcto.
- El workflow de GitHub corre verificaciones en `main`; el despliegue permanece cerrado hasta configurar servicios y activar `DEPLOY_ENABLED=true`.
- No se ha creado un proyecto nuevo de Supabase, ni un servicio en Render, ni un proyecto en Vercel. Nada esta publicado como aplicacion web.
- La organizacion Supabase disponible es `orquestAI`. La cotizacion consultada para crear un proyecto fue US$0 al mes. **Falta que el usuario confirme que entiende/acepta esa cotizacion antes de crearlo.** Vuelve a consultar la cotizacion al retomar.
- El repositorio remoto es publico: nunca subir `.env`, claves, contrasenas, `DATABASE_URL` ni tokens.

## Siguiente paso exacto

Retomar preguntando si confirma la creacion de un proyecto Supabase nuevo en `orquestAI` con cotizacion de US$0 al mes. Si confirma:

1. Reconsultar el costo y crear `securevault` en `us-east-1` (cambiar nombre/region solo si el usuario lo pide).
2. Esperar a que Supabase informe `ACTIVE_HEALTHY`.
3. Revisar que la base este vacia y aplicar `supabase/migrations/20261125191624_securevault.sql`.
4. Ayudar a configurar las conexiones y variables privadas en Render y Vercel. No pedir claves por el chat; el usuario las agrega en los paneles.
5. Como el repo ya esta subido, importar/conectar este GitHub repo en Render y Vercel.
6. Configurar en GitHub Actions los secretos `RENDER_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` y la variable `DEPLOY_ENABLED=true`.
7. Desplegar, esperar a CI, visitar `/health` en ambos dominios y solo entonces recopilar evidencia de seguridad externa.

## Guia y archivos utiles

- `README.md`: instalacion, variables y despliegue.
- `render.yaml`: Blueprint Render, incluye claves con `sync: false`.
- `vercel.json`: despliegue Vercel.
- `supabase/migrations/20261125191624_securevault.sql`: esquema PostgreSQL.
- `.github/workflows/security-deploy.yml`: CI y despliegue condicionado.
- `docs/guia-para-la-exposicion.md`: demostracion y guion para el profesor.
- `docs/security-report.md`: mitigaciones y verificaciones pendientes.
- `docs/deep-research.md` y `output/pdf/deep-research.pdf`: investigacion.

## Frase para retomar

En la misma conversacion desde la otra computadora, decir: **"Sigue donde quedaste con SecureVault; lee docs/CONTINUAR-DESDE-OTRA-COMPUTADORA.md"**.

Si es una conversacion nueva, enviar el enlace del repositorio y pedir que lean este archivo. No copiar secretos en la conversacion.
