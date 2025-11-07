package com.ecoestudiante.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);
    private static final int VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
    private static final int RESET_TOKEN_EXPIRY_HOURS = 1; // 1 hora para reset de contraseña
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final GoogleOAuth2UserService googleOAuth2UserService;
    private final SecureRandom random = new SecureRandom();

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil, EmailService emailService, GoogleOAuth2UserService googleOAuth2UserService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
        this.googleOAuth2UserService = googleOAuth2UserService;
    }

    private String generateVerificationToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String generateResetToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public AuthDtos.RegisterResponse register(AuthDtos.RegisterRequest request) {
        // Verificar si el username ya existe
        if (userRepository.findByUsername(request.username()).isPresent()) {
            throw new IllegalArgumentException("Username ya está en uso");
        }

        // Verificar si el email ya existe
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new IllegalArgumentException("Email ya está en uso");
        }

        // Generar token de verificación
        String verificationToken = generateVerificationToken();
        LocalDateTime tokenExpiry = LocalDateTime.now().plusHours(VERIFICATION_TOKEN_EXPIRY_HOURS);

        // Crear nuevo usuario
        AppUser user = new AppUser();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setCarrera(request.carrera());
        user.setJornada(request.jornada());
        user.setEnabled(true);
        user.setEmailVerified(false);
        user.setVerificationToken(verificationToken);
        user.setVerificationTokenExpiry(tokenExpiry);

        AppUser savedUser = userRepository.save(user);

        // Enviar email de verificación
        boolean emailSent = false;
        try {
            emailService.sendVerificationEmail(
                savedUser.getEmail(),
                savedUser.getUsername(),
                verificationToken
            );
            emailSent = true;
            logger.info("Usuario registrado exitosamente: {} - Email de verificación enviado", savedUser.getUsername());
        } catch (Exception e) {
            logger.error("Error al enviar email de verificación para usuario: {}", savedUser.getUsername(), e);
            // No fallar el registro si el email falla, pero indicarlo
        }

        return new AuthDtos.RegisterResponse(
            "Registro exitoso. Por favor verifica tu correo electrónico para activar tu cuenta.",
            savedUser.getEmail(),
            emailSent
        );
    }

    public AuthDtos.VerifyEmailResponse verifyEmail(String token) {
        logger.debug("Verificando email con token: {}...", token.substring(0, Math.min(10, token.length())));
        
        // Buscar usuario por token (sin filtrar por expiración para dar mejor mensaje)
        Optional<AppUser> userOpt = userRepository.findByVerificationTokenOnly(token);
        
        if (userOpt.isEmpty()) {
            logger.warn("Token de verificación no encontrado: {}...", token.substring(0, Math.min(10, token.length())));
            throw new IllegalArgumentException("Token de verificación inválido. Por favor solicita un nuevo enlace de verificación.");
        }
        
        AppUser user = userOpt.get();
        logger.debug("Usuario encontrado para token - Username: {}, Email: {}, EmailVerified: {}, Expiry: {}", 
                    user.getUsername(), user.getEmail(), user.isEmailVerified(), user.getVerificationTokenExpiry());

        if (user.isEmailVerified()) {
            logger.info("Email ya verificado anteriormente - Username: {}", user.getUsername());
            return new AuthDtos.VerifyEmailResponse("Email ya verificado anteriormente", true);
        }

        // Verificar que el token no haya expirado
        if (user.getVerificationTokenExpiry() != null && 
            user.getVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            logger.warn("Token de verificación expirado - Username: {}, Expiry: {}, Now: {}", 
                       user.getUsername(), user.getVerificationTokenExpiry(), LocalDateTime.now());
            throw new IllegalArgumentException("Token de verificación expirado. Por favor solicita un nuevo enlace de verificación.");
        }

        // Marcar email como verificado
        user.setEmailVerified(true);
        user.setVerificationToken(null);
        user.setVerificationTokenExpiry(null);
        userRepository.save(user);

        logger.info("Email verificado exitosamente para usuario: {}", user.getUsername());

        return new AuthDtos.VerifyEmailResponse("Email verificado exitosamente. Ya puedes iniciar sesión.", true);
    }

    public AuthDtos.RegisterResponse resendVerificationEmail(String email) {
        logger.info("Solicitud de reenvío de email de verificación - Email: {}", email);
        
        AppUser user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("No existe una cuenta con este correo electrónico"));

        if (user.isEmailVerified()) {
            throw new IllegalArgumentException("Este correo electrónico ya está verificado");
        }

        // Generar nuevo token de verificación
        String verificationToken = generateVerificationToken();
        LocalDateTime tokenExpiry = LocalDateTime.now().plusHours(VERIFICATION_TOKEN_EXPIRY_HOURS);
        
        user.setVerificationToken(verificationToken);
        user.setVerificationTokenExpiry(tokenExpiry);
        userRepository.save(user);

        // Enviar email de verificación
        boolean emailSent = false;
        try {
            emailService.sendVerificationEmail(
                user.getEmail(),
                user.getUsername(),
                verificationToken
            );
            emailSent = true;
            logger.info("Email de verificación reenviado exitosamente a: {}", user.getEmail());
        } catch (Exception e) {
            logger.error("Error al reenviar email de verificación para usuario: {}", user.getUsername(), e);
            throw new RuntimeException("Error al enviar el email de verificación. Por favor intenta más tarde.");
        }

        return new AuthDtos.RegisterResponse(
            "Se ha enviado un nuevo enlace de verificación a tu correo electrónico.",
            user.getEmail(),
            emailSent
        );
    }

    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        logger.debug("Iniciando login - Identificador: {}", request.username());
        
        // Intentar buscar por username primero
        Optional<AppUser> userOpt = userRepository.findByUsername(request.username());
        boolean foundByUsername = userOpt.isPresent();
        
        // Si no se encuentra por username, intentar por email
        if (!foundByUsername) {
            logger.debug("Usuario no encontrado por username, buscando por email: {}", request.username());
            userOpt = userRepository.findByEmail(request.username());
            if (userOpt.isPresent()) {
                logger.debug("Usuario encontrado por email: {}", request.username());
            } else {
                logger.warn("Usuario no encontrado ni por username ni por email: {}", request.username());
                throw new IllegalArgumentException("No existe una cuenta con ese nombre de usuario o correo electrónico. Por favor verifica tus datos o regístrate.");
            }
        }
        
        AppUser user = userOpt.get();
        logger.debug("Usuario encontrado - ID: {}, Username: {}, Email: {}, EmailVerified: {}", 
                    user.getId(), user.getUsername(), user.getEmail(), user.isEmailVerified());

        if (!user.isEnabled()) {
            logger.warn("Intento de login con usuario deshabilitado - Username: {}", user.getUsername());
            throw new IllegalArgumentException("Usuario deshabilitado");
        }

        // Verificar que el email esté verificado
        if (!user.isEmailVerified()) {
            logger.warn("Intento de login con email no verificado - Username: {}, Email: {}", 
                       user.getUsername(), user.getEmail());
            throw new IllegalArgumentException("Por favor verifica tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.");
        }

        // Verificar contraseña
        boolean passwordMatches = passwordEncoder.matches(request.password(), user.getPasswordHash());
        if (!passwordMatches) {
            logger.warn("Contraseña incorrecta - Username: {}, Email: {}", user.getUsername(), user.getEmail());
            throw new IllegalArgumentException("La contraseña ingresada es incorrecta. Por favor intenta nuevamente.");
        }

        logger.info("Login exitoso - Username: {}, UserId: {}", user.getUsername(), user.getId());

        // Generar tokens JWT (access token y refresh token)
        String accessToken = jwtUtil.generateToken(user.getUsername(), user.getId().toString());
        String refreshToken = jwtUtil.generateRefreshToken(user.getUsername(), user.getId().toString());

        return new AuthDtos.AuthResponse(
            accessToken,
            "Bearer",
            user.getUsername(),
            user.getId().toString(),
            user.getEmail(),
            refreshToken
        );
    }

    public AuthDtos.AuthResponse refreshToken(String refreshToken) {
        logger.debug("Renovando token con refresh token");
        
        if (!jwtUtil.validateRefreshToken(refreshToken)) {
            logger.warn("Refresh token inválido o expirado");
            throw new IllegalArgumentException("Refresh token inválido o expirado. Por favor inicia sesión nuevamente.");
        }

        String username = jwtUtil.extractUsername(refreshToken);
        String userId = jwtUtil.extractUserId(refreshToken);

        logger.debug("Refresh token válido - Username: {}, UserId: {}", username, userId);

        // Verificar que el usuario aún existe y está habilitado
        AppUser user = userRepository.findByUsername(username)
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        if (!user.isEnabled()) {
            throw new IllegalArgumentException("Usuario deshabilitado");
        }

        // Generar nuevos tokens
        String newAccessToken = jwtUtil.generateToken(user.getUsername(), user.getId().toString());
        String newRefreshToken = jwtUtil.generateRefreshToken(user.getUsername(), user.getId().toString());

        logger.info("Tokens renovados exitosamente - Username: {}", user.getUsername());

        return new AuthDtos.AuthResponse(
            newAccessToken,
            "Bearer",
            user.getUsername(),
            user.getId().toString(),
            user.getEmail(),
            newRefreshToken
        );
    }

    public AuthDtos.RegisterResponse requestPasswordReset(String email) {
        logger.info("Solicitud de reset de contraseña - Email: {}", email);
        
        AppUser user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("No existe una cuenta con este correo electrónico"));

        if (!user.isEnabled()) {
            throw new IllegalArgumentException("Esta cuenta está deshabilitada");
        }

        // Generar token de reset
        String resetToken = generateResetToken();
        LocalDateTime tokenExpiry = LocalDateTime.now().plusHours(RESET_TOKEN_EXPIRY_HOURS);
        
        user.setResetToken(resetToken);
        user.setResetTokenExpiry(tokenExpiry);
        userRepository.save(user);

        // Enviar email de reset
        boolean emailSent = false;
        try {
            emailService.sendPasswordResetEmail(
                user.getEmail(),
                user.getUsername(),
                resetToken
            );
            emailSent = true;
            logger.info("Email de reset de contraseña enviado exitosamente a: {}", user.getEmail());
        } catch (Exception e) {
            logger.error("Error al enviar email de reset de contraseña para usuario: {}", user.getUsername(), e);
            // No fallar la solicitud si el email falla, pero indicarlo
        }

        return new AuthDtos.RegisterResponse(
            "Si existe una cuenta con ese correo electrónico, se ha enviado un enlace para restablecer tu contraseña.",
            user.getEmail(),
            emailSent
        );
    }

    public AuthDtos.VerifyEmailResponse resetPassword(String token, String newPassword) {
        logger.debug("Reseteando contraseña con token: {}...", token.substring(0, Math.min(10, token.length())));
        
        AppUser user = userRepository.findByResetToken(token)
            .orElseThrow(() -> new IllegalArgumentException("Token de reset inválido o expirado"));

        // Verificar que el token no haya expirado
        if (user.getResetTokenExpiry() != null && 
            user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            logger.warn("Token de reset expirado - Username: {}, Expiry: {}", 
                       user.getUsername(), user.getResetTokenExpiry());
            throw new IllegalArgumentException("Token de reset expirado. Por favor solicita un nuevo enlace.");
        }

        // Validar nueva contraseña (misma validación que en registro)
        if (newPassword == null || newPassword.length() < 8) {
            throw new IllegalArgumentException("La contraseña debe tener al menos 8 caracteres");
        }
        
        if (!newPassword.matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).{8,}$")) {
            throw new IllegalArgumentException("La contraseña debe contener al menos: una mayúscula, una minúscula, un número y un símbolo");
        }

        // Actualizar contraseña y limpiar token de reset
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        logger.info("Contraseña reseteada exitosamente para usuario: {}", user.getUsername());

        return new AuthDtos.VerifyEmailResponse("Contraseña restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.", true);
    }

    public AuthDtos.AuthResponse handleGoogleLogin(String idToken) {
        logger.info("Procesando login con Google - Token recibido");
        
        try {
            // Decodificar y verificar el token de Google
            Map<String, Object> userInfo = decodeGoogleIdToken(idToken);
            
            // Procesar usuario OAuth2
            AppUser user = googleOAuth2UserService.processOAuth2User(userInfo);
            
            logger.info("Login con Google exitoso - Username: {}, Email: {}", user.getUsername(), user.getEmail());
            
            // Generar tokens JWT
            return googleOAuth2UserService.generateAuthResponse(user);
        } catch (Exception e) {
            logger.error("Error procesando token de Google", e);
            throw new IllegalArgumentException("Error al procesar autenticación con Google: " + e.getMessage());
        }
    }

    private Map<String, Object> decodeGoogleIdToken(String idToken) {
        // Decodificar el JWT de Google (sin verificación para desarrollo)
        // En producción, deberías verificar el token con Google
        try {
            String[] parts = idToken.split("\\.");
            if (parts.length != 3) {
                throw new IllegalArgumentException("Token de Google inválido");
            }
            
            // Decodificar payload (parte 2)
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
            ObjectMapper objectMapper = new ObjectMapper();
            @SuppressWarnings("unchecked")
            Map<String, Object> claims = objectMapper.readValue(payload, Map.class);
            
            // Verificar que el token no haya expirado
            Long exp = claims.get("exp") != null ? ((Number) claims.get("exp")).longValue() : null;
            if (exp != null && exp * 1000 < System.currentTimeMillis()) {
                throw new IllegalArgumentException("Token de Google expirado");
            }
            
            return claims;
        } catch (Exception e) {
            logger.error("Error decodificando token de Google", e);
            throw new IllegalArgumentException("Token de Google inválido o corrupto");
        }
    }
}

