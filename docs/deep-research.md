# Deep Research: despliegue de SecureVault

**Curso:** ____________________  **Equipo:** ____________________  **Fecha:** 25 de noviembre de 2026  
**Estado:** borrador con consulta de fuentes oficiales; el equipo debe leerlas y explicar la selección con sus propias palabras antes de entregar.

## Resumen ejecutivo

Para SecureVault proponemos Render como hosting principal del backend Node.js/Express, PostgreSQL administrado por Supabase como base persistente y Vercel como segundo despliegue del mismo codigo para cumplir el requisito de usar ambas plataformas. Render mantiene un servicio web persistente (en Free puede dormir por inactividad); Vercel ejecuta Express como una funcion. Ambas instancias usan secretos de ejecucion y una llave AES compartida, pero cada una tiene su propia URL. La base guarda hash de contrasenas y ciphertext de notas/datos sensibles. Los planes gratuitos tienen cuotas y pueden pausar recursos. Limites consultados el 25-11-2026; revalidarlos antes de crear cuentas.

## Respuestas a las preguntas

**1. PaaS, contenedor y VPS/IaaS.** En un PaaS el proveedor maneja sistema operativo, proxy, certificados y despliegue; se configura la aplicación y secretos. Es rápido y reduce errores operativos, a cambio de límites del runtime y dependencia del proveedor. Docker empaqueta la app y sus dependencias de forma reproducible; se puede ejecutar en PaaS, una máquina virtual o un orquestador. Ofrece portabilidad, pero el equipo debe mantener la imagen, parches y configuración. En un VPS/IaaS se controla el servidor y se instalan Node, Nginx/Caddy, TLS y un proceso como systemd; permite más control, pero también exige más operación, monitoreo y costo de tiempo. Para un laboratorio de dos semanas, PaaS es la opción más simple; Docker es una mejora de reproducibilidad y un VPS es una opción de aprendizaje de administración.

**2. Comparación de plataformas concretas.** Límites consultados en sus páginas oficiales:

| Plataforma / opción gratuita | Node y regiones | Base de datos | Inactividad / costo orientativo |
|---|---|---|---|
| **Vercel Hobby** | Express corre como funcion Node; region configurable; no mantiene un proceso permanente, escala por solicitudes. | No incluye Postgres; conecta una base externa como Supabase. | $0 dentro de cuotas: 4 horas CPU activa/mes y 1M invocaciones; Hobby es para uso personal/no comercial. HTTPS y certificado automaticos. |
| **Render Free** | Web service Node con URL `onrender.com`; region seleccionable al crear. | Render Postgres de 1 GB que expira a los 30 dias. | Duerme tras 15 min sin trafico y tarda cerca de 1 min en despertar. TLS gestionado y redireccion HTTP a HTTPS. |
| **Railway Free** | Hasta 3 servicios, 1 vCPU y 0,5 GB RAM; Free asigna region automaticamente. | Postgres y otros motores; volumen de 0,5 GB. | $1/mes de uso; duerme tras 5-10 min sin trafico saliente. HTTPS/TLS automatico en dominios Railway. |

**Supabase** no reemplaza a las plataformas de hosting de la tabla: provee PostgreSQL para Render y Vercel. El plan gratuito consultado permite 500 MB y puede pausar proyectos con baja actividad a los siete dias; no incluye backups automaticos. Render es el hosting principal y Vercel el segundo destino; ambos usan la misma base y llave AES. Verifica las cuotas vigentes antes de crear cuentas.

**3. Secretos.** Una variable de entorno es un valor que la app recibe al ejecutarse, por ejemplo `DATABASE_URL`. Un gestor de secretos la almacena fuera del repositorio, limita quien la ve y separa entornos. `.env` ayuda en local, pero un descuido puede subirlo al historial de Git; no rota ni separa permisos centralmente. Se ignora en Git y los secretos productivos se configuran por separado en Render y Vercel. Nunca publiques `DATABASE_URL`, `SESSION_SECRET`, `DATA_ENCRYPTION_KEY`, API de correo ni clave `service_role` en el navegador.

**4. TLS, Let's Encrypt y HSTS.** TLS cifra la comunicación entre navegador y servidor y ayuda a confirmar que se llegó al dominio correcto. Let's Encrypt emite certificados TLS automatizados y gratuitos mediante validación de control del dominio. HTTPS debe ser obligatorio y HTTP redirigir a HTTPS. HSTS indica al navegador que use HTTPS en visitas futuras; debe activarse solo cuando HTTPS funcione correctamente, porque dificulta volver temporalmente a HTTP.

**5. Proxy inverso y `trust proxy`.** Nginx o Caddy pueden estar delante de Node para TLS, limites y cabeceras. En PaaS el proveedor maneja esa capa. Express debe confiar solo en el proxy conocido para interpretar IP y protocolo; una confianza demasiado amplia deja falsificar IP y debilita el rate limit. Configuramos `trust proxy=1` en Render y Vercel, y comprobamos cookies `Secure` en ambas.

