# EcoEstudiante API (skeleton)
Java 17 + Spring Boot 3 + Maven + Flyway + Testcontainers + OpenAPI + Jib (distroless)

## Requisitos
- Java 17 (temurin)
- Maven 3.9+
- Docker (solo para tests con Testcontainers, opcional)

## Ejecutar en local
```bash
mvn spring-boot:run
# health: http://localhost:8080/healthz
# swagger: http://localhost:8080/swagger-ui.html
```

## Compilar y testear
```bash
mvn -q -DskipTests=false clean verify
```

## Migraciones
Flyway ejecuta `V1__init.sql` al inicio.
Config DB en `src/main/resources/application.properties` (usa env vars en CI/CD).

## Contenedor con Jib (no requiere Dockerfile)
```bash
mvn -Pproduction -DskipTests -Djib.to.image=ghcr.io/ecoestudiante/api:0.1.0 jib:build
```

## Estructura de módulos internos
- `common` (errores/DTOs)
- `factors` (metadatos y versiones de factores)
- `calc` (cálculo y auditoría de factores aplicados)
- `checkins` (registros de acciones del estudiante)
- `reports` (generación asíncrona de reportes)
- `telemetry` (métricas y trazas)

## Próximos pasos sugeridos
- Añadir endpoints reales de `calc` con idempotencia por clave natural.
- Persistir factor aplicado en `calculation_audit`.
- Añadir seguridad (JWT) y rate limiting.
- Pipeline GitLab CI (+ Testcontainers en integración).
