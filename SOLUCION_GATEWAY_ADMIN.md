# 🔧 Solución: Error 404 en Panel de Administración

## Problema Identificado

El error `BACKEND 404: Not Found` al acceder a `/api/admin/dashboard` se debía a que **el Gateway no tenía configurada la ruta para el servicio de administración**.

### Flujo del Error

1. Frontend llama a `/api/admin/dashboard` (ruta API de Next.js)
2. Next.js route handler llama al Gateway en `/api/v1/admin/dashboard/overview`
3. **El Gateway no tenía ruta configurada para `/api/v1/admin/**`**
4. Gateway devuelve 404 Not Found

## ✅ Correcciones Aplicadas

### 1. Agregada Ruta de Admin al Gateway

**Archivo**: `ecoestudiante-gateway/src/main/resources/application.yml`

```yaml
# Servicio de Administración
# Ruta: /api/v1/admin/**
# Incluye: dashboard, estudiantes, estadísticas
# NOTA: NO usar StripPrefix - el backend espera la ruta completa /api/v1/admin/**
# Requiere rol ADMIN (verificado por @PreAuthorize en AdminController)
- id: admin-service
  uri: ${BACKEND_API_URL:http://localhost:18080}
  predicates:
    - Path=/api/v1/admin/**
  metadata:
    service-name: admin-service
```

### 2. Agregada Ruta de Admin al Perfil Docker

**Archivo**: `ecoestudiante-gateway/src/main/resources/application-docker.yml`

Misma configuración pero usando `http://api:8080` como URI (nombre del servicio en Docker).

### 3. Corregido TypeScript en Route Handler

**Archivo**: `ecoestudiante-web/src/app/api/admin/dashboard/route.ts`

- Eliminado `any` explícito
- Agregado type assertion correcto para manejo de errores

## 🔄 Flujo Correcto Ahora

```
Frontend (Next.js)
    ↓
/api/admin/dashboard (Route Handler de Next.js)
    ↓
Gateway:8888/api/v1/admin/dashboard/overview
    ↓
Backend:18080/api/v1/admin/dashboard/overview
    ↓
AdminController.getDashboardOverview()
    ↓
AdminService.getDashboardOverview()
    ↓
Respuesta con datos del dashboard
```

## 📋 Pasos para Aplicar la Solución

### Si estás usando Docker:

1. **Reconstruir el Gateway**:
   ```bash
   docker-compose build gateway
   ```

2. **Reiniciar el Gateway**:
   ```bash
   docker-compose restart gateway
   ```

   O si prefieres reiniciar todo:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Si estás ejecutando localmente:

1. **Reiniciar el Gateway**:
   ```bash
   cd ecoestudiante-gateway
   mvn spring-boot:run
   ```

2. **Verificar que el Gateway esté corriendo**:
   ```bash
   curl http://localhost:8888/actuator/health
   ```

## ✅ Verificación

### 1. Verificar que el Gateway tiene la ruta configurada

Revisa los logs del Gateway al iniciar. Deberías ver algo como:

```
Mapped "{[/api/v1/admin/**],methods=[GET]}" onto ...
```

### 2. Probar el endpoint directamente

```bash
# Con autenticación (reemplaza TOKEN con tu JWT)
curl -H "Authorization: Bearer TOKEN" \
     http://localhost:8888/api/v1/admin/dashboard/overview
```

### 3. Verificar desde el frontend

1. Inicia sesión como administrador en `/admin/login`
2. Deberías ser redirigido a `/admin/dashboard`
3. El dashboard debería cargar correctamente con los datos

## 🐛 Troubleshooting

### Si aún obtienes 404:

1. **Verifica que el Gateway esté corriendo**:
   ```bash
   docker-compose ps gateway
   # O
   curl http://localhost:8888/actuator/health
   ```

2. **Verifica los logs del Gateway**:
   ```bash
   docker-compose logs gateway | grep -i admin
   ```

3. **Verifica que el backend esté corriendo**:
   ```bash
   curl http://localhost:18080/actuator/health
   ```

4. **Verifica que el usuario tenga rol ADMIN**:
   ```sql
   SELECT email, role FROM app_user WHERE email = 'tu-email@ejemplo.com';
   ```

### Si obtienes 403 Forbidden:

- El usuario no tiene rol `ADMIN` en la base de datos
- El token JWT no incluye el rol `ADMIN`
- Solución: Actualizar el rol y hacer login nuevamente

### Si obtienes 401 Unauthorized:

- El token JWT es inválido o expirado
- Solución: Cerrar sesión y volver a iniciar sesión

## 📝 Notas Adicionales

### Rutas Configuradas en el Gateway

El Gateway ahora tiene configuradas las siguientes rutas:

- `/api/v1/auth/**` → Servicio de autenticación
- `/api/v1/calc/**` → Servicio de cálculos
- `/api/v1/gam/**` → Servicio de gamificación
- `/api/v1/reports/**` → Servicio de reportes
- `/api/v1/admin/**` → **Servicio de administración (NUEVO)**

### Seguridad

- El endpoint `/api/v1/admin/**` requiere autenticación (JWT válido)
- El backend verifica que el usuario tenga rol `ADMIN` con `@PreAuthorize("hasRole('ADMIN')")`
- El Gateway pasa el token JWT al backend sin modificarlo

---

**Última actualización**: 2025-01-XX  
**Versión del sistema**: 0.1.0-SNAPSHOT
