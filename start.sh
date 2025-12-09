#!/bin/bash
# =============================================================================
# EcoEstudiante - Script de Inicio Automatizado
# =============================================================================
# Este script levanta todo el proyecto de manera profesional y automatizada.
# Ideal para profesores, evaluadores o nuevos desarrolladores.
#
# Uso:
#   ./start.sh              # Levantar todos los servicios
#   ./start.sh --rebuild    # Reconstruir imágenes y levantar
#   ./start.sh --clean      # Limpiar todo y levantar desde cero
# =============================================================================

set -euo pipefail  # Salir en error, variables no definidas, pipe failures

# Colores para output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# Configuración
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly COMPOSE_FILE="docker-compose.yml"
readonly ENV_FILE=".env"
readonly ENV_EXAMPLE=".env.example"

# Flags
REBUILD=false
CLEAN=false

# =============================================================================
# Funciones de Utilidad
# =============================================================================

print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# =============================================================================
# Verificación de Requisitos
# =============================================================================

check_requirements() {
    print_header "Verificando Requisitos del Sistema"
    
    local missing_deps=()
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        missing_deps+=("Docker")
    else
        print_success "Docker instalado: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"
    fi
    
    # Verificar Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        missing_deps+=("Docker Compose")
    else
        if command -v docker-compose &> /dev/null; then
            print_success "Docker Compose instalado: $(docker-compose --version | cut -d' ' -f4 | cut -d',' -f1)"
        else
            print_success "Docker Compose instalado: $(docker compose version --short)"
        fi
    fi
    
    # Verificar que Docker esté corriendo
    if ! docker info &> /dev/null; then
        print_error "Docker no está corriendo. Por favor, inicia Docker Desktop o el daemon de Docker."
        exit 1
    fi
    print_success "Docker está corriendo"
    
    # Verificar permisos de Docker
    if ! docker ps &> /dev/null; then
        print_error "No tienes permisos para ejecutar Docker. Añade tu usuario al grupo 'docker' o ejecuta con sudo."
        exit 1
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        print_error "Faltan las siguientes dependencias: ${missing_deps[*]}"
        print_info "Instala Docker desde: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    echo ""
}

