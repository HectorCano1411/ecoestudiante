package com.ecoestudiante.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Configuración para el manejo asíncrono de eventos.
 *
 * Habilita la ejecución asíncrona de listeners de eventos (@Async)
 * y configura un pool de threads dedicado para procesamiento paralelo.
 *
 * Esto permite que los eventos de gamificación (cálculos completados,
 * misiones asignadas/completadas) se procesen en segundo plano sin
 * bloquear las respuestas HTTP principales.
 *
 * @author EcoEstudiante Team
 * @version 1.0.0
 * @since 2025-12-08
 */
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

        // Core pool size: threads mínimos siempre activos
        executor.setCorePoolSize(2);

        // Max pool size: threads máximos en momentos de alta carga
        executor.setMaxPoolSize(10);

        // Queue capacity: tamaño de la cola de tareas pendientes
        executor.setQueueCapacity(100);

        // Thread name prefix para facilitar debugging en logs
        executor.setThreadNamePrefix("gamification-async-");

        // Wait for tasks to complete on shutdown
        executor.setWaitForTasksToCompleteOnShutdown(true);

        // Max wait time for shutdown
        executor.setAwaitTerminationSeconds(60);

        executor.initialize();

        return executor;
    }
}
