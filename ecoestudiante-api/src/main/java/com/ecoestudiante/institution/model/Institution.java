package com.ecoestudiante.institution.model;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entidad que representa una institución educativa.
 * Puede ser: Universidad, Instituto Profesional, Centro de Formación Técnica, o Liceo Técnico Profesional.
 */
@Data
public class Institution {
    private UUID id;
    private String name;
    private InstitutionType type;
    private String code; // Código único (ej: "UCH", "PUC", "INACAP")
    private String website;
    private String email;
    private String phone;
    private String address;
    private String city;
    private String region;
    private String country;
    private boolean enabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;

    /**
     * Tipo de institución educativa
     */
    public enum InstitutionType {
        UNIVERSIDAD,
        INSTITUTO_PROFESIONAL,
        CENTRO_FORMACION_TECNICA,
        LICEO_TECNICO_PROFESIONAL
    }
}
