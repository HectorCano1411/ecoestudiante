package com.ecoestudiante.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class GoogleOAuth2UserService {

    private static final Logger logger = LoggerFactory.getLogger(GoogleOAuth2UserService.class);
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    public GoogleOAuth2UserService(UserRepository userRepository, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    public AppUser processOAuth2User(Map<String, Object> attributes) {
        String googleId = (String) attributes.get("sub");
        String email = (String) attributes.get("email");
        String picture = (String) attributes.get("picture");

        logger.info("Procesando usuario OAuth2 de Google - Email: {}, GoogleId: {}", email, googleId);

        // Buscar usuario por Google ID
        Optional<AppUser> userOpt = userRepository.findByGoogleId(googleId);

        AppUser user;
        if (userOpt.isPresent()) {
            // Usuario existe, actualizar información
            user = userOpt.get();
            logger.info("Usuario encontrado por Google ID - Username: {}", user.getUsername());
            
            // Actualizar información si es necesario
            boolean updated = false;
            if (email != null && !email.equals(user.getEmail())) {
                user.setEmail(email);
                updated = true;
            }
            if (picture != null && !picture.equals(user.getPictureUrl())) {
                user.setPictureUrl(picture);
                updated = true;
            }
            if (updated) {
                user = userRepository.save(user);
            }
        } else {
            // Buscar por email para vincular cuenta existente
            Optional<AppUser> emailUserOpt = userRepository.findByEmail(email);
            
            if (emailUserOpt.isPresent()) {
                // Vincular cuenta existente con Google
                user = emailUserOpt.get();
                logger.info("Vinculando cuenta existente con Google - Username: {}", user.getUsername());
                user.setGoogleId(googleId);
                user.setAuthProvider("google");
                user.setEmailVerified(true); // Google ya verificó el email
                if (picture != null) {
                    user.setPictureUrl(picture);
                }
                user = userRepository.save(user);
            } else {
                // Crear nuevo usuario
                logger.info("Creando nuevo usuario desde Google OAuth2 - Email: {}", email);
                user = new AppUser();
                user.setId(UUID.randomUUID());
                user.setGoogleId(googleId);
                user.setEmail(email);
                user.setUsername(generateUsernameFromEmail(email));
                user.setAuthProvider("google");
                user.setEmailVerified(true); // Google ya verificó el email
                user.setEnabled(true);
                user.setPasswordHash(""); // Sin contraseña para usuarios OAuth2
                if (picture != null) {
                    user.setPictureUrl(picture);
                }
                user = userRepository.save(user);
                logger.info("Usuario creado exitosamente desde Google - Username: {}, Email: {}", user.getUsername(), user.getEmail());
            }
        }
        
        return user;
    }

    private String generateUsernameFromEmail(String email) {
        // Generar username desde email (parte antes del @)
        String baseUsername = email.split("@")[0];
        
        // Limpiar username (solo letras, números y guiones bajos)
        baseUsername = baseUsername.replaceAll("[^a-zA-Z0-9_]", "");
        
        // Verificar si el username ya existe y agregar sufijo si es necesario
        String username = baseUsername;
        int suffix = 1;
        while (userRepository.findByUsername(username).isPresent()) {
            username = baseUsername + suffix;
            suffix++;
        }
        
        return username;
    }

    public AuthDtos.AuthResponse generateAuthResponse(AppUser user) {
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
}

