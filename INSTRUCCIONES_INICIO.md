# 🚀 Instrucciones de Inicio Rápido - EcoEstudiante

## ⚡ Inicio Automatizado (Recomendado)

Para levantar todo el proyecto de una sola vez, simplemente ejecuta:

```bash
./start.sh
```

Este script automatizado:
- ✅ Verifica que Docker esté instalado y corriendo
- ✅ Verifica que los puertos necesarios estén disponibles
- ✅ Crea el archivo `.env` si no existe
- ✅ Construye todas las imágenes Docker
- ✅ Levanta todos los servicios
- ✅ Espera a que todo esté listo
- ✅ Muestra las URLs y credenciales de acceso

## 📋 Requisitos Previos

1. **Docker Desktop** o **Docker Engine** instalado y corriendo
   - Descarga: https://docs.docker.com/get-docker/
   - Verifica: `docker --version`

2. **Docker Compose** (viene incluido con Docker Desktop)
   - Verifica: `docker-compose --version` o `docker compose version`

3. **Puertos libres**:
   - `3000` - Frontend Web
   - `8888` - API Gateway
   - `18080` - Backend API
   - `5432` - PostgreSQL
   - `5050` - pgAdmin
   - `6379` - Redis

## 🎯 Opciones del Script

```bash
# Inicio normal (usa caché de imágenes si están disponibles)
./start.sh

# Reconstruir imágenes sin caché (si hay cambios en el código)
./start.sh --rebuild

# Limpiar todo y empezar desde cero (elimina contenedores, volúmenes e imágenes)
./start.sh --clean

# Ver ayuda
./start.sh --help
```

## 🌐 URLs de Acceso

Una vez que el script termine, podrás acceder a:

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Aplicación Web** | http://localhost:3000 | Frontend principal |
| **Panel Admin** | http://localhost:3000/admin/login | Panel de administración |
| **API Gateway** | http://localhost:8888 | Gateway de la API |
| **Backend API** | http://localhost:18080 | API REST |
| **Swagger UI** | http://localhost:18080/swagger-ui.html | Documentación API |
| **pgAdmin** | http://localhost:5050 | Interfaz web para PostgreSQL |

## 🔑 Credenciales por Defecto

### PostgreSQL
- **Database**: `ecoestudiante`
- **Usuario**: `eco`
- **Contraseña**: `eco`

### pgAdmin
- **Email**: `admin@ecoestudiante.com`
- **Contraseña**: `admin123`

### Panel de Administración
Para acceder al panel de administración, necesitas crear un usuario con rol `ADMIN` en la base de datos. Puedes usar el script SQL:

```sql
-- Conectarte a PostgreSQL y ejecutar:
UPDATE app_user 
SET role = 'ADMIN' 
WHERE email = 'tu-email@ejemplo.com';
```

O usar el archivo `update_user_role.sql` incluido en el proyecto.

## 📊 Comandos Útiles

### Ver logs de todos los servicios
```bash
docker-compose logs -f
```

### Ver logs de un servicio específico
```bash
docker-compose logs -f api      # Backend API
docker-compose logs -f gateway  # API Gateway
docker-compose logs -f web       # Frontend
docker-compose logs -f postgres  # Base de datos
```

### Ver estado de los servicios
```bash
docker-compose ps
```

### Detener todos los servicios
```bash
docker-compose down
```

### Detener y eliminar volúmenes (⚠️ elimina datos)
```bash
docker-compose down -v
```

### Reiniciar un servicio específico
```bash
docker-compose restart api
docker-compose restart gateway
docker-compose restart web
```

### Reconstruir un servicio específico
```bash
docker-compose build --no-cache api
docker-compose up -d api
```

## 🔧 Solución de Problemas

### Error: "Docker no está corriendo"
- Asegúrate de que Docker Desktop esté iniciado
- En Linux, verifica que el servicio Docker esté activo: `sudo systemctl status docker`

### Error: "Puerto XXXX ya está en uso"
- El puerto está siendo usado por otra aplicación
- Detén la aplicación que usa ese puerto o cambia el puerto en `docker-compose.yml`

### Error: "Permission denied" al ejecutar Docker
- En Linux, añade tu usuario al grupo docker: `sudo usermod -aG docker $USER`
- Cierra sesión y vuelve a iniciar sesión

### Los servicios no inician correctamente
1. Verifica los logs: `docker-compose logs -f`
2. Reconstruye sin caché: `./start.sh --clean`
3. Verifica que los puertos estén libres

### La aplicación web no carga
- Espera unos minutos (la primera compilación puede tardar)
- Verifica los logs: `docker-compose logs -f web`
- Asegúrate de que el Gateway esté funcionando: `docker-compose logs -f gateway`

## 📝 Notas Importantes

1. **Primera ejecución**: La primera vez que ejecutes el script, puede tardar **10-15 minutos** mientras descarga imágenes y compila el código.

2. **Archivo .env**: El script crea automáticamente un archivo `.env` con valores por defecto. Puedes editarlo para personalizar la configuración.

3. **Datos persistentes**: Los datos de PostgreSQL se guardan en un volumen Docker, por lo que no se perderán al reiniciar los contenedores.

4. **Desarrollo vs Producción**: Este script está configurado para desarrollo. Para producción, usa configuraciones apropiadas de seguridad.

## 🆘 Soporte

Si encuentras problemas:
1. Revisa los logs: `docker-compose logs -f`
2. Verifica que todos los requisitos estén cumplidos
3. Intenta limpiar y reconstruir: `./start.sh --clean`

---

**¡Listo para empezar!** 🎉

Ejecuta `./start.sh` y espera a que todo esté listo.
