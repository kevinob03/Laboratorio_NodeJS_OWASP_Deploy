# Modelo de amenazas STRIDE (resumen)

```text
Navegador --HTTPS--> Render / Express (principal) ----TLS----> Supabase PostgreSQL
                             |
                             +---- Vercel / Express (segunda instancia)
                             Ambas instancias comparten datos y llave AES; URLs y cookies separadas.
```

| Amenaza | Riesgo | Mitigacion |
|---|---|---|
| Usuario cambia un ID para abrir nota ajena | IDOR/BOLA | Filtrar cada lectura/edicion/borrado por `owner_id`; 404 y evento de acceso denegado. |
| Atacante prueba contrasenas repetidamente | Robo de cuenta | Argon2id, rate limit persistente, respuesta generica, rotacion de ID de sesion. |
| Inyeccion HTML/SQL | XSS o manipulacion SQL | Consultas parametrizadas, Zod, salida EJS escapada, CSP. |
| Copia robada de la base | Divulgacion | AES-256-GCM, hash no reversible, llave fuera de Git. |
| Se filtra un secreto | Toma de cuenta/datos | `.gitignore`, secretos separados en Render, Vercel y GitHub; no enviar claves al navegador. |
| Error de servidor o fallo de correo | Exposicion o interrupcion | Errores genericos, timeouts y proveedor de correo HTTPS en Render Free. |

**Limites de negocio:** 100 notas por usuario, titulo hasta 100 caracteres, cuerpo hasta 10.000 caracteres y contrasena de 12-128 caracteres con minusc., mayusc., numero y simbolo. El rol admin se consulta en la base en cada ruta protegida.
