# 📊 Análisis Técnico Completo - EcoEstudiante

**Fecha de Análisis:** 2025-01-XX  
**Analista:** Experto en Tecnologías del Proyecto  
**Versión del Proyecto:** 0.1.0-SNAPSHOT

---

## 🎯 Resumen Ejecutivo

**EcoEstudiante** es una plataforma web completa para el cálculo y seguimiento de la huella de carbono de estudiantes universitarios. El sistema está diseñado con una arquitectura de microservicios moderna, utilizando tecnologías de vanguardia tanto en backend como frontend.

### Características Principales:
- ✅ Cálculo de huella de carbono (electricidad, transporte, residuos)
- ✅ Sistema de gamificación con XP, niveles, misiones y leaderboards
- ✅ Dashboard de analytics con visualizaciones avanzadas
- ✅ Autenticación dual (JWT tradicional + Auth0 OAuth2)
- ✅ Panel de administración para gestión de estudiantes
- ✅ API Gateway con rate limiting y seguridad centralizada
- ✅ Testing completo (unitario, integración, contract testing)

---

## 🏗️ Arquitectura del Sistema

### Patrón Arquitectónico
**Microservicios con API Gateway Pattern**

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                       │
│                    Puerto: 3000                              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              API Gateway (Spring Cloud Gateway)              │
│                    Puerto: 8888                              │
│  - Enrutamiento                                             │
│  - Autenticación OAuth2/JWT                                 │
│  - Rate Limiting (Redis)                                    │
│  - Logging y Tracing                                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            Backend API (Spring Boot Monolito Modular)        │
│                    Puerto: 18080                             │
│  - Auth Service                                             │
│  - Calc Service                                             │
│  - Gamification Service                                     │
│  - Reports Service                                          │
│  - Admin Service                                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL 16 (Base de Datos)                   │
│                    Puerto: 5432                              │
│  - Migraciones con Flyway                                   │
│  - 16 versiones de esquema                                  │
└─────────────────────────────────────────────────────────────┘
```

### Componentes del Sistema

#### 1. **Frontend (ecoestudiante-web)**
- **Framework:** Next.js 15.5.5 (React 19.1.0)
- **Lenguaje:** TypeScript 5
- **UI Libraries:**
  - Material-UI (MUI) v7.3.5
  - NextUI v2.6.11
  - TailwindCSS v4
- **Visualización:**
  - ECharts v5.6.0
  - Recharts v3.3.0
  - Mapbox GL v3.16.0 (mapas de movilidad)
- **Autenticación:** Auth0 Next.js SDK v3.3.0
- **Testing:**
  - Jest v29.7.0
  - React Testing Library v16.0.0
  - Pact v13.1.0 (Contract Testing)

#### 2. **API Gateway (ecoestudiante-gateway)**
- **Framework:** Spring Cloud Gateway (Spring Boot 3.3.4)
- **Java:** 17
- **Spring Cloud:** 2023.0.3
- **Funcionalidades:**
  - Enrutamiento dinámico por servicio
  - OAuth2 Resource Server (Auth0)
  - Validación de JWT (Nimbus JOSE JWT)
  - R2DBC para acceso reactivo a PostgreSQL
  - Auto-creación de usuarios Auth0 en BD
  - Logging de requests/responses
- **Testing:**
  - Pact Provider Testing
  - WireMock para mocking
  - JaCoCo (cobertura mínima 80%)

#### 3. **Backend API (ecoestudiante-api)**
- **Framework:** Spring Boot 3.3.4
- **Java:** 17
- **Arquitectura:** Monolito Modular (preparado para microservicios)
- **Módulos Principales:**
  - `auth`: Autenticación, registro, JWT, OAuth2 Google
  - `calc`: Cálculos de huella de carbono
  - `gamification`: XP, niveles, misiones, streaks, leaderboards
  - `reports`: Generación de reportes y exports
  - `admin`: Panel de administración
  - `factors`: Gestión de factores de emisión
- **Base de Datos:**
  - PostgreSQL 16
  - Flyway para migraciones (16 versiones)
  - JDBC tradicional (no JPA)
- **Seguridad:**
  - Spring Security
  - JWT (JJWT 0.12.5)
  - BCrypt para passwords
  - OAuth2 Client (Google)
- **Documentación:**
  - OpenAPI 3.0 (SpringDoc)
  - Swagger UI
- **Testing:**
  - JUnit 5
  - Testcontainers (PostgreSQL)
  - Separación unit/integration tests

#### 4. **Infraestructura**
- **Orquestación:** Docker Compose
- **Base de Datos:** PostgreSQL 16 Alpine
- **Cache:** Redis 7 Alpine (rate limiting)
- **Herramientas:**
  - pgAdmin 4 (gestión BD)
  - Health checks en todos los servicios
- **Ambientes:**
  - Producción: `docker-compose.yml`
  - Desarrollo: `docker-compose.dev.yml` (hot reload)

---

## 🗄️ Modelo de Datos

### Tablas Principales

#### **Core del Sistema**
1. **`app_user`** - Usuarios del sistema
   - Soporta autenticación tradicional (email/password) y Auth0
   - Campos: id (UUID), email, password_hash, role, email_verified, etc.

2. **`calculation`** - Cálculos de huella de carbono
   - Almacena inputs JSONB y resultados en kg CO2e
   - Índice de idempotencia para evitar duplicados

3. **`factor_version`** - Versiones de factores de emisión
   - Sistema de versionado temporal
   - Soporte multi-región (país, nacional, global)

4. **`calculation_audit`** - Auditoría de cálculos
   - Snapshot de factores usados en cada cálculo

#### **Gamificación**
5. **`gamification_profiles`** - Perfiles de gamificación
   - XP total, nivel actual, streaks
   - Relación 1:1 con usuarios

6. **`missions`** - Catálogo de misiones
   - Templates reutilizables e instancias semanales
   - Categorías: ELECTRICITY, TRANSPORT, WASTE, GENERAL, BONUS
   - Tipos: REDUCTION, FREQUENCY, DISCOVERY, BONUS

7. **`mission_progress`** - Progreso en misiones
   - Estado: ACTIVE, COMPLETED, EXPIRED, FAILED
   - Tracking de progreso vs objetivo

8. **`xp_transactions`** - Auditoría de XP
   - Registro de todas las transacciones
   - Fuentes: MISSION_COMPLETE, CALCULATION, STREAK_BONUS, etc.

9. **`leaderboard_cache`** - Cache de rankings semanales
   - Pre-calculado para optimización
   - Métricas: CO2 evitado, misiones completadas, XP semanal

#### **Otros**
10. **`checkin`** - Registros de actividad
11. **`report_job`** - Jobs de generación de reportes
12. **`consent`** - Consentimientos de usuarios

### Migraciones de Base de Datos
- **Total:** 16 migraciones Flyway
- **Estrategia:** Versionado incremental
- **Última migración:** V16 (roles de usuario)

---

## 🔐 Seguridad y Autenticación

### Estrategia Dual de Autenticación

#### 1. **JWT Tradicional**
- Implementación propia con JJWT
- Secret key configurable
- Tokens de acceso y refresh
- Expiración: 24h (access), 7 días (refresh)

#### 2. **Auth0 OAuth2**
- Integración completa con Auth0
- Soporte para múltiples proveedores (Google, etc.)
- Auto-creación de usuarios en BD desde Auth0
- Validación de tokens en Gateway y API

### Flujo de Autenticación

```
Usuario → Frontend (Next.js)
    ↓
