# Inicio Rápido - EcoEstudiante

## 3 Formas de Trabajar sin Reiniciar Contenedores

### Opción 1: Script Interactivo (La más fácil)

```bash
./dev.sh
```

Menú interactivo con todas las opciones de desarrollo.

---

### Opción 2: Docker con Hot Reload (Recomendado para equipos)

```bash
# Levantar todo en modo desarrollo
docker-compose -f docker-compose.dev.yml up

# O en segundo plano
docker-compose -f docker-compose.dev.yml up -d
```

**Cambios se reflejan automáticamente**:
- Frontend (Next.js): < 1 segundo
- Backend (Spring Boot): 5-30 segundos

**URLs**:
- Frontend: http://localhost:3000
- Gateway: http://localhost:8888
- API: http://localhost:18080
- Swagger: http://localhost:18080/swagger-ui.html
- pgAdmin: http://localhost:5050

**Detener**:
```bash
docker-compose -f docker-compose.dev.yml down
```

---

### Opción 3: Desarrollo Híbrido (Recomendado para desarrollo individual)

Solo infraestructura en Docker, código en local:

```bash
# Terminal 1: Infraestructura
docker-compose -f docker-compose.dev.yml up postgres redis

# Terminal 2: Backend API
cd ecoestudiante-api
mvn spring-boot:run

# Terminal 3: Gateway
cd ecoestudiante-gateway
mvn spring-boot:run

# Terminal 4: Frontend
cd ecoestudiante-web
npm install  # Solo primera vez
npm run dev
```

**Hot reload super rápido** porque el código está en tu máquina.

---

## Comandos Útiles

### Ver logs
```bash
# Todos los servicios
docker-compose -f docker-compose.dev.yml logs -f

# Un servicio específico
docker-compose -f docker-compose.dev.yml logs -f web
docker-compose -f docker-compose.dev.yml logs -f api
```

### Estado de servicios
```bash
docker-compose -f docker-compose.dev.yml ps
```

### Reiniciar un servicio
```bash
docker-compose -f docker-compose.dev.yml restart web
```

### Limpiar todo (¡elimina datos!)
```bash
docker-compose -f docker-compose.dev.yml down -v
```

---

## Troubleshooting Rápido

### Frontend no ve cambios
```bash
# En WSL2/Docker
export WATCHPACK_POLLING=true
npm run dev
```

### Backend no reinicia automáticamente
```bash
# Verifica que DevTools esté habilitado
mvn dependency:tree | grep devtools
```

### Puerto ocupado
```bash
# Ver qué usa el puerto
lsof -i :3000
lsof -i :8080

# Matar proceso
kill -9 <PID>
```

### Errores de conexión
```bash
# Verifica que todos los servicios estén corriendo
docker-compose -f docker-compose.dev.yml ps

# Verifica logs
docker-compose -f docker-compose.dev.yml logs
```

---

## Más Información

- **Guía Completa de Desarrollo**: [DESARROLLO.md](DESARROLLO.md)
- **README General**: [README.md](README.md)
- **Script Interactivo**: `./dev.sh`

---

## Comparación Rápida

| Característica | Docker Full | Híbrido | Nativo |
|----------------|-------------|---------|--------|
| Configuración | Fácil | Media | Compleja |
| Hot Reload | Bueno | Excelente | Excelente |
| Recursos | Alto | Medio | Bajo |
| Debugging | Limitado | Completo | Completo |
| Para equipo | ✅ Sí | ⚠️ Varía | ❌ No |

---

**¿Nuevo en el proyecto?** Usa **Opción 1** (Script) o **Opción 2** (Docker Full).

**¿Desarrollador experimentado?** Usa **Opción 3** (Híbrido) para máximo rendimiento.
