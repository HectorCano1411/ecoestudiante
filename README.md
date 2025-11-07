# EcoEstudiante Platform

> Plataforma integral para cálculo, seguimiento y análisis de la huella de carbono de estudiantes. Incluye backend Spring Boot, frontend Next.js 15 y flujos de autenticación unificados (JWT propio y Auth0).

## Tabla de contenidos

- [Arquitectura general](#arquitectura-general)
- [Características clave](#características-clave)
- [Stack tecnológico](#stack-tecnológico)
- [Requisitos previos](#requisitos-previos)
- [Instalación y puesta en marcha](#instalación-y-puesta-en-marcha)
  - [Base de datos PostgreSQL](#base-de-datos-postgresql)
  - [Backend (Spring Boot)](#backend-spring-boot)
  - [Frontend (Nextjs)](#frontend-nextjs)
- [Configuración de autenticación](#configuración-de-autenticación)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Flujos funcionales](#flujos-funcionales)
- [Pruebas](#pruebas)
- [Buenas prácticas y lineamientos](#buenas-prácticas-y-lineamientos)
- [Próximos pasos sugeridos](#próximos-pasos-sugeridos)

## Arquitectura general

```
┌────────────────────────────────────────┐
│                  Web                   │
│  Next.js 15 + React 19 + Auth0 SDK     │
│  - Dashboard, formularios, analítica   │
│  - API Routes como BFF                 │
└───────────────▲───────────────┬────────┘
                │               │
        Solicitudes proxy       │
                │               │ Token Bearer (Auth0/JWT)
                │               ▼
┌───────────────┴────────────────────────┐
│             ecoestudiante-api           │
│ Spring Boot + Spring Security           │
│  - Cálculos de huella (electricidad,    │
│    transporte)                          │
│  - Servicios de estadísticas            │
│  - TokenUtil unificado (Auth0 + JWT)    │
└───────────────▲────────────────────────┘
                │ JDBC / Flyway
                │
┌───────────────┴────────────────────────┐
│               PostgreSQL                │
│  - Persistencia de cálculos             │
│  - Historial e indicadores              │
└─────────────────────────────────────────┘
```

## Características clave

- **Autenticación unificada**: login tradicional (JWT propio) y social login vía Auth0; ambos emiten tokens válidos en todo el backend.
- **Cálculo de emisiones**: formularios para electricidad y transporte con validaciones, idempotencia y normalización de `userId` (Auth0 `sub` → UUID).
- **Analítica avanzada**: dashboard con tarjetas de resumen, gráficos temporales y por categoría, filtros combinables (jornada, carrera, mes, día, categorías) y sidebar dinámico.
- **Idempotencia y normalización**: claves idempotentes por cálculo, conversión determinística de `userId` para almacenamiento consistente.
- **Logging estructurado**: trazabilidad completa de llamadas, errores autenticación y consumo de estadísticas (frontend y backend).
- **Scripts de apoyo**: (opcional) scripts para levantar backend/frontend y configurar PostgreSQL cuando se requiera.

## Stack tecnológico

| Capa        | Tecnología principal                          |
|-------------|-----------------------------------------------|
| Frontend    | Next.js 15, React 19, Auth0 SDK, TailwindCSS* |
| Backend     | Java 17, Spring Boot 3, Spring Security       |
| Persistencia| PostgreSQL 15 (Docker) + JDBC/Flyway          |
| Autenticación | JWT HS512 + Auth0 (OIDC)                    |
| Utilidades  | Logger propio, API Routes BFF, TokenUtil      |

\* *TailwindCSS está preparado pero puedes optar por MUI si deseas migrar los gráficos a MUI X Charts.*

## Requisitos previos

- **Node.js ≥ 18** (recomendado 18.x LTS)
- **npm ≥ 9** o **pnpm**
- **Java 17** (Temurin o OpenJDK)
- **Maven ≥ 3.9** (`mvn -v`)
- **Docker** (para PostgreSQL en contenedor) o PostgreSQL nativo
- Cuenta y aplicación en **Auth0** (para social login)

## Instalación y puesta en marcha

Clona el repositorio y entra al directorio raíz:

```bash
git clone git@github.com:<tu_usuario>/ecoestudiante.git
cd ecoestudiante
```

### Base de datos PostgreSQL

Levanta PostgreSQL en Docker:

```bash
docker run -d \
  --name ecoestudiante-db \
  -e POSTGRES_DB=ecoestudiante \
  -e POSTGRES_USER=eco \
  -e POSTGRES_PASSWORD=eco \
  -p 5432:5432 \
  postgres:15-alpine
```

Verifica que el contenedor esté activo: `docker ps | grep ecoestudiante-db`.

### Backend (Spring Boot)

1. Crea el archivo `ecoestudiante-api/src/main/resources/application-dev.properties` (si no existe) con tus variables.
2. Ejecuta:

```bash
cd ecoestudiante-api
mvn clean spring-boot:run -Dspring-boot.run.profiles=dev
```

El backend correrá en `http://localhost:18080`.

### Frontend (Next.js)

1. Copia `.env.example` a `.env.local` dentro de `ecoestudiante-web` y completa las variables (ver sección de autenticación).
2. Ejecuta:

```bash
cd ../ecoestudiante-web
npm install
npm run dev
```

Frontend disponible en `http://localhost:3000`.

## Configuración de autenticación

### Backend

`ecoestudiante-api/src/main/resources/application.properties` expone propiedades clave:

```properties
jwt.secret=<clave_hs512_de_>=256bits
jwt.expiration=86400000          # 24 h
jwt.refresh-expiration=604800000 # 7 días
auth0.audience=https://api.ecoestudiante.com
auth0.issuer=https://<tu-dominio>.auth0.com/
```

`TokenUtil` detecta si el token proviene de Auth0 o del propio backend y normaliza automáticamente `userId` → UUID.

### Frontend (.env.local recomendado)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000   # proxy Next.js
BACKEND_URL=http://localhost:18080
AUTH0_SECRET=<Random string>
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://<tu-dominio>.auth0.com
AUTH0_CLIENT_ID=<client-id>
AUTH0_CLIENT_SECRET=<client-secret>
AUTH0_AUDIENCE=https://api.ecoestudiante.com
```

## Estructura del repositorio

```
ecoestudiante/
├── ecoestudiante-api/        # Backend Spring Boot
│   ├── src/main/java/com/ecoestudiante
│   │   ├── auth/             # TokenUtil, JwtUtil, filtros de seguridad
│   │   ├── calc/             # Controladores y servicios de cálculos
│   │   └── stats/            # Estadísticas y analítica
│   └── src/main/resources/   # configs, Flyway migrations
├── ecoestudiante-web/        # Frontend Next.js
│   ├── src/app/              # Páginas y API routes (BFF)
│   ├── src/components/       # Formulario electricidad, sidebar, etc.
│   └── src/lib/              # Cliente API, logger
└── README.md                 # Este documento
```

## Flujos funcionales

1. **Onboarding & Login**
   - Auth tradicional: `/api/auth/jwt-login` → tokens guardados en LocalStorage.
   - Auth0: flujo OIDC con scopes `openid profile email read:carbon write:carbon`.

2. **Registro de huella**
   - Formularios de electricidad y transporte validan datos antes de llamar al backend.
   - `Idempotency-Key` evita duplicidad.
   - El backend normaliza `userId` y persiste resultados + auditoría.

3. **Analítica**
   - Dashboard `/dashboard`: tarjetas resumen + formularios.
   - Página `/analytics`: gráficos temporales (Area/Bar), por categoría (Pie/Bar) y sidebar de filtros dinámicos (jornada, carrera, mes, día, categorías/subcategorías).
   - API routes (`/api/stats/*`) actúan como BFF, reenvían tokens al backend.

## Pruebas

- **Backend:** puedes añadir pruebas unitarias/integración con JUnit. Ejecuta `mvn test`.
- **Frontend:** Jest y Testing Library están configurados (`npm run test`).
- **Manual:** verifica flujos críticos (login JWT/Auth0, cálculos electricidad/transporte, filtros de analytics, historial).

## Buenas prácticas y lineamientos

- Mantén las claves sensibles fuera del repo (`.env*`).
- Los scripts `.sh` están ignorados por defecto; reutilízalos localmente si los necesitas.
- Los archivos Markdown personales se almacenan fuera del repo (`/home/hectorcanoleal/md-notas/` o similar).
- Usa `git status` antes de commitear; el frontend y backend viven en el mismo repositorio.
- Para integraciones adicionales (ej. MUI X Charts) recuerda actualizar README y dependencias.

## Próximos pasos sugeridos

- Migrar gráficos de Recharts a MUI X Charts para un look & feel homogéneo con Material UI.
- Añadir pruebas e2e (Playwright/Cypress) para flujos completos de cálculo y dashboard.
- Implementar pipeline CI/CD (GitHub Actions) con stages: lint → test → build → deploy.
- Añadir cobertura de métricas (Prometheus/Grafana) y monitoreo de logs.
- Extender categorías de huella (alimentación, residuos, agua) reutilizando el esquema actual.

---

¿Dudas o mejoras? Abre un issue o crea un branch con tu propuesta. Mantén siempre sincronizado `main` con origin antes de empujar cambios (`git pull --rebase`).

