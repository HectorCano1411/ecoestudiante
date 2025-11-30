#!/usr/bin/env python3
"""
Script para generar 1000 registros realistas de huella de carbono
simulando un estudiante de Ingeniería en Informática durante un año académico

Considera patrones estacionales y comportamiento real de estudiante universitario
"""

import random
import json
from datetime import datetime, timedelta
from uuid import uuid4

# Usuario ID de Hector
USER_ID = '0337bc65-4e22-4233-8f71-ce1855154b11'

# Configuración de estaciones del año en Chile (Hemisferio Sur)
SEASONS = {
    'verano': {  # Diciembre - Febrero (Vacaciones)
        'months': [12, 1, 2],
        'electricidad_factor': 0.6,  # Menos tiempo estudiando
        'transporte_factor': 1.3,    # Más viajes (vacaciones, paseos)
        'residuos_factor': 0.7,      # Menos trabajos universitarios
    },
    'otono': {  # Marzo - Mayo (Inicio de clases)
        'months': [3, 4, 5],
        'electricidad_factor': 1.2,  # Mucho estudio
        'transporte_factor': 1.0,    # Transporte regular
        'residuos_factor': 1.1,      # Trabajos y tareas
    },
    'invierno': {  # Junio - Agosto (Exámenes parciales + vacaciones invierno)
        'months': [6, 7, 8],
        'electricidad_factor': 1.4,  # Mucho estudio (frío, más tiempo en casa)
        'transporte_factor': 0.8,    # Menos salidas (frío)
        'residuos_factor': 1.3,      # Trabajos finales + exámenes
    },
    'primavera': {  # Septiembre - Noviembre (Exámenes finales)
        'months': [9, 10, 11],
        'electricidad_factor': 1.5,  # Máximo estudio (exámenes finales)
        'transporte_factor': 0.9,    # Regular
        'residuos_factor': 1.5,      # Muchos trabajos impresos
    }
}

# Electrodomésticos típicos de estudiante de Ingeniería en Informática
APPLIANCES = {
    'laptop': {'prob': 0.95, 'kwh_base': 8.0},       # Casi siempre
    'monitor': {'prob': 0.70, 'kwh_base': 3.5},      # Frecuente
    'desktop': {'prob': 0.40, 'kwh_base': 12.0},     # Algunos días
    'router': {'prob': 0.90, 'kwh_base': 2.0},       # Muy frecuente
    'lampara': {'prob': 0.85, 'kwh_base': 1.5},      # Estudio nocturno
    'cargador': {'prob': 0.80, 'kwh_base': 0.5},     # Celular, tablet
    'ventilador': {'prob': 0.30, 'kwh_base': 2.5},   # Verano
}

# Modos de transporte típicos
TRANSPORT_MODES = [
    {'mode': 'bus', 'fuel': None, 'prob': 0.35, 'distance': (5, 15)},
    {'mode': 'metro', 'fuel': None, 'prob': 0.25, 'distance': (8, 20)},
    {'mode': 'bicycle', 'fuel': None, 'prob': 0.15, 'distance': (2, 8)},
    {'mode': 'walking', 'fuel': None, 'prob': 0.10, 'distance': (0.5, 3)},
    {'mode': 'car', 'fuel': 'gasoline', 'prob': 0.10, 'distance': (5, 25)},
    {'mode': 'motorcycle', 'fuel': 'gasoline', 'prob': 0.05, 'distance': (5, 20)},
]

# Tipos de residuos típicos de estudiante
WASTE_TYPES = [
    {'type': 'paper', 'weight': (0.5, 3.0), 'prob': 0.40},      # Trabajos, apuntes
    {'type': 'plastic', 'weight': (0.2, 1.5), 'prob': 0.30},    # Botellas, envases
    {'type': 'organic', 'weight': (0.3, 2.0), 'prob': 0.20},    # Comida
    {'type': 'glass', 'weight': (0.2, 1.0), 'prob': 0.05},      # Ocasional
    {'type': 'metal', 'weight': (0.1, 0.5), 'prob': 0.05},      # Latas
]

DISPOSAL_METHODS = ['mixed', 'recycling', 'composting', 'landfill']

def get_season(month):
    """Determina la estación según el mes"""
    for season, config in SEASONS.items():
        if month in config['months']:
            return season, config
    return 'verano', SEASONS['verano']