Auth0 Login (opcional) o JWT Login
    ↓
Token JWT generado/validado
    ↓
API Gateway valida token
    ↓
Backend API procesa request con UserContext
```

### Seguridad Implementada
- ✅ CORS configurado en Gateway
- ✅ Rate limiting (preparado con Redis)
- ✅ Validación de inputs (Bean Validation)
- ✅ Encriptación de passwords (BCrypt)
- ✅ HTTPS ready (configuración de producción)
- ✅ Middleware de autenticación en Next.js
- ✅ Protección de rutas API

---

## 📊 Funcionalidades Principales

### 1. **Cálculo de Huella de Carbono**
- **Categorías:**
  - Electricidad (kWh, región, mes)
  - Transporte (tipo, distancia, frecuencia)
  - Residuos (tipo, cantidad, frecuencia)
- **Características:**
  - Factores de emisión versionados
  - Soporte multi-región (Chile, nacional, global)
  - Idempotencia en cálculos
  - Historial completo de cálculos

### 2. **Gamificación**
- **Sistema de XP:**
  - Ganancia por cálculos realizados
  - Bonificaciones por misiones completadas
  - Streaks semanales
  - Niveles progresivos
- **Misiones:**
  - Templates reutilizables
  - Asignación semanal automática
  - Tracking de progreso en tiempo real
  - Recompensas por completación
- **Leaderboards:**
  - Rankings semanales
  - Cache pre-calculado
  - Métricas: CO2 evitado, XP, misiones

### 3. **Analytics y Reportes**
- **Dashboard de Analytics:**
  - Visualizaciones con ECharts y Recharts
  - Filtros por categoría, carrera, período
  - Gráficos de series temporales
  - Heatmaps de emisiones
  - Predicciones de tendencias
- **Exportación:**
  - CSV
  - PDF (preparado)
- **Estadísticas:**
  - Por categoría
  - Por carrera
  - Agregados anonimizados

### 4. **Panel de Administración**
- Gestión de estudiantes
- Estadísticas globales
- Exportación de datos
- Visualización de rankings

---

## 🧪 Testing y Calidad

### Estrategia de Testing

#### **Frontend (ecoestudiante-web)**
- **Unit Tests:** Jest + React Testing Library
- **Contract Tests:** Pact (consumer-driven)
- **Coverage:** Configurado con thresholds
- **Linting:** ESLint con configuración Next.js

#### **Backend (ecoestudiante-api)**
- **Unit Tests:** JUnit 5
- **Integration Tests:** Testcontainers (PostgreSQL)
- **Separación:** Surefire (unit) / Failsafe (integration)

#### **Gateway (ecoestudiante-gateway)**
- **Provider Tests:** Pact (verificación de contratos)
- **Unit Tests:** JUnit 5 + Spring Security Test
- **Coverage:** JaCoCo (mínimo 80% requerido)

### CI/CD Pipeline
- **GitHub Actions:**
  - Lint y tests frontend
  - Tests backend (unit + integration)
  - Contract testing (Pact)
  - SAST scanning (Semgrep)
  - Coverage reporting (Codecov)

---

## 🚀 DevOps y Despliegue

### Dockerización
- **Todos los servicios containerizados**
- **Multi-stage builds** para optimización
- **Health checks** en todos los servicios
- **Volúmenes persistentes** para datos

### Ambientes

#### **Producción (`docker-compose.yml`)**
- Builds optimizados
- Variables de entorno desde `.env`
- Redes aisladas
- Restart policies

#### **Desarrollo (`docker-compose.dev.yml`)**
- Hot reload habilitado
- Volúmenes montados para código
- DevTools de Spring Boot
- Next.js dev server
- Caches compartidos (Maven, Next.js)

### Monitoreo
- **Spring Boot Actuator** en API y Gateway
- **Health endpoints** (`/actuator/health`)
- **Metrics** (`/actuator/metrics`)
- **Prometheus** ready (micrometer)

---

## 📦 Dependencias y Tecnologías

### Stack Tecnológico Completo

#### **Backend**
- Spring Boot 3.3.4
- Spring Cloud Gateway 2023.0.3
- Spring Security
- Spring Mail
- PostgreSQL Driver
- Flyway 10.17.1
- JJWT 0.12.5
- Nimbus JOSE JWT 9.37.3
- SpringDoc OpenAPI 2.6.0
- Micrometer Prometheus
- Testcontainers 1.20.1

#### **Frontend**
- Next.js 15.5.5
- React 19.1.0
- TypeScript 5
- Material-UI 7.3.5
- NextUI 2.6.11
- TailwindCSS 4
- ECharts 5.6.0
- Recharts 3.3.0
- Mapbox GL 3.16.0
- Auth0 Next.js SDK 3.3.0
- Framer Motion 11.18.2

#### **Infraestructura**
- Docker & Docker Compose
- PostgreSQL 16 Alpine
- Redis 7 Alpine
- pgAdmin 4
- Maven 3.9
- Node.js 20

---

## 🎨 Frontend - Estructura y Patrones

### Arquitectura Next.js
- **App Router** (Next.js 13+)
- **Server Components** y **Client Components**
- **API Routes** para proxy y server-side logic
- **Middleware** para autenticación

### Estructura de Carpetas
```
src/
├── app/                    # App Router (páginas y API routes)
│   ├── admin/             # Panel de administración
│   ├── analytics/         # Dashboard de analytics
│   ├── api/               # API routes (proxy al backend)
│   ├── dashboard/         # Dashboard principal
│   └── ...
├── components/            # Componentes React reutilizables
│   ├── charts/           # Componentes de visualización
│   ├── gamification/     # Componentes de gamificación
│   └── ...
├── lib/                  # Utilidades y clientes API
├── types/                # TypeScript types
└── utils/                # Funciones auxiliares
```

### Patrones de Diseño
- **Component Composition** (React)
- **Custom Hooks** para lógica reutilizable
- **API Client Pattern** (separación cliente/servidor)
- **Type Safety** completo con TypeScript
- **Theme Management** (next-themes)

---

## 🔄 Flujos de Datos Principales

### 1. Cálculo de Huella de Carbono
```
Usuario completa formulario
    ↓
