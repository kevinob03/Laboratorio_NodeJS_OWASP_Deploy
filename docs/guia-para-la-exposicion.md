# Guia rapida para ti y para hablar con el profesor

## Antes de entregar

1. Escribe los nombres del equipo en el informe. Lee las fuentes oficiales y reescribe la explicacion con tus palabras.
2. Crea Supabase y corre la migracion. Guarda `DATABASE_URL` solo como secreto.
3. Crea un repo privado de GitHub, conecta Render y Vercel y configura las variables secretas en ambos.
4. Configura Render usando `render.yaml` y un remitente de correo HTTPS (Resend) para recovery.
5. Agrega los secretos de GitHub Actions para el deploy hook de Render y el CLI de Vercel.
6. Agrega la variable de repositorio `DEPLOY_ENABLED=true`; luego ejecuta el workflow `Security and gated dual deploy` manualmente desde `main` o haz push a `main`. Prueba ambas URLs. No digas que ZAP/SSL Labs pasaron si no guardaste el resultado.

## Demostracion de 10 minutos

- **Min 0-1:** muestra el diagrama: navegador -> Render/Express principal -> Supabase PostgreSQL; Vercel hospeda la segunda instancia.
- **Min 1-3:** crea una cuenta e inicia sesion; explica Argon2id y la cookie segura.
- **Min 3-5:** crea una nota y un dato sensible; muestra ciphertext en la base y explica AES-256-GCM.
- **Min 5-7:** con dos usuarios prueba que A no puede abrir, editar ni borrar una nota de B; muestra 404, 429 y neutralizacion de XSS/SQL injection.
- **Min 7-8:** abre bitacora y `/health`; ense?a que los logs omiten secretos.
- **Min 8-9:** ense?a ambas URLs HTTPS, cabeceras, `npm audit`, CI, ZAP y SSL Labs solo si ya existen sus resultados.
- **Min 9-10:** explica riesgos pendientes: MFA y rotacion de llave no estan implementadas.

## Una forma honesta de explicarselo al profesor

> ?Nuestro proyecto es SecureVault, una app Node.js con PostgreSQL. Render aloja el servicio principal, Supabase guarda los datos y desplegamos el mismo codigo tambien en Vercel. Usamos Argon2id para contrasenas porque no debemos recuperarlas; usamos AES-256-GCM para notas porque la app necesita volver a leerlas. Cada consulta verifica el propietario. GitHub Actions instala dependencias, ejecuta pruebas y auditoria, y despues inicia los dos despliegues. Contrasta la investigacion con la documentacion oficial que citamos.?

Di que el informe se verifico con fuentes oficiales solo si el equipo realmente las leyo. Indica cualquier evidencia que falte.