def is_weekday(date):
    """Verifica si es día de semana (más actividad universitaria)"""
    return date.weekday() < 5  # 0=Lunes, 4=Viernes

def generate_electricity_record(date, season_factor):
    """Genera un registro de consumo eléctrico realista"""
    # Más consumo en días de semana y según la estación
    base_kwh = 5.0 * season_factor
    if is_weekday(date):
        base_kwh *= 1.3  # Más estudio en días de semana

    # Seleccionar electrodomésticos según probabilidades
    selected = []
    total_kwh = 0

    for appliance, config in APPLIANCES.items():
        if random.random() < config['prob'] * season_factor:
            selected.append(appliance)
            # Variar las horas de uso
            hours = random.uniform(2, 10) if appliance in ['laptop', 'monitor'] else random.uniform(1, 6)
            total_kwh += config['kwh_base'] * hours / 24

    # Asegurar que haya al menos laptop
    if 'laptop' not in selected:
        selected.append('laptop')

    # Limitar a 5 electrodomésticos máximo
    selected = selected[:5]

    # Calcular kWh total con variación
    final_kwh = max(1.0, base_kwh + total_kwh + random.uniform(-2, 3))

    return {
        'kwh': round(final_kwh, 2),
        'country': 'CL',
        'period': date.strftime('%Y-%m'),
        'idempotencyKey': str(uuid4()),
        'selectedAppliances': selected,
        'career': 'Ingeniería en Informática',
        'schedule': 'diurna'
    }

def generate_transport_record(date, season_factor):
    """Genera un registro de transporte realista"""
    # Seleccionar modo de transporte según probabilidades
    rand = random.random()
    cumulative = 0
    selected_mode = TRANSPORT_MODES[0]

    for mode_config in TRANSPORT_MODES:
        cumulative += mode_config['prob']
        if rand <= cumulative:
            selected_mode = mode_config
            break

    # Calcular distancia según la estación (más viajes en verano)
    min_dist, max_dist = selected_mode['distance']
    distance = random.uniform(min_dist, max_dist) * season_factor

    # Menos transporte en fin de semana (a menos que sea verano)
    if not is_weekday(date) and season_factor < 1.0:
        distance *= 0.5

    return {
        'distance': round(distance, 2),
        'transportMode': selected_mode['mode'],
        'fuelType': selected_mode['fuel'],
        'occupancy': 1 if selected_mode['mode'] in ['car', 'motorcycle'] else None,
        'country': 'CL',
        'period': date.strftime('%Y-%m'),
        'idempotencyKey': str(uuid4())
    }

def generate_waste_record(date, season_factor):
    """Genera un registro de residuos realista"""
    # Seleccionar 1-3 tipos de residuos
    num_items = random.randint(1, 3)
    waste_items = []

    # Más papel en época de exámenes (primavera/invierno)
    paper_boost = 1.5 if season_factor > 1.2 else 1.0

    for _ in range(num_items):
        # Seleccionar tipo de residuo
        rand = random.random()
        cumulative = 0

        for waste_config in WASTE_TYPES:
            prob = waste_config['prob']
            if waste_config['type'] == 'paper':
                prob *= paper_boost

            cumulative += prob
            if rand <= cumulative:
                min_weight, max_weight = waste_config['weight']
                weight = round(random.uniform(min_weight, max_weight) * season_factor, 2)
                waste_items.append({
                    'wasteType': waste_config['type'],
                    'weightKg': weight
                })
                break

    # Método de disposición (estudiantes universitarios tienden a reciclar más)
    disposal = random.choices(
        DISPOSAL_METHODS,
        weights=[0.30, 0.45, 0.15, 0.10],  # Más reciclaje
        k=1
    )[0]

    return {
        'wasteItems': waste_items,
        'disposalMethod': disposal,
        'country': 'CL',
        'period': date.strftime('%Y-%m'),
        'idempotencyKey': str(uuid4())
    }