Frontend valida inputs
    ↓
POST /api/v1/calc/{category}
    ↓
Gateway enruta a Backend API
    ↓
Backend:
  - Valida inputs
  - Obtiene factor de emisión (versión correcta)
  - Calcula kg CO2e
  - Guarda en BD (con idempotencia)
  - Actualiza gamificación (XP)
    ↓
Respuesta con resultado
    ↓
Frontend muestra resultado y actualiza UI
```

### 2. Sistema de Gamificación
```
Usuario completa acción (cálculo, misión, etc.)
    ↓
Backend detecta evento
    ↓
GamificationService procesa:
  - Calcula XP ganado
  - Actualiza perfil (XP, nivel)
  - Verifica progreso en misiones activas
  - Actualiza streaks
  - Registra transacción XP
    ↓
Scheduled Tasks (diario):
  - Recalcula rankings
  - Expira misiones
  - Asigna nuevas misiones semanales
```

### 3. Autenticación Auth0
```
Usuario hace login con Auth0
    ↓
Auth0 redirige a callback
    ↓
Next.js API route procesa callback
    ↓
Crea sesión Auth0
    ↓
Gateway intercepta request
    ↓
Auth0UserAutoCreateFilter:
  - Extrae info del JWT Auth0
  - Verifica si usuario existe en BD
  - Si no existe, lo crea automáticamente
    ↓
