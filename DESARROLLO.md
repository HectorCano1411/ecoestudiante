# Guía de Desarrollo - EcoEstudiante

Esta guía explica las **tres formas principales de trabajar** en el proyecto EcoEstudiante sin tener que reiniciar contenedores constantemente.

## Opción 1: Desarrollo con Docker (Recomendado para equipos)

Esta opción usa Docker con **hot reload completo**. Los cambios se reflejan automáticamente.

### Inicio Rápido

```bash
# Levantar todos los servicios en modo desarrollo
docker-compose -f docker-compose.dev.yml up

# O en segundo plano
docker-compose -f docker-compose.dev.yml up -d

# Ver logs en tiempo real
docker-compose -f docker-compose.dev.yml logs -f

# Ver logs de un servicio específico
docker-compose -f docker-compose.dev.yml logs -f web
docker-compose -f docker-compose.dev.yml logs -f api
docker-compose -f docker-compose.dev.yml logs -f gateway
```

### Cómo Funciona

#### Frontend (Next.js)
- Código fuente montado como volumen
- Next.js dev server con hot reload
- Los cambios en `.tsx`, `.ts`, `.css` se reflejan inmediatamente
- Fast Refresh habilitado

#### Backend (Spring Boot API)
- Código fuente montado como volumen
- Spring Boot DevTools habilitado
- Los cambios en `.java` reinician automáticamente la aplicación
- LiveReload en puerto 35729

#### Gateway (Spring Cloud Gateway)
- Código fuente montado como volumen
- Spring Boot DevTools habilitado
- Los cambios se reinician automáticamente
- LiveReload en puerto 35730

### Ventajas
- Entorno idéntico para todo el equipo
- No necesitas instalar Java/Maven/Node en tu máquina
- Base de datos y servicios auxiliares incluidos
- Fácil de escalar y compartir

### Desventajas
- Primera vez es lenta (descarga de dependencias)
- Reinicio de Spring Boot puede tardar 10-30 segundos
- Usa más recursos que desarrollo local

### Comandos Útiles

```bash
# Detener servicios
docker-compose -f docker-compose.dev.yml down

# Rebuild forzado (si cambias dependencias)
docker-compose -f docker-compose.dev.yml up --build

# Limpiar cache de Maven
docker volume rm ecoestudiante-maven-cache

# Limpiar cache de Next.js
docker volume rm ecoestudiante-nextjs-cache

# Ejecutar comando en contenedor específico
docker-compose -f docker-compose.dev.yml exec web sh
docker-compose -f docker-compose.dev.yml exec api bash

# Ver uso de recursos
docker stats
```

---

## Opción 2: Desarrollo Híbrido (Recomendado para desarrollo individual)

Esta opción corre **solo la base de datos en Docker** y el código en tu máquina local.

### Requisitos

- Java 17
- Maven 3.9+
- Node.js 20+
- npm o yarn

### Paso 1: Levantar solo servicios de infraestructura

```bash
# Solo PostgreSQL, Redis y pgAdmin
docker-compose -f docker-compose.dev.yml up postgres redis pgadmin
```

### Paso 2: Backend API (terminal 1)

```bash
cd ecoestudiante-api

# Modo 1: Con Maven wrapper (recomendado)
./mvnw spring-boot:run

# Modo 2: Con Maven instalado
mvn spring-boot:run

# Con DevTools (hot reload)
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Dspring.devtools.restart.enabled=true"
```

**Variables de entorno necesarias**:
```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/ecoestudiante
export SPRING_DATASOURCE_USERNAME=eco
export SPRING_DATASOURCE_PASSWORD=eco
export JWT_SECRET=YourSecretKeyShouldBeAtLeast256BitsLongForHS512AlgorithmToWorkProperlyAndSecurely
```

### Paso 3: Gateway (terminal 2)

```bash
cd ecoestudiante-gateway

mvn spring-boot:run
```

**Variables de entorno necesarias**:
```bash
export BACKEND_API_URL=http://localhost:8080
export JWT_SECRET=YourSecretKeyShouldBeAtLeast256BitsLongForHS512AlgorithmToWorkProperlyAndSecurely
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=ecoestudiante
export DB_USERNAME=eco
export DB_PASSWORD=eco
export SPRING_REDIS_HOST=localhost
export SPRING_REDIS_PORT=6379
```

