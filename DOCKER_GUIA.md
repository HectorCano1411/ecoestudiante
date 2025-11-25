# Guía de Docker Compose - EcoEstudiante

## Servicios Disponibles

| Servicio | Puerto | URL | Descripción |
|----------|--------|-----|-------------|
| **PostgreSQL** | 5432 | - | Base de datos |
| **pgAdmin** | 5050 | http://localhost:5050 | Interfaz web para PostgreSQL |
| **Redis** | 6379 | - | Cache (rate limiting) |
| **API** | 18080 | http://localhost:18080 | Backend Spring Boot |
| **Gateway** | 8888 | http://localhost:8888 | API Gateway |
| **Web** | 3000 | http://localhost:3000 | Frontend Next.js |

---

## Paso a Paso: Levantar el Sistema Completo

### 1. Preparar Variables de Entorno

```bash
cd /home/hectorcanoleal/ecoestudiante

# Copiar el archivo de ejemplo (si no existe .env)
cp .env.example .env

# Editar si necesitas cambiar valores (opcional)
nano .env
```

### 2. Levantar Solo PostgreSQL y pgAdmin (Desarrollo Rápido)

Si solo necesitas la base de datos y pgAdmin:

```bash
docker-compose up -d postgres pgadmin
```

Espera ~10 segundos y accede a:
- **pgAdmin:** http://localhost:5050

### 3. Levantar Todo el Sistema

```bash
# Primera vez (construye las imágenes)
docker-compose up -d --build

# Siguientes veces (usa imágenes cacheadas)
docker-compose up -d
```

### 4. Verificar que Todo Está Corriendo

```bash
docker-compose ps
```

Deberías ver algo como:
```
NAME           STATUS                   PORTS
eco-api        Up (healthy)             0.0.0.0:18080->8080/tcp
eco-gateway    Up (healthy)             0.0.0.0:8888->8080/tcp
eco-pgadmin    Up                       0.0.0.0:5050->80/tcp
eco-postgres   Up (healthy)             0.0.0.0:5432->5432/tcp
eco-redis      Up (healthy)             0.0.0.0:6379->6379/tcp
eco-web        Up (healthy)             0.0.0.0:3000->3000/tcp
```

---

## Conectar pgAdmin a PostgreSQL

### Paso 1: Acceder a pgAdmin

1. Abre tu navegador en: **http://localhost:5050**
2. Inicia sesión con:
   - **Email:** `admin@ecoestudiante.com`
   - **Password:** `admin123`

### Paso 2: Agregar el Servidor PostgreSQL

1. Click derecho en "Servers" → "Register" → "Server..."
2. En la pestaña **General**:
   - **Name:** `EcoEstudiante DB`
3. En la pestaña **Connection**:
   - **Host name/address:** `postgres` (nombre del contenedor en Docker)
   - **Port:** `5432`
   - **Maintenance database:** `ecoestudiante`
   - **Username:** `eco`
   - **Password:** `eco`
   - ✅ Marcar "Save password"
4. Click en **Save**

### Paso 3: Explorar la Base de Datos

1. Expande: Servers → EcoEstudiante DB → Databases → ecoestudiante
2. Expande: Schemas → public → Tables
3. Verás las tablas: `users`, `calculation`, `emission_factor`, etc.

---

## Comandos Útiles

### Ver Logs

```bash
# Logs de todos los servicios
docker-compose logs -f

# Logs de un servicio específico
docker-compose logs -f api
docker-compose logs -f gateway
docker-compose logs -f postgres
```

### Reiniciar Servicios

```bash
# Reiniciar un servicio específico
docker-compose restart api

# Reiniciar todo
docker-compose restart
```

### Detener Servicios

```bash
# Detener sin eliminar volúmenes (mantiene datos)
docker-compose down

# Detener Y eliminar volúmenes (BORRA TODOS LOS DATOS)
docker-compose down -v
```

### Reconstruir Imágenes

```bash
# Reconstruir todo
docker-compose up -d --build

# Reconstruir un servicio específico
docker-compose up -d --build api
```

### Ejecutar Comandos en Contenedores

```bash
# Conectar a PostgreSQL via CLI
docker exec -it eco-postgres psql -U eco -d ecoestudiante

# Ejecutar SQL
docker exec -it eco-postgres psql -U eco -d ecoestudiante -c "SELECT * FROM users;"

# Shell en un contenedor
docker exec -it eco-api sh
```

---

## Solución de Problemas

### Puerto ya en uso

Si ves error de puerto ocupado:

```bash
# Ver qué proceso usa el puerto (ejemplo: 5432)
sudo lsof -i :5432

# Matar el proceso o cambiar el puerto en docker-compose.yml
```

### Contenedor no inicia

```bash
# Ver logs del contenedor problemático
docker-compose logs api

# Verificar health checks
docker inspect eco-api | grep -A 10 "Health"
```

### Reiniciar desde cero

```bash
# CUIDADO: Esto borra todos los datos
docker-compose down -v
docker-compose up -d --build
```

---

## Desarrollo Local (Sin Docker para API/Gateway)

Si prefieres correr API y Gateway localmente pero usar PostgreSQL y pgAdmin de Docker:

```bash
# Solo levantar PostgreSQL, pgAdmin y Redis
docker-compose up -d postgres pgadmin redis

# Luego en terminales separadas:
cd ecoestudiante-api && mvn spring-boot:run
cd ecoestudiante-gateway && mvn spring-boot:run
cd ecoestudiante-web && npm run dev
```

---

## Credenciales por Defecto

| Servicio | Usuario | Password |
|----------|---------|----------|
| PostgreSQL | eco | eco |
| pgAdmin | admin@ecoestudiante.com | admin123 |

> **Nota:** Cambia estas credenciales en producción editando el archivo `.env`
