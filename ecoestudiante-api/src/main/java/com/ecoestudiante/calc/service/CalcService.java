package com.ecoestudiante.calc.service;

import com.ecoestudiante.calc.dto.CalcDtos;
import java.time.LocalDate;
import java.util.List;

public interface CalcService {
  CalcDtos.CalcResult computeElectricity(CalcDtos.ElectricityInput in);
  CalcDtos.CalcResult computeTransport(CalcDtos.TransportInput in);
  CalcDtos.CalcResult computeWaste(CalcDtos.WasteInput in);

  CalcDtos.CalcHistoryResponse getHistory(
      String userId,
      String category,
      int page,
      int pageSize,
      LocalDate dateFrom,
      LocalDate dateTo,
      Double emissionMin,
      Double emissionMax,
      List<String> subcategories
  );
}