### Paso 4: Frontend (terminal 3)

```bash
cd ecoestudiante-web

# Instalar dependencias (solo primera vez)
npm install

# Modo desarrollo con hot reload
npm run dev
```

**Variables de entorno necesarias** (crear `.env.local`):
```env
GATEWAY_BASE_URL=http://localhost:8080
NEXT_PUBLIC_API_URL=http://localhost:8080
AUTH0_SECRET=tu_secret_si_usas_auth0
AUTH0_BASE_URL=http://localhost:3000
# ... otras variables Auth0 si las usas
```

### Ventajas
- Hot reload super rápido
- Debugging más fácil (puedes usar IDE)
- Menos recursos que Docker completo
- Reinicio de Spring Boot más rápido

### Desventajas
- Necesitas instalar todas las herramientas
- Configuración manual de variables de entorno
- Diferentes versiones pueden causar problemas

---

## Opción 3: Desarrollo Nativo (Sin Docker)

Todo corre en tu máquina local, incluyendo PostgreSQL.

### Requisitos

- Java 17
- Maven 3.9+
- Node.js 20+
- PostgreSQL 16
- Redis 7 (opcional)

### Paso 1: Configurar PostgreSQL

```bash
# Crear base de datos
psql -U postgres
CREATE DATABASE ecoestudiante;
CREATE USER eco WITH PASSWORD 'eco';
GRANT ALL PRIVILEGES ON DATABASE ecoestudiante TO eco;
\q
```

### Paso 2: Configurar Redis (opcional)

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis
sudo systemctl start redis

# Windows
# Descargar desde https://github.com/microsoftarchive/redis/releases
```

### Paso 3: Ejecutar servicios

Igual que **Opción 2, Pasos 2-4**, pero usando `localhost` en todas las URLs.

### Ventajas
- Control total del entorno
- Máximo rendimiento
- Debugging avanzado

### Desventajas
- Configuración inicial compleja
- Posibles conflictos de versiones
- Difícil de compartir con equipo

---

## Comparación de Opciones

| Característica | Docker Full | Híbrido | Nativo |
|----------------|-------------|---------|--------|
| **Configuración inicial** | Fácil | Media | Compleja |
| **Hot reload frontend** | ⚡ Rápido | ⚡⚡ Muy rápido | ⚡⚡ Muy rápido |
| **Hot reload backend** | 🐢 Lento (10-30s) | ⚡ Rápido (5-10s) | ⚡ Rápido (5-10s) |
| **Recursos** | Alto | Medio | Bajo |
| **Debugging** | Limitado | Completo | Completo |
| **Consistencia equipo** | ✅ Excelente | ⚠️ Regular | ❌ Varía |
| **Requisitos instalación** | Solo Docker | Java + Node + Docker | Todo manual |

## Recomendaciones

### Para principiantes
👉 **Opción 1 (Docker Full)**: Más fácil de configurar, funciona igual para todos.

### Para desarrollo frontend
👉 **Opción 2 (Híbrido)**: Solo frontend local, backend en Docker.
```bash
# Solo backend en Docker
docker-compose -f docker-compose.dev.yml up postgres api gateway redis

# Frontend local
cd ecoestudiante-web && npm run dev
```

### Para desarrollo backend
👉 **Opción 2 (Híbrido)**: Solo backend local, infraestructura en Docker.
```bash
# Solo infraestructura en Docker
docker-compose -f docker-compose.dev.yml up postgres redis

# Backend local
cd ecoestudiante-api && mvn spring-boot:run
```

### Para equipos
👉 **Opción 1 (Docker Full)**: Garantiza entorno idéntico para todos.

---

## Tips y Trucos

### 1. Spring Boot DevTools

Para habilitar hot reload en Spring Boot, agrega a `pom.xml` (ya incluido):

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

### 2. Next.js Fast Refresh

Next.js 15 incluye Fast Refresh por defecto. Si no funciona:

```bash
# Limpiar cache
rm -rf .next
npm run dev
```

### 3. Acelerar Maven en Docker

El cache de Maven está configurado en `docker-compose.dev.yml`:

```yaml
volumes:
  - maven_cache:/root/.m2
