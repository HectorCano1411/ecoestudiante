package com.ecoestudiante.auth;

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
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping({"/api/v1/auth", "/api/auth"})
@Tag(name = "Authentication", description = "Endpoints de autenticación (registro y login)")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping(
        path = "/register",
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(
        summary = "Registrar nuevo usuario",
        description = "Crea una nueva cuenta de usuario. Se enviará un email de verificación al correo proporcionado."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Usuario registrado exitosamente. Se ha enviado un email de verificación.",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = AuthDtos.RegisterResponse.class)
            )
        ),
        @ApiResponse(responseCode = "400", description = "Datos inválidos o usuario/email ya existe"),
        @ApiResponse(responseCode = "422", description = "Validación fallida")
    })
    public ResponseEntity<?> register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        try {
            logger.info("Intento de registro - Username: {}, Email: {}", request.username(), request.email());
            AuthDtos.RegisterResponse response = authService.register(request);
            logger.info("Usuario registrado exitosamente - Username: {}, Email enviado: {}", 
                       request.username(), response.emailSent());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Registro fallido - Username: {}, Error: {}", request.username(), e.getMessage());
            return ResponseEntity.badRequest()
                .body(new AuthDtos.ErrorResponse("REGISTRATION_ERROR", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error inesperado en registro - Username: {}", request.username(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AuthDtos.ErrorResponse("INTERNAL_ERROR", "Error interno del servidor"));
        }
    }

    @PostMapping(
        path = "/verify-email",
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(
        summary = "Verificar correo electrónico",
        description = "Verifica el correo electrónico del usuario usando el token recibido por email"
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Email verificado exitosamente",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = AuthDtos.VerifyEmailResponse.class)
            )
        ),
        @ApiResponse(responseCode = "400", description = "Token inválido o expirado"),
        @ApiResponse(responseCode = "422", description = "Validación fallida")
    })
    public ResponseEntity<?> verifyEmail(@Valid @RequestBody AuthDtos.VerifyEmailRequest request) {
        try {
            logger.info("Intento de verificación de email - Token: {}", request.token().substring(0, Math.min(10, request.token().length())) + "...");
            AuthDtos.VerifyEmailResponse response = authService.verifyEmail(request.token());
            logger.info("Email verificado exitosamente");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Verificación fallida - Error: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(new AuthDtos.ErrorResponse("VERIFICATION_ERROR", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error inesperado en verificación de email", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AuthDtos.ErrorResponse("INTERNAL_ERROR", "Error interno del servidor"));
        }
    }

    @PostMapping(
        path = "/login",
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(
        summary = "Iniciar sesión",
        description = "Autentica un usuario con username/email y password, retorna access token y refresh token JWT"
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Login exitoso",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = AuthDtos.AuthResponse.class)
            )
        ),
        @ApiResponse(responseCode = "401", description = "Credenciales inválidas"),
        @ApiResponse(responseCode = "422", description = "Validación fallida")
    })
    public ResponseEntity<?> login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        try {
            logger.info("Intento de login - Username/Email: {}", request.username());
            AuthDtos.AuthResponse response = authService.login(request);
            logger.info("Login exitoso - Username: {}, UserId: {}", 
                       response.username(), response.userId());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Login fallido - Username/Email: {}, Error: {}", request.username(), e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new AuthDtos.ErrorResponse("AUTHENTICATION_ERROR", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error inesperado en login - Username/Email: {}", request.username(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AuthDtos.ErrorResponse("INTERNAL_ERROR", "Error interno del servidor"));
        }
    }

    @PostMapping(
        path = "/refresh",
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(
        summary = "Renovar token de acceso",
        description = "Genera un nuevo access token usando un refresh token válido"
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Token renovado exitosamente",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = AuthDtos.AuthResponse.class)
            )
        ),
        @ApiResponse(responseCode = "401", description = "Refresh token inválido o expirado"),
        @ApiResponse(responseCode = "422", description = "Validación fallida")
    })
    public ResponseEntity<?> refreshToken(@Valid @RequestBody AuthDtos.RefreshTokenRequest request) {
        try {
            logger.debug("Intento de renovación de token con refresh token");
            AuthDtos.AuthResponse response = authService.refreshToken(request.refreshToken());
            logger.info("Token renovado exitosamente - Username: {}", response.username());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Renovación de token fallida - Error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new AuthDtos.ErrorResponse("REFRESH_TOKEN_ERROR", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error inesperado en renovación de token", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AuthDtos.ErrorResponse("INTERNAL_ERROR", "Error interno del servidor"));
        }
    }

    @PostMapping(
        path = "/resend-verification",
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(
        summary = "Reenviar email de verificación",
        description = "Envía un nuevo email de verificación al correo electrónico proporcionado"
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Email de verificación reenviado exitosamente",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = AuthDtos.RegisterResponse.class)
            )
        ),
        @ApiResponse(responseCode = "400", description = "Email no encontrado o ya verificado"),
        @ApiResponse(responseCode = "422", description = "Validación fallida")
    })
    public ResponseEntity<?> resendVerificationEmail(@Valid @RequestBody AuthDtos.ResendVerificationRequest request) {
        try {
            logger.info("Solicitud de reenvío de email de verificación - Email: {}", request.email());
            AuthDtos.RegisterResponse response = authService.resendVerificationEmail(request.email());
            logger.info("Email de verificación reenviado exitosamente - Email: {}", request.email());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Reenvío de email fallido - Email: {}, Error: {}", request.email(), e.getMessage());
            return ResponseEntity.badRequest()
                .body(new AuthDtos.ErrorResponse("RESEND_VERIFICATION_ERROR", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error inesperado al reenviar email de verificación - Email: {}", request.email(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AuthDtos.ErrorResponse("INTERNAL_ERROR", "Error interno del servidor"));
        }
    }

    @PostMapping(
        path = "/forgot-password",
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(
        summary = "Solicitar reset de contraseña",
        description = "Envía un email con un enlace para restablecer la contraseña"
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Solicitud procesada exitosamente",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = AuthDtos.RegisterResponse.class)
            )
        ),
        @ApiResponse(responseCode = "400", description = "Email no encontrado o cuenta deshabilitada"),
        @ApiResponse(responseCode = "422", description = "Validación fallida")
    })
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody AuthDtos.ResendVerificationRequest request) {
        try {
            logger.info("Solicitud de reset de contraseña - Email: {}", request.email());
            AuthDtos.RegisterResponse response = authService.requestPasswordReset(request.email());
            logger.info("Reset de contraseña solicitado exitosamente - Email: {}", request.email());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Solicitud de reset fallida - Email: {}, Error: {}", request.email(), e.getMessage());
            return ResponseEntity.badRequest()
                .body(new AuthDtos.ErrorResponse("RESET_PASSWORD_ERROR", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error inesperado al solicitar reset de contraseña - Email: {}", request.email(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AuthDtos.ErrorResponse("INTERNAL_ERROR", "Error interno del servidor"));
        }
    }

    @PostMapping(
        path = "/reset-password",
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(
        summary = "Restablecer contraseña",
        description = "Restablece la contraseña usando el token recibido por email"
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Contraseña restablecida exitosamente",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = AuthDtos.VerifyEmailResponse.class)
            )
        ),
        @ApiResponse(responseCode = "400", description = "Token inválido, expirado o contraseña no válida"),
        @ApiResponse(responseCode = "422", description = "Validación fallida")
    })
    public ResponseEntity<?> resetPassword(@Valid @RequestBody AuthDtos.ResetPasswordRequest request) {
        try {
            logger.info("Intento de reset de contraseña - Token: {}", request.token().substring(0, Math.min(10, request.token().length())) + "...");
            AuthDtos.VerifyEmailResponse response = authService.resetPassword(request.token(), request.password());
            logger.info("Contraseña restablecida exitosamente");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Reset de contraseña fallido - Error: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(new AuthDtos.ErrorResponse("RESET_PASSWORD_ERROR", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error inesperado al resetear contraseña", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AuthDtos.ErrorResponse("INTERNAL_ERROR", "Error interno del servidor"));
        }
    }

    @PostMapping(
        path = "/google/callback",
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(
        summary = "Callback de autenticación con Google",
        description = "Procesa el token de Google y crea/inicia sesión del usuario"
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Autenticación exitosa",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = AuthDtos.AuthResponse.class)
            )
        ),
        @ApiResponse(responseCode = "400", description = "Token inválido o error en procesamiento"),
        @ApiResponse(responseCode = "422", description = "Validación fallida")
    })
    public ResponseEntity<?> googleCallback(@RequestBody Map<String, Object> request) {
        try {
            String idToken = (String) request.get("idToken");
            if (idToken == null || idToken.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new AuthDtos.ErrorResponse("GOOGLE_AUTH_ERROR", "Token de Google no proporcionado"));
            }

            logger.info("Procesando callback de Google OAuth2");
            AuthDtos.AuthResponse response = authService.handleGoogleLogin(idToken);
            logger.info("Autenticación con Google exitosa - Username: {}", response.username());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Error en callback de Google - Error: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(new AuthDtos.ErrorResponse("GOOGLE_AUTH_ERROR", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error inesperado en callback de Google", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AuthDtos.ErrorResponse("INTERNAL_ERROR", "Error interno del servidor"));
        }
    }

    @GetMapping(
        path = "/me",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(
        summary = "Obtener información del usuario actual",
        description = "Retorna la información del usuario autenticado actualmente"
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Información del usuario obtenida exitosamente",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = AuthDtos.UserInfo.class)
            )
        ),
        @ApiResponse(responseCode = "401", description = "No autenticado o token inválido"),
        @ApiResponse(responseCode = "404", description = "Usuario no encontrado")
    })
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                logger.warn("Intento de acceso a /me sin autenticación válida");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthDtos.ErrorResponse("AUTHENTICATION_ERROR", "No autenticado"));
            }

            String username = authentication.getName();
            logger.info("Solicitud de información de usuario actual - Username: {}", username);

            AuthDtos.UserInfo userInfo = authService.getUserInfo(username);
            logger.info("Información de usuario obtenida exitosamente - UserId: {}", userInfo.userId());

            return ResponseEntity.ok(userInfo);
        } catch (IllegalArgumentException e) {
            logger.warn("Usuario no encontrado - Error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new AuthDtos.ErrorResponse("USER_NOT_FOUND", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error inesperado al obtener información de usuario", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AuthDtos.ErrorResponse("INTERNAL_ERROR", "Error interno del servidor"));
        }
    }
}

