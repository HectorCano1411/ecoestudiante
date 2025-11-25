package com.ecoestudiante.calc.exception;

/**
 * Excepción personalizada para errores en el servicio de estadísticas.
 * 
 * Esta excepción se lanza cuando ocurre un error al procesar estadísticas
 * de cálculos de huella de carbono.
 */
public class StatsServiceException extends RuntimeException {

    public StatsServiceException(String message) {
        super(message);
    }

    public StatsServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}




