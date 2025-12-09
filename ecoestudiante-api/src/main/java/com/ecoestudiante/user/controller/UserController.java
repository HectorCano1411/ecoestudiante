package com.ecoestudiante.user.controller;

import com.ecoestudiante.user.dto.UserDtos;
import com.ecoestudiante.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "User Management", description = "Endpoints para gestión de usuarios (solo ADMIN y SUPER_ADMIN)")
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROFESOR')")
    @Operation(
        summary = "Obtener lista de usuarios",
        description = "Retorna una lista paginada de usuarios con filtros opcionales. Solo accesible para ADMIN y SUPER_ADMIN."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Lista de usuarios obtenida exitosamente",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = UserDtos.UserListResponse.class)
            )
        ),
        @ApiResponse(responseCode = "401", description = "No autenticado o sin permisos"),
        @ApiResponse(responseCode = "403", description = "Sin permisos suficientes")
    })
    public ResponseEntity<?> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(required = false) Boolean emailVerified,
            @RequestParam(required = false) UUID institutionId,
            @RequestParam(required = false) UUID campusId,
            Authentication authentication
    ) {
        try {
            String currentUserRole = authentication.getAuthorities().stream()
                .findFirst()
                .map(auth -> auth.getAuthority().replace("ROLE_", ""))
                .orElse("");

            logger.info("Solicitud de lista de usuarios - Page: {}, Size: {}, Search: {}, Role: {}, InstitutionId: {}, CampusId: {}, CurrentUserRole: {}", 
                       page, size, search, role, institutionId, campusId, currentUserRole);

            UserDtos.UserListResponse response = userService.getUsers(
                page, size, search, role, enabled, emailVerified, institutionId, campusId
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error al obtener lista de usuarios", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new UserDtos.ErrorResponse("INTERNAL_ERROR", "Error al obtener lista de usuarios"));
        }
    }

    @GetMapping(
        path = "/{id}",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROFESOR')")
    @Operation(
        summary = "Obtener usuario por ID",
        description = "Retorna la información de un usuario específico. Solo accesible para ADMIN y SUPER_ADMIN."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Usuario obtenido exitosamente",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = UserDtos.UserDto.class)
            )
        ),
        @ApiResponse(responseCode = "404", description = "Usuario no encontrado"),
        @ApiResponse(responseCode = "401", description = "No autenticado o sin permisos"),
        @ApiResponse(responseCode = "403", description = "Sin permisos suficientes")
    })
    public ResponseEntity<?> getUserById(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        try {
            logger.info("Solicitud de usuario por ID: {}", id);
            UserDtos.UserDto user = userService.getUserById(id);
            return ResponseEntity.ok(user);
        } catch (IllegalArgumentException e) {
            logger.warn("Usuario no encontrado - ID: {}, Error: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new UserDtos.ErrorResponse("USER_NOT_FOUND", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error al obtener usuario por ID: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new UserDtos.ErrorResponse("INTERNAL_ERROR", "Error al obtener usuario"));
        }
    }

    @PostMapping(
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROFESOR')")
    @Operation(
        summary = "Crear nuevo usuario",
        description = "Crea un nuevo usuario con el rol especificado. Solo accesible para ADMIN y SUPER_ADMIN."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "201",
            description = "Usuario creado exitosamente",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = UserDtos.UserDto.class)
            )
        ),
        @ApiResponse(responseCode = "400", description = "Datos inválidos o usuario/email ya existe"),
        @ApiResponse(responseCode = "401", description = "No autenticado o sin permisos"),
        @ApiResponse(responseCode = "403", description = "Sin permisos suficientes")
    })
    public ResponseEntity<?> createUser(
            @Valid @RequestBody UserDtos.CreateUserRequest request,
            Authentication authentication
    ) {
        try {
            String currentUserRole = authentication.getAuthorities().stream()
                .findFirst()
                .map(auth -> auth.getAuthority().replace("ROLE_", ""))
                .orElse("");

            logger.info("Solicitud de creación de usuario - Username: {}, Email: {}, Role: {}, CurrentUserRole: {}", 
                       request.username(), request.email(), request.role(), currentUserRole);

            UserDtos.UserDto user = userService.createUser(request, currentUserRole);
            return ResponseEntity.status(HttpStatus.CREATED).body(user);
        } catch (IllegalArgumentException e) {
            logger.warn("Error al crear usuario - Error: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(new UserDtos.ErrorResponse("VALIDATION_ERROR", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error inesperado al crear usuario", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new UserDtos.ErrorResponse("INTERNAL_ERROR", "Error al crear usuario"));
        }
    }

    @PutMapping(
        path = "/{id}",
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROFESOR')")
    @Operation(
        summary = "Actualizar usuario",
        description = "Actualiza la información de un usuario existente. Solo accesible para ADMIN y SUPER_ADMIN."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Usuario actualizado exitosamente",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = UserDtos.UserDto.class)
            )
        ),
        @ApiResponse(responseCode = "400", description = "Datos inválidos"),
        @ApiResponse(responseCode = "404", description = "Usuario no encontrado"),
        @ApiResponse(responseCode = "401", description = "No autenticado o sin permisos"),
        @ApiResponse(responseCode = "403", description = "Sin permisos suficientes")
    })
    public ResponseEntity<?> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody UserDtos.UpdateUserRequest request,
            Authentication authentication
    ) {
        try {
            String currentUserRole = authentication.getAuthorities().stream()
                .findFirst()
                .map(auth -> auth.getAuthority().replace("ROLE_", ""))
                .orElse("");

            logger.info("Solicitud de actualización de usuario - ID: {}, CurrentUserRole: {}", id, currentUserRole);

            UserDtos.UserDto user = userService.updateUser(id, request, currentUserRole);
            return ResponseEntity.ok(user);
        } catch (IllegalArgumentException e) {
            logger.warn("Error al actualizar usuario - ID: {}, Error: {}", id, e.getMessage());
            return ResponseEntity.badRequest()
                .body(new UserDtos.ErrorResponse("VALIDATION_ERROR", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error inesperado al actualizar usuario - ID: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new UserDtos.ErrorResponse("INTERNAL_ERROR", "Error al actualizar usuario"));
        }
    }

    @PutMapping(
        path = "/{id}/password",
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROFESOR')")
    @Operation(
        summary = "Actualizar contraseña de usuario",
        description = "Actualiza la contraseña de un usuario. Solo accesible para ADMIN y SUPER_ADMIN."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Contraseña actualizada exitosamente",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = UserDtos.UserOperationResponse.class)
            )
        ),
        @ApiResponse(responseCode = "400", description = "Datos inválidos"),
        @ApiResponse(responseCode = "404", description = "Usuario no encontrado"),
        @ApiResponse(responseCode = "401", description = "No autenticado o sin permisos"),
        @ApiResponse(responseCode = "403", description = "Sin permisos suficientes")
    })
    public ResponseEntity<?> updatePassword(
            @PathVariable UUID id,
            @Valid @RequestBody UserDtos.UpdatePasswordRequest request,
            Authentication authentication
    ) {
        try {
            String currentUserRole = authentication.getAuthorities().stream()
                .findFirst()
                .map(auth -> auth.getAuthority().replace("ROLE_", ""))
                .orElse("");

            logger.info("Solicitud de actualización de contraseña - ID: {}, CurrentUserRole: {}", id, currentUserRole);

            UserDtos.UserOperationResponse response = userService.updatePassword(id, request, currentUserRole);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Error al actualizar contraseña - ID: {}, Error: {}", id, e.getMessage());
            return ResponseEntity.badRequest()
                .body(new UserDtos.ErrorResponse("VALIDATION_ERROR", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error inesperado al actualizar contraseña - ID: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new UserDtos.ErrorResponse("INTERNAL_ERROR", "Error al actualizar contraseña"));
        }
    }

    @DeleteMapping(
        path = "/{id}",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROFESOR')")
    @Operation(
        summary = "Eliminar usuario",
        description = "Elimina (deshabilita) un usuario. Solo accesible para ADMIN y SUPER_ADMIN."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Usuario eliminado exitosamente",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = UserDtos.UserOperationResponse.class)
            )
        ),
        @ApiResponse(responseCode = "404", description = "Usuario no encontrado"),
        @ApiResponse(responseCode = "401", description = "No autenticado o sin permisos"),
        @ApiResponse(responseCode = "403", description = "Sin permisos suficientes")
    })
    public ResponseEntity<?> deleteUser(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        try {
            String currentUserRole = authentication.getAuthorities().stream()
                .findFirst()
                .map(auth -> auth.getAuthority().replace("ROLE_", ""))
                .orElse("");

            logger.info("Solicitud de eliminación de usuario - ID: {}, CurrentUserRole: {}", id, currentUserRole);

            UserDtos.UserOperationResponse response = userService.deleteUser(id, currentUserRole);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Error al eliminar usuario - ID: {}, Error: {}", id, e.getMessage());
            return ResponseEntity.badRequest()
                .body(new UserDtos.ErrorResponse("VALIDATION_ERROR", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error inesperado al eliminar usuario - ID: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new UserDtos.ErrorResponse("INTERNAL_ERROR", "Error al eliminar usuario"));
        }
    }

    @PutMapping(
        path = "/{id}/toggle-enabled",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROFESOR')")
    @Operation(
        summary = "Habilitar/Deshabilitar usuario",
        description = "Cambia el estado habilitado/deshabilitado de un usuario. Solo accesible para ADMIN y SUPER_ADMIN."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Estado de usuario actualizado exitosamente",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = UserDtos.UserOperationResponse.class)
            )
        ),
        @ApiResponse(responseCode = "404", description = "Usuario no encontrado"),
        @ApiResponse(responseCode = "401", description = "No autenticado o sin permisos"),
        @ApiResponse(responseCode = "403", description = "Sin permisos suficientes")
    })
    public ResponseEntity<?> toggleUserEnabled(
            @PathVariable UUID id,
            @RequestParam boolean enabled,
            Authentication authentication
    ) {
        try {
            String currentUserRole = authentication.getAuthorities().stream()
                .findFirst()
                .map(auth -> auth.getAuthority().replace("ROLE_", ""))
                .orElse("");

            logger.info("Solicitud de cambio de estado de usuario - ID: {}, Enabled: {}, CurrentUserRole: {}", 
                       id, enabled, currentUserRole);

            UserDtos.UserOperationResponse response = userService.toggleUserEnabled(id, enabled, currentUserRole);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Error al cambiar estado de usuario - ID: {}, Error: {}", id, e.getMessage());
            return ResponseEntity.badRequest()
                .body(new UserDtos.ErrorResponse("VALIDATION_ERROR", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error inesperado al cambiar estado de usuario - ID: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new UserDtos.ErrorResponse("INTERNAL_ERROR", "Error al cambiar estado de usuario"));
        }
    }

    @PutMapping(
        path = "/{id}/verify-email",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROFESOR')")
    @Operation(
        summary = "Verificar email de usuario",
        description = "Verifica manualmente el email de un usuario. Solo accesible para ADMIN y SUPER_ADMIN."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Email verificado exitosamente",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = UserDtos.UserOperationResponse.class)
            )
        ),
        @ApiResponse(responseCode = "404", description = "Usuario no encontrado"),
        @ApiResponse(responseCode = "401", description = "No autenticado o sin permisos"),
        @ApiResponse(responseCode = "403", description = "Sin permisos suficientes")
    })
    public ResponseEntity<?> verifyUserEmail(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        try {
            String currentUserRole = authentication.getAuthorities().stream()
                .findFirst()
                .map(auth -> auth.getAuthority().replace("ROLE_", ""))
                .orElse("");

            logger.info("Solicitud de verificación de email - ID: {}, CurrentUserRole: {}", id, currentUserRole);

            UserDtos.UserOperationResponse response = userService.verifyUserEmail(id, currentUserRole);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Error al verificar email - ID: {}, Error: {}", id, e.getMessage());
            return ResponseEntity.badRequest()
                .body(new UserDtos.ErrorResponse("VALIDATION_ERROR", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error inesperado al verificar email - ID: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new UserDtos.ErrorResponse("INTERNAL_ERROR", "Error al verificar email"));
        }
    }

    @PostMapping(
        path = "/{id}/resend-verification-email",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROFESOR')")
    @Operation(
        summary = "Reenviar email de verificación",
        description = "Reenvía el email de verificación a un usuario. Solo accesible para ADMIN y SUPER_ADMIN."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Email de verificación reenviado exitosamente",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = UserDtos.UserOperationResponse.class)
            )
        ),
        @ApiResponse(responseCode = "404", description = "Usuario no encontrado"),
        @ApiResponse(responseCode = "401", description = "No autenticado o sin permisos"),
        @ApiResponse(responseCode = "403", description = "Sin permisos suficientes")
    })
    public ResponseEntity<?> resendVerificationEmail(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        try {
            String currentUserRole = authentication.getAuthorities().stream()
                .findFirst()
                .map(auth -> auth.getAuthority().replace("ROLE_", ""))
                .orElse("");

            logger.info("Solicitud de reenvío de email de verificación - ID: {}, CurrentUserRole: {}", id, currentUserRole);

            UserDtos.UserOperationResponse response = userService.resendVerificationEmail(id, currentUserRole);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Error al reenviar email de verificación - ID: {}, Error: {}", id, e.getMessage());
            return ResponseEntity.badRequest()
                .body(new UserDtos.ErrorResponse("VALIDATION_ERROR", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error inesperado al reenviar email de verificación - ID: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new UserDtos.ErrorResponse("INTERNAL_ERROR", "Error al reenviar email de verificación"));
        }
    }
}

