# Informe de seguridad SecureVault

Estado local; completar con las dos URLs, capturas y resultados reales despues de desplegar. Ningun escaneo externo se declara realizado si no hay resultado guardado.

| OWASP Top 10:2025 | Mitigacion en el codigo | Evidencia por recopilar |
|---|---|---|
| A01 Broken Access Control | Middleware de rol; consultas `WHERE id = ... AND owner_id = ...`; no existen rutas que visiten URLs externas, por lo que no hay superficie SSRF. | Dos cuentas. IDOR en lectura, edicion y borrado debe responder 404; consultar ciphertext en DB. |
| A02 Security Misconfiguration | Helmet+CSP, X-Powered-By apagado, secretos por plataforma, errores genericos, sin API CORS cross-origin. | Security Headers en Render y Vercel, HTTPS, `NODE_ENV=production`, verificar `TRUST_PROXY`. |
| A03 Software Supply Chain Failures | Lockfile, `npm ci`, Dependabot, CI con `npm audit --audit-level=high` antes del deploy doble. | Salida audit, lockfile y ejecucion real de GitHub Actions. |
| A04 Cryptographic Failures | Argon2id; AES-256-GCM con IV/tag unicos; token SHA-256; TLS entre navegador/hosting/DB; secretos fuera de Git. | BD muestra `$argon2id$` y `v1...`; secretos censurados; SSL Labs en ambas URLs. |
| A05 Injection | SQL parametrizado, Zod, salida EJS escapada y CSP sin scripts inline. | Intento `' OR 1=1 --`, `<script>` y CSP en ambas URLs. |
| A06 Insecure Design | Limite 100 notas, titulo 100 chars y cuerpo 10.000 chars; bloqueo transaccional por usuario; STRIDE en `docs/threat-model.md`. | Diagrama y tabla de abuso/mitigacion. |
| A07 Authentication Failures | Argon2id, respuesta generica, session ID regenerado, cookie HttpOnly/Secure/SameSite, sesion 30 min, 5 login/min/IP y 3 reset/10 min/IP. | Evidencia de 429 en ambas instancias, cookies y token de reset de un uso. |
| A08 Software or Data Integrity Failures | CI corre pruebas/auditoria antes de los dos despliegues; parametros SQL; sin scripts de CDN ni deserializacion no confiable. | GitHub Actions exitoso y prueba GCM; SRI no aplica, no hay scripts de CDN. |
| A09 Security Logging and Alerting Failures | Bitacora de autenticacion, cambios de rol y accesos denegados; no registra contrasenas, tokens ni notas. | Captura del panel y logs censurados. Alerta externa de N fallos no implementada. |
| A10 Mishandling of Exceptional Conditions | Errores genericos, handler global, timeouts DB/correo, 429 falla cerrada, rechazo no manejado termina el proceso. | Provocar error controlado; comparar respuesta y log interno. |

## Verificaciones locales

- `npm ci`: instalacion reproducible completada.
- `npm test`: 9 pruebas aprobadas, 0 fallidas.
- `npm audit --audit-level=high`: 0 vulnerabilidades conocidas en la ultima ejecucion.
- `node --check` en archivos JavaScript: correcto tras la modificacion de despliegue.
- `GET /health` local respondio HTTP 200 con CSP, HSTS y `X-Content-Type-Options: nosniff`; sin X-Powered-By.
- ZAP, Security Headers y SSL Labs en Render/Vercel estan pendientes hasta publicar.

## Riesgos residuales

- `DATA_ENCRYPTION_KEY` es una llave activa unica; `v1` etiqueta el ciphertext pero no hay rotacion ni historial de llaves. Perderla impide descifrar los datos.
- No hay MFA ni alerta externa. El limite es por IP y ventana fija, no bloqueo progresivo por cuenta.
- La tabla `rate_limits` requiere limpieza periodica para controlar su crecimiento.
- RLS esta habilitado y permisos de API publica revocados. `DATABASE_URL` es un secreto de servidor y no debe llegar al navegador.
- Render Free duerme con inactividad, y el envio SMTP a puertos 25/465/587 esta bloqueado; configurar correo por API HTTPS y probar que el remitente este validado.
- Verifica ambas instancias porque comparten base; sus cookies son independientes por dominio y `APP_ORIGIN` debe apuntar al dominio principal Render.
