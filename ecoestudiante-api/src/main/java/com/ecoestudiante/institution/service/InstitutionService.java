package com.ecoestudiante.institution.service;

import com.ecoestudiante.institution.dto.InstitutionDtos;
import java.util.UUID;

/**
 * Servicio para gestión de instituciones educativas y campus
 */
public interface InstitutionService {
    
    // Operaciones de Instituciones
    InstitutionDtos.InstitutionListResponse getInstitutions(
        int page, 
        int size, 
        String search, 
        com.ecoestudiante.institution.model.Institution.InstitutionType type, 
        Boolean enabled
    );
    
    InstitutionDtos.InstitutionDto getInstitutionById(UUID id);
    
    InstitutionDtos.InstitutionWithCampusDto getInstitutionWithCampus(UUID id);
    
    InstitutionDtos.InstitutionDto createInstitution(
        InstitutionDtos.CreateInstitutionRequest request, 
        UUID currentUserId
    );
    
    InstitutionDtos.InstitutionDto updateInstitution(
        UUID id, 
        InstitutionDtos.UpdateInstitutionRequest request, 
        UUID currentUserId
    );
    
    InstitutionDtos.OperationResponse deleteInstitution(UUID id);
    
    // Operaciones de Campus
    InstitutionDtos.CampusListResponse getCampuses(
        int page, 
        int size, 
        UUID institutionId, 
        String search, 
        Boolean enabled
    );
    
    InstitutionDtos.CampusDto getCampusById(UUID id);
    
    InstitutionDtos.CampusDto createCampus(
        InstitutionDtos.CreateCampusRequest request, 
        UUID currentUserId
    );
    
    InstitutionDtos.CampusDto updateCampus(
        UUID id, 
        InstitutionDtos.UpdateCampusRequest request, 
        UUID currentUserId
    );
    
    InstitutionDtos.OperationResponse deleteCampus(UUID id);
}
