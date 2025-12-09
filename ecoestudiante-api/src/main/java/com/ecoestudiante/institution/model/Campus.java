package com.ecoestudiante.institution.model;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entidad que representa un campus o sede de una institución educativa.
 */
@Data
public class Campus {
    private UUID id;
    private UUID institutionId;
    private String name;
    private String code; // Código único dentro de la institución
    private String address;
    private String city;
    private String region;
    private BigDecimal latitude; // Para geolocalización
    private BigDecimal longitude; // Para geolocalización
    private String phone;
    private String email;
    private boolean enabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
}