```

Para limpiar:
```bash
docker volume rm ecoestudiante-maven-cache
```

### 4. Variables de entorno

Crea un archivo `.env` en la raíz para compartir config:

```env
# .env
POSTGRES_USER=eco
POSTGRES_PASSWORD=eco
POSTGRES_DB=ecoestudiante
JWT_SECRET=YourSecretKeyShouldBeAtLeast256BitsLongForHS512AlgorithmToWorkProperlyAndSecurely
```

### 5. Problemas comunes

#### El frontend no ve los cambios
```bash
# En WSL2/Docker, habilita polling
export WATCHPACK_POLLING=true
npm run dev
```

#### El backend no reinicia automáticamente
```bash
# Verifica que DevTools esté en el classpath
mvn dependency:tree | grep devtools

# Asegúrate de que no esté excluido
mvn spring-boot:run -Dspring-boot.run.excludeDevtools=false
```

#### Puerto ocupado
```bash
# Ver qué proceso usa el puerto
lsof -i :3000
lsof -i :8080

# Matar proceso
kill -9 <PID>
```

---

## Debugging

### Frontend (Next.js)

**En Chrome DevTools**:
- Abre http://localhost:3000
- F12 → Sources → Código TypeScript visible

**En VS Code**:
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Next.js: debug server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 9229,
      "cwd": "${workspaceFolder}/ecoestudiante-web"
    }
  ]
}
```

### Backend (Spring Boot)

**En IntelliJ IDEA**:
1. Run → Edit Configurations
2. Add New → Spring Boot
3. Main class: `com.ecoestudiante.EcoestudianteApplication`
4. Active profiles: `dev`

**En VS Code** (con Extension Pack for Java):
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "java",
      "name": "Debug API",
      "request": "launch",
      "mainClass": "com.ecoestudiante.EcoestudianteApplication",
      "projectName": "ecoestudiante-api",
      "env": {
        "SPRING_PROFILES_ACTIVE": "dev"
      }
    }
  ]
}
```

**Remote debugging con Docker**:
```yaml
# docker-compose.dev.yml
environment:
  JAVA_TOOL_OPTIONS: "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
ports:
  - "5005:5005"  # Puerto debug
```

---

## Perfiles de Spring

El proyecto usa diferentes perfiles:

### `default` (desarrollo local)
- Base de datos: localhost:5432
- Sin seguridad estricta
- Logs detallados

### `docker`
- Base de datos: postgres:5432 (red Docker)
- Configuración para contenedores
- Usado en docker-compose.dev.yml

### `test`
- Base de datos H2 en memoria (o Testcontainers)
- Datos de prueba
- Usado en tests

### `prod`
- Seguridad completa
- Logs optimizados
- Usado en producción

Para cambiar perfil:
```bash
# Maven
mvn spring-boot:run -Dspring-boot.run.profiles=docker

# Java
java -jar app.jar --spring.profiles.active=prod

# Docker
environment:
  SPRING_PROFILES_ACTIVE: docker
```

---

## Preguntas Frecuentes

### ¿Cuál opción usar?

**Estás en un equipo**: Opción 1 (Docker Full)
**Solo frontend**: Opción 2 (Frontend local, resto en Docker)
**Solo backend**: Opción 2 (Backend local, infraestructura en Docker)
**Debugging intenso**: Opción 2 o 3

### ¿Cuánto tarda el hot reload?

- **Frontend (Next.js)**: < 1 segundo
- **Backend (Spring Boot)**: 5-30 segundos dependiendo del cambio
- **Solo HTML/CSS**: Instantáneo

### ¿Necesito reiniciar si cambio dependencias?

**Frontend**:
```bash
# Sí, si cambias package.json
npm install
# Reinicia el servidor
```

**Backend**:
```bash
# Sí, si cambias pom.xml
mvn clean install
# Reinicia la aplicación
```

### ¿Puedo mezclar opciones?

Sí, por ejemplo:
```bash
# Frontend local + Backend en Docker
docker-compose -f docker-compose.dev.yml up postgres api gateway redis
cd ecoestudiante-web && npm run dev
```

---

## Recursos Adicionales

- [Spring Boot DevTools Docs](https://docs.spring.io/spring-boot/docs/current/reference/html/using.html#using.devtools)
- [Next.js Fast Refresh](https://nextjs.org/docs/architecture/fast-refresh)
- [Docker Compose Best Practices](https://docs.docker.com/compose/production/)

---

**¿Problemas?** Abre un issue en el repositorio o consulta la documentación en `/docs`.
