# 🔧 Cómo Activar los Aliases en Warp Terminal

## Problema

Al ejecutar aliases como `dlr`, `dlg`, `dla`, etc. en Warp, obtienes el error:
```
Command 'dlr' not found
```

Esto sucede porque Warp necesita cargar los aliases desde tu `~/.bashrc` en cada nueva sesión.

---

## Solución 1: Recargar `.bashrc` (Temporal)

En tu terminal de Warp, ejecuta:

```bash
source ~/.bashrc
```

**Verificar que funcionó:**
```bash
dlr    # Debería mostrar logs de Redis con colores
dlg    # Debería mostrar logs del Gateway con colores
```

**Limitación:** Esto solo funciona para la sesión actual. Si cierras y abres Warp, tendrás que hacerlo de nuevo.

---

## Solución 2: Configurar Warp para Cargar Aliases Automáticamente (Permanente)

### Paso 1: Verificar si `.bash_profile` existe

```bash
ls -la ~/ | grep bash_profile
```

### Paso 2: Agregar carga de `.bashrc` al inicio de sesión

Si **NO** existe `.bash_profile`, créalo:

```bash
cat > ~/.bash_profile << 'HEREDOC'
# Cargar .bashrc si existe
if [ -f ~/.bashrc ]; then
    source ~/.bashrc
fi
HEREDOC
```

Si **SÍ** existe `.bash_profile`, agrega esta línea al final:

```bash
echo "" >> ~/.bash_profile
echo "# Cargar .bashrc si existe" >> ~/.bash_profile
echo "if [ -f ~/.bashrc ]; then" >> ~/.bash_profile
echo "    source ~/.bashrc" >> ~/.bash_profile
echo "fi" >> ~/.bash_profile
```

### Paso 3: Reiniciar Warp

1. Cierra completamente Warp (no solo la pestaña, sino toda la aplicación)
2. Vuelve a abrir Warp
3. Prueba: `dlr` o `dlg`

**Ahora debería funcionar automáticamente en cada nueva sesión.**

---

## Solución 3: Usar `.zshrc` si prefieres Zsh (Alternativa)

Si prefieres usar Zsh en lugar de Bash:

### Paso 1: Cambiar shell a Zsh

```bash
chsh -s $(which zsh)
```

### Paso 2: Copiar aliases a `.zshrc`

```bash
# Extraer solo los aliases de Docker de .bashrc
grep -A 50 "EcoEstudiante - Aliases" ~/.bashrc >> ~/.zshrc
```

### Paso 3: Reiniciar Warp

1. Cierra completamente Warp
2. Vuelve a abrir Warp
3. Verifica: `echo $SHELL` (debería mostrar `/usr/bin/zsh` o similar)
4. Prueba: `dlr` o `dlg`

---

## Solución 4: Alias Individual para Testing (Rápido)

Si solo quieres probar un alias sin configurar todo, ejecuta directamente en Warp:

```bash
# Definir el alias manualmente (temporal, solo para esta sesión)
alias dlr='clear && ./docker-logs-color.sh redis'
alias dlg='clear && cd /home/hectorcanoleal/ecoestudiante && ./docker-logs-color.sh gateway'
alias dla='clear && cd /home/hectorcanoleal/ecoestudiante && ./docker-logs-color.sh api'

# Ahora prueba
dlr
```

---

## Verificar que los Aliases Están Cargados

Ejecuta este comando para ver todos los aliases de EcoEstudiante:

```bash
alias | grep -E "dlg|dlr|dla|desc-|health-|ip-|docker-"
```

**Deberías ver algo como:**
```
alias dla='clear && cd /home/hectorcanoleal/ecoestudiante && ./docker-logs-color.sh api'
alias dlg='clear && cd /home/hectorcanoleal/ecoestudiante && ./docker-logs-color.sh gateway'
alias dlr='clear && cd /home/hectorcanoleal/ecoestudiante && ./docker-logs-color.sh redis'
alias desc-gateway='docker inspect eco-gateway'
alias health-gateway='docker inspect --format="{{.State.Health.Status}}" eco-gateway'
alias ip-gateway='docker inspect --format="{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" eco-gateway'
...
```

---

## Lista Rápida de Aliases Disponibles

Una vez que funcionen, estos son los 27 aliases disponibles:

### Logs
```bash
dlg        # Gateway logs
dla        # API logs
dlw        # Web logs
dlp        # PostgreSQL logs
dlr        # Redis logs
dlall      # Todos los logs
```

### Describe
```bash
desc-gateway    # Inspect Gateway
desc-api        # Inspect API
desc-web        # Inspect Web
desc-postgres   # Inspect PostgreSQL
desc-redis      # Inspect Redis
desc-pgadmin    # Inspect pgAdmin
```

### Health Checks
```bash
health-gateway  # Health Gateway
health-api      # Health API
health-web      # Health Web
docker-health   # Health todos
```

### IP Addresses
```bash
ip-gateway      # IP Gateway
ip-api          # IP API
ip-web          # IP Web
```

### Utilidades
```bash
docker-status       # Estado (ps)
docker-clean-logs   # Limpiar logs
```

---

## Troubleshooting

### Error: "Command not found" después de `source ~/.bashrc`

**Causa:** Puede haber un error de sintaxis en `.bashrc`.

**Solución:**
```bash
# Ver errores de sintaxis
bash -n ~/.bashrc

# Si hay errores, editar el archivo
nano ~/.bashrc
```

### Los aliases funcionan pero no encuentran el script

**Error típico:**
```
./docker-logs-color.sh: No such file or directory
```

**Causa:** No estás en el directorio correcto.

**Solución:** Los aliases ya incluyen `cd /home/hectorcanoleal/ecoestudiante`, pero verifica que el script existe:
```bash
ls -la /home/hectorcanoleal/ecoestudiante/docker-logs-color.sh
```

Si no existe, algo salió mal con la instalación.

### Warp no carga `.bash_profile` ni `.bashrc`

**Solución:** Configura Warp manualmente:

1. Abre Warp Settings (Cmd+, en Mac o Ctrl+, en Linux)
2. Busca "Shell" o "Startup"
3. Asegúrate de que esté configurado para usar Bash
4. Agrega el comando de inicio: `source ~/.bashrc`

---

## Resumen Recomendado para Ti

**La forma más rápida (temporal):**
```bash
source ~/.bashrc
```

**La forma más permanente (recomendada):**
```bash
# Crear .bash_profile si no existe
cat > ~/.bash_profile << 'HEREDOC'
if [ -f ~/.bashrc ]; then
    source ~/.bashrc
fi
HEREDOC

# Reiniciar Warp completamente
```

---

**Documentación relacionada:**
- [ALIASES_DOCKER.md](ALIASES_DOCKER.md) - Lista completa de 27 aliases
- [DOCKER_LOGS.md](DOCKER_LOGS.md) - Documentación completa
- [CHEATSHEET_LOGS.md](CHEATSHEET_LOGS.md) - Referencia rápida

**Actualizado:** 2025-11-25
