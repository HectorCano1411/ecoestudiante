# 🗑️ Cómo Eliminar Archivos del Repositorio Git

## 📋 Situaciones Comunes

### 1️⃣ Archivos que YA están en el repositorio remoto (eliminar del historial)

Si subiste archivos por error y quieres eliminarlos del repositorio:

```bash
# Eliminar archivo del repositorio (pero mantenerlo localmente)
git rm --cached nombre-archivo.md

# Eliminar archivo completamente (del repo y localmente)
git rm nombre-archivo.md

# Eliminar directorio completo
git rm -r nombre-directorio/

# Agregar al .gitignore para que no se suba de nuevo
echo "nombre-archivo.md" >> .gitignore

# Hacer commit
git add .gitignore
git commit -m "chore: Eliminar archivos no deseados del repositorio"

# Subir cambios
git push
```

### 2️⃣ Archivos en staging pero NO commitados (quitar del staging)

Si agregaste archivos con `git add` pero aún no hiciste commit:

```bash
# Quitar archivo del staging (pero mantenerlo en el directorio)
git reset HEAD nombre-archivo.md

# Quitar todos los archivos del staging
git reset HEAD

# Ver qué archivos están en staging
git status
```

### 3️⃣ Archivos que NO quieres que se suban nunca (agregar a .gitignore)

Si quieres evitar que ciertos archivos se suban en el futuro:

```bash
# Editar .gitignore
nano .gitignore

# Agregar el patrón (ejemplos):
*.md              # Todos los archivos .md
SOLUCION_*.md      # Archivos que empiezan con SOLUCION_
*.log              # Todos los archivos .log
carpeta/           # Todo el directorio
```

### 4️⃣ Eliminar archivos del historial completo (historial limpio)

⚠️ **CUIDADO**: Esto reescribe el historial. Solo si es necesario:

```bash
# Eliminar archivo del historial completo
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch nombre-archivo.md" \
  --prune-empty --tag-name-filter cat -- --all

# O usar git-filter-repo (más moderno)
git filter-repo --path nombre-archivo.md --invert-paths

# Forzar push (¡CUIDADO! Esto reescribe el historial)
git push origin --force --all
```

## 🎯 Ejemplos Prácticos

### Eliminar archivos .md de documentación temporal

```bash
# Eliminar archivos específicos
git rm --cached SOLUCION_*.md ANALISIS_*.md

# Agregar al .gitignore
echo "SOLUCION_*.md" >> .gitignore
echo "ANALISIS_*.md" >> .gitignore

# Commit y push
git add .gitignore
git commit -m "chore: Eliminar archivos de documentación temporal"
git push
```

### Eliminar scripts temporales

```bash
# Eliminar script temporal
git rm --cached fix-admin-dashboard.sh

# Ya está en .gitignore (*.sh excepto start.sh)
git add .gitignore
git commit -m "chore: Eliminar script temporal"
git push
```

### Eliminar archivos SQL de prueba

```bash
# Eliminar archivos SQL
git rm --cached update_user_role.sql test-*.sql

# Agregar al .gitignore
echo "*.sql" >> .gitignore
echo "!**/migration/*.sql" >> .gitignore  # Excepto migraciones

git add .gitignore
git commit -m "chore: Eliminar scripts SQL temporales"
git push
```

## 📝 Comandos Útiles

```bash
# Ver qué archivos están siendo rastreados
git ls-files

# Ver archivos que están en staging
git diff --cached --name-only

# Ver archivos modificados pero no en staging
git diff --name-only

# Ver todos los archivos (rastreados y no rastreados)
git status

# Ver tamaño de archivos en el repositorio
git ls-files | xargs du -h | sort -h
```

## ⚠️ Advertencias Importantes

1. **`git rm --cached`**: Elimina del repositorio pero mantiene el archivo localmente
2. **`git rm`**: Elimina del repositorio Y del sistema de archivos local
3. **`--force` en push**: Reescribe el historial, puede afectar a otros colaboradores
4. **Backup**: Siempre haz backup antes de eliminar archivos importantes

## 🔄 Deshacer Cambios

Si te equivocaste:

```bash
# Deshacer git rm (antes del commit)
git reset HEAD nombre-archivo.md
git checkout -- nombre-archivo.md

# Recuperar archivo eliminado (después del commit)
git checkout HEAD~1 -- nombre-archivo.md

# Deshacer último commit (mantener cambios)
git reset --soft HEAD~1

# Deshacer último commit (eliminar cambios)
git reset --hard HEAD~1
```

## 🎯 Recomendación

Para tu caso específico (eliminar archivos .md de documentación temporal):

```bash
# 1. Ver qué archivos .md hay en el repo
git ls-files | grep "\.md$"

# 2. Eliminar los que no quieres (ejemplo)
git rm --cached SOLUCION_*.md ANALISIS_*.md PLAN_*.md

# 3. Agregar patrón al .gitignore
cat >> .gitignore << EOF
# Documentación temporal
SOLUCION_*.md
ANALISIS_*.md
PLAN_*.md
EOF

# 4. Commit y push
git add .gitignore
git commit -m "chore: Eliminar documentación temporal del repositorio"
git push
```
