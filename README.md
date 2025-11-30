# EcoEstudiante

Plataforma web integral para calcular y monitorear la huella de carbono de estudiantes universitarios.

## Descripción

**EcoEstudiante** es un sistema completo que permite a los estudiantes calcular, monitorear y reducir su huella de carbono a través de:

- Cálculo de emisiones de CO2 en múltiples categorías (electricidad, transporte, residuos)
- Visualización de historial con análisis detallados
- Comparación con promedios por carrera y universidad
- Sistema de gamificación con desafíos y logros
- Generación de reportes personalizados (PDF, CSV, Excel)
- Estadísticas agregadas de comportamiento sostenible

## Arquitectura

### Componentes del Sistema

```
┌─────────────────┐
│   Frontend      │  Next.js 15 (TypeScript)
│   (Puerto 3000) │  Material-UI, TailwindCSS
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Gateway       │  Spring Cloud Gateway
│   (Puerto 8888) │  Auth0, JWT, Rate Limiting
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   API Backend   │  Spring Boot 3.3.4 (Java 17)
│   (Puerto 18080)│  REST API, OpenAPI/Swagger
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │  Base de datos principal
│   (Puerto 5432) │  Flyway migrations
└─────────────────┘
```

### Stack Tecnológico

#### Backend
- **Framework**: Spring Boot 3.3.4
- **Lenguaje**: Java 17
- **Base de datos**: PostgreSQL 16 + Flyway
- **Seguridad**: Spring Security, JWT, OAuth2, Auth0
- **API**: OpenAPI 3.0 con Swagger UI
- **Testing**: JUnit 5, Testcontainers, Pact
- **Build**: Maven + Jib (Docker)
- **Monitoreo**: Prometheus, Spring Actuator

#### Frontend
- **Framework**: Next.js 15.5.5
- **Lenguaje**: TypeScript
- **UI**: Material-UI v7, NextUI, TailwindCSS v4
- **Autenticación**: Auth0 SDK, NextAuth.js
- **Gráficos**: ECharts, Recharts, MUI Charts
- **Mapas**: Mapbox GL, Leaflet
- **Testing**: Jest, Testing Library, Pact

#### Infraestructura
- **Contenedores**: Docker & Docker Compose
- **Cache**: Redis (rate limiting)
- **Admin**: pgAdmin (puerto 5050)
- **CI/CD**: GitHub Actions

## Módulos Principales

### 1. Cálculo de Emisiones (`calc`)
Cálculo de huella de carbono en tres categorías:

- **Electricidad**: Basado en consumo kWh y factores de emisión nacionales
- **Transporte**: Múltiples modos (auto, transporte público, bicicleta) con ocupancia
- **Residuos**: Clasificación por tipo y método de disposición

Características:
- Factores de emisión actualizados (2025)
- Metodología EPA WARM + GHG Protocol
- Operaciones idempotentes (Idempotency-Key)
- Auditoría completa de cálculos

### 2. Autenticación (`auth`)
Sistema dual de autenticación:

- **JWT Nativo**: Registro/login tradicional con BCrypt
- **Auth0 OAuth2**: Integración con auto-creación de usuarios
- **Google OAuth**: Login social
- Recuperación de contraseñas por email
- Verificación de cuentas

### 3. Estadísticas (`stats`)
Análisis y visualización de datos:

- Series de tiempo para tendencias
- Análisis por categoría (electricidad, transporte, residuos)
- Comparativas por carrera universitaria
- Agregados anonimizados

### 4. Reportes (`reports`)
Generación asíncrona de reportes:

- Múltiples formatos: PDF, CSV, Excel
- Sistema de jobs con estados
- Descargas con expiración
- Agregados para análisis

### 5. Gamificación (`gamification`)
Sistema de motivación:

- Challenges (desafíos) de sostenibilidad
- Sistema XP/Niveles
- Streaks (rachas) de días consecutivos
- Logros y badges

### 6. Factores de Emisión (`factors`)
Gestión de metadatos:

- Factores por país y categoría
- Actualización periódica
- Versionado de factores
- Datos EPA y GHG Protocol

## Instalación y Configuración

> **Inicio Rápido**: Ver [QUICK_START.md](QUICK_START.md) para comenzar a desarrollar en menos de 5 minutos.

### Requisitos Previos