Request continúa al backend
```

---

## 📈 Métricas y Observabilidad

### Health Checks
- **API:** `/actuator/health`
- **Gateway:** `/actuator/health`
- **PostgreSQL:** `pg_isready`
- **Redis:** `redis-cli ping`

### Logging
- **Backend:** Logback (Spring Boot)
- **Gateway:** Logging detallado de requests
- **Frontend:** Console logging + middleware logs

### Métricas (Preparado)
- Prometheus endpoints configurados
- Micrometer integrado
- Métricas custom (preparado para implementar)

---

## 🔧 Configuración y Variables de Entorno

### Variables Críticas

#### **Backend API**
- `SPRING_DATASOURCE_URL` - Conexión PostgreSQL
- `JWT_SECRET` - Secret para JWT
- `AUTH0_ISSUER_BASE_URL` - URL de Auth0
- `AUTH0_AUDIENCE` - Audience de Auth0
- `SPRING_MAIL_*` - Configuración SMTP

#### **Gateway**
- `BACKEND_API_URL` - URL del backend
- `AUTH0_ISSUER_BASE_URL` - Validación Auth0
- `SPRING_REDIS_HOST` - Redis para rate limiting
- `DB_*` - Configuración R2DBC

#### **Frontend**
- `NEXT_PUBLIC_API_URL` - URL del Gateway
- `AUTH0_*` - Configuración Auth0
- `NEXT_PUBLIC_MAPBOX_TOKEN` - Token Mapbox

---

## 🎯 Fortalezas del Proyecto

### ✅ Arquitectura
- **Microservicios bien estructurados** con separación clara de responsabilidades
- **API Gateway** centraliza seguridad y enrutamiento
- **Monolito modular** preparado para evolución a microservicios

### ✅ Tecnologías
- **Stack moderno** (Spring Boot 3, Next.js 15, React 19)
- **TypeScript** en todo el frontend
- **Java 17** con features modernas

### ✅ Calidad
- **Testing completo** (unit, integration, contract)
- **CI/CD** automatizado
- **Code coverage** con thresholds
- **SAST scanning** (Semgrep)

### ✅ Seguridad
- **Autenticación dual** (JWT + Auth0)
- **Validación de inputs** en todas las capas
- **CORS** configurado correctamente
- **Rate limiting** preparado

### ✅ Base de Datos
- **Migraciones versionadas** con Flyway
- **Índices optimizados**
- **Auditoría** de transacciones críticas
- **Cache** para rankings

### ✅ UX/UI
- **UI moderna** con Material-UI y NextUI
- **Visualizaciones avanzadas** (ECharts, Recharts)
- **Mapas interactivos** (Mapbox)
- **Responsive design**

---

## ⚠️ Áreas de Mejora y Recomendaciones

### 🔴 Críticas
1. **Secrets en código:** Algunos valores de Auth0 están hardcodeados en docker-compose.yml
   - **Solución:** Mover todos a variables de entorno y `.env.example`

2. **Rate Limiting:** Configurado pero no implementado completamente
   - **Solución:** Implementar Redis-based rate limiting en Gateway

### 🟡 Importantes
3. **Documentación API:** OpenAPI configurado pero podría mejorarse
   - **Solución:** Agregar más ejemplos y descripciones detalladas

4. **Error Handling:** Mejorar mensajes de error para usuarios
   - **Solución:** Implementar códigos de error estandarizados

5. **Monitoring:** Métricas básicas pero falta dashboards
   - **Solución:** Integrar Grafana o similar

6. **Caching:** Solo en leaderboards, podría expandirse
   - **Solución:** Implementar cache para factores de emisión, rankings, etc.

### 🟢 Mejoras Futuras
7. **Performance:**
   - Implementar paginación en todos los endpoints de listado
   - Lazy loading en frontend
   - CDN para assets estáticos

8. **Testing:**
   - Aumentar cobertura de tests E2E
   - Implementar tests de carga (JMeter/Gatling)

9. **Documentación:**
   - README más completo
   - Guías de desarrollo
   - Documentación de API más detallada

10. **Seguridad:**
    - Implementar rate limiting completo
    - Agregar WAF (Web Application Firewall)
    - Implementar DDoS protection

---

## 📚 Convenciones y Estándares

### Código
- **Java:** Convenciones de Spring Boot, Lombok para DTOs
- **TypeScript:** Strict mode, interfaces bien definidas
- **Naming:** camelCase (Java/TS), snake_case (SQL)

### Git
- Branches: `main`, `develop`
- CI/CD en push a `main` y `develop`
- Pull requests requeridos

### Base de Datos
- Migraciones con Flyway (V{number}__{description}.sql)
- Índices en todas las foreign keys
- Constraints para integridad de datos

---

## 🎓 Conclusión

**EcoEstudiante** es un proyecto **bien arquitecturado y moderno**, con una base sólida para escalar. La separación de responsabilidades, el testing completo, y el uso de tecnologías actuales lo posicionan como una solución robusta.

### Puntos Destacados:
- ✅ Arquitectura clara y escalable
- ✅ Stack tecnológico moderno
- ✅ Testing comprehensivo
- ✅ Seguridad bien implementada
- ✅ UX/UI profesional

### Próximos Pasos Recomendados:
1. Implementar rate limiting completo
2. Mejorar documentación
3. Agregar monitoring avanzado
4. Optimizar performance
5. Expandir tests E2E

---

**Fin del Análisis Técnico**
