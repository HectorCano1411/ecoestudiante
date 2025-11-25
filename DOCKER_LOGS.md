# Guía de Logs - Docker Compose EcoEstudiante

## Visualizador de Logs Colorizado (Recomendado)

### Instalación y Configuración

El proyecto incluye un script bash optimizado para ver logs con colores que facilitan la lectura y el debugging:

```bash
# 1. El script ya está incluido en el proyecto
cd /home/hectorcanoleal/ecoestudiante

# 2. Verificar que sea ejecutable (debería estarlo por defecto)
chmod +x docker-logs-color.sh

# 3. Ver ayuda del script
./docker-logs-color.sh
```

### Uso del Script Colorizado

```bash
# Ver logs del Gateway (puerto 8888) con colores
./docker-logs-color.sh gateway

# Ver logs del API Backend (puerto 18080) con colores
./docker-logs-color.sh api

# Ver logs del Frontend Next.js (puerto 3000) con colores
./docker-logs-color.sh web

# Ver logs de PostgreSQL (puerto 5432) con colores
./docker-logs-color.sh postgres

# Ver logs de Redis (puerto 6379) con colores
./docker-logs-color.sh redis

# Ver logs de TODOS los servicios simultáneamente
./docker-logs-color.sh all
```

### Limpiar Terminal Antes de Ver Logs (Recomendado para Warp)

Para evitar que se acumulen logs antiguos en la terminal, usa `clear` antes del comando:

```bash
# Opción 1: Comando directo con clear
clear && ./docker-logs-color.sh gateway
clear && ./docker-logs-color.sh api
clear && ./docker-logs-color.sh web
clear && ./docker-logs-color.sh all

# Opción 2: Usar aliases (más rápido) - YA CONFIGURADOS en tu .bashrc
dlg        # Gateway logs (limpia pantalla automáticamente)
dla        # API logs (limpia pantalla automáticamente)
dlw        # Web logs (limpia pantalla automáticamente)
dlp        # PostgreSQL logs (limpia pantalla automáticamente)
dlr        # Redis logs (limpia pantalla automáticamente)
dlall      # Todos los logs (limpia pantalla automáticamente)
```

**Nota:** Los aliases ya están configurados en tu `~/.bashrc`. Si no funcionan, ejecuta: `source ~/.bashrc`

### Códigos de Color del Script

El script aplica colores automáticamente según el tipo de mensaje:

| Color | Significado | Ejemplo |
|-------|-------------|---------|
| 🔴 **ROJO** | Errores críticos | `ERROR`, `Exception`, `Failed` |
| 🟡 **AMARILLO** | Advertencias | `WARN`, `Warning` |
| 🟢 **VERDE** | Información exitosa | `INFO`, `Success`, `Completed`, `Started` |
| ⚪ **GRIS** | Debug/Trace | `DEBUG`, `TRACE` |
| 🔵 **CYAN** | Inicio de servicios | `Starting`, `JWT` |
| 🟣 **MAGENTA** | Migraciones DB | `Flyway` |
| 🔷 **AZUL** | Seguridad/Auth | `Authentication`, `Security` |

### Prefijos por Servicio

Cada servicio tiene su propio prefijo de color para identificarlo rápidamente:

```
[GATEWAY]   - Cyan
[API]       - Verde
[WEB]       - Magenta
[POSTGRES]  - Azul
[REDIS]     - Amarillo
```

### Ventajas del Script Colorizado

✅ **Identificación rápida de errores** - Los errores aparecen en rojo brillante
✅ **Filtrado visual** - Cada nivel de log tiene su color
✅ **Seguimiento en tiempo real** - Flag `-f` incluido por defecto
✅ **Prefijos por servicio** - Fácil identificar de qué contenedor viene cada log
✅ **Resaltado de eventos clave** - Flyway, JWT, Security tienen colores especiales

---

## Comandos Tradicionales (Docker Compose)

Si prefieres usar los comandos estándar sin colores:

### Ver logs en tiempo real (follow)

```bash
# Todos los servicios
docker-compose logs -f

# PostgreSQL
docker-compose logs -f postgres

# API Backend (Spring Boot)
docker-compose logs -f api

# Gateway (Spring Cloud Gateway)
docker-compose logs -f gateway

# Frontend (Next.js)
docker-compose logs -f web

# Redis
docker-compose logs -f redis

# pgAdmin
docker-compose logs -f pgadmin
```

### Ver últimas N líneas

