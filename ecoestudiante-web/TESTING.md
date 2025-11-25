# 🧪 Guía de Testing Local

Esta guía te ayudará a ejecutar tests en local antes de subir cambios al repositorio.

## 📋 Comandos Disponibles

### Tests Básicos

```bash
# Ejecutar todos los tests una vez
npm test

# Ejecutar tests en modo watch (se ejecutan automáticamente al cambiar archivos)
npm run test:watch

# Ejecutar tests con cobertura de código
npm run test:coverage

# Ejecutar solo tests unitarios (excluye contract tests)
npm run test:unit

# Ejecutar solo contract tests (Pact)
npm run test:contract
```

### Tests Específicos

```bash
# Ejecutar un archivo de test específico
npm test -- src/__tests__/auth.test.ts

# Ejecutar tests que coincidan con un patrón
npm test -- --testNamePattern="debe retornar"

# Ejecutar tests de un directorio específico
npm test -- src/__tests__/

# Ejecutar un test específico por nombre
npm test -- -t "debe retornar null si no hay sesión"
```

### Linting

```bash
# Verificar errores de ESLint
npm run lint

# Corregir errores automáticamente (cuando sea posible)
npm run lint:fix
```

### Verificación Completa (Pre-Push)

```bash
# Ejecutar lint + tests con cobertura (simula CI/CD)
npm run test:ci
```

## 🔄 Flujo de Trabajo Recomendado

### Durante el Desarrollo

1. **Mientras escribes código:**
   ```bash
   # En una terminal separada, ejecuta tests en modo watch
   npm run test:watch
   ```
   Esto ejecutará automáticamente los tests relevantes cuando guardes cambios.

2. **Antes de hacer commit:**
   ```bash
   # Verificar que todo esté bien
   npm run lint
   npm test
   ```

3. **Antes de hacer push:**
   ```bash
   # Ejecutar verificación completa (como en CI/CD)
   npm run test:ci
   ```

### Ejemplo de Flujo Completo

```bash
# 1. Crear una nueva feature
git checkout -b feature/nueva-funcionalidad

# 2. En una terminal, iniciar watch mode
npm run test:watch

# 3. Escribir código y tests
# Los tests se ejecutarán automáticamente

# 4. Antes de commitear
npm run lint
npm test

# 5. Hacer commit
git add .
git commit -m "feat: nueva funcionalidad"

# 6. Antes de pushear
npm run test:ci

# 7. Push
git push origin feature/nueva-funcionalidad
```

## 🎯 Modo Watch - Atajos de Teclado

Cuando ejecutas `npm run test:watch`, puedes usar estos atajos:

- **`a`** - Ejecutar todos los tests
- **`f`** - Ejecutar solo los tests que fallaron
- **`o`** - Ejecutar solo tests relacionados con archivos modificados (requiere git)
- **`p`** - Filtrar por nombre de archivo (patrón)
- **`t`** - Filtrar por nombre de test (patrón)
- **`q`** - Salir del modo watch
- **`Enter`** - Ejecutar tests

## 📊 Entendiendo la Cobertura

```bash
npm run test:coverage
```

Esto generará:
- Un reporte en la terminal
- Un reporte HTML en `coverage/lcov-report/index.html`

Para ver el reporte HTML:
```bash
# En Linux/Mac
open coverage/lcov-report/index.html

# O simplemente abre el archivo en tu navegador
```

## 🐛 Debugging Tests

### Ver output detallado

```bash
npm test -- --verbose
```

### Ejecutar un solo test y ver output

```bash
npm test -- src/__tests__/auth.test.ts --verbose
```

### Ejecutar tests y mantener el proceso activo

```bash
npm test -- --watchAll
```

## ⚙️ Configuración de Pre-commit (Opcional)

Para ejecutar tests automáticamente antes de cada commit, puedes usar `husky`:

```bash
# Instalar husky
npm install --save-dev husky

# Configurar pre-commit hook
npx husky init
echo "npm run pre-commit" > .husky/pre-commit
```

Esto ejecutará `lint` y `test` automáticamente antes de cada commit.

## 🔍 Troubleshooting

### Tests fallan localmente pero pasan en CI

1. Limpia el caché de Jest:
   ```bash
   npm test -- --clearCache
   ```

2. Reinstala dependencias:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Tests muy lentos

- Usa `test:watch` con modo `o` (solo archivos modificados)
- Ejecuta tests específicos en lugar de toda la suite
- Verifica que no haya tests que esperen timeouts innecesarios

### Problemas con mocks

- Verifica que los mocks estén en `jest.setup.ts` o en el archivo de test
- Asegúrate de limpiar mocks entre tests con `beforeEach(() => jest.clearAllMocks())`

## 📝 Mejores Prácticas

1. **Ejecuta tests frecuentemente**: No esperes hasta el final
2. **Usa watch mode**: Te ahorra tiempo durante el desarrollo
3. **Escribe tests primero (TDD)**: Ayuda a pensar en el diseño
4. **Mantén tests rápidos**: Tests lentos desincentivan su ejecución
5. **Un test, una cosa**: Tests específicos son más fáciles de debuggear

## 🚀 Integración con CI/CD

Los tests que pasan localmente deberían pasar en CI/CD. Si hay diferencias:

1. Verifica que las variables de entorno estén configuradas
2. Asegúrate de usar `npm ci` en CI (no `npm install`)
3. Verifica que la versión de Node.js sea la misma

---

**¿Preguntas?** Revisa la documentación de Jest: https://jestjs.io/docs/getting-started