check_ports() {
    print_header "Verificando Puertos Disponibles"
    
    local ports=(5432 5050 6379 18080 8888 3000)
    local occupied_ports=()
    
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 || netstat -an 2>/dev/null | grep -q ":$port.*LISTEN" || ss -lnt 2>/dev/null | grep -q ":$port"; then
            occupied_ports+=($port)
            print_warning "Puerto $port está en uso"
        else
            print_success "Puerto $port disponible"
        fi
    done
    
    if [ ${#occupied_ports[@]} -gt 0 ]; then
        print_warning "Los siguientes puertos están en uso: ${occupied_ports[*]}"
        print_info "Esto puede causar conflictos. Considera detener los servicios que los usan."
        read -p "¿Deseas continuar de todos modos? (s/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
            print_info "Operación cancelada por el usuario"
            exit 0
        fi
    fi
    
    echo ""
}

setup_env_file() {
    print_header "Configurando Archivo de Variables de Entorno"
    
    if [ -f "$ENV_FILE" ]; then
        print_success "Archivo .env ya existe"
        return
    fi
    
    if [ -f "$ENV_EXAMPLE" ]; then
        print_info "Creando .env desde .env.example"
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        print_success "Archivo .env creado"
        print_warning "Revisa y ajusta las variables en .env si es necesario"
    else
        print_warning ".env.example no encontrado. Creando .env con valores por defecto"
        cat > "$ENV_FILE" <<EOF
# Database
POSTGRES_DB=ecoestudiante
POSTGRES_USER=eco
POSTGRES_PASSWORD=eco

# pgAdmin
PGADMIN_EMAIL=admin@ecoestudiante.com
PGADMIN_PASSWORD=admin123

# JWT
JWT_SECRET=YourSecretKeyShouldBeAtLeast256BitsLongForHS512AlgorithmToWorkProperlyAndSecurely

# Auth0 (Opcional - dejar vacío si no se usa)
AUTH0_ISSUER_BASE_URL=
AUTH0_AUDIENCE=https://api.ecoestudiante.com
AUTH0_SECRET=
AUTH0_BASE_URL=http://localhost:3000
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=

# Email (Opcional)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=

# Mapbox (Opcional)
NEXT_PUBLIC_MAPBOX_TOKEN=
EOF
        print_success "Archivo .env creado con valores por defecto"
    fi
    
    echo ""
}

# =============================================================================
# Operaciones Docker
# =============================================================================

clean_previous() {
    print_header "Limpiando Instancias Anteriores"
    
    print_info "Deteniendo contenedores..."
    docker-compose -f "$COMPOSE_FILE" down -v 2>/dev/null || true
    
    print_info "Eliminando imágenes antiguas..."
    docker rmi ecoestudiante-api ecoestudiante-gateway ecoestudiante-web 2>/dev/null || true
    
    print_success "Limpieza completada"
    echo ""
}

build_images() {
    print_header "Construyendo Imágenes Docker"
    
    local build_args=()
    
    if [ "$REBUILD" = true ] || [ "$CLEAN" = true ]; then
        build_args+=("--no-cache")
        print_info "Reconstruyendo imágenes sin caché (esto puede tardar varios minutos)..."
    else
        print_info "Construyendo imágenes (usando caché si está disponible)..."
    fi
    
    if docker-compose -f "$COMPOSE_FILE" build "${build_args[@]}"; then
        print_success "Imágenes construidas correctamente"
    else
        print_error "Error al construir imágenes"
        exit 1
    fi
    
    echo ""
}

start_services() {
    print_header "Iniciando Servicios"
    
    print_info "Levantando todos los servicios..."
    
    if docker-compose -f "$COMPOSE_FILE" up -d; then
        print_success "Servicios iniciados"
    else
        print_error "Error al iniciar servicios"
        exit 1
    fi
    
    echo ""
}

wait_for_services() {
    print_header "Esperando a que los Servicios Estén Listos"
    
    local max_attempts=60
    local attempt=0
    local services=("postgres" "api" "gateway" "web")
    
    for service in "${services[@]}"; do
        attempt=0
        print_info "Esperando a que $service esté listo..."
        
        while [ $attempt -lt $max_attempts ]; do
            if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "healthy\|Up"; then
                if docker-compose -f "$COMPOSE_FILE" exec -T "$service" sh -c "exit 0" 2>/dev/null; then
                    print_success "$service está listo"
                    break
                fi
            fi
            
            attempt=$((attempt + 1))
            echo -n "."
            sleep 2
        done
        
        if [ $attempt -eq $max_attempts ]; then
            print_warning "$service no respondió a tiempo, pero continuando..."
        fi
        
        echo ""
    done
    
    # Espera adicional para que todo esté completamente operativo
    print_info "Esperando 10 segundos adicionales para que todo esté completamente operativo..."
    sleep 10
    
    echo ""
}

show_status() {
    print_header "Estado de los Servicios"
    
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo ""
}

check_auth0_config() {
    # Verificar si Auth0 está configurado
    if [ -f "$ENV_FILE" ]; then
        local auth0_issuer
        local auth0_client_id
        local auth0_client_secret
        
        auth0_issuer=$(grep "^AUTH0_ISSUER_BASE_URL=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
        auth0_client_id=$(grep "^AUTH0_CLIENT_ID=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
        auth0_client_secret=$(grep "^AUTH0_CLIENT_SECRET=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
        
        if [ -n "$auth0_issuer" ] && [ -n "$auth0_client_id" ] && [ -n "$auth0_client_secret" ] && \
           [ "$auth0_issuer" != "" ] && [ "$auth0_client_id" != "" ] && [ "$auth0_client_secret" != "" ]; then
            return 0  # Auth0 está configurado
        fi
    fi
    return 1  # Auth0 no está configurado
}

show_auth0_info() {
    echo -e "${CYAN}🔐 Autenticación Auth0:${NC}"
    
    if check_auth0_config; then
        local auth0_issuer
        local auth0_client_id
        local auth0_audience
        
        auth0_issuer=$(grep "^AUTH0_ISSUER_BASE_URL=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
        auth0_client_id=$(grep "^AUTH0_CLIENT_ID=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
        auth0_audience=$(grep "^AUTH0_AUDIENCE=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
        
        print_success "Auth0 está configurado"
        echo -e "   ${BLUE}Issuer:${NC} ${YELLOW}$auth0_issuer${NC}"
        echo -e "   ${BLUE}Client ID:${NC} ${YELLOW}$auth0_client_id${NC}"
        if [ -n "$auth0_audience" ] && [ "$auth0_audience" != "" ]; then
            echo -e "   ${BLUE}Audience:${NC} ${YELLOW}$auth0_audience${NC}"
        fi
        echo -e "   ${GREEN}✓${NC} Los usuarios pueden iniciar sesión con Auth0"
        echo -e "   ${GREEN}✓${NC} También está disponible autenticación JWT del backend"
    else
        print_warning "Auth0 no está configurado"
        echo -e "   ${YELLOW}Estado:${NC} Usando solo autenticación JWT del backend"
        echo -e "   ${BLUE}Para configurar Auth0:${NC}"
        echo -e "      1. Crea una cuenta en ${BLUE}https://auth0.com${NC}"
        echo -e "      2. Crea una aplicación (Single Page Application)"
        echo -e "      3. Configura las variables en ${YELLOW}.env${NC}:"
        echo -e "         ${CYAN}AUTH0_ISSUER_BASE_URL${NC}=https://tu-dominio.auth0.com"
        echo -e "         ${CYAN}AUTH0_CLIENT_ID${NC}=tu-client-id"
        echo -e "         ${CYAN}AUTH0_CLIENT_SECRET${NC}=tu-client-secret"
        echo -e "         ${CYAN}AUTH0_AUDIENCE${NC}=https://api.ecoestudiante.com"
        echo -e "         ${CYAN}AUTH0_SECRET${NC}=tu-secret-random"
        echo -e "         ${CYAN}AUTH0_BASE_URL${NC}=http://localhost:3000"
        echo -e "      4. Reinicia los servicios: ${BLUE}./start.sh --rebuild${NC}"
    fi
    echo ""
}

show_urls() {
    print_header "URLs y Accesos del Sistema"
    
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🌐 Aplicación Web:${NC}"
    echo -e "   ${BLUE}http://localhost:3000${NC}"
    echo ""
    echo -e "${CYAN}🔌 API Gateway:${NC}"
    echo -e "   ${BLUE}http://localhost:8888${NC}"
    echo ""
    echo -e "${CYAN}⚙️  API Backend:${NC}"
    echo -e "   ${BLUE}http://localhost:18080${NC}"
    echo -e "   ${BLUE}http://localhost:18080/actuator/health${NC} (Health Check)"
    echo -e "   ${BLUE}http://localhost:18080/swagger-ui.html${NC} (Swagger UI)"
    echo ""
    echo -e "${CYAN}🗄️  Base de Datos:${NC}"
    echo -e "   ${BLUE}PostgreSQL:${NC} localhost:5432"
    echo -e "   ${BLUE}pgAdmin:${NC} http://localhost:5050"
    echo ""
    echo -e "${CYAN}📊 Credenciales por Defecto:${NC}"
    echo -e "   ${BLUE}pgAdmin:${NC}"
    echo -e "      Email: ${YELLOW}admin@ecoestudiante.com${NC}"
    echo -e "      Password: ${YELLOW}admin123${NC}"
    echo ""
    echo -e "   ${BLUE}PostgreSQL:${NC}"
    echo -e "      Database: ${YELLOW}ecoestudiante${NC}"
    echo -e "      User: ${YELLOW}eco${NC}"
    echo -e "      Password: ${YELLOW}eco${NC}"
    echo ""
    echo -e "${CYAN}🔑 Panel de Administración:${NC}"
    echo -e "   ${BLUE}http://localhost:3000/admin/login${NC}"
    echo -e "   ${YELLOW}Nota:${NC} Necesitas crear un usuario con rol ADMIN en la base de datos"
    echo ""
    
    # Información sobre Auth0
    show_auth0_info
    
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

show_commands() {
    print_header "Comandos Útiles"
    
    echo -e "${CYAN}Ver logs de todos los servicios:${NC}"
    echo -e "   ${BLUE}docker-compose logs -f${NC}"
    echo ""
    echo -e "${CYAN}Ver logs de un servicio específico:${NC}"
    echo -e "   ${BLUE}docker-compose logs -f api${NC}"
    echo -e "   ${BLUE}docker-compose logs -f gateway${NC}"
    echo -e "   ${BLUE}docker-compose logs -f web${NC}"
    echo ""
    echo -e "${CYAN}Detener todos los servicios:${NC}"
    echo -e "   ${BLUE}docker-compose down${NC}"
    echo ""
    echo -e "${CYAN}Detener y eliminar volúmenes:${NC}"
    echo -e "   ${BLUE}docker-compose down -v${NC}"
    echo ""
    echo -e "${CYAN}Reiniciar un servicio:${NC}"
    echo -e "   ${BLUE}docker-compose restart api${NC}"
    echo ""
    echo -e "${CYAN}Ver estado de los servicios:${NC}"
    echo -e "   ${BLUE}docker-compose ps${NC}"
    echo ""
}

# =============================================================================
# Función Principal
# =============================================================================

main() {
    # Parsear argumentos
    while [[ $# -gt 0 ]]; do
        case $1 in
            --rebuild)
                REBUILD=true
                shift
                ;;
            --clean)
                CLEAN=true
                REBUILD=true
                shift
                ;;
            -h|--help)
                echo "Uso: $0 [OPCIONES]"
                echo ""
                echo "Opciones:"
                echo "  --rebuild    Reconstruir imágenes Docker sin caché"
                echo "  --clean       Limpiar todo y reconstruir desde cero"
                echo "  -h, --help    Mostrar esta ayuda"
                exit 0
                ;;
            *)
                print_error "Opción desconocida: $1"
                echo "Usa --help para ver las opciones disponibles"
                exit 1
                ;;
        esac
    done
    
    # Cambiar al directorio del script
    cd "$SCRIPT_DIR"
    
    # Banner
    clear
    echo -e "${CYAN}"
    cat << "EOF"
  _____                _____ _        _  _         _       _       
 | ____|___  ___ _ __ | ____| |_ _ __(_) |_ _   _| | __ _| |_ ___ 
 |  _| / __|/ _ \ '_ \|  _| | __| '__| | __| | | | |/ _` | __/ _ \
 | |___\__ \  __/ | | | |___| |_| |  | | |_| |_| | | (_| | ||  __/
 |_____|___/\___|_| |_|_____|\__|_|  |_|\__|\__,_|_|\__,_|\__\___|
                                                                   
EOF
    echo -e "${NC}"
    echo -e "${GREEN}Script de Inicio Automatizado${NC}"
    echo ""
    
    # Ejecutar pasos
    check_requirements
    check_ports
    setup_env_file
    
    if [ "$CLEAN" = true ]; then
        clean_previous
    fi
    
    build_images
    start_services
    wait_for_services
    show_status
    show_urls
    show_commands
    
    print_header "¡Todo Listo!"
    print_success "El proyecto EcoEstudiante está corriendo correctamente"
    print_info "Abre tu navegador en: ${BLUE}http://localhost:3000${NC}"
    echo ""
}

# Ejecutar función principal
main "$@"