```bash
# Últimas 100 líneas del API
docker-compose logs --tail=100 api

# Últimas 50 líneas del Gateway
docker-compose logs --tail=50 gateway

# Últimas 200 líneas de PostgreSQL
docker-compose logs --tail=200 postgres
```

### Filtrar logs por patrón

```bash
# Buscar errores en API
docker-compose logs api 2>&1 | grep -i error

# Buscar warnings en Gateway
docker-compose logs gateway 2>&1 | grep -i warn

# Buscar migraciones Flyway
docker-compose logs api 2>&1 | grep -i flyway

# Buscar problemas de autenticación
docker-compose logs gateway 2>&1 | grep -i "jwt\|auth\|token"

# Buscar errores de conexión
docker-compose logs web 2>&1 | grep -i "econnrefused\|connection"
```

---

## Comandos con Docker Directo

```bash
# Logs del API
docker logs eco-api -f

# Logs del Gateway
docker logs eco-gateway -f

# Logs de PostgreSQL
docker logs eco-postgres -f

# Logs del Frontend
docker logs eco-web -f

# Logs de Redis
docker logs eco-redis -f
```

---

## Health Checks Rápidos

```bash
# Estado de todos los contenedores
docker-compose ps

# Health check del API (puerto interno 8080, externo 18080)
curl -s http://localhost:18080/actuator/health | jq .

# Health check del Gateway (puerto 8888)
curl -s http://localhost:8888/actuator/health | jq .

# Verificar PostgreSQL
docker exec eco-postgres pg_isready -U eco -d ecoestudiante

# Verificar Redis
docker exec eco-redis redis-cli ping
```

---

## Debugging Avanzado

### Entrar a los contenedores

```bash
# Shell en el API
docker exec -it eco-api sh

# Conectar a PostgreSQL CLI
docker exec -it eco-postgres psql -U eco -d ecoestudiante

# Shell en el Gateway
docker exec -it eco-gateway sh

# Shell en el Frontend
docker exec -it eco-web sh

# Ver variables de entorno del API
docker exec eco-api env | sort

# Ver variables de entorno del Gateway
docker exec eco-gateway env | sort
```

### Inspeccionar contenedores (Describe)

#### Comandos Describe por Contenedor

```bash
# Gateway (eco-gateway)
docker inspect eco-gateway

# API Backend (eco-api)
docker inspect eco-api

# Frontend Web (eco-web)
docker inspect eco-web

# PostgreSQL (eco-postgres)
docker inspect eco-postgres

# Redis (eco-redis)
docker inspect eco-redis

# pgAdmin (eco-pgadmin)
docker inspect eco-pgadmin
```

#### Inspección Detallada (Filtros Útiles)

```bash
# Ver health checks de cada contenedor
docker inspect eco-gateway | grep -A 10 "Health"
docker inspect eco-api | grep -A 10 "Health"
docker inspect eco-web | grep -A 10 "Health"
docker inspect eco-postgres | grep -A 10 "Health"
docker inspect eco-redis | grep -A 10 "Health"

# Ver redes de cada contenedor
docker inspect eco-gateway | grep -A 5 "Networks"
docker inspect eco-api | grep -A 5 "Networks"
docker inspect eco-web | grep -A 5 "Networks"

# Ver variables de entorno de cada contenedor
docker inspect eco-gateway | grep -A 30 "Env"
docker inspect eco-api | grep -A 30 "Env"
docker inspect eco-web | grep -A 30 "Env"

# Ver puertos mapeados de cada contenedor
docker inspect eco-gateway | grep -A 5 "Ports"
docker inspect eco-api | grep -A 5 "Ports"
docker inspect eco-web | grep -A 5 "Ports"

# Ver volúmenes de cada contenedor
docker inspect eco-postgres | grep -A 5 "Mounts"
docker inspect eco-pgadmin | grep -A 5 "Mounts"

# Ver estado completo de un contenedor (JSON formateado)
docker inspect eco-gateway | jq '.[0].State'
docker inspect eco-api | jq '.[0].NetworkSettings'
docker inspect eco-postgres | jq '.[0].Mounts'
```

#### Información Específica con --format

