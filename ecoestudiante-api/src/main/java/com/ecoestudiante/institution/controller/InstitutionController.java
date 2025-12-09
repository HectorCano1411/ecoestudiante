package com.ecoestudiante.institution.controller;

import com.ecoestudiante.institution.dto.InstitutionDtos;
import com.ecoestudiante.institution.model.Institution;
import com.ecoestudiante.institution.service.InstitutionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/institutions")
@Tag(name = "Instituciones Educativas", description = "API para gestión de instituciones educativas y campus")
@SecurityRequirement(name = "bearerAuth")
public class InstitutionController {

    private static final Logger logger = LoggerFactory.getLogger(InstitutionController.class);
    private final InstitutionService institutionService;

    private final com.ecoestudiante.auth.JwtUtil jwtUtil;

    public InstitutionController(
            InstitutionService institutionService,
            com.ecoestudiante.auth.JwtUtil jwtUtil) {
        this.institutionService = institutionService;
        this.jwtUtil = jwtUtil;
    }

    /**
     * Extrae el userId del token JWT desde el request
     */
    private UUID getCurrentUserId(HttpServletRequest request) {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                String userId = jwtUtil.extractUserId(token);
                if (userId != null && !userId.isBlank()) {
                    try {
                        return UUID.fromString(userId);
                    } catch (IllegalArgumentException e) {
                        logger.warn("UserId no es un UUID válido: {}", userId);
                    }
                }
            }
        } catch (Exception e) {
            logger.warn("No se pudo extraer userId del token: {}", e.getMessage());
        }
        // Fallback: retornar un UUID por defecto (no debería ocurrir en producción)
        // En producción, esto debería lanzar una excepción
        logger.error("⚠️ No se pudo extraer userId del token - usando UUID por defecto");
        return UUID.fromString("00000000-0000-0000-0000-000000000000");
    }

    // ==================== ENDPOINTS DE INSTITUCIONES ====================

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
        summary = "Listar instituciones",
        description = "Retorna lista paginada de instituciones educativas con filtros opcionales. " +
                     "Acceso público cuando enabled=true, requiere autenticación para otros filtros."
    )
    public ResponseEntity<InstitutionDtos.InstitutionListResponse> getInstitutions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Institution.InstitutionType type,
            @RequestParam(required = false) Boolean enabled) {
        
        // Obtener autenticación del contexto de seguridad (puede ser null para endpoints públicos)
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // Permitir acceso público solo cuando se solicitan instituciones habilitadas (enabled=true)
        // y no hay otros filtros sensibles
        boolean isPublicAccess = enabled != null && enabled && 
                                 (search == null || search.trim().isEmpty()) &&
                                 type == null;
        
        if (!isPublicAccess) {
            // Para otros casos, requiere autenticación
            if (authentication == null || !authentication.isAuthenticated() || 
                authentication.getPrincipal().equals("anonymousUser")) {
                logger.warn("Intento de acceso no autenticado a instituciones con filtros: enabled={}, search={}, type={}", 
                           enabled, search, type);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            // Verificar roles para acceso completo
            boolean hasRequiredRole = authentication.getAuthorities().stream()
                    .anyMatch(auth -> {
                        String authority = auth.getAuthority().replace("ROLE_", "");
                        return authority.equals("ADMIN") || 
                               authority.equals("SUPER_ADMIN") || 
                               authority.equals("PROFESOR");
                    });
            
            if (!hasRequiredRole) {
                logger.warn("Usuario sin rol requerido intentó acceder a instituciones: {}", 
                           authentication.getName());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        
        String currentUserRole = (authentication != null && authentication.isAuthenticated() && 
                                 !authentication.getPrincipal().equals("anonymousUser")) ? 
                authentication.getAuthorities().stream()
                        .findFirst()
                        .map(auth -> auth.getAuthority().replace("ROLE_", ""))
                        .orElse("PUBLIC") : "PUBLIC";
        
        logger.info("Solicitud de lista de instituciones - Page: {}, Size: {}, Search: {}, Type: {}, Enabled: {}, Role: {}", 
                   page, size, search, type, enabled, currentUserRole);

        InstitutionDtos.InstitutionListResponse response = institutionService.getInstitutions(
                page, size, search, type, enabled);
        return ResponseEntity.ok(response);
    }

    @GetMapping(
        path = "/{id}",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROFESOR')")
    @Operation(
        summary = "Obtener institución por ID",
        description = "Retorna información detallada de una institución"
    )
    public ResponseEntity<InstitutionDtos.InstitutionDto> getInstitutionById(@PathVariable UUID id) {
        logger.info("Solicitud de institución por ID: {}", id);
        InstitutionDtos.InstitutionDto institution = institutionService.getInstitutionById(id);
        return ResponseEntity.ok(institution);
    }

    @GetMapping(
        path = "/{id}/with-campuses",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROFESOR')")
    @Operation(
        summary = "Obtener institución con sus campus",
        description = "Retorna información de la institución incluyendo todos sus campus"
    )
    public ResponseEntity<InstitutionDtos.InstitutionWithCampusDto> getInstitutionWithCampus(@PathVariable UUID id) {
        logger.info("Solicitud de institución con campus por ID: {}", id);
        InstitutionDtos.InstitutionWithCampusDto response = institutionService.getInstitutionWithCampus(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping(
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(
        summary = "Crear nueva institución",
        description = "Crea una nueva institución educativa. Solo accesible para ADMIN y SUPER_ADMIN."
    )
    public ResponseEntity<InstitutionDtos.InstitutionDto> createInstitution(
            @Valid @RequestBody InstitutionDtos.CreateInstitutionRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        UUID currentUserId = getCurrentUserId(httpRequest);
        logger.info("Solicitud de creación de institución: {} por usuario: {}", request.name(), currentUserId);
        InstitutionDtos.InstitutionDto institution = institutionService.createInstitution(request, currentUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(institution);
    }

    @PutMapping(
        path = "/{id}",
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(
        summary = "Actualizar institución",
        description = "Actualiza información de una institución existente. Solo accesible para ADMIN y SUPER_ADMIN."
    )
    public ResponseEntity<InstitutionDtos.InstitutionDto> updateInstitution(
            @PathVariable UUID id,
            @Valid @RequestBody InstitutionDtos.UpdateInstitutionRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        UUID currentUserId = getCurrentUserId(httpRequest);
        logger.info("Solicitud de actualización de institución: {} por usuario: {}", id, currentUserId);
        InstitutionDtos.InstitutionDto institution = institutionService.updateInstitution(id, request, currentUserId);
        return ResponseEntity.ok(institution);
    }

    @DeleteMapping(
        path = "/{id}",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(
        summary = "Eliminar institución",
        description = "Deshabilita una institución (soft delete). Solo accesible para ADMIN y SUPER_ADMIN."
    )
    public ResponseEntity<InstitutionDtos.OperationResponse> deleteInstitution(@PathVariable UUID id) {
        logger.info("Solicitud de eliminación de institución: {}", id);
        InstitutionDtos.OperationResponse response = institutionService.deleteInstitution(id);
        return ResponseEntity.ok(response);
    }

    // ==================== ENDPOINTS DE CAMPUS ====================

    @GetMapping(
        path = "/campuses",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(
        summary = "Listar campus",
        description = "Retorna lista paginada de campus con filtros opcionales. " +
                     "Acceso público cuando enabled=true y se proporciona institutionId, requiere autenticación para otros casos."
    )
    public ResponseEntity<InstitutionDtos.CampusListResponse> getCampuses(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) UUID institutionId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean enabled) {
        
        // Obtener autenticación del contexto de seguridad (puede ser null para endpoints públicos)
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // Permitir acceso público cuando se solicitan campus habilitados de una institución específica
        boolean isPublicAccess = enabled != null && enabled && 
                                 institutionId != null &&
                                 (search == null || search.trim().isEmpty());
        
        if (!isPublicAccess) {
            // Para otros casos, requiere autenticación
            if (authentication == null || !authentication.isAuthenticated() || 
                authentication.getPrincipal().equals("anonymousUser")) {
                logger.warn("Intento de acceso no autenticado a campus con filtros: enabled={}, institutionId={}, search={}", 
                           enabled, institutionId, search);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            // Verificar roles para acceso completo
            boolean hasRequiredRole = authentication.getAuthorities().stream()
                    .anyMatch(auth -> {
                        String authority = auth.getAuthority().replace("ROLE_", "");
                        return authority.equals("ADMIN") || 
                               authority.equals("SUPER_ADMIN") || 
                               authority.equals("PROFESOR");
                    });
            
            if (!hasRequiredRole) {
                logger.warn("Usuario sin rol requerido intentó acceder a campus: {}", 
                           authentication.getName());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        
        logger.info("Solicitud de lista de campus - Page: {}, Size: {}, InstitutionId: {}, Enabled: {}", 
                   page, size, institutionId, enabled);
        InstitutionDtos.CampusListResponse response = institutionService.getCampuses(page, size, institutionId, search, enabled);
        return ResponseEntity.ok(response);
    }

    @GetMapping(
        path = "/campuses/{id}",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROFESOR')")
    @Operation(
        summary = "Obtener campus por ID",
        description = "Retorna información detallada de un campus"
    )
    public ResponseEntity<InstitutionDtos.CampusDto> getCampusById(@PathVariable UUID id) {
        logger.info("Solicitud de campus por ID: {}", id);
        InstitutionDtos.CampusDto campus = institutionService.getCampusById(id);
        return ResponseEntity.ok(campus);
    }

    @PostMapping(
        path = "/campuses",
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(
        summary = "Crear nuevo campus",
        description = "Crea un nuevo campus para una institución. Solo accesible para ADMIN y SUPER_ADMIN."
    )
    public ResponseEntity<InstitutionDtos.CampusDto> createCampus(
            @Valid @RequestBody InstitutionDtos.CreateCampusRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        UUID currentUserId = getCurrentUserId(httpRequest);
        logger.info("Solicitud de creación de campus: {} para institución: {} por usuario: {}", 
                   request.name(), request.institutionId(), currentUserId);
        InstitutionDtos.CampusDto campus = institutionService.createCampus(request, currentUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(campus);
    }

    @PutMapping(
        path = "/campuses/{id}",
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(
        summary = "Actualizar campus",
        description = "Actualiza información de un campus existente. Solo accesible para ADMIN y SUPER_ADMIN."
    )
    public ResponseEntity<InstitutionDtos.CampusDto> updateCampus(
            @PathVariable UUID id,
            @Valid @RequestBody InstitutionDtos.UpdateCampusRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        UUID currentUserId = getCurrentUserId(httpRequest);
        logger.info("Solicitud de actualización de campus: {} por usuario: {}", id, currentUserId);
        InstitutionDtos.CampusDto campus = institutionService.updateCampus(id, request, currentUserId);
        return ResponseEntity.ok(campus);
    }

    @DeleteMapping(
        path = "/campuses/{id}",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(
        summary = "Eliminar campus",
        description = "Deshabilita un campus (soft delete). Solo accesible para ADMIN y SUPER_ADMIN."
    )
    public ResponseEntity<InstitutionDtos.OperationResponse> deleteCampus(@PathVariable UUID id) {
        logger.info("Solicitud de eliminación de campus: {}", id);
        InstitutionDtos.OperationResponse response = institutionService.deleteCampus(id);
        return ResponseEntity.ok(response);
    }
}