- Docker y Docker Compose
- Java 17 (solo para desarrollo backend)
- Node.js 20+ (solo para desarrollo frontend)
- Maven 3.9+ (solo para desarrollo backend)

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
# Base de datos
POSTGRES_DB=ecoestudiante
POSTGRES_USER=eco
POSTGRES_PASSWORD=eco

# JWT (debe ser de al menos 256 bits para HS512)
JWT_SECRET=YourSecretKeyShouldBeAtLeast256BitsLongForHS512AlgorithmToWorkProperlyAndSecurely

# Auth0 (opcional - solo si están TODAS las variables configuradas)
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_AUDIENCE=https://api.ecoestudiante.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
AUTH0_SECRET=your_nextjs_secret
AUTH0_BASE_URL=http://localhost:3000

# Email (opcional)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password

# Mapbox (opcional - para funcionalidad de mapas)
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token

# pgAdmin
PGADMIN_EMAIL=admin@ecoestudiante.com
PGADMIN_PASSWORD=admin123
```

### Inicio Rápido con Docker

```bash
# 1. Clonar el repositorio
git clone <repository-url>
cd ecoestudiante

# 2. Levantar todos los servicios
docker-compose up -d

# 3. Ver logs (opcional)
docker-compose logs -f

# 4. Acceder a los servicios
# Frontend:  http://localhost:3000
# Gateway:   http://localhost:8888
# API:       http://localhost:18080
# Swagger:   http://localhost:18080/swagger-ui.html
# pgAdmin:   http://localhost:5050
```

Los servicios estarán disponibles:
- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:8888
- **API Backend**: http://localhost:18080
- **Swagger UI**: http://localhost:18080/swagger-ui.html
- **pgAdmin**: http://localhost:5050

### Desarrollo Local con Hot Reload

Para trabajar **sin reiniciar contenedores** cada vez que haces un cambio, consulta la **[Guía de Desarrollo Completa](DESARROLLO.md)** que incluye:

- Opción 1: Docker con hot reload completo
- Opción 2: Desarrollo híbrido (DB en Docker, código local)
- Opción 3: Desarrollo 100% nativo

**Inicio rápido con hot reload**:

```bash
# Modo desarrollo con hot reload automático
docker-compose -f docker-compose.dev.yml up

# Los cambios en el código se reflejan automáticamente:
# - Frontend (Next.js): < 1 segundo
# - Backend (Spring Boot): 5-30 segundos
```

**O solo la infraestructura en Docker y código local**:

```bash
# Terminal 1: Solo base de datos y servicios
docker-compose -f docker-compose.dev.yml up postgres redis

# Terminal 2: Backend local con hot reload
cd ecoestudiante-api && mvn spring-boot:run

# Terminal 3: Frontend local con hot reload
cd ecoestudiante-web && npm run dev
```

#### Comandos de Desarrollo

**Backend (API)**:
```bash
cd ecoestudiante-api

# Ejecutar en modo desarrollo
mvn spring-boot:run

# Ejecutar tests
mvn test

# Tests de integración
mvn verify

# Build sin tests
mvn clean package -DskipTests

# Build con Jib (imagen Docker)
mvn jib:build -Djib.to.image=ecoestudiante/api:latest
```

**Gateway**:
```bash
cd ecoestudiante-gateway

# Ejecutar en modo desarrollo
mvn spring-boot:run

# Build
mvn clean package -DskipTests
```

**Frontend (Web)**:
```bash
cd ecoestudiante-web

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Build de producción
npm run build

# Ejecutar producción
npm start

# Tests
npm test

# Tests con cobertura
npm run test:coverage

# Linter
npm run lint

# Contract tests
npm run test:contract
```

Ver **[DESARROLLO.md](DESARROLLO.md)** para guía completa de desarrollo, debugging y troubleshooting.

## Comandos Docker Útiles

```bash
# Rebuild y levantar servicios
docker-compose up -d --build

# Ver logs de un servicio específico
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f gateway

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes (¡cuidado! elimina datos)
docker-compose down -v

# Reiniciar un servicio específico
docker-compose restart api

# Ver estado de servicios
docker-compose ps

# Ejecutar comandos en un contenedor
docker-compose exec api bash
docker-compose exec postgres psql -U eco -d ecoestudiante
```

## Testing

### Backend

```bash
cd ecoestudiante-api

# Tests unitarios
mvn test

# Tests de integración (usa Testcontainers)
mvn verify

# Cobertura de código
mvn test jacoco:report
```

### Frontend

```bash
cd ecoestudiante-web