```bash
# Estado de salud
docker inspect --format='{{.State.Health.Status}}' eco-gateway
docker inspect --format='{{.State.Health.Status}}' eco-api
docker inspect --format='{{.State.Health.Status}}' eco-web

# IP Address
docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' eco-gateway
docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' eco-api
docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' eco-web

# Ruta de logs
docker inspect --format='{{.LogPath}}' eco-gateway
docker inspect --format='{{.LogPath}}' eco-api
docker inspect --format='{{.LogPath}}' eco-web

# Uptime (tiempo corriendo)
docker inspect --format='{{.State.Status}} - Started at {{.State.StartedAt}}' eco-gateway
docker inspect --format='{{.State.Status}} - Started at {{.State.StartedAt}}' eco-api
docker inspect --format='{{.State.Status}} - Started at {{.State.StartedAt}}' eco-web

# Comando de inicio
docker inspect --format='{{.Config.Cmd}}' eco-gateway
docker inspect --format='{{.Config.Cmd}}' eco-api
docker inspect --format='{{.Config.Cmd}}' eco-web
```

### Verificar conectividad entre servicios

```bash
# Desde el Gateway, probar conexión al API
docker exec eco-gateway wget -qO- http://api:8080/actuator/health

# Desde el API, probar conexión a PostgreSQL
docker exec eco-api sh -c 'nc -zv postgres 5432'

# Desde el API, probar conexión a Redis
docker exec eco-api sh -c 'nc -zv redis 6379'
```

---

## Casos de Uso Comunes

### 1. Debugging de errores 500 en Gateway

```bash
# Opción 1: Usar el script colorizado (recomendado)
./docker-logs-color.sh gateway

# Opción 2: Comando tradicional con filtro
docker-compose logs -f gateway 2>&1 | grep -i "error\|exception\|500"
```

### 2. Verificar migraciones de Flyway

```bash
# Opción 1: Usar el script colorizado (recomendado)
./docker-logs-color.sh api

# Opción 2: Comando tradicional con filtro
docker-compose logs api 2>&1 | grep -i flyway
```

### 3. Debugging de autenticación JWT

```bash
# Ver logs de Gateway y API simultáneamente con colores
./docker-logs-color.sh all

# O por separado:
./docker-logs-color.sh gateway  # En terminal 1
./docker-logs-color.sh api      # En terminal 2
```

### 4. Verificar problemas de conexión del Frontend

```bash
# Ver logs del Frontend con colores
./docker-logs-color.sh web

# Buscar errores de conexión específicos
docker-compose logs web 2>&1 | grep -i "econnrefused\|fetch failed"
```

### 5. Monitorear todos los servicios durante testing

```bash
# Ver todos los logs con prefijos de color
./docker-logs-color.sh all

# Presionar Ctrl+C para salir
```

---

## Limpiar Logs Antiguos de Docker (No Solo la Pantalla)

Si los contenedores acumulan muchos logs históricos y quieres eliminarlos:

```bash
# Opción 1: Reiniciar contenedores (los logs se limpian)
docker-compose restart

# Opción 2: Detener y volver a levantar (limpia logs + reconstruye health checks)
docker-compose down && docker-compose up -d

# Opción 3: Limpiar logs de un contenedor específico (AVANZADO)
truncate -s 0 $(docker inspect --format='{{.LogPath}}' eco-gateway)
truncate -s 0 $(docker inspect --format='{{.LogPath}}' eco-api)
truncate -s 0 $(docker inspect --format='{{.LogPath}}' eco-web)

# Opción 4: Usar el alias configurado
docker-clean-logs   # Detiene y reinicia todos los servicios
```

### ⚠️ Advertencia
- **Opción 1** (restart): Rápido pero mantiene logs antiguos
- **Opción 2** (down + up): Limpia logs pero requiere ~30-60 segundos para health checks
- **Opción 3** (truncate): Inmediato pero requiere permisos root (puede fallar en algunos sistemas)
- **Opción 4** (alias): Igual que Opción 2, pero más corto de escribir

---

## Guardar Logs en Archivos

```bash
# Guardar logs del API en archivo (sin colores)
docker-compose logs api > logs-api.txt

# Guardar logs del Gateway en archivo (sin colores)
docker-compose logs gateway > logs-gateway.txt

# Guardar logs de todos los servicios
docker-compose logs > logs-all.txt

# Guardar logs con timestamp
docker-compose logs -t api > logs-api-$(date +%Y%m%d_%H%M%S).txt
```

---

## Troubleshooting

### Script colorizado no funciona

```bash
# Verificar que el script existe
ls -la docker-logs-color.sh

# Verificar permisos de ejecución
chmod +x docker-logs-color.sh

# Ejecutar con bash explícitamente
bash docker-logs-color.sh gateway
```

### Los colores no se ven en mi terminal

Algunos terminales no soportan ANSI colors. Alternativas:

```bash
# Usar comandos tradicionales sin colores
docker-compose logs -f gateway

# O instalar un terminal moderno (ejemplo en Ubuntu/Debian):
# sudo apt install gnome-terminal
```

