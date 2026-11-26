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
- Supabase: proyecto nuevo `securevault-nodejs-owasp`, ref `jkqsmzoifktzzlkfqudf`, organizacion `orquestAI`, region `us-east-1`, estado `ACTIVE_HEALTHY`.
- La migracion `securevault_initial_schema` ya esta aplicada. Existen seis tablas (`users`, `notes`, `password_resets`, `security_events`, `rate_limits`, `user_sessions`); RLS esta habilitado y la API publica no tiene permisos.
- La cotizacion de creacion fue US$0/mes y el usuario la confirmo.
- No se ha creado un servicio en Render ni un proyecto en Vercel. Nada esta publicado como aplicacion web.
- Falta configurar `DATABASE_URL` en Render y Vercel. La herramienta no tiene acceso a la contrasena PostgreSQL ni a esos paneles; el usuario debe entrar al Dashboard de Supabase > Connect, copiar los poolers adecuados y agregarlos como secretos. No pedir que pegue esas cadenas en el chat.
- Vercel CLI se comprobo y la sesion esta cerrada (`Logged out`). No crear un deploy temporal: faltan los secretos de base de datos y aplicacion. No se encontro Render CLI/sesion.
- El repositorio remoto es publico: nunca subir `.env`, claves, contrasenas, `DATABASE_URL` ni tokens.

## Siguiente paso exacto

Retomar preguntando si confirma la creacion de un proyecto Supabase nuevo en `orquestAI` con cotizacion de US$0 al mes. Si confirma:

1. Guiar al usuario para obtener el pooler de sesion para Render y el pooler de transacciones para Vercel desde Supabase > Connect; no mostrar ni guardar secretos en Git.
2. Conectar el repo de GitHub a Render y sincronizar `render.yaml`; introducir alli `DATABASE_URL`, `SESSION_SECRET`, `DATA_ENCRYPTION_KEY`, `RESEND_API_KEY` y `MAIL_FROM`.
3. Importar el repo de GitHub en Vercel y agregar las mismas variables, mas `APP_ORIGIN` con el dominio principal de Render.
4. Agregar en GitHub Actions los secretos `RENDER_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` y la variable `DEPLOY_ENABLED=true`.
5. Iniciar el workflow manual en `main`, esperar CI, visitar `/health` en ambos dominios y solo entonces recopilar evidencia de seguridad externa.

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
