package com.ecoestudiante.institution.dto;

import com.ecoestudiante.institution.model.Institution;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * DTOs para gestión de instituciones educativas y campus
 */
public class InstitutionDtos {

    /**
     * DTO para crear una institución
     */
    public record CreateInstitutionRequest(
            @NotBlank(message = "El nombre es requerido")
            String name,
            
            @NotNull(message = "El tipo de institución es requerido")
            Institution.InstitutionType type,
            
            String code, // Opcional, se puede generar automáticamente
            
            @Pattern(regexp = "^(https?://)?([\\da-z\\.-]+)\\.([a-z\\.]{2,6})([/\\w \\.-]*)*/?$", 
                     message = "URL de sitio web inválida")
            String website,
            
            @Email(message = "Email inválido")
            String email,
            
            String phone,
            String address,
            String city,
            String region,
            String country
    ) {}

    /**
     * DTO para actualizar una institución
     */
    public record UpdateInstitutionRequest(
            String name,
            Institution.InstitutionType type,
            String code,
            String website,
            @Email(message = "Email inválido")
            String email,
            String phone,
            String address,
            String city,
            String region,
            String country,
            Boolean enabled
    ) {}

    /**
     * DTO para respuesta de institución
     */
    public record InstitutionDto(
            UUID id,
            String name,
            Institution.InstitutionType type,
            String code,
            String website,
            String email,
            String phone,
            String address,
            String city,
            String region,
            String country,
            boolean enabled,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            Integer campusCount // Número de campus activos
    ) {}

    /**
     * DTO para crear un campus
     */
    public record CreateCampusRequest(
            @NotNull(message = "El ID de la institución es requerido")
            UUID institutionId,
            
            @NotBlank(message = "El nombre del campus es requerido")
            String name,
            
            String code, // Opcional
            
            String address,
            String city,
            String region,
            BigDecimal latitude,
            BigDecimal longitude,
            String phone,
            @Email(message = "Email inválido")
            String email
    ) {}

    /**
     * DTO para actualizar un campus
     */
    public record UpdateCampusRequest(
            String name,
            String code,
            String address,
            String city,
            String region,
            BigDecimal latitude,
            BigDecimal longitude,
            String phone,
            @Email(message = "Email inválido")
            String email,
            Boolean enabled
    ) {}

    /**
     * DTO para respuesta de campus
     */
    public record CampusDto(
            UUID id,
            UUID institutionId,
            String institutionName, // Nombre de la institución padre
            String name,
            String code,
            String address,
            String city,
            String region,
            BigDecimal latitude,
            BigDecimal longitude,
            String phone,
            String email,
            boolean enabled,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}

    /**
     * DTO para respuesta de institución con sus campus
     */
    public record InstitutionWithCampusDto(
            InstitutionDto institution,
            List<CampusDto> campuses
    ) {}

    /**
     * DTO para lista paginada de instituciones
     */
    public record InstitutionListResponse(
            List<InstitutionDto> institutions,
            int totalElements,
            int totalPages,
            int currentPage,
            int pageSize,
            boolean hasNext,
            boolean hasPrevious
    ) {}

    /**
     * DTO para lista paginada de campus
     */
    public record CampusListResponse(
            List<CampusDto> campuses,
            int totalElements,
            int totalPages,
            int currentPage,
            int pageSize,
            boolean hasNext,
            boolean hasPrevious
    ) {}

    /**
     * DTO para respuesta de operación
     */
    public record OperationResponse(
            boolean success,
            String message,
            UUID id
    ) {}

    /**
     * DTO para respuesta de error
     */
    public record ErrorResponse(
            String code,
            String message,
            List<ValidationError> details
    ) {}

    /**
     * DTO para errores de validación
     */
    public record ValidationError(
            String field,
            String message
    ) {}
}
