package com.ecoestudiante.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class AuthDtos {

    public record RegisterRequest(
            @NotBlank(message = "Username es requerido")
            @Size(min = 3, max = 50, message = "Username debe tener entre 3 y 50 caracteres")
            String username,

            @NotBlank(message = "Email es requerido")
            @Email(message = "Email debe ser válido")
            String email,

            @NotBlank(message = "Password es requerido")
            @Size(min = 8, message = "Password debe tener al menos 8 caracteres")
            @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).{8,}$",
                message = "Password debe contener al menos: una mayúscula, una minúscula, un número y un símbolo"
            )
            String password,

            @NotBlank(message = "Carrera es requerida")
            String carrera,

            @NotBlank(message = "Jornada es requerida")
            String jornada
    ) {}

    public record LoginRequest(
            @NotBlank(message = "Username o Email es requerido")
            String username,  // Puede ser username o email

            @NotBlank(message = "Password es requerido")
            String password
    ) {}

    public record AuthResponse(
            String token,
            String type,
            String username,
            String userId,
            String email,
            String refreshToken
    ) {}

    public record ErrorResponse(
            String error,
            String message
    ) {}

    public record RegisterResponse(
            String message,
            String email,
            boolean emailSent
    ) {}

    public record VerifyEmailRequest(
            @NotBlank(message = "Token es requerido")
            String token
    ) {}

    public record VerifyEmailResponse(
            String message,
            boolean verified
    ) {}

    public record RefreshTokenRequest(
            @NotBlank(message = "Refresh token es requerido")
            String refreshToken
    ) {}

    public record ResendVerificationRequest(
            @NotBlank(message = "Email es requerido")
            @Email(message = "Email debe ser válido")
            String email
    ) {}

    public record ResetPasswordRequest(
            @NotBlank(message = "Token es requerido")
            String token,
            
            @NotBlank(message = "Password es requerido")
            @Size(min = 8, message = "Password debe tener al menos 8 caracteres")
            @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).{8,}$",
                message = "Password debe contener al menos: una mayúscula, una minúscula, un número y un símbolo"
            )
            String password
    ) {}
}