def generate_sql_insert(category, input_json, result_kg_co2e, created_at):
    """Genera una sentencia SQL INSERT"""
    calc_id = str(uuid4())
    factor_hash = 'mock_' + str(uuid4())[:8]

    # Escapar comillas simples en JSON
    input_json_str = json.dumps(input_json).replace("'", "''")

    return f"""INSERT INTO calculation (id, user_id, category, input_json, result_kg_co2e, factor_hash, created_at)
VALUES ('{calc_id}', '{USER_ID}', '{category}', '{input_json_str}'::jsonb, {result_kg_co2e}, '{factor_hash}', '{created_at.strftime('%Y-%m-%d %H:%M:%S')}');"""

def estimate_co2e(category, input_data):
    """Estima kg CO2e según la categoría (valores aproximados)"""
    if category == 'electricidad':
        # Factor promedio Chile: ~0.37 kg CO2e/kWh
        return round(input_data['kwh'] * 0.37 * random.uniform(0.9, 1.1), 4)
    elif category == 'transporte':
        mode = input_data['transportMode']
        distance = input_data['distance']
        # Factores aproximados por km
        factors = {
            'car': 0.21,
            'motorcycle': 0.15,
            'bus': 0.08,
            'metro': 0.04,
            'bicycle': 0.0,
            'walking': 0.0
        }
        return round(distance * factors.get(mode, 0.1) * random.uniform(0.9, 1.1), 4)
    elif category == 'residuos':
        total_weight = sum(item['weightKg'] for item in input_data['wasteItems'])
        disposal = input_data['disposalMethod']
        # Factores aproximados por kg según disposición
        factors = {
            'landfill': 0.5,
            'mixed': 0.3,
            'recycling': 0.1,
            'composting': 0.05
        }
        return round(total_weight * factors.get(disposal, 0.3) * random.uniform(0.9, 1.1), 4)
    return 1.0

def main():
    """Genera el script SQL con 1000 registros"""
    print("-- ============================================================================")
    print("-- Script de inserción de datos realistas de estudiante universitario")
    print("-- Estudiante: Hector Cano Leal")
    print("-- Carrera: Ingeniería en Informática")
    print("-- Periodo: Año académico completo (Diciembre 2023 - Noviembre 2024)")
    print("-- Total de registros: 1000")
    print("-- ============================================================================")
    print()
    print("BEGIN;")
    print()

    # Fecha de inicio: 1 de diciembre 2023
    start_date = datetime(2023, 12, 1)
    records_generated = 0
    target_records = 1000

    # Distribuir registros a lo largo de 365 días
    current_date = start_date

    # Distribución de categorías: 40% electricidad, 35% transporte, 25% residuos
    category_weights = {
        'electricidad': 0.40,
        'transporte': 0.35,
        'residuos': 0.25
    }

    while records_generated < target_records:
        # Determinar estación
        month = current_date.month
        season_name, season_config = get_season(month)

        # Número de registros por día (1-4, más en días de semana)
        if is_weekday(current_date):
            daily_records = random.randint(2, 4)
        else:
            daily_records = random.randint(1, 2)

        for _ in range(daily_records):
            if records_generated >= target_records:
                break

            # Seleccionar categoría según pesos
            category = random.choices(
                list(category_weights.keys()),
                weights=list(category_weights.values()),
                k=1
            )[0]

            # Generar datos según categoría y estación
            if category == 'electricidad':
                input_data = generate_electricity_record(
                    current_date,
                    season_config['electricidad_factor']
                )
            elif category == 'transporte':
                input_data = generate_transport_record(
                    current_date,
                    season_config['transporte_factor']
                )
            else:  # residuos
                input_data = generate_waste_record(
                    current_date,
                    season_config['residuos_factor']
                )

            # Estimar CO2e
            co2e = estimate_co2e(category, input_data)

            # Añadir variación en timestamp (horas del día)
            timestamp = current_date + timedelta(
                hours=random.randint(7, 22),
                minutes=random.randint(0, 59)
            )

            # Generar SQL
            sql = generate_sql_insert(category, input_data, co2e, timestamp)
            print(sql)

            records_generated += 1

            if records_generated % 100 == 0:
                print(f"\n-- Progreso: {records_generated}/{target_records} registros generados")
                print()

        # Avanzar al siguiente día
        current_date += timedelta(days=1)

    print()
    print("COMMIT;")
    print()
    print(f"-- Total de registros generados: {records_generated}")
    print("-- Script generado exitosamente")

if __name__ == '__main__':
    main()
