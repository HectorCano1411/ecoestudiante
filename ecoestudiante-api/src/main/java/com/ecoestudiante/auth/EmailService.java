package com.ecoestudiante.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@ecoestudiante.com}")
    private String fromEmail;

    @Value("${app.base-url:http://localhost:3000}")
    private String baseUrl;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendVerificationEmail(String to, String username, String verificationToken) throws MailException {
        try {
            // Verificar que las credenciales estén configuradas
            if (mailUsername == null || mailUsername.isEmpty()) {
                logger.error("MAIL_USERNAME no está configurado. No se puede enviar email.");
                throw new MailAuthenticationException("Configuración de email incompleta: MAIL_USERNAME no está configurado");
            }

            String verificationUrl = baseUrl + "/verify-email?token=" + verificationToken;
            
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject("Verifica tu correo electrónico - EcoEstudiante");
            message.setText(buildVerificationEmailContent(username, verificationUrl));
            
            mailSender.send(message);
            logger.info("Email de verificación enviado exitosamente a: {}", to);
        } catch (MailAuthenticationException e) {
            logger.error("═══════════════════════════════════════════════════════════");
            logger.error("❌ ERROR DE AUTENTICACIÓN CON GMAIL");
            logger.error("═══════════════════════════════════════════════════════════");
            logger.error("Email destino: {}", to);
            logger.error("Mensaje del servidor: {}", e.getMessage());
            logger.error("");
            logger.error("SOLUCIONES:");
            logger.error("  1. Verifica que la verificación en 2 pasos esté activada en Gmail");
            logger.error("  2. Genera una nueva App Password (16 caracteres, sin espacios)");
            logger.error("  3. Verifica que MAIL_USERNAME y MAIL_PASSWORD estén correctamente configurados");
            logger.error("  4. URL de ayuda: https://support.google.com/mail/?p=BadCredentials");
            logger.error("  5. Ejecuta: ./diagnosticar-email.sh para verificar la configuración");
            logger.error("═══════════════════════════════════════════════════════════");
            throw e;
        } catch (MailException e) {
            logger.error("Error al enviar email de verificación a: {}", to, e);
            throw e;
        } catch (Exception e) {
            logger.error("Error inesperado al enviar email de verificación a: {}", to, e);
            throw new MailException("Error inesperado al enviar email") {
                @Override
                public String getMessage() {
                    return "Error inesperado: " + e.getMessage();
                }
            };
        }
    }

    private String buildVerificationEmailContent(String username, String verificationUrl) {
        return String.format("""
            Hola %s,
            
            ¡Bienvenido a EcoEstudiante!
            
            Para completar tu registro y verificar tu correo electrónico, por favor haz clic en el siguiente enlace:
            
            %s
            
            Este enlace expirará en 24 horas.
            
            Si no creaste esta cuenta, puedes ignorar este mensaje.
            
            Saludos,
            El equipo de EcoEstudiante
            """, username, verificationUrl);
    }

    public void sendPasswordResetEmail(String to, String username, String resetToken) throws MailException {
        try {
            // Verificar que las credenciales estén configuradas
            if (mailUsername == null || mailUsername.isEmpty()) {
                logger.error("MAIL_USERNAME no está configurado. No se puede enviar email.");
                throw new MailAuthenticationException("Configuración de email incompleta: MAIL_USERNAME no está configurado");
            }

            String resetUrl = baseUrl + "/reset-password?token=" + resetToken;
            
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject("Restablecer tu contraseña - EcoEstudiante");
            message.setText(buildPasswordResetEmailContent(username, resetUrl));
            
            mailSender.send(message);
            logger.info("Email de reset de contraseña enviado exitosamente a: {}", to);
        } catch (MailAuthenticationException e) {
            logger.error("═══════════════════════════════════════════════════════════");
            logger.error("❌ ERROR DE AUTENTICACIÓN CON GMAIL");
            logger.error("═══════════════════════════════════════════════════════════");
            logger.error("Email destino: {}", to);
            logger.error("Mensaje del servidor: {}", e.getMessage());
            logger.error("");
            logger.error("SOLUCIONES:");
            logger.error("  1. Verifica que la verificación en 2 pasos esté activada en Gmail");
            logger.error("  2. Genera una nueva App Password (16 caracteres, sin espacios)");
            logger.error("  3. Verifica que MAIL_USERNAME y MAIL_PASSWORD estén correctamente configurados");
            logger.error("  4. URL de ayuda: https://support.google.com/mail/?p=BadCredentials");
            logger.error("  5. Ejecuta: ./diagnosticar-email.sh para verificar la configuración");
            logger.error("═══════════════════════════════════════════════════════════");
            throw e;
        } catch (MailException e) {
            logger.error("Error al enviar email de reset de contraseña a: {}", to, e);
            throw e;
        } catch (Exception e) {
            logger.error("Error inesperado al enviar email de reset de contraseña a: {}", to, e);
            throw new MailException("Error inesperado al enviar email") {
                @Override
                public String getMessage() {
                    return "Error inesperado: " + e.getMessage();
                }
            };
        }
    }

    private String buildPasswordResetEmailContent(String username, String resetUrl) {
        return String.format("""
            Hola %s,
            
            Recibimos una solicitud para restablecer la contraseña de tu cuenta en EcoEstudiante.
            
            Para restablecer tu contraseña, por favor haz clic en el siguiente enlace:
            
            %s
            
            Este enlace expirará en 1 hora.
            
            Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura. Tu contraseña no será modificada.
            
            Por seguridad, nunca compartas este enlace con nadie.
            
            Saludos,
            El equipo de EcoEstudiante
            """, username, resetUrl);
    }
}
