# 🔧 Solución: Problema de Acceso al Panel de Administración

## Problema Identificado

El usuario `ecoestudiante7@gmail.com` no puede acceder al dashboard de administración debido a dos problemas:

1. **Ruta incorrecta en el frontend**: El dashboard estaba llamando directamente a `/v1/admin/dashboard/overview` en lugar de usar la ruta API de Next.js `/admin/dashboard`.

2. **Rol de usuario**: El usuario necesita tener el rol `ADMIN` en la base de datos para acceder al panel.

## ✅ Correcciones Aplicadas

### 1. Corrección de la Ruta del Dashboard
- **Archivo modificado**: `ecoestudiante-web/src/app/admin/dashboard/page.tsx`
- **Cambio**: La función `loadDashboard()` ahora usa `/admin/dashboard` (ruta API de Next.js) en lugar de `/v1/admin/dashboard/overview`
- **Resultado**: Las peticiones ahora pasan correctamente por el proxy de Next.js al backend

### 2. Mejoras en el Manejo de Errores
- Se agregó verificación del rol antes de hacer la petición
- Mensajes de error más claros y específicos
- Botones de acción según el tipo de error (permisos vs otros errores)

## 📋 Pasos para Solucionar el Problema

### Paso 1: Actualizar el Rol del Usuario en la Base de Datos

Ejecuta el siguiente script SQL en tu base de datos PostgreSQL:

```sql
-- Verificar el usuario actual
SELECT id, username, email, role, enabled, email_verified 
FROM app_user 
WHERE email = 'ecoestudiante7@gmail.com';

-- Actualizar el rol a ADMIN
UPDATE app_user 
SET role = 'ADMIN' 
WHERE email = 'ecoestudiante7@gmail.com';

-- Verificar que se actualizó correctamente
SELECT id, username, email, role, enabled, email_verified 
FROM app_user 
WHERE email = 'ecoestudiante7@gmail.com';
```

**O usando el archivo SQL proporcionado:**
```bash
psql -U eco -d ecoestudiante -f update_user_role.sql
```

### Paso 2: Cerrar Sesión y Volver a Iniciar Sesión

**IMPORTANTE**: Después de actualizar el rol en la base de datos, el usuario **DEBE**:

1. **Cerrar sesión completamente** (limpiar localStorage y cookies)
2. **Iniciar sesión nuevamente** en `/admin/login` con:
   - Usuario: `ecoestudiante7@gmail.com`
   - Contraseña: `Inacap2025*-/`

**Razón**: El token JWT actual no incluye el nuevo rol. Solo al hacer login nuevamente se generará un nuevo token con el rol `ADMIN`.

### Paso 3: Verificar el Acceso

1. Ve a `http://localhost:3000/admin/login`
2. Inicia sesión con las credenciales del administrador
3. Deberías ser redirigido automáticamente a `/admin/dashboard`
4. El dashboard debería cargar correctamente con las estadísticas

## 🔍 Verificación del Problema

### Verificar el Rol en la Base de Datos

```sql
-- Ver todos los usuarios con rol ADMIN
SELECT id, username, email, role, enabled, email_verified, created_at
FROM app_user 
WHERE role = 'ADMIN'
ORDER BY created_at DESC;
```

### Verificar el Token JWT

Si después de actualizar el rol y hacer login nuevamente aún hay problemas, verifica que el token JWT incluya el rol:

1. Abre las herramientas de desarrollador (F12)
2. Ve a la pestaña "Application" > "Local Storage"
3. Busca la clave `authToken`
4. Copia el token y decodifícalo en [jwt.io](https://jwt.io)
5. Verifica que el campo `role` en el payload sea `"ADMIN"`

### Verificar los Logs del Backend

Revisa los logs del backend para ver si hay errores de autorización:

```bash
# Si estás usando Docker
docker-compose logs -f api

# Busca mensajes como:
# "Autenticación establecida en SecurityContext - Principal: ..., Role: ADMIN"
# O errores de autorización
```

## 🐛 Troubleshooting

### Error: "No tienes permisos de administrador"

**Causa**: El usuario no tiene el rol `ADMIN` en la base de datos o el token JWT no incluye el rol.

**Solución**:
1. Verifica que el rol esté actualizado en la BD (Paso 1)
2. Cierra sesión y vuelve a iniciar sesión (Paso 2)
3. Verifica que el token JWT incluya el rol `ADMIN`

### Error: "401 Unauthorized" o "403 Forbidden"

**Causa**: El token JWT es inválido, expirado, o no tiene el rol correcto.

**Solución**:
1. Cierra sesión completamente
2. Limpia el localStorage: `localStorage.clear()` en la consola del navegador
3. Inicia sesión nuevamente
4. Verifica que el token se haya guardado correctamente

### Error: "Error al cargar dashboard"

**Causa**: Problema de conexión con el backend o el endpoint no está disponible.

**Solución**:
1. Verifica que el backend esté corriendo: `http://localhost:18080/actuator/health`
2. Verifica que el Gateway esté corriendo: `http://localhost:8888/actuator/health`
3. Revisa los logs del backend para ver errores específicos
4. Verifica que la ruta `/api/v1/admin/dashboard/overview` esté disponible en el backend

### El dashboard carga pero está vacío

**Causa**: No hay datos en la base de datos o hay un error en la consulta.

**Solución**:
1. Verifica que haya datos en las tablas:
   ```sql
   SELECT COUNT(*) FROM app_user;
   SELECT COUNT(*) FROM calculation;
   SELECT COUNT(*) FROM gamification_profiles;
   ```
2. Revisa los logs del backend para ver si hay errores en las consultas

## 📝 Notas Adicionales

### Estructura de Roles

El sistema soporta los siguientes roles:
- `STUDENT`: Rol por defecto para estudiantes
- `ADMIN`: Rol para administradores (acceso completo al panel)
- `MODERATOR`: Rol para moderadores (futuro)

### Seguridad

- Los endpoints de administración están protegidos con `@PreAuthorize("hasRole('ADMIN')")`
- El rol se verifica tanto en el frontend (localStorage) como en el backend (JWT)
- El backend es la fuente de verdad para la autorización

### Flujo de Autenticación

1. Usuario hace login en `/admin/login`
2. Backend valida credenciales y genera JWT con rol
3. Frontend guarda token en localStorage
4. Frontend verifica rol antes de hacer peticiones
5. Backend valida token y rol en cada petición
6. Si el rol es `ADMIN`, se permite el acceso

## ✅ Checklist de Verificación

- [ ] Usuario tiene rol `ADMIN` en la base de datos
- [ ] Usuario cerró sesión completamente
- [ ] Usuario inició sesión nuevamente en `/admin/login`
- [ ] Token JWT incluye el rol `ADMIN`
- [ ] Backend está corriendo y accesible
- [ ] Gateway está corriendo y accesible
- [ ] Frontend está usando la ruta correcta `/admin/dashboard`
- [ ] No hay errores en la consola del navegador
- [ ] No hay errores en los logs del backend

## 🆘 Si el Problema Persiste

1. Revisa los logs completos del backend y frontend
2. Verifica la configuración de CORS en el Gateway
3. Verifica que todas las variables de entorno estén configuradas correctamente
4. Asegúrate de que el usuario tenga `email_verified = true` en la base de datos
5. Verifica que el usuario tenga `enabled = true` en la base de datos

---

**Última actualización**: 2025-01-XX  
**Versión del sistema**: 0.1.0-SNAPSHOT
