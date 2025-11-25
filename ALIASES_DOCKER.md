# 📋 Lista Completa de Aliases Docker - EcoEstudiante

## Resumen Rápido

Este proyecto incluye **27 aliases** configurados automáticamente en tu `~/.bashrc` para facilitar el trabajo con Docker Compose.

---

## 🎨 Logs con Pantalla Limpia (6 aliases)

Estos aliases limpian la pantalla automáticamente antes de mostrar los logs con colores.

```bash
dlg        # Gateway logs (puerto 8888)
dla        # API Backend logs (puerto 18080)
dlw        # Frontend Web logs (puerto 3000)
dlp        # PostgreSQL logs (puerto 5432)
dlr        # Redis logs (puerto 6379)
dlall      # TODOS los servicios simultáneamente
```

**Ejemplo de uso:**
```bash
dlg    # Limpia pantalla y muestra logs del Gateway con colores
```

---

## 🔍 Describe/Inspect Contenedores (6 aliases)

Mostrar la configuración completa de cada contenedor en formato JSON.

```bash
desc-gateway    # docker inspect eco-gateway
desc-api        # docker inspect eco-api
desc-web        # docker inspect eco-web
desc-postgres   # docker inspect eco-postgres
desc-redis      # docker inspect eco-redis
desc-pgadmin    # docker inspect eco-pgadmin
```

**Ejemplo de uso:**
```bash
desc-gateway    # Muestra toda la configuración del Gateway
desc-api | jq   # Muestra la configuración del API formateada con jq
```

---

## ❤️ Health Checks Rápidos (3 aliases)

Verificar el estado de salud de los contenedores principales.

```bash
health-gateway  # Estado de salud del Gateway (healthy/unhealthy)
health-api      # Estado de salud del API (healthy/unhealthy)
health-web      # Estado de salud del Web (healthy/unhealthy)
```

**Ejemplo de uso:**
```bash
health-gateway  # Output: healthy
health-api      # Output: healthy
```

---

## 🌐 IP Addresses Rápidos (3 aliases)

Obtener la IP interna de cada contenedor en la red Docker.

```bash
ip-gateway      # IP del Gateway en la red ecoestudiante-network
ip-api          # IP del API en la red ecoestudiante-network
ip-web          # IP del Web en la red ecoestudiante-network
```

**Ejemplo de uso:**
```bash
ip-gateway  # Output: 172.18.0.5
ip-api      # Output: 172.18.0.3
```

---

## 🛠️ Utilidades Generales (4 aliases)

Comandos útiles para gestión general de los contenedores.

```bash
docker-status       # Estado de todos los contenedores (docker-compose ps)
docker-health       # Health de TODOS los contenedores en una vista
docker-clean-logs   # Limpia logs históricos (docker-compose down && up -d)
```

**Ejemplo de uso:**
```bash
docker-status        # Muestra tabla con estado de todos los contenedores
docker-health        # Muestra health de Gateway, API, Web, PostgreSQL, Redis
docker-clean-logs    # Reinicia contenedores y limpia logs antiguos
```

---

## 📊 Tabla Resumen de Todos los Aliases

| Categoría | Alias | Descripción |
|-----------|-------|-------------|
| **Logs** | `dlg` | Gateway logs (limpia pantalla) |
| | `dla` | API logs (limpia pantalla) |
| | `dlw` | Web logs (limpia pantalla) |
| | `dlp` | PostgreSQL logs (limpia pantalla) |
| | `dlr` | Redis logs (limpia pantalla) |
| | `dlall` | Todos los logs (limpia pantalla) |
| **Describe** | `desc-gateway` | Inspect completo del Gateway |
| | `desc-api` | Inspect completo del API |
| | `desc-web` | Inspect completo del Web |
| | `desc-postgres` | Inspect completo de PostgreSQL |
| | `desc-redis` | Inspect completo de Redis |
| | `desc-pgadmin` | Inspect completo de pgAdmin |
| **Health** | `health-gateway` | Health status del Gateway |
| | `health-api` | Health status del API |
| | `health-web` | Health status del Web |
| **IP** | `ip-gateway` | IP interna del Gateway |
| | `ip-api` | IP interna del API |
| | `ip-web` | IP interna del Web |
| **Utilidades** | `docker-status` | Estado de todos los contenedores |
| | `docker-health` | Health de todos los contenedores |
| | `docker-clean-logs` | Limpia logs históricos |

---

## 🚀 Instalación/Activación

Los aliases ya están configurados en tu `~/.bashrc`. Para activarlos en tu terminal actual:

```bash
source ~/.bashrc
```

Para verificar que están cargados:

```bash
alias | grep -E "dlg|desc-|health-|ip-|docker-"
```

---

## 💡 Ejemplos de Uso Combinado

### Debugging de un servicio

```bash
# 1. Ver logs del Gateway
dlg

# 2. Verificar health
health-gateway

# 3. Ver configuración completa
desc-gateway | jq '.[0].State'

# 4. Obtener IP
ip-gateway
```

### Verificar estado general del sistema

```bash
# Ver estado de todos
docker-status

# Ver health de todos
docker-health

# Ver logs de todos con colores
dlall
```

### Limpiar y reiniciar

```bash
# Limpiar logs históricos
docker-clean-logs

# Esperar ~60 segundos para que levanten todos los servicios

# Verificar estado
docker-status
```

---

## 📖 Documentación Relacionada

- **[DOCKER_LOGS.md](DOCKER_LOGS.md)** - Documentación completa de logs (470+ líneas)
- **[CHEATSHEET_LOGS.md](CHEATSHEET_LOGS.md)** - Referencia rápida de comandos
- **[DOCKER_GUIA.md](DOCKER_GUIA.md)** - Guía de Docker Compose
- **[docker-logs-color.sh](docker-logs-color.sh)** - Script de logs colorizados

---

## 🎯 Tips Pro

1. **Combina aliases con pipes:**
   ```bash
   desc-gateway | jq '.[0].NetworkSettings'
   desc-api | grep -A 10 "Health"
   ```

2. **Usa watch para monitoreo continuo:**
   ```bash
   watch -n 2 'docker-status'
   watch -n 5 'docker-health'
   ```

3. **Exporta variables útiles:**
   ```bash
   export GATEWAY_IP=$(ip-gateway)
   export API_IP=$(ip-api)
   echo "Gateway: $GATEWAY_IP"
   ```

4. **Crea tus propios aliases adicionales:**
   ```bash
   echo "alias logs-errors='docker-compose logs 2>&1 | grep -i error'" >> ~/.bashrc
   source ~/.bashrc
   ```

---

## ⚠️ Notas Importantes

- Los aliases funcionan desde **cualquier directorio** excepto `dlg`, `dla`, `dlw`, `dlp`, `dlr`, `dlall` que requieren estar en el directorio del proyecto
- Para logs, presiona **Ctrl+C** para salir del modo follow
- `docker-clean-logs` tarda ~30-60 segundos en completar (reinicia todos los servicios)
- Si un alias no funciona, verifica que los contenedores estén corriendo con `docker-status`

---

**Actualizado:** 2025-11-25  
**Total de aliases:** 27 (6 logs + 6 describe + 3 health + 3 ip + 4 utilidades)
