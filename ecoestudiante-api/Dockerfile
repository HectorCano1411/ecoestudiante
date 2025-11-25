# =============================================================================
# EcoEstudiante API - Dockerfile Multi-Stage
# =============================================================================
# Alineado con la arquitectura de la tesis:
# - Puerto interno: 8080
# - JVM optimizada para contenedores
# - Health checks para orquestación
# =============================================================================

# Stage 1: Build
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# Copiar archivos de Maven primero (para cache de dependencias)
COPY pom.xml .

# Descargar dependencias (caché de Docker)
RUN mvn dependency:go-offline -B

# Copiar código fuente
COPY src ./src

# Compilar y empaquetar (sin tests - se ejecutan en CI/CD)
RUN mvn clean package -DskipTests -B

# Stage 2: Runtime
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Instalar wget para health checks
RUN apk add --no-cache wget

# Crear usuario no root para seguridad
RUN addgroup -S spring && adduser -S spring -G spring

# Copiar JAR desde stage de build
COPY --from=build --chown=spring:spring /app/target/*.jar app.jar

# Cambiar a usuario no root
USER spring:spring

# Puerto expuesto (coherente con tesis: 8080 para servicios internos)
EXPOSE 8080

# Health check para orquestadores (Docker Compose, Kubernetes)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# Configuración JVM optimizada para contenedores
# - UseZGC: Garbage Collector de baja latencia
# - UseContainerSupport: Detecta límites de memoria del contenedor
# - MaxRAMPercentage: Usa 75% de la RAM disponible
ENTRYPOINT ["java", \
  "-XX:+UseZGC", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
