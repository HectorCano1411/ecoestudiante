package com.ecoestudiante.calc.service;

import com.ecoestudiante.calc.dto.CalcDtos;

public interface CalcService {
  CalcDtos.CalcResult computeElectricity(CalcDtos.ElectricityInput in);
  CalcDtos.CalcResult computeTransport(CalcDtos.TransportInput in);
  CalcDtos.CalcHistoryResponse getHistory(String userId, String category, int page, int pageSize);
}
