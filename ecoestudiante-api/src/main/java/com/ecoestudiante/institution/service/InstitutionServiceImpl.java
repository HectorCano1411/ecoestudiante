package com.ecoestudiante.institution.service;

import com.ecoestudiante.institution.dto.InstitutionDtos;
import com.ecoestudiante.institution.model.Campus;
import com.ecoestudiante.institution.model.Institution;
import com.ecoestudiante.institution.repository.CampusRepository;
import com.ecoestudiante.institution.repository.InstitutionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class InstitutionServiceImpl implements InstitutionService {

    private static final Logger logger = LoggerFactory.getLogger(InstitutionServiceImpl.class);
    private final InstitutionRepository institutionRepository;
    private final CampusRepository campusRepository;

    public InstitutionServiceImpl(
            InstitutionRepository institutionRepository,
            CampusRepository campusRepository) {
        this.institutionRepository = institutionRepository;
        this.campusRepository = campusRepository;
    }

    @Override
    public InstitutionDtos.InstitutionListResponse getInstitutions(
            int page, int size, String search, Institution.InstitutionType type, Boolean enabled) {
        logger.info("Obteniendo lista de instituciones - página: {}, tamaño: {}", page, size);

        List<Institution> institutions = institutionRepository.findAll(page, size, search, type, enabled);
        Long total = institutionRepository.count(search, type, enabled);

        List<InstitutionDtos.InstitutionDto> institutionDtos = institutions.stream()
                .map(this::toInstitutionDto)
                .collect(Collectors.toList());

        int totalPages = (int) Math.ceil((double) total / size);

        return new InstitutionDtos.InstitutionListResponse(
                institutionDtos,
                total.intValue(),
                totalPages,
                page,
                size,
                page < totalPages - 1,
                page > 0
        );
    }

    @Override
    public InstitutionDtos.InstitutionDto getInstitutionById(UUID id) {
        logger.info("Obteniendo institución por ID: {}", id);
        Institution institution = institutionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Institución no encontrada con ID: " + id));
        return toInstitutionDto(institution);
    }

    @Override
    public InstitutionDtos.InstitutionWithCampusDto getInstitutionWithCampus(UUID id) {
        logger.info("Obteniendo institución con campus por ID: {}", id);
        Institution institution = institutionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Institución no encontrada con ID: " + id));

        List<Campus> campuses = campusRepository.findByInstitutionId(id);
        List<InstitutionDtos.CampusDto> campusDtos = campuses.stream()
                .map(c -> toCampusDto(c, institution.getName()))
                .collect(Collectors.toList());

        return new InstitutionDtos.InstitutionWithCampusDto(
                toInstitutionDto(institution),
                campusDtos
        );
    }

    @Override
    @Transactional
    public InstitutionDtos.InstitutionDto createInstitution(
            InstitutionDtos.CreateInstitutionRequest request, UUID currentUserId) {
        logger.info("Creando nueva institución: {}", request.name());

        // Validar código único si se proporciona
        if (request.code() != null && !request.code().isBlank()) {
            institutionRepository.findByCode(request.code())
                    .ifPresent(i -> {
                        throw new IllegalArgumentException("Ya existe una institución con el código: " + request.code());
                    });
        }

        Institution institution = new Institution();
        institution.setName(request.name().trim());
        institution.setType(request.type());
        institution.setCode(request.code() != null ? request.code().trim().toUpperCase() : null);
        institution.setWebsite(request.website());
        institution.setEmail(request.email());
        institution.setPhone(request.phone());
        institution.setAddress(request.address());
        institution.setCity(request.city());
        institution.setRegion(request.region());
        institution.setCountry(request.country() != null ? request.country() : "Chile");
        institution.setEnabled(true);
        institution.setCreatedBy(currentUserId);
        institution.setUpdatedBy(currentUserId);

        Institution saved = institutionRepository.save(institution);
        logger.info("Institución creada exitosamente: {} (ID: {})", saved.getName(), saved.getId());

        return toInstitutionDto(saved);
    }

    @Override
    @Transactional
    public InstitutionDtos.InstitutionDto updateInstitution(
            UUID id, InstitutionDtos.UpdateInstitutionRequest request, UUID currentUserId) {
        logger.info("Actualizando institución: {}", id);

        Institution institution = institutionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Institución no encontrada con ID: " + id));

        if (request.name() != null && !request.name().isBlank()) {
            institution.setName(request.name().trim());
        }
        if (request.type() != null) {
            institution.setType(request.type());
        }
        if (request.code() != null) {
            String newCode = request.code().trim().toUpperCase();
            // Verificar que el código no esté en uso por otra institución
            institutionRepository.findByCode(newCode)
                    .ifPresent(i -> {
                        if (!i.getId().equals(id)) {
                            throw new IllegalArgumentException("Ya existe otra institución con el código: " + newCode);
                        }
                    });
            institution.setCode(newCode);
        }
        if (request.website() != null) {
            institution.setWebsite(request.website());
        }
        if (request.email() != null) {
            institution.setEmail(request.email());
        }
        if (request.phone() != null) {
            institution.setPhone(request.phone());
        }
        if (request.address() != null) {
            institution.setAddress(request.address());
        }
        if (request.city() != null) {
            institution.setCity(request.city());
        }
        if (request.region() != null) {
            institution.setRegion(request.region());
        }
        if (request.country() != null) {
            institution.setCountry(request.country());
        }
        if (request.enabled() != null) {
            institution.setEnabled(request.enabled());
        }

        institution.setUpdatedBy(currentUserId);
        Institution updated = institutionRepository.save(institution);
        logger.info("Institución actualizada exitosamente: {} (ID: {})", updated.getName(), updated.getId());

        return toInstitutionDto(updated);
    }

    @Override
    @Transactional
    public InstitutionDtos.OperationResponse deleteInstitution(UUID id) {
        logger.info("Eliminando (deshabilitando) institución: {}", id);

        Institution institution = institutionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Institución no encontrada con ID: " + id));

        institutionRepository.deleteById(id);
        logger.info("Institución deshabilitada exitosamente: {} (ID: {})", institution.getName(), id);

        return new InstitutionDtos.OperationResponse(true, "Institución deshabilitada exitosamente", id);
    }

    @Override
    public InstitutionDtos.CampusListResponse getCampuses(
            int page, int size, UUID institutionId, String search, Boolean enabled) {
        logger.info("Obteniendo lista de campus - página: {}, tamaño: {}", page, size);

        List<Campus> campuses = campusRepository.findAll(page, size, institutionId, search, enabled);
        Long total = campusRepository.count(institutionId, search, enabled);

        // Obtener nombres de instituciones para los DTOs
        List<InstitutionDtos.CampusDto> campusDtos = campuses.stream()
                .map(c -> {
                    String institutionName = institutionRepository.findById(c.getInstitutionId())
                            .map(Institution::getName)
                            .orElse("Desconocida");
                    return toCampusDto(c, institutionName);
                })
                .collect(Collectors.toList());

        int totalPages = (int) Math.ceil((double) total / size);

        return new InstitutionDtos.CampusListResponse(
                campusDtos,
                total.intValue(),
                totalPages,
                page,
                size,
                page < totalPages - 1,
                page > 0
        );
    }

    @Override
    public InstitutionDtos.CampusDto getCampusById(UUID id) {
        logger.info("Obteniendo campus por ID: {}", id);
        Campus campus = campusRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Campus no encontrado con ID: " + id));

        String institutionName = institutionRepository.findById(campus.getInstitutionId())
                .map(Institution::getName)
                .orElse("Desconocida");

        return toCampusDto(campus, institutionName);
    }

    @Override
    @Transactional
    public InstitutionDtos.CampusDto createCampus(
            InstitutionDtos.CreateCampusRequest request, UUID currentUserId) {
        logger.info("Creando nuevo campus: {} para institución: {}", request.name(), request.institutionId());

        // Verificar que la institución existe
        Institution institution = institutionRepository.findById(request.institutionId())
                .orElseThrow(() -> new IllegalArgumentException("Institución no encontrada con ID: " + request.institutionId()));

        // Validar código único dentro de la institución si se proporciona
        if (request.code() != null && !request.code().isBlank()) {
            campusRepository.findByInstitutionIdAndCode(request.institutionId(), request.code())
                    .ifPresent(c -> {
                        throw new IllegalArgumentException("Ya existe un campus con el código: " + request.code() + " en esta institución");
                    });
        }

        Campus campus = new Campus();
        campus.setInstitutionId(request.institutionId());
        campus.setName(request.name().trim());
        campus.setCode(request.code() != null ? request.code().trim().toUpperCase() : null);
        campus.setAddress(request.address());
        campus.setCity(request.city());
        campus.setRegion(request.region());
        campus.setLatitude(request.latitude());
        campus.setLongitude(request.longitude());
        campus.setPhone(request.phone());
        campus.setEmail(request.email());
        campus.setEnabled(true);
        campus.setCreatedBy(currentUserId);
        campus.setUpdatedBy(currentUserId);

        Campus saved = campusRepository.save(campus);
        logger.info("Campus creado exitosamente: {} (ID: {})", saved.getName(), saved.getId());

        return toCampusDto(saved, institution.getName());
    }

    @Override
    @Transactional
    public InstitutionDtos.CampusDto updateCampus(
            UUID id, InstitutionDtos.UpdateCampusRequest request, UUID currentUserId) {
        logger.info("Actualizando campus: {}", id);

        Campus campus = campusRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Campus no encontrado con ID: " + id));

        if (request.name() != null && !request.name().isBlank()) {
            campus.setName(request.name().trim());
        }
        if (request.code() != null) {
            String newCode = request.code().trim().toUpperCase();
            // Verificar que el código no esté en uso por otro campus de la misma institución
            campusRepository.findByInstitutionIdAndCode(campus.getInstitutionId(), newCode)
                    .ifPresent(c -> {
                        if (!c.getId().equals(id)) {
                            throw new IllegalArgumentException("Ya existe otro campus con el código: " + newCode + " en esta institución");
                        }
                    });
            campus.setCode(newCode);
        }
        if (request.address() != null) {
            campus.setAddress(request.address());
        }
        if (request.city() != null) {
            campus.setCity(request.city());
        }
        if (request.region() != null) {
            campus.setRegion(request.region());
        }
        if (request.latitude() != null) {
            campus.setLatitude(request.latitude());
        }
        if (request.longitude() != null) {
            campus.setLongitude(request.longitude());
        }
        if (request.phone() != null) {
            campus.setPhone(request.phone());
        }
        if (request.email() != null) {
            campus.setEmail(request.email());
        }
        if (request.enabled() != null) {
            campus.setEnabled(request.enabled());
        }

        campus.setUpdatedBy(currentUserId);
        Campus updated = campusRepository.save(campus);

        String institutionName = institutionRepository.findById(updated.getInstitutionId())
                .map(Institution::getName)
                .orElse("Desconocida");

        logger.info("Campus actualizado exitosamente: {} (ID: {})", updated.getName(), updated.getId());

        return toCampusDto(updated, institutionName);
    }

    @Override
    @Transactional
    public InstitutionDtos.OperationResponse deleteCampus(UUID id) {
        logger.info("Eliminando (deshabilitando) campus: {}", id);

        Campus campus = campusRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Campus no encontrado con ID: " + id));

        campusRepository.deleteById(id);
        logger.info("Campus deshabilitado exitosamente: {} (ID: {})", campus.getName(), id);

        return new InstitutionDtos.OperationResponse(true, "Campus deshabilitado exitosamente", id);
    }

    // Métodos auxiliares para conversión a DTOs
    private InstitutionDtos.InstitutionDto toInstitutionDto(Institution institution) {
        int campusCount = institutionRepository.countCampusByInstitutionId(institution.getId());
        return new InstitutionDtos.InstitutionDto(
                institution.getId(),
                institution.getName(),
                institution.getType(),
                institution.getCode(),
                institution.getWebsite(),
                institution.getEmail(),
                institution.getPhone(),
                institution.getAddress(),
                institution.getCity(),
                institution.getRegion(),
                institution.getCountry(),
                institution.isEnabled(),
                institution.getCreatedAt(),
                institution.getUpdatedAt(),
                campusCount
        );
    }

    private InstitutionDtos.CampusDto toCampusDto(Campus campus, String institutionName) {
        return new InstitutionDtos.CampusDto(
                campus.getId(),
                campus.getInstitutionId(),
                institutionName,
                campus.getName(),
                campus.getCode(),
                campus.getAddress(),
                campus.getCity(),
                campus.getRegion(),
                campus.getLatitude(),
                campus.getLongitude(),
                campus.getPhone(),
                campus.getEmail(),
                campus.isEnabled(),
                campus.getCreatedAt(),
                campus.getUpdatedAt()
        );
    }
}
