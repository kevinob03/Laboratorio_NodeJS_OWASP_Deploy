# SecureVault - Node.js + OWASP Top 10:2025

Proyecto academico en Express. Render aloja el servicio web principal, Supabase PostgreSQL conserva los datos y Vercel recibe un segundo despliegue del mismo codigo.

## Funciones

- Registro, login y logout con sesion en PostgreSQL, regeneracion de ID y cookies HttpOnly/Secure/SameSite.
- Contrasenas Argon2id (19 MiB, 2 iteraciones, paralelismo 1).
- CRUD de notas limitado por propietario; titulo y contenido cifrados con AES-256-GCM, IV aleatorio de 12 bytes y tag de autenticacion.
- Dato sensible cifrado y enmascarado. Recuperacion con token aleatorio de un solo uso; solo se guarda SHA-256(token), vence en 15 minutos.
- Roles usuario/admin, bitacora, `/health`, Helmet/CSP, CSRF, validacion Zod, limites persistentes de intentos y errores genericos.
- RLS habilitado y roles de API publica sin privilegios. La app solo conecta desde el servidor.

## Desarrollo local

Requiere Node.js 22+ y PostgreSQL (Supabase recomendado).

1. `npm ci`
2. Copia `.env.example` a `.env`. Completa `DATABASE_URL`, `SESSION_SECRET` y `DATA_ENCRYPTION_KEY`.
3. Genera la llave AES con `npm run key:generate`. Genera `SESSION_SECRET` con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
4. Crea un proyecto Supabase y ejecuta el SQL de `supabase/migrations/*_securevault.sql` desde SQL Editor.
5. Usa `npm run dev`; abre `http://localhost:3000`.

Para Vercel usa el pooler de transacciones de Supabase (serverless). Para Render usa el pooler de sesiones o la conexion directa compatible con la red, siempre TLS. Configura `DATABASE_URL` separadamente en cada hosting.

## Correo de recuperacion

En Render Free, el SMTP saliente a 25/465/587 esta bloqueado. La aplicacion usa la API HTTPS de Resend cuando `RESEND_API_KEY` esta configurada; establece tambien `MAIL_FROM` con un remitente validado en el servicio de correo. Nodemailer SMTP queda como alternativa local/planes que permitan esos puertos.

## Despliegue Render + Vercel

`render.yaml` define un Web Service Node en Virginia, `npm ci`, `npm start`, chequeo `/health` y auto deploy desactivado. Conecta el repo a Render usando Blueprint. En el primer sync configura `DATABASE_URL`, `SESSION_SECRET`, `DATA_ENCRYPTION_KEY`, `RESEND_API_KEY` y `MAIL_FROM`. Render define `RENDER_EXTERNAL_URL`; se usa como origen por defecto para los enlaces de reset.

Vercel despliega el mismo repo con `vercel.json`; la carpeta `public/` aloja archivos estaticos y `src/views/**/*.ejs` se incluye en la funcion. Define `NODE_ENV=production`, `TRUST_PROXY=1`, `DATABASE_URL`, la misma `DATA_ENCRYPTION_KEY`, `SESSION_SECRET`, `RESEND_API_KEY`, `MAIL_FROM` y `APP_ORIGIN` apuntando al dominio principal de Render. Las cookies quedan separadas por dominio, pero ambas instancias comparten usuarios y datos.

El workflow `.github/workflows/security-deploy.yml` ejecuta `npm ci`, `npm audit`, pruebas y sintaxis. Solo con CI exitoso en `main` activa el deploy hook de Render y despliega a Vercel. Configura en GitHub Actions estos secretos: `RENDER_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. En Render deja auto deploy en Off. Para que el primer push no despliegue antes de configurar las cuentas, el job externo requiere la variable de repo `DEPLOY_ENABLED=true`; luego corre el workflow `workflow_dispatch` en la rama `main`. El job de despliegue inicia solo si CI paso.

## Administrador de demostracion

Define temporalmente `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12+ caracteres con mayuscula, minuscula, numero y simbolo) y `ADMIN_NAME`; ejecuta `npm run admin:create`. Comparte credenciales de prueba al docente por canal privado, nunca en README o Git.

## Comprobaciones

- `npm test`: pruebas de cifrado, integridad, tokens, mail API y consultas con control de propietario.
- `npm audit --audit-level=high`: dependencias.
- `npm run security:headers -- https://<dominio>`: cabeceras del sitio.
- Tras publicar ambas instancias, comprueba `/health`, dos cuentas, IDOR (lectura/edicion/borrado), XSS/inyeccion, respuesta 429, cookies y recovery. Corre ZAP baseline, Security Headers y SSL Labs contra URLs propias.

## Limitaciones conocidas

- Para recuperar contrasenas en Render Free se necesita un servicio de correo HTTPS como Resend y un dominio/remitente verificado.
- La etiqueta AES `v1` existe, pero no se implemento rotacion automatica de llaves ni MFA.
- Render Free duerme tras inactividad; el proyecto Supabase Free tambien puede pausarse por inactividad y tiene cuotas. Revisa el estado antes de la demo.
- Ningun escaneo de produccion se considera hecho hasta guardar los resultados reales de cada URL.
