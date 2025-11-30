# 🔧 Solución Final: Error 500 - calc_history no existe

## ⚠️ Problema Crítico Identificado

El error muestra que el código **compilado en Docker** todavía usa `calc_history`, pero el **código fuente** ya está corregido. Esto significa que:

1. ✅ El código fuente está correcto (`calculation`)
2. ❌ El contenedor Docker está usando código compilado antiguo
3. ❌ Necesitas **reconstruir completamente** el contenedor

## 🔍 Análisis del Error

```
ERROR: relation "calc_history" does not exist
at AdminServiceImpl.getDashboardOverview(AdminServiceImpl.java:53)
```

El stack trace muestra línea 53, pero el código fuente actual muestra `calculation`. Esto confirma que Docker está usando una versión compilada antigua.

## ✅ Solución Completa

### Paso 1: Limpiar y Recompilar Localmente (Verificación)

```bash
cd ecoestudiante-api
mvn clean compile
```

### Paso 2: Reconstruir el Contenedor Docker (CRÍTICO)

**IMPORTANTE**: Debes reconstruir el contenedor sin caché para asegurar que use el código actualizado:

```bash
# Opción 1: Reconstruir sin caché (RECOMENDADO)
docker-compose build --no-cache api

# Opción 2: Si la opción 1 no funciona, eliminar todo y reconstruir
docker-compose down
docker-compose build --no-cache api
docker-compose up -d
```

### Paso 3: Verificar que el Código Está Actualizado

Después de reconstruir, verifica los logs:

```bash
docker-compose logs api | grep -i "calc_history"
```

**No debería aparecer ninguna referencia a `calc_history`**.

### Paso 4: Verificar el Código Compilado en el Contenedor

```bash
# Entrar al contenedor
docker exec -it eco-api bash

# Verificar el código compilado (opcional, solo para debugging)
# El código compilado está en /app/target/classes
```

## 🔄 Verificación del Código Fuente

El código fuente actual en `AdminServiceImpl.java` línea 53-57 debería ser:

```java
Long activeStudents = jdbcTemplate.queryForObject(
    """
    SELECT COUNT(DISTINCT user_id) 
    FROM calculation 
    WHERE created_at >= NOW() - INTERVAL '30 days'
    """,
    Long.class
);
```

**NO** debería tener `calc_history`.

## 🐛 Si el Problema Persiste

### Verificar que el Archivo Está Guardado

```bash
cd ecoestudiante-api
grep -n "calc_history" src/main/java/com/ecoestudiante/admin/service/AdminServiceImpl.java
```

**Resultado esperado**: No debería encontrar nada (salida vacía).

### Verificar el Dockerfile

Asegúrate de que el Dockerfile copia el código fuente correctamente:

```dockerfile
COPY src/ /app/src/
```

### Forzar Rebuild Completo

```bash
# Detener todo
docker-compose down -v

# Eliminar imágenes
docker rmi ecoestudiante-api:latest 2>/dev/null || true

# Reconstruir desde cero
docker-compose build --no-cache --pull api

# Iniciar
docker-compose up -d
```

## 📋 Checklist de Verificación

- [ ] Código fuente no tiene `calc_history` (verificado con grep)
- [ ] `mvn clean compile` ejecuta sin errores
- [ ] Contenedor reconstruido con `--no-cache`
- [ ] Logs del contenedor no muestran `calc_history`
- [ ] Dashboard carga correctamente

## 🎯 Comandos Rápidos

```bash
# Todo en uno (recomendado)
cd /home/hectorcanoleal/ecoestudiante
docker-compose down
docker-compose build --no-cache api gateway
docker-compose up -d
docker-compose logs -f api
```

## ⚡ Solución Rápida (Si Tienes Prisa)

```bash
# Reconstruir solo el API sin caché
docker-compose build --no-cache api
docker-compose restart api

# Ver logs en tiempo real
docker-compose logs -f api
```

Luego prueba el dashboard nuevamente.

---

**IMPORTANTE**: El problema es que Docker está usando código compilado antiguo. La solución es reconstruir el contenedor con `--no-cache`.