**6. Gestores de procesos.** `systemd` o PM2 mantienen un Node activo en un VPS y lo reinician si cae. Render ejecuta el servicio Node y administra su despliegue/reinicio; no hace falta meter PM2 dentro de este Web Service. Vercel ejecuta Express como una funcion por demanda. En los dos hostings, las sesiones quedan en PostgreSQL, no en memoria local.

**7. CI/CD.** Integracion y despliegue continuos automatizan validaciones y publicacion al cambiar codigo. GitHub Actions instala el lockfile (`npm ci`), ejecuta pruebas y `npm audit`; con CI exitoso, activa el deploy hook de Render y despliega la salida a Vercel. Los tokens de Render/Vercel y los IDs del proyecto son secretos de GitHub Actions; los secretos de ejecucion viven en cada hosting.

**8. Bases administradas y conexion.** Alternativas: Supabase Postgres, Neon Postgres y MongoDB Atlas. La base administrada mantiene el motor; el equipo conserva responsabilidad por usuarios, permisos, esquema y datos. Elegimos Supabase Postgres. Render usa el pooler de sesiones o conexion directa compatible con su red; Vercel usa el pooler de transacciones para funciones. Ambos requieren TLS, credenciales fuertes y secretos solo de servidor. Alinear regiones reduce latencia.

**9. Desarrollo vs producción.** Desarrollo permite localhost y mensajes de error útiles. Producción fija `NODE_ENV=production`, fuerza cookies `Secure`, habilita HTTPS y secretos del proveedor, restringe CORS (aquí no hace falta API cross-origin), no devuelve stack traces, registra JSON sin contraseñas/tokens y configura límites, timeouts y backups. El código no guarda secretos ni datos persistentes en disco local.

**10. Verificación posterior.** Ejecutar `npm audit`; pasar OWASP ZAP Baseline contra la URL propia; revisar cabeceras con Security Headers; validar certificado, protocolo y configuración TLS con SSL Labs; probar manualmente IDOR entre dos usuarios, inyección, XSS, fuerza bruta/429, cookie y recuperación de contraseña; revisar logs y `/health`. Guardar fecha, alcance, resultado y capturas. Solo se examina la app del equipo o un objetivo con autorización.

## Plan de despliegue propuesto

```text
Navegador --HTTPS--> Render / Express principal --TLS--> Supabase PostgreSQL
       \--HTTPS--> Vercel / Express segunda instancia (misma base)
```

1. Crear Supabase y ejecutar la migracion del repositorio antes de iniciar las apps.
2. Crear el servicio Render desde `render.yaml`, elegir Virginia, configurar los secretos y `/health`; dejar auto deploy apagado.
3. Conectar Vercel al mismo repo; configurar la misma llave AES y `SESSION_SECRET`, y poner `APP_ORIGIN` igual a la URL principal de Render.
4. Configurar Resend por API HTTPS (Render Free bloquea SMTP 25/465/587); crear el administrador mediante el script y compartir sus credenciales al docente por canal privado.
5. Configurar GitHub Actions para que CI active el deploy hook de Render y el despliegue Vercel; comprobar las dos URLs y guardar resultados.

## Referencias oficiales

1. Vercel, Express en Vercel: https://vercel.com/docs/frameworks/backend/express; HTTPS: https://vercel.com/docs/cdn
2. Vercel, planes Hobby: https://vercel.com/docs/plans/hobby
3. Supabase, conexión a PostgreSQL y poolers: https://supabase.com/docs/guides/database/connecting-to-postgres
4. Supabase, plan gratuito y pausa por inactividad: https://supabase.com/docs/guides/platform/free-project-pausing
5. Railway, Free Plan: https://docs.railway.com/pricing/free-plan; TLS/domains: https://docs.railway.com/platform/advanced-concepts
6. Render, Free services y PostgreSQL: https://render.com/docs/free; TLS: https://render.com/docs/tls
7. Node.js, mejores prácticas de seguridad: https://nodejs.org/en/learn/getting-started/security-best-practices
8. Express, seguridad en producción: https://expressjs.com/en/advanced/best-practice-security.html
9. OWASP, Top 10:2025 y Cheat Sheet Series: https://owasp.org/Top10/2025/ y https://cheatsheetseries.owasp.org/
10. Let's Encrypt, cómo funciona: https://letsencrypt.org/how-it-works/
11. OWASP ZAP, Baseline Scan: https://www.zaproxy.org/docs/docker/baseline-scan/
12. Qualys SSL Labs, SSL Server Test: https://www.ssllabs.com/ssltest/
13. Render, Deploy Hooks para CI: https://render.com/docs/deploy-hooks
14. Render, bloqueo de SMTP en Free: https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports
15. Render, regiones disponibles: https://render.com/docs/regions
16. Resend, envio de correo con Node.js/API: https://resend.com/nodejs/
