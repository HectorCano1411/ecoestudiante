/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Location } from './MobilityMap';

interface SimpleMobilityMapProps {
  onOriginChange?: (location: Location) => void;
  onDestinationChange?: (location: Location) => void;
  onDistanceChange?: (distance: number) => void;
}

/**
 * Mapa de movilidad SIMPLE sin dependencia de Mapbox
 *
 * Usa OpenStreetMap (100% gratuito) con Leaflet
 * Calcula distancias con:
 * - Fórmula Haversine (línea recta)
 * - API OSRM (ruta real por carretera) - GRATUITA
 *
 * NO requiere tokens ni configuración adicional
 */
export default function SimpleMobilityMap({
  onOriginChange,
  onDestinationChange,
  onDistanceChange,
}: SimpleMobilityMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [roadDistance, setRoadDistance] = useState<number | null>(null);
  const [isSelectingOrigin, setIsSelectingOrigin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const leafletMap = useRef<any>(null);
  const L = useRef<any>(null);
  const originMarker = useRef<any>(null);
  const destinationMarker = useRef<any>(null);
  const routeLayer = useRef<any>(null);

  // Fórmula Haversine para calcular distancia en línea recta
  const calculateHaversineDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Calcular ruta usando OSRM (Open Source Routing Machine) - GRATIS
  const calculateRouteWithOSRM = useCallback(async (originLoc: Location, destLoc: Location) => {
    setLoading(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${originLoc.lng},${originLoc.lat};${destLoc.lng},${destLoc.lat}?overview=full&geometries=geojson`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Error calculando ruta con OSRM');
      }

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = route.distance / 1000;

        setRoadDistance(distanceKm);
        onDistanceChange?.(distanceKm);

        // Dibujar ruta en el mapa
        if (routeLayer.current && leafletMap.current) {
          leafletMap.current.removeLayer(routeLayer.current);
        }

        if (L.current && leafletMap.current) {
          const coordinates = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
          routeLayer.current = L.current.polyline(coordinates, {
            color: '#3b82f6',
            weight: 5,
            opacity: 0.75,
          }).addTo(leafletMap.current);

          // Ajustar vista para mostrar toda la ruta
          leafletMap.current.fitBounds(routeLayer.current.getBounds(), { padding: [50, 50] });
        }

        return distanceKm;
      }
    } catch (error) {
      console.error('Error con OSRM:', error);
      // Fallback: usar Haversine si OSRM falla
      const haversineDistance = calculateHaversineDistance(
        originLoc.lat,
        originLoc.lng,
        destLoc.lat,
        destLoc.lng
      );

      // Aplicar factor de corrección del 20% (las carreteras no son líneas rectas)
      const estimatedRoadDistance = haversineDistance * 1.2;
      setRoadDistance(estimatedRoadDistance);
      onDistanceChange?.(estimatedRoadDistance);

      // Dibujar línea recta
      if (routeLayer.current && leafletMap.current) {
        leafletMap.current.removeLayer(routeLayer.current);
      }

      if (L.current && leafletMap.current) {
        routeLayer.current = L.current.polyline(
          [
            [originLoc.lat, originLoc.lng],
            [destLoc.lat, destLoc.lng],
          ],
          {
            color: '#f97316',
            weight: 3,
            opacity: 0.75,
            dashArray: '10, 10',
          }
        ).addTo(leafletMap.current);
      }

      return estimatedRoadDistance;
    } finally {
      setLoading(false);
    }
  }, [calculateHaversineDistance, onDistanceChange]);

  // Geocodificación inversa con Nominatim (OpenStreetMap) - GRATIS
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'EcoEstudiante/1.0',
          },
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      return data.display_name || null;
    } catch (error) {
      console.error('Error en geocodificación:', error);
      return null;
    }
  }, []);

  // Handler de click en el mapa
  const handleMapClick = useCallback(async (e: any) => {
    console.log('🗺️ Click en mapa detectado', e.latlng);
    const { lat, lng } = e.latlng;

    if (isSelectingOrigin) {
      console.log('📍 Seleccionando ORIGEN');
      // Seleccionar origen
      const address = await reverseGeocode(lat, lng);
      const newOrigin: Location = { lat, lng, address: address || undefined };

      setOrigin(newOrigin);
      onOriginChange?.(newOrigin);
      setIsSelectingOrigin(false);

      // Eliminar marcador anterior si existe
      if (originMarker.current && leafletMap.current) {
        leafletMap.current.removeLayer(originMarker.current);
      }

      // Crear marcador de origen (verde)
      if (L.current && leafletMap.current) {
        const greenIcon = L.current.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });

        originMarker.current = L.current
          .marker([lat, lng], { icon: greenIcon, draggable: true })
          .addTo(leafletMap.current)
          .bindPopup(`<b>📍 Origen</b><br>${address || 'Ubicación seleccionada'}`)
          .openPopup();

        // Evento de arrastrar
        originMarker.current.on('dragend', async (dragEvent: any) => {
          const newLat = dragEvent.target.getLatLng().lat;
          const newLng = dragEvent.target.getLatLng().lng;
          const newAddress = await reverseGeocode(newLat, newLng);
          const updatedOrigin: Location = { lat: newLat, lng: newLng, address: newAddress || undefined };

          setOrigin(updatedOrigin);
          onOriginChange?.(updatedOrigin);

          if (destination) {
            await calculateRouteWithOSRM(updatedOrigin, destination);
          }
        });
      }
    } else {
      console.log('🎯 Seleccionando DESTINO');
      // Seleccionar destino
      const address = await reverseGeocode(lat, lng);
      const newDestination: Location = { lat, lng, address: address || undefined };

      setDestination(newDestination);
      onDestinationChange?.(newDestination);

      // Eliminar marcador anterior si existe
      if (destinationMarker.current && leafletMap.current) {
        leafletMap.current.removeLayer(destinationMarker.current);
      }

      // Crear marcador de destino (rojo)
      if (L.current && leafletMap.current) {
        const redIcon = L.current.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });

        destinationMarker.current = L.current
          .marker([lat, lng], { icon: redIcon, draggable: true })
          .addTo(leafletMap.current)
          .bindPopup(`<b>🎯 Destino</b><br>${address || 'Ubicación seleccionada'}`)
          .openPopup();

        // Evento de arrastrar
        destinationMarker.current.on('dragend', async (dragEvent: any) => {
          const newLat = dragEvent.target.getLatLng().lat;
          const newLng = dragEvent.target.getLatLng().lng;
          const newAddress = await reverseGeocode(newLat, newLng);
          const updatedDestination: Location = { lat: newLat, lng: newLng, address: newAddress || undefined };

          setDestination(updatedDestination);
          onDestinationChange?.(updatedDestination);

          if (origin) {
            await calculateRouteWithOSRM(origin, updatedDestination);
          }
        });

        // Calcular ruta si hay origen
        if (origin) {
          // Calcular distancia en línea recta
          const straightDistance = calculateHaversineDistance(origin.lat, origin.lng, lat, lng);
          setDistance(straightDistance);

          // Calcular ruta por carretera
          await calculateRouteWithOSRM(origin, newDestination);
        }
      }
    }
  }, [isSelectingOrigin, origin, destination, reverseGeocode, onOriginChange, onDestinationChange, calculateHaversineDistance, calculateRouteWithOSRM]);

  // Cargar Leaflet dinámicamente
  useEffect(() => {
    const loadLeaflet = async () => {
      if (typeof window === 'undefined') return;
      if (leafletMap.current) return; // Ya está inicializado

      try {
        console.log('🔄 Cargando Leaflet...');

        // Cargar CSS de Leaflet
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
          link.crossOrigin = '';
          document.head.appendChild(link);
        }

        // Cargar librería Leaflet
        const leafletLib = await import('leaflet');
        L.current = leafletLib.default;

        // Fix para iconos de Leaflet
        delete (L.current.Icon.Default.prototype as any)._getIconUrl;
        L.current.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        // Inicializar mapa
        if (mapContainer.current && !leafletMap.current) {
          console.log('🗺️ Inicializando mapa...');
          leafletMap.current = L.current.map(mapContainer.current).setView([-33.4489, -70.6693], 13);

          // Agregar capa de OpenStreetMap (GRATIS, sin API key)
          L.current.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }).addTo(leafletMap.current);

          console.log('✅ Mapa inicializado correctamente');
          setMapReady(true);
        }
      } catch (error) {
        console.error('❌ Error cargando Leaflet:', error);
      }
    };

    loadLeaflet();

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Registrar evento de click cuando el mapa esté listo
  useEffect(() => {
    if (mapReady && leafletMap.current && handleMapClick) {
      console.log('🎯 Registrando evento de click en el mapa');
      leafletMap.current.on('click', handleMapClick);

      return () => {
        if (leafletMap.current) {
          leafletMap.current.off('click', handleMapClick);
        }
      };
    }
  }, [mapReady, handleMapClick]);

  // Limpiar selección
  const handleClearSelection = () => {
    console.log('🗑️ Limpiando selección');
    if (originMarker.current && leafletMap.current) {
      leafletMap.current.removeLayer(originMarker.current);
      originMarker.current = null;
    }
    if (destinationMarker.current && leafletMap.current) {
      leafletMap.current.removeLayer(destinationMarker.current);
      destinationMarker.current = null;
    }
    if (routeLayer.current && leafletMap.current) {
      leafletMap.current.removeLayer(routeLayer.current);
      routeLayer.current = null;
    }

    setOrigin(null);
    setDestination(null);
    setDistance(null);
    setRoadDistance(null);
    setIsSelectingOrigin(true);
    onOriginChange?.({ lat: 0, lng: 0 });
    onDestinationChange?.({ lat: 0, lng: 0 });
    onDistanceChange?.(0);
  };

  return (
    <div className="w-full">
      {/* Banner informativo */}
      <div className="mb-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-300">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-sm font-bold text-green-800">
              Mapa 100% Gratuito - OpenStreetMap + Leaflet
            </p>
            <p className="text-xs text-green-700">
              Sin tokens ni configuración adicional • Rutas calculadas con OSRM (Open Source)
            </p>
          </div>
        </div>
      </div>

      {/* Indicador de estado */}
      <div className="mb-3 p-3 rounded-lg border-2 bg-blue-50 border-blue-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSelectingOrigin ? (
              <>
                <span className="text-2xl animate-pulse">📍</span>
                <div>
                  <p className="text-sm font-semibold text-blue-800">
                    Paso 1: HAZ CLIC en el mapa para seleccionar el ORIGEN
                  </p>
                  <p className="text-xs text-blue-600">Punto de partida de tu trayecto</p>
                </div>
              </>
            ) : (
              <>
                <span className="text-2xl animate-pulse">🎯</span>
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    Paso 2: HAZ CLIC en el mapa para seleccionar el DESTINO
                  </p>
                  <p className="text-xs text-green-600">Punto de llegada de tu trayecto</p>
                </div>
              </>
            )}
          </div>
          {(origin || destination) && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              🗑️ Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Mapa */}
      <div className="relative">
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg border-2 border-gray-300 z-10">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-gray-600">Cargando mapa...</p>
            </div>
          </div>
        )}
        <div
          ref={mapContainer}
          className="w-full h-96 rounded-lg border-2 border-gray-300 shadow-lg cursor-crosshair"
          style={{ zIndex: 1 }}
        />
        {loading && mapReady && (
          <div className="absolute top-2 right-2 bg-white px-3 py-2 rounded-lg shadow-md flex items-center gap-2 z-20">
            <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm text-gray-700">Calculando ruta...</span>
          </div>
        )}
      </div>

      {/* Información de ubicaciones */}
      {mapReady && (
        <div className="mt-4 space-y-2">
          {origin && (
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-green-500"></span>
                <div>
                  <p className="text-xs font-semibold text-green-800">Origen</p>
                  <p className="text-sm text-gray-700">
                    {origin.address || `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {destination && (
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-red-500"></span>
                <div>
                  <p className="text-xs font-semibold text-red-800">Destino</p>
                  <p className="text-sm text-gray-700">
                    {destination.address || `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {distance !== null && (
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2">
                <span className="text-xl">📏</span>
                <div>
                  <p className="text-xs font-semibold text-yellow-800">Distancia en Línea Recta (Haversine)</p>
                  <p className="text-lg font-bold text-yellow-600">{distance.toFixed(2)} km</p>
                </div>
              </div>
            </div>
          )}

          {roadDistance !== null && (
            <div className="p-3 bg-blue-50 rounded-lg border-2 border-blue-300">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛣️</span>
                <div>
                  <p className="text-xs font-semibold text-blue-800">Distancia por Carretera (OSRM)</p>
                  <p className="text-lg font-bold text-blue-600">{roadDistance.toFixed(2)} km</p>
                  <p className="text-xs text-gray-600 mt-1">
                    ✓ Esta es la distancia real que usaremos para calcular tu huella de carbono
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instrucciones */}
      {mapReady && !origin && !destination && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600">
            💡 <strong>Instrucciones:</strong> Haz clic en el mapa para seleccionar el origen (marcador verde 📍),
            luego haz clic nuevamente para seleccionar el destino (marcador rojo 🎯).
            Puedes arrastrar los marcadores para ajustar las ubicaciones.
          </p>
        </div>
      )}
    </div>
  );
}