# Tests unitarios
npm run test:unit

# Tests de contrato (Pact)
npm run test:contract

# Todos los tests con cobertura
npm run test:coverage

# CI tests (lint + coverage)
npm run test:ci
```

## API Documentation

### Swagger UI

Una vez el backend esté corriendo, accede a la documentación interactiva:

- **Local**: http://localhost:18080/swagger-ui.html
- **Docker**: http://localhost:18080/swagger-ui.html

### Endpoints Principales

#### Autenticación
```
POST   /api/auth/register     - Registrar nuevo usuario
POST   /api/auth/login        - Login con credenciales
POST   /api/auth/refresh      - Refrescar token JWT
POST   /api/auth/logout       - Cerrar sesión
GET    /api/auth/me           - Obtener perfil del usuario
```

#### Cálculos
```
POST   /api/calc/electricity  - Calcular emisiones por electricidad
POST   /api/calc/transport    - Calcular emisiones por transporte
POST   /api/calc/waste        - Calcular emisiones por residuos
GET    /api/calc/history      - Historial de cálculos
```

#### Estadísticas
```
GET    /api/stats/summary              - Resumen general
GET    /api/stats/time-series          - Serie temporal
GET    /api/stats/by-category          - Por categoría
GET    /api/stats/available-careers    - Carreras disponibles
GET    /api/stats/available-categories - Categorías disponibles
```

#### Reportes
```
POST   /api/reports/generate  - Generar reporte
GET    /api/reports/{id}      - Estado del reporte
GET    /api/reports/{id}/download - Descargar reporte
```

## Base de Datos

### Acceso con psql

```bash
# Desde Docker
docker-compose exec postgres psql -U eco -d ecoestudiante

# Desde host (si PostgreSQL está expuesto)
psql -h localhost -p 5432 -U eco -d ecoestudiante
```

### Migraciones Flyway

Las migraciones se ejecutan automáticamente al iniciar el backend. Ubicación:
```
ecoestudiante-api/src/main/resources/db/migration/
```

Convención de nombres:
```
V1__init.sql
V2__add_auth_tables.sql
V3__add_calculations.sql
...
```

### pgAdmin

Accede a pgAdmin en http://localhost:5050

**Credenciales por defecto**:
- Email: `admin@ecoestudiante.com`
- Password: `admin123`

**Conectar a PostgreSQL desde pgAdmin**:
- Host: `postgres` (nombre del servicio Docker)
- Port: `5432`
- Username: `eco`
- Password: `eco`
- Database: `ecoestudiante`

## Estructura del Proyecto

```
ecoestudiante/
├── ecoestudiante-api/                 # Backend Spring Boot
│   ├── src/main/java/com/ecoestudiante/
│   │   ├── calc/                      # Cálculo de emisiones
│   │   ├── auth/                      # Autenticación JWT/Auth0
│   │   ├── gamification/              # Sistema de gamificación
│   │   ├── reports/                   # Generación de reportes
│   │   ├── factors/                   # Factores de emisión
│   │   ├── stats/                     # Estadísticas
│   │   └── common/                    # Utilidades compartidas
│   ├── src/main/resources/
│   │   ├── db/migration/              # Migraciones Flyway
│   │   └── application*.yml           # Configuración
│   ├── src/test/                      # Tests
│   └── pom.xml                        # Maven
│
├── ecoestudiante-gateway/             # Spring Cloud Gateway
│   ├── src/main/java/com/ecoestudiante/gateway/
│   │   ├── JwtDecoderConfig.java      # Auth0
│   │   ├── SecurityConfig.java        # Seguridad
│   │   └── Auth0UserAutoCreateFilter.java
│   └── pom.xml
│
├── ecoestudiante-web/                 # Frontend Next.js
│   ├── src/
│   │   ├── app/                       # App Router
│   │   │   ├── api/                   # API Routes
│   │   │   ├── dashboard/             # Dashboard
│   │   │   ├── history/               # Historial
│   │   │   ├── analytics/             # Analytics
│   │   │   └── auth/                  # Auth0 routes
│   │   ├── components/                # Componentes React
│   │   │   ├── ElectricityForm.tsx
│   │   │   ├── TransportForm.tsx
│   │   │   ├── WasteForm.tsx
│   │   │   ├── analytics/             # Gráficos
│   │   │   └── charts/                # Visualizaciones
│   │   ├── lib/                       # Utilidades
│   │   └── types/                     # TypeScript types
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml                 # Orquestación completa
├── .env                               # Variables de entorno
└── README.md                          # Este archivo
```

## CI/CD

### GitHub Actions

El proyecto incluye workflows automatizados:

**Backend (`ecoestudiante-api/.github/workflows/api-ci.yml`)**:
- Compilación con Maven
- Tests unitarios e integración
- Cobertura de código
- Build de imagen Docker con Jib

**Frontend (`ecoestudiante-web/.github/workflows/web-ci.yml`)**:
- Linting con ESLint
- Tests con Jest
- Cobertura de código
- Contract tests con Pact
- Build de Next.js

### Hooks Git (Opcional)

```bash
# Configurar pre-commit en frontend
cd ecoestudiante-web
npm run pre-commit  # lint + tests

