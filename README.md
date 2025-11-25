# EcoEstudiante Platform

> **Plataforma enterprise para cálculo, monitoreo y análisis de huella de carbono estudiantil con arquitectura de microservicios, orquestación Docker y observabilidad distribuida.**

Sistema robusto de gestión ambiental diseñado con Domain-Driven Design (DDD), implementando bounded contexts para cálculo de emisiones, gamificación, reportería y analítica. Incluye autenticación híbrida (JWT + OAuth2/OIDC), API Gateway con rate limiting, y preparado para observabilidad con OpenTelemetry.

[![Java 17](https://img.shields.io/badge/Java-17-orange.svg)](https://openjdk.org/projects/jdk/17/)
[![Spring Boot 3.3](https://img.shields.io/badge/Spring%20Boot-3.3-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://docs.docker.com/compose/)

---

## 📋 Tabla de Contenidos

- [Arquitectura General](#-arquitectura-general)
- [Estado del Proyecto](#-estado-del-proyecto)
- [Stack Tecnológico](#-stack-tecnológico)
- [Bounded Contexts (DDD)](#-bounded-contexts-ddd)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación Rápida](#-instalación-rápida)
- [Despliegue con Docker](#-despliegue-con-docker)
- [Arquitectura de Autenticación](#-arquitectura-de-autenticación)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Guías de Desarrollo](#-guías-de-desarrollo)
- [Testing](#-testing)
- [Roadmap](#-roadmap)
- [Contribución](#-contribución)

---

## 🏗️ Arquitectura General

### Arquitectura de Microservicios con API Gateway

```
┌──────────────────────────────────────────────────────────────┐
│                        NAVEGADOR                              │
│                    http://localhost:3000                      │
└────────────────────────────┬─────────────────────────────────┘
                             │
                    Peticiones HTTP/HTTPS
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                    ecoestudiante-web                          │
│              Next.js 15 + React 19 (SSR/SSG)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - Dashboard Analytics + Visualizaciones              │   │
│  │  - Formularios de Cálculo (Electricidad/Transporte)   │   │
│  │  - API Routes como Backend-for-Frontend (BFF)         │   │
│  │  - PWA con Service Workers y Offline Support          │   │
│  └──────────────────────────────────────────────────────┘   │
│                   Puerto: 3000                                │
└────────────────────────────┬─────────────────────────────────┘
                             │
              Token Bearer (JWT HS512 / Auth0)
                             │
┌────────────────────────────▼─────────────────────────────────┐
│              ecoestudiante-gateway (API Gateway)              │
│            Spring Cloud Gateway 4.x (WebFlux)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ✓ Rate Limiting con Redis (Token Bucket)            │   │
│  │  ✓ JWT Validation (HS512 + Auth0 Hybrid)             │   │
│  │  ✓ Request Routing a Bounded Contexts                │   │
│  │  ✓ Circuit Breaker (Resilience4j)                    │   │
│  │  ✓ Logging & Tracing (OpenTelemetry ready)           │   │
│  └──────────────────────────────────────────────────────┘   │
│                   Puerto: 8888                                │
└─────────┬───────────┬──────────────┬─────────────────────────┘
          │           │              │
   ┌──────▼──┐  ┌─────▼────┐  ┌──────▼──────┐
   │  Calc   │  │   Gam    │  │  Reports    │
   │ Context │  │ Context  │  │  Context    │
   └──────┬──┘  └─────┬────┘  └──────┬──────┘
          │           │              │
┌─────────▼───────────▼──────────────▼─────────────────────────┐
│                   ecoestudiante-api                           │
│           Spring Boot 3.3 + Spring Security 6                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Bounded Contexts:                                    │   │
│  │  • calc/      - Cálculo de emisiones CO2e             │   │
│  │  • gamification/ - Sistema de puntos y logros         │   │
│  │  • reports/   - Generación de reportes PDF/Excel      │   │
│  │                                                        │   │
│  │  Cross-cutting Concerns:                              │   │
│  │  • auth/      - JWT + Auth0 OAuth2 Resource Server    │   │
│  │  • error/     - Global Exception Handler              │   │
│  │  • audit/     - Event Sourcing de cálculos            │   │
│  └──────────────────────────────────────────────────────┘   │
│                   Puerto: 18080                               │
└────────────────────────────┬─────────────────────────────────┘
                             │
                      JDBC / Flyway
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                    PostgreSQL 16-alpine                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Schemas:                                             │   │
│  │  • public.app_user         - Usuarios y autenticación │   │
│  │  • public.calculation      - Cálculos de CO2e         │   │
│  │  • public.calculation_audit - Event log              │   │
│  │  • public.emission_factor  - Factores de emisión     │   │
│  │  • public.checkin          - Gamification checkins   │   │
│  │  • public.consent          - Consentimientos GDPR    │   │
│  │  • public.report_job       - Jobs de reportería      │   │
│  └──────────────────────────────────────────────────────┘   │
│                   Puerto: 5432                                │
└────────────────────────────┬─────────────────────────────────┘
                             │
                  pgAdmin 4 (localhost:5050)
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                      Redis 7-alpine                           │
│           Cache distribuido para Rate Limiting                │
│                   Puerto: 6379                                │
└───────────────────────────────────────────────────────────────┘
```

### Flujo de Request End-to-End

```
Usuario → Next.js (SSR) → API Gateway → Backend API → PostgreSQL
   ↓                          ↓              ↓
Browser         Rate Limit Check    JWT Validation
Cache           Circuit Breaker     Business Logic
                                    Event Sourcing
```

---

## 📊 Estado del Proyecto

### ✅ Implementado (Fases 1-2)

| Fase | Componente | Estado | Descripción |
|------|------------|--------|-------------|
| **1** | **Bounded Contexts** | ✅ **Completo** | Separación DDD de calc, gamification, reports |
| **2** | **Docker Compose** | ✅ **Completo** | Orquestación completa de 6 servicios |
| **2** | **API Gateway** | ✅ **Completo** | Spring Cloud Gateway con JWT validation |
| **2** | **Autenticación Híbrida** | ✅ **Completo** | JWT HS512 + Auth0 OAuth2 |
| **2** | **Base de Datos** | ✅ **Completo** | PostgreSQL 16 + Flyway (11 migraciones) |
| **2** | **Frontend PWA** | ✅ **Completo** | Next.js 15 con Service Workers |

### 🚧 En Desarrollo (Fases 3-5)

| Fase | Componente | Estado | Prioridad |
|------|------------|--------|-----------|
| **3** | **OpenTelemetry** | ⏳ Pendiente | Alta |
| **3** | **Distributed Tracing** | ⏳ Pendiente | Alta |
| **4** | **Rate Limiting (Redis)** | ⚡ Infraestructura lista | Media |
| **5** | **Contract Testing (Pact)** | ⏳ Pendiente | Media |
| **5** | **CI/CD Pipeline** | ⏳ Pendiente | Alta |

---

## 🛠️ Stack Tecnológico

### Backend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Java** | 17 (LTS) | Lenguaje base |
| **Spring Boot** | 3.3.4 | Framework principal |
| **Spring Cloud Gateway** | 4.x | API Gateway reactivo |
| **Spring Security** | 6.x | Autenticación/Autorización |
| **Spring Data JPA** | 3.x | Persistencia ORM |
| **Flyway** | 10.17.1 | Migraciones de BD |
| **PostgreSQL Driver** | 42.x | Conector JDBC |
| **OAuth2 Resource Server** | 6.x | Validación Auth0 |
| **Resilience4j** | 2.x (ready) | Circuit Breaker |
| **Lombok** | 1.18.x | Reducción de boilerplate |
| **JUnit 5** | 5.10.x | Testing |
| **Testcontainers** | 1.20.1 | Integration tests |

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Next.js** | 15.x | React Framework (SSR/SSG) |
| **React** | 19.x | UI Library |
| **TypeScript** | 5.x | Type safety |
| **TailwindCSS** | 3.x | Styling utility-first |
| **Auth0 SDK** | 4.x | Autenticación social |
| **Recharts** | 2.x | Visualización de datos |
| **Next-PWA** | 5.x | Progressive Web App |
| **ESLint** | 9.x | Linting |
| **Jest** | 29.x | Testing |

### Infraestructura

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Docker** | 24.x+ | Containerización |
| **Docker Compose** | 2.x+ | Orquestación local |
| **PostgreSQL** | 16-alpine | Base de datos relacional |
| **Redis** | 7-alpine | Cache distribuido |
| **pgAdmin** | 4.x | Admin de PostgreSQL |
| **Kubernetes** | 1.28+ (ready) | Orquestación producción |
| **OpenTelemetry** | 1.x (ready) | Observabilidad |

---

## 🎯 Bounded Contexts (DDD)

### 1. Calculation Context (`/calc`)

**Responsabilidad:** Cálculo de emisiones de CO2e

```
Entidades:
├── Calculation (Aggregate Root)
├── EmissionFactor (Value Object)
└── CalculationAudit (Event)

Servicios:
├── CalcService - Lógica de negocio
├── ElectricityCalculator - Estrategia para electricidad
└── TransportCalculator - Estrategia para transporte

Endpoints:
├── POST /api/v1/calc/electricity
└── POST /api/v1/calc/transport
```

**Características:**
- Idempotencia con `Idempotency-Key` header
- Event Sourcing en `calculation_audit`
- Validaciones con Bean Validation
- Factores de emisión por país/región

### 2. Gamification Context (`/gamification`)

**Responsabilidad:** Sistema de puntos, logros y engagement

```
Entidades:
├── CheckIn (Aggregate Root)
├── Achievement
└── Leaderboard

Servicios:
├── GamificationService
└── AchievementEngine

Endpoints:
├── POST /api/v1/gam/checkin
├── GET /api/v1/gam/achievements
└── GET /api/v1/gam/leaderboard
```

### 3. Reports Context (`/reports`)

**Responsabilidad:** Generación de reportes PDF/Excel

```
Entidades:
└── ReportJob (Aggregate Root)

Servicios:
├── ReportService
├── PDFGenerator
└── ExcelGenerator

Endpoints:
├── POST /api/v1/reports/generate
└── GET /api/v1/reports/{jobId}/download
```

---

## 📦 Requisitos Previos

### Software Requerido

- **Java 17** (Temurin/OpenJDK)
- **Maven 3.9+**
- **Node.js 18.x LTS** o superior
- **npm 9+** o **pnpm 8+**
- **Docker 24.x+** y **Docker Compose 2.x+**
- **Git 2.x+**

### Opcional

- **pgAdmin 4** (si no usas Docker)
- **Redis CLI** (para debugging)
- **Postman/Insomnia** (para testing API)

### Verificación del Entorno

```bash
# Java
java -version  # Debe mostrar 17.x

# Maven
mvn -v  # Debe mostrar 3.9+

# Node.js
node -v  # Debe mostrar v18.x o superior

# Docker
docker --version
docker-compose --version
```

---

## 🚀 Instalación Rápida

### Opción A: Docker Compose (Recomendado)

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/ecoestudiante.git
cd ecoestudiante

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales (Auth0, JWT secret, etc.)

# 3. Levantar todos los servicios
docker-compose up -d --build

# 4. Verificar que todos los contenedores estén healthy
docker-compose ps

# 5. Ver logs en tiempo real
docker-compose logs -f
```

**URLs de acceso:**
- Frontend: http://localhost:3000
- API Gateway: http://localhost:8888
- API Backend: http://localhost:18080
- pgAdmin: http://localhost:5050
- PostgreSQL: localhost:5432

### Opción B: Desarrollo Local (Sin Docker)

```bash
# 1. Levantar PostgreSQL (Docker)
docker run -d \
  --name eco-postgres \
  -e POSTGRES_DB=ecoestudiante \
  -e POSTGRES_USER=eco \
  -e POSTGRES_PASSWORD=eco \
  -p 5432:5432 \
  postgres:16-alpine

# 2. Backend API
cd ecoestudiante-api
mvn clean spring-boot:run -Dspring-boot.run.profiles=dev

# 3. Gateway (en otra terminal)
cd ../ecoestudiante-gateway
mvn clean spring-boot:run -Dspring-boot.run.profiles=dev

# 4. Frontend (en otra terminal)
cd ../ecoestudiante-web
npm install
npm run dev
```

---

## 🐳 Despliegue con Docker

### Servicios Docker Compose

```yaml
services:
  postgres:   # PostgreSQL 16-alpine (puerto 5432)
  pgadmin:    # pgAdmin 4 (puerto 5050)
  redis:      # Redis 7-alpine (puerto 6379)
  api:        # Spring Boot API (puerto 18080)
  gateway:    # Spring Cloud Gateway (puerto 8888)
  web:        # Next.js Frontend (puerto 3000)
```

### Comandos Útiles

```bash
# Iniciar servicios
docker-compose up -d

# Detener servicios
docker-compose down

# Ver logs de un servicio específico
docker-compose logs -f api
docker-compose logs -f gateway
docker-compose logs -f web

# Reiniciar un servicio
docker-compose restart api

# Reconstruir imágenes
docker-compose up -d --build

# Ver estado de contenedores
docker-compose ps

# Ejecutar comando en contenedor
docker exec -it eco-api sh
docker exec -it eco-postgres psql -U eco -d ecoestudiante

# Limpiar todo (⚠️ BORRA DATOS)
docker-compose down -v
```

### Health Checks

```bash
# PostgreSQL
docker exec eco-postgres pg_isready -U eco

# Redis
docker exec eco-redis redis-cli ping

# API
curl http://localhost:18080/actuator/health

# Gateway
curl http://localhost:8888/actuator/health

# Web
curl http://localhost:3000/
```

**Ver documentación completa:** [DOCKER_GUIA.md](DOCKER_GUIA.md)

---

## 🔐 Arquitectura de Autenticación

### Sistema Híbrido: JWT + OAuth2

```
┌─────────────────────────────────────────────────────┐
│           Autenticación Dual (Hybrid)               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────┐      ┌────────────────────┐  │
│  │  JWT Propio     │      │   Auth0 (OAuth2)   │  │
│  │  (HS512)        │      │   OIDC             │  │
│  └────────┬────────┘      └─────────┬──────────┘  │
│           │                         │              │
│           ▼                         ▼              │
│  ┌─────────────────────────────────────────────┐  │
│  │      ReactiveJwtDecoder (Gateway)           │  │
│  │  • Valida ambos tipos de tokens             │  │
│  │  • Normaliza claims (userId → UUID)         │  │
│  │  • Inyecta SecurityContext                  │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Configuración JWT (Backend)

```properties
# application.properties
jwt.secret=YourSecretKeyShouldBeAtLeast256BitsLongForHS512AlgorithmToWorkProperlyAndSecurely
jwt.expiration=86400000          # 24 horas
jwt.refresh-expiration=604800000 # 7 días
```

### Configuración Auth0

```env
# .env
AUTH0_ISSUER_BASE_URL=https://tu-dominio.auth0.com
AUTH0_AUDIENCE=https://api.ecoestudiante.com
AUTH0_CLIENT_ID=tu_client_id
AUTH0_CLIENT_SECRET=tu_client_secret
AUTH0_BASE_URL=http://localhost:3000
```

### Endpoints de Autenticación

```bash
# Registro tradicional
POST /api/v1/auth/register
Content-Type: application/json
{
  "email": "user@example.com",
  "password": "SecurePass123@",
  "username": "johndoe",
  "carrera": "ing_informatica",
  "jornada": "diurna"
}

# Login tradicional
POST /api/v1/auth/login
Content-Type: application/json
{
  "username": "johndoe",
  "password": "SecurePass123@"
}

# Respuesta
{
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "type": "Bearer",
  "userId": "uuid",
  "username": "johndoe"
}

# Uso del token
GET /api/v1/calc/history
Authorization: Bearer eyJhbGc...
```

---

## 📁 Estructura del Proyecto

```
ecoestudiante/
├── .github/
│   └── workflows/               # CI/CD pipelines (GitHub Actions)
│       └── ci-cd.yml
│
├── ecoestudiante-api/          # Backend Spring Boot
│   ├── src/main/
│   │   ├── java/com/ecoestudiante/
│   │   │   ├── auth/           # Autenticación y seguridad
│   │   │   │   ├── JwtUtil.java
│   │   │   │   ├── TokenUtil.java
│   │   │   │   └── SecurityConfig.java
│   │   │   │
│   │   │   ├── calc/           # 📦 Calculation Context
│   │   │   │   ├── controller/
│   │   │   │   │   └── CalcController.java
│   │   │   │   ├── service/
│   │   │   │   │   ├── CalcService.java
│   │   │   │   │   └── CalcServiceImpl.java
│   │   │   │   ├── dto/
│   │   │   │   │   └── CalcDtos.java
│   │   │   │   └── exception/
│   │   │   │       └── CalcException.java
│   │   │   │
│   │   │   ├── gamification/   # 📦 Gamification Context
│   │   │   │   ├── controller/
│   │   │   │   ├── service/
│   │   │   │   └── model/
│   │   │   │
│   │   │   ├── reports/        # 📦 Reports Context
│   │   │   │   ├── controller/
│   │   │   │   ├── service/
│   │   │   │   └── generator/
│   │   │   │
│   │   │   ├── error/          # Global Exception Handler
│   │   │   │   └── GlobalExceptionHandler.java
│   │   │   │
│   │   │   └── EcoEstudianteApplication.java
│   │   │
│   │   └── resources/
│   │       ├── application.properties
│   │       ├── application-dev.properties
│   │       ├── application-docker.properties
│   │       └── db/migration/   # Flyway migrations
│   │           ├── V1__init.sql
│   │           ├── V2__emission_factor.sql
│   │           └── ...
│   │
│   ├── Dockerfile
│   ├── .dockerignore
│   └── pom.xml
│
├── ecoestudiante-gateway/      # API Gateway
│   ├── src/main/
│   │   ├── java/com/ecoestudiante/gateway/
│   │   │   ├── SecurityConfig.java
│   │   │   ├── JwtDecoderConfig.java
│   │   │   └── LoggingFilter.java
│   │   │
│   │   └── resources/
│   │       ├── application.yml
│   │       └── application-docker.yml
│   │
│   ├── Dockerfile
│   ├── .dockerignore
│   └── pom.xml
│
├── ecoestudiante-web/          # Frontend Next.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/            # API Routes (BFF pattern)
│   │   │   │   ├── auth/
│   │   │   │   ├── calc/
│   │   │   │   └── stats/
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── history/
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── ElectricityForm.tsx
│   │   │   ├── TransportForm.tsx
│   │   │   └── AnalyticsDashboard.tsx
│   │   │
│   │   └── lib/
│   │       ├── api-client.ts   # Client-side API
│   │       ├── api-server.ts   # Server-side API
│   │       └── auth.ts         # Auth utilities
│   │
│   ├── public/
│   │   ├── manifest.json       # PWA manifest
│   │   └── icons/              # PWA icons
│   │
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml          # Orquestación de servicios
├── .env.example                # Variables de entorno template
├── DOCKER_GUIA.md             # Guía de Docker Compose
├── DOCKER_LOGS.md             # Guía de logs y debugging
└── README.md                  # Este archivo
```

---

## 📚 Guías de Desarrollo

### Flujo de Trabajo Git

```bash
# Crear rama de feature
git checkout -b feature/nueva-funcionalidad

# Commits atómicos
git add .
git commit -m "feat: agregar endpoint de cálculo de transporte"

# Push a origin
git push -u origin feature/nueva-funcionalidad

# Crear Pull Request en GitHub
# Después de review y CI/CD success, merge a main
```

### Agregar Nueva Migración Flyway

```bash
# Crear archivo en ecoestudiante-api/src/main/resources/db/migration/
# Nombre: V<numero>__<descripcion>.sql
# Ejemplo: V12__add_water_consumption.sql

# El número debe ser consecutivo y único
# Flyway ejecutará automáticamente en el próximo startup
```

### Crear Nuevo Bounded Context

```bash
# 1. Crear package en ecoestudiante-api
mkdir -p src/main/java/com/ecoestudiante/nuevo-contexto/{controller,service,dto,exception}

# 2. Agregar ruta en Gateway
# ecoestudiante-gateway/src/main/resources/application.yml
spring:
  cloud:
    gateway:
      routes:
        - id: nuevo-contexto
          uri: ${BACKEND_API_URL:http://api:8080}
          predicates:
            - Path=/api/v1/nuevo/**

# 3. Implementar Controllers, Services, DTOs
# 4. Agregar tests
# 5. Documentar en README
```

---

## 🧪 Testing

### Backend (JUnit 5 + Testcontainers)

```bash
# Ejecutar todos los tests
cd ecoestudiante-api
mvn test

# Tests con cobertura
mvn test jacoco:report

# Ver reporte
open target/site/jacoco/index.html

# Tests de integración
mvn verify
```

### Frontend (Jest + React Testing Library)

```bash
cd ecoestudiante-web
npm run test

# Tests con cobertura
npm run test:coverage

# Tests en modo watch
npm run test:watch
```

### Contract Testing (Pendiente - Fase 5)

```bash
# Pact entre Frontend y Gateway
cd ecoestudiante-web
npm run test:pact

# Verificación en Gateway
cd ecoestudiante-gateway
mvn pact:verify
```

### Manual Testing (Postman)

**Importar colección:** `postman/EcoEstudiante.postman_collection.json`

Endpoints clave:
- Auth: Register, Login, Refresh Token
- Calc: Electricidad, Transporte, History
- Stats: Summary, Time Series, By Category

---

## 🗺️ Roadmap

### Fase 3: Observabilidad (Q1 2025) 🚧

- [ ] Integrar OpenTelemetry Collector
- [ ] Configurar Jaeger para distributed tracing
- [ ] Exportar métricas a Prometheus
- [ ] Dashboards en Grafana
- [ ] Structured logging con ELK Stack

### Fase 4: Optimización (Q2 2025) 🚧

- [ ] Implementar Rate Limiting con Redis
- [ ] Circuit Breaker con Resilience4j
- [ ] Caching distribuido con Redis
- [ ] Compresión de responses (Gzip/Brotli)
- [ ] CDN para assets estáticos

### Fase 5: Calidad y CI/CD (Q2 2025) 🚧

- [ ] Pipeline CI/CD con GitHub Actions
- [ ] Contract Testing con Pact
- [ ] SonarQube para análisis de código
- [ ] Semantic versioning automático
- [ ] Deploy automático a Kubernetes

### Fase 6: Funcionalidades (Q3 2025)

- [ ] Cálculo de huella alimentación
- [ ] Cálculo de huella agua
- [ ] Comparativas inter-campus
- [ ] Exportación de reportes PDF
- [ ] Notificaciones push (PWA)

### Futuro

- [ ] Mobile app (React Native)
- [ ] Integración con IoT sensors
- [ ] Machine Learning para predicciones
- [ ] Blockchain para certificaciones
- [ ] GraphQL API

---

## 👥 Contribución

### Cómo Contribuir

1. Fork el proyecto
2. Crea tu rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'feat: add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Convención de Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: nueva funcionalidad
fix: corrección de bug
docs: cambios en documentación
style: formato, punto y coma, etc.
refactor: refactorización de código
test: agregar tests
chore: cambios en build, CI, etc.
```

### Code Review

Todos los PRs requieren:
- ✅ CI/CD passing
- ✅ Code coverage > 80%
- ✅ Al menos 1 approval
- ✅ Sin conflictos con main

---

## 📄 Licencia

Este proyecto es privado y de uso académico. Todos los derechos reservados © 2024-2025

---

## 🔗 Enlaces Útiles

- **Documentación Spring Boot**: https://docs.spring.io/spring-boot/
- **Next.js Docs**: https://nextjs.org/docs
- **Docker Compose**: https://docs.docker.com/compose/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Auth0**: https://auth0.com/docs

---

## 🆘 Soporte

- **Issues**: https://github.com/tu-usuario/ecoestudiante/issues
- **Email**: soporte@ecoestudiante.com
- **Slack**: #ecoestudiante-dev

---

## 🙏 Agradecimientos

Este proyecto es parte de una tesis de ingeniería enfocada en arquitectura de microservicios y desarrollo sostenible.

**Stack inspirado en:**
- Spring Cloud Netflix (Microservices)
- The Twelve-Factor App
- Domain-Driven Design (Eric Evans)
- Clean Architecture (Robert C. Martin)

---

**Última actualización:** Noviembre 2025 | **Versión:** 0.2.0-SNAPSHOT