### Logs muy largos (saturan la terminal)

```bash
# Limitar a las últimas 50 líneas y seguir
docker-compose logs --tail=50 -f gateway

# Usar el script con pipe a less
./docker-logs-color.sh gateway | less -R

# Guardar en archivo y ver con editor
docker-compose logs gateway > logs.txt && nano logs.txt
```

---

## Resumen de Comandos Recomendados

### Tabla de Logs

| Tarea | Comando Recomendado | Alias Rápido |
|-------|---------------------|--------------|
| Ver logs del Gateway (limpio) | `clear && ./docker-logs-color.sh gateway` | `dlg` |
| Ver logs del API (limpio) | `clear && ./docker-logs-color.sh api` | `dla` |
| Ver logs del Frontend (limpio) | `clear && ./docker-logs-color.sh web` | `dlw` |
| Ver logs de PostgreSQL (limpio) | `clear && ./docker-logs-color.sh postgres` | `dlp` |
| Ver logs de Redis (limpio) | `clear && ./docker-logs-color.sh redis` | `dlr` |
| Ver todos los logs (limpio) | `clear && ./docker-logs-color.sh all` | `dlall` |

### Tabla de Inspect/Describe

| Tarea | Comando Recomendado | Alias Rápido |
|-------|---------------------|--------------|
| Describe Gateway | `docker inspect eco-gateway` | `desc-gateway` |
| Describe API | `docker inspect eco-api` | `desc-api` |
| Describe Web | `docker inspect eco-web` | `desc-web` |
| Describe PostgreSQL | `docker inspect eco-postgres` | `desc-postgres` |
| Describe Redis | `docker inspect eco-redis` | `desc-redis` |
| Describe pgAdmin | `docker inspect eco-pgadmin` | `desc-pgadmin` |
| Health check Gateway | `docker inspect --format='{{.State.Health.Status}}' eco-gateway` | `health-gateway` |
| Health check API | `docker inspect --format='{{.State.Health.Status}}' eco-api` | `health-api` |
| Health check Web | `docker inspect --format='{{.State.Health.Status}}' eco-web` | `health-web` |
| IP Gateway | `docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' eco-gateway` | `ip-gateway` |
| IP API | `docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' eco-api` | `ip-api` |
| IP Web | `docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' eco-web` | `ip-web` |

### Tabla de Utilidades

| Tarea | Comando Recomendado | Alias Rápido |
|-------|---------------------|--------------|
| Limpiar logs de Docker | `docker-compose down && docker-compose up -d` | `docker-clean-logs` |
| Estado de contenedores | `docker-compose ps` | `docker-status` |
| Health de todos | Ver todos los health checks | `docker-health` |
| Buscar errores específicos | `docker-compose logs <servicio> 2>&1 \| grep -i error` | - |
| Entrar al contenedor | `docker exec -it eco-<servicio> sh` | - |

---

## Lista Completa de Aliases Disponibles

### Logs (Con limpieza de pantalla)
```bash
dlg        # Gateway logs
dla        # API logs
dlw        # Web logs
dlp        # PostgreSQL logs
dlr        # Redis logs
dlall      # Todos los logs
```

### Describe/Inspect
```bash
desc-gateway    # Describe completo del Gateway
desc-api        # Describe completo del API
desc-web        # Describe completo del Web
desc-postgres   # Describe completo de PostgreSQL
desc-redis      # Describe completo de Redis
desc-pgadmin    # Describe completo de pgAdmin
```

### Health Checks
```bash
health-gateway  # Health status del Gateway
health-api      # Health status del API
health-web      # Health status del Web
docker-health   # Health de todos los contenedores
```

### IP Addresses
```bash
ip-gateway      # IP del Gateway
ip-api          # IP del API
ip-web          # IP del Web
```

### Utilidades
```bash
docker-status       # Estado de todos los contenedores (ps)
docker-clean-logs   # Limpia logs históricos (down + up)
```

**Nota:** Para usar los aliases, asegúrate de haber ejecutado `source ~/.bashrc` después de la configuración inicial.

---

## Notas Finales

- **Presiona Ctrl+C** para salir de cualquier comando con `-f` (follow)
- Los logs se mantienen aunque reinicies los contenedores
- Para limpiar logs antiguos: `docker-compose down && docker-compose up -d`
- El script colorizado **no guarda logs en archivos**, solo los muestra en pantalla
- Para producción, considera usar herramientas como ELK Stack o Grafana Loki