# Configurar pre-push
npm run pre-push    # lint + coverage
```

## Troubleshooting

### El frontend no puede conectarse al backend

1. Verifica que todos los servicios estén corriendo:
   ```bash
   docker-compose ps
   ```

2. Revisa los logs:
   ```bash
   docker-compose logs gateway
   docker-compose logs api
   ```

3. Verifica las URLs en `.env`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8888
   GATEWAY_BASE_URL=http://gateway:8080
   ```

### Errores de Auth0

Si no estás usando Auth0, asegúrate de que **TODAS** las variables de Auth0 estén vacías o ausentes:

```bash
# .env (sin Auth0)
AUTH0_ISSUER_BASE_URL=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
# etc.
```

### Base de datos con errores de migración

```bash
# Ver logs de PostgreSQL
docker-compose logs postgres

# Reiniciar solo la base de datos
docker-compose restart postgres

# Si es necesario resetear (¡elimina todos los datos!)
docker-compose down -v
docker-compose up -d
```

### Puerto ya en uso

Si algún puerto está ocupado, edita `docker-compose.yml`:

```yaml
services:
  web:
    ports:
      - "3001:3000"  # Cambiar puerto externo
```

## Contribuir

### Flujo de Trabajo

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit con mensajes descriptivos
4. Push a tu fork (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

### Estándares de Código

**Backend (Java)**:
- Código limpio siguiendo principios SOLID
- Tests unitarios para lógica de negocio
- Tests de integración con Testcontainers
- Documentación en JavaDoc para APIs públicas

**Frontend (TypeScript/React)**:
- Functional components con hooks
- TypeScript strict mode
- Tests con Testing Library
- ESLint + Prettier configurados

### Commits

Usar conventional commits:
```
feat: agregar cálculo de emisiones por agua
fix: corregir bug en autenticación Auth0
docs: actualizar README con nuevas variables
test: agregar tests para módulo de reportes
refactor: mejorar estructura de componentes
```

## Roadmap

### Fase 1 - Completada
- [x] API REST con Spring Boot
- [x] Frontend con Next.js
- [x] Autenticación dual (JWT + Auth0)
- [x] Cálculo de emisiones (electricidad, transporte, residuos)
- [x] Historial con filtros
- [x] Dashboard básico

### Fase 2 - Completada
- [x] Estadísticas y analytics
- [x] Gráficos interactivos
- [x] Exportación de datos
- [x] Contract testing (Pact)
- [x] CI/CD pipeline

### Fase 3 - En Progreso
- [ ] Generación completa de reportes (PDF, CSV, Excel)
- [ ] Sistema de gamificación funcional
- [ ] Notificaciones push
- [ ] PWA (Progressive Web App)

### Fase 4 - Planificado
- [ ] Rate limiting en gateway
- [ ] Caché con Redis
- [ ] Análisis predictivo con ML
- [ ] Recomendaciones personalizadas
- [ ] API pública para terceros

### Fase 5 - Futuro
- [ ] App móvil nativa (React Native)
- [ ] Integración con IoT
- [ ] Blockchain para certificados
- [ ] Marketplace de compensación de carbono

## Licencia

[Especificar licencia del proyecto]

## Contacto y Soporte

- **Issues**: [GitHub Issues](https://github.com/your-repo/ecoestudiante/issues)
- **Documentación**: Ver `/docs` o Swagger UI
- **Email**: [tu-email@ejemplo.com]

## Agradecimientos

- Factores de emisión basados en EPA WARM y GHG Protocol
- Datos de electricidad de [fuente]
- Comunidad de código abierto

---

Desarrollado con dedicación para promover la sostenibilidad estudiantil.
