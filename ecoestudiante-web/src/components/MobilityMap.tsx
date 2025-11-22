'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface MobilityMapProps {
  onOriginChange?: (location: Location) => void;
  onDestinationChange?: (location: Location) => void;
  onDistanceChange?: (distance: number) => void;
  initialOrigin?: Location;
  initialDestination?: Location;
}

export default function MobilityMap({
  onOriginChange,
  onDestinationChange,
  onDistanceChange,
  initialOrigin,
  initialDestination,
}: MobilityMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Location | null>(initialOrigin || null);
  const [destination, setDestination] = useState<Location | null>(initialDestination || null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isSelectingOrigin, setIsSelectingOrigin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Refs para marcadores
  const originMarker = useRef<mapboxgl.Marker | null>(null);
  const destinationMarker = useRef<mapboxgl.Marker | null>(null);

  // Inicializar mapa - SOLO UNA VEZ
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setMapError('Token de Mapbox no configurado. Verifica NEXT_PUBLIC_MAPBOX_TOKEN en .env.local');
      console.error('MAPBOX_TOKEN no configurado');
      return;
    }

    try {
      mapboxgl.accessToken = token;

      // Inicializar mapa
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: initialOrigin ? [initialOrigin.lng, initialOrigin.lat] : [-70.6693, -33.4489],
        zoom: 13,
        antialias: true,
      });

      // Manejar carga del mapa
      map.current.on('load', () => {
        setMapLoaded(true);
        setMapError(null);
        
        // Agregar controles
        if (map.current) {
          map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
          
          // Preparar fuente y capa para la ruta
          if (map.current.getSource('route') === undefined) {
            map.current.addSource('route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: [],
                },
              },
            });

            map.current.addLayer({
              id: 'route',
              type: 'line',
              source: 'route',
              layout: {
                'line-join': 'round',
                'line-cap': 'round',
              },
              paint: {
                'line-color': '#3b82f6',
                'line-width': 5,
                'line-opacity': 0.75,
              },
            });
          }
        }
      });

      // Manejar errores del mapa
      map.current.on('error', (e) => {
        console.error('Error del mapa:', e);
        setMapError('Error al cargar el mapa. Verifica tu conexión a internet y el token de Mapbox.');
      });

    } catch (error) {
      console.error('Error inicializando mapa:', error);
      setMapError('Error al inicializar el mapa. Verifica la configuración.');
    }

    return () => {
      if (originMarker.current) {
        originMarker.current.remove();
        originMarker.current = null;
      }
      if (destinationMarker.current) {
        destinationMarker.current.remove();
        destinationMarker.current = null;
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [initialOrigin]); // eslint-disable-line react-hooks/exhaustive-deps

  // Geocodificación inversa
  const geocodeLocation = useCallback(async (lat: number, lng: number): Promise<string | null> => {
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return null;

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&language=es`
      );
      
      if (!response.ok) {
        console.error('Error en geocodificación:', response.statusText);
        return null;
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }
      return null;
    } catch (error) {
      console.error('Error en geocodificación:', error);
      return null;
    }
  }, []);

  // Calcular ruta y distancia
  const calculateRoute = useCallback(async (originLoc: Location, destLoc: Location) => {
    if (!map.current) return;

    setLoading(true);
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) {
        throw new Error('Token de Mapbox no disponible');
      }

      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLoc.lng},${originLoc.lat};${destLoc.lng},${destLoc.lat}?access_token=${token}&geometries=geojson&language=es`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error calculando ruta: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = route.distance / 1000;
        
        setDistance(distanceKm);
        onDistanceChange?.(distanceKm);

        // Actualizar ruta en el mapa
        const routeSource = map.current.getSource('route') as mapboxgl.GeoJSONSource;
        if (routeSource) {
          routeSource.setData({
            type: 'Feature',
            properties: {},
            geometry: route.geometry,
          });
        }

        // Ajustar vista para mostrar toda la ruta
        const coordinates = route.geometry.coordinates;
        if (coordinates.length > 0) {
          const bounds = coordinates.reduce(
            (bounds: mapboxgl.LngLatBounds, coord: number[]) => {
              return bounds.extend(coord as [number, number]);
            },
            new mapboxgl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number])
          );

          map.current.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
          });
        }
      }
    } catch (error) {
      console.error('Error calculando ruta:', error);
      setMapError('Error al calcular la ruta. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [onDistanceChange]);

  // Handler de click en el mapa
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const handleMapClick = async (e: mapboxgl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      
      if (isSelectingOrigin) {
        // Seleccionar origen
        const address = await geocodeLocation(lat, lng);
        const newOrigin: Location = { lat, lng, address: address || undefined };
        
        setOrigin(newOrigin);
        onOriginChange?.(newOrigin);
        setIsSelectingOrigin(false);
        
        // Eliminar marcador anterior si existe
        if (originMarker.current) {
          originMarker.current.remove();
        }
        
        // Crear nuevo marcador de origen
        if (map.current) {
          originMarker.current = new mapboxgl.Marker({ 
            color: '#10b981',
            draggable: true,
          })
            .setLngLat([lng, lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 })
                .setHTML(`<div style="font-weight: bold; color: #10b981;">📍 Origen</div><div>${address || 'Ubicación seleccionada'}</div>`)
            )
            .addTo(map.current);
          
          // Evento para arrastrar origen
          originMarker.current.on('dragend', async () => {
            if (originMarker.current && map.current) {
              const newLngLat = originMarker.current.getLngLat();
              const newAddress = await geocodeLocation(newLngLat.lat, newLngLat.lng);
              const updatedOrigin: Location = { 
                lat: newLngLat.lat, 
                lng: newLngLat.lng, 
                address: newAddress || undefined 
              };
              setOrigin(updatedOrigin);
              onOriginChange?.(updatedOrigin);
              
              if (destination) {
                await calculateRoute(updatedOrigin, destination);
              }
            }
          });
        }
        
      } else {
        // Seleccionar destino
        const address = await geocodeLocation(lat, lng);
        const newDestination: Location = { lat, lng, address: address || undefined };
        
        setDestination(newDestination);
        onDestinationChange?.(newDestination);
        
        // Eliminar marcador anterior si existe
        if (destinationMarker.current) {
          destinationMarker.current.remove();
        }
        
        // Crear nuevo marcador de destino
        if (map.current) {
          destinationMarker.current = new mapboxgl.Marker({ 
            color: '#ef4444',
            draggable: true,
          })
            .setLngLat([lng, lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 })
                .setHTML(`<div style="font-weight: bold; color: #ef4444;">🎯 Destino</div><div>${address || 'Ubicación seleccionada'}</div>`)
            )
            .addTo(map.current);
          
          // Evento para arrastrar destino
          destinationMarker.current.on('dragend', async () => {
            if (destinationMarker.current && map.current) {
              const newLngLat = destinationMarker.current.getLngLat();
              const newAddress = await geocodeLocation(newLngLat.lat, newLngLat.lng);
              const updatedDestination: Location = { 
                lat: newLngLat.lat, 
                lng: newLngLat.lng, 
                address: newAddress || undefined 
              };
              setDestination(updatedDestination);
              onDestinationChange?.(updatedDestination);
              
              if (origin) {
                await calculateRoute(origin, updatedDestination);
              }
            }
          });
          
          // Calcular ruta si hay origen
          if (origin) {
            await calculateRoute(origin, newDestination);
          }
        }
      }
    };

    map.current.on('click', handleMapClick);

    return () => {
      map.current?.off('click', handleMapClick);
    };
  }, [mapLoaded, isSelectingOrigin, origin, destination, geocodeLocation, calculateRoute, onOriginChange, onDestinationChange]);

  // Limpiar selección
  const handleClearSelection = () => {
    if (originMarker.current) {
      originMarker.current.remove();
      originMarker.current = null;
    }
    if (destinationMarker.current) {
      destinationMarker.current.remove();
      destinationMarker.current = null;
    }
    
    // Limpiar ruta
    if (map.current && map.current.getSource('route')) {
      const routeSource = map.current.getSource('route') as mapboxgl.GeoJSONSource;
      routeSource.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
      });
    }
    
    setOrigin(null);
    setDestination(null);
    setDistance(null);
    setIsSelectingOrigin(true);
    onOriginChange?.({ lat: 0, lng: 0 });
    onDestinationChange?.({ lat: 0, lng: 0 });
    onDistanceChange?.(0);
  };

  // Restablecer para seleccionar origen nuevamente
  const handleResetOrigin = () => {
    if (originMarker.current) {
      originMarker.current.remove();
      originMarker.current = null;
    }
    setOrigin(null);
    setIsSelectingOrigin(true);
    onOriginChange?.({ lat: 0, lng: 0 });
    
    // Si hay destino, limpiar también la ruta
    if (destination && map.current && map.current.getSource('route')) {
      const routeSource = map.current.getSource('route') as mapboxgl.GeoJSONSource;
      routeSource.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
      });
      setDistance(null);
      onDistanceChange?.(0);
    }
  };

  return (
    <div className="w-full">
      {/* Mensaje de error */}
      {mapError && (
        <div className="mb-3 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
          <p className="text-sm text-red-800 font-semibold">⚠️ {mapError}</p>
        </div>
      )}

      {/* Indicador de estado */}
      {!mapError && (
        <div className="mb-3 p-3 rounded-lg border-2 bg-blue-50 border-blue-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isSelectingOrigin ? (
                <>
                  <span className="text-2xl">📍</span>
                  <div>
                    <p className="text-sm font-semibold text-blue-800">
                      Paso 1: Haz clic en el mapa para seleccionar el ORIGEN
                    </p>
                    <p className="text-xs text-blue-600">Selecciona el punto de partida</p>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-2xl">🎯</span>
                  <div>
                    <p className="text-sm font-semibold text-green-800">
                      Paso 2: Haz clic en el mapa para seleccionar el DESTINO
                    </p>
                    <p className="text-xs text-green-600">Selecciona el punto de llegada</p>
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
      )}

      {/* Mapa */}
      <div className="relative">
        {!mapLoaded && !mapError && (
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
          className={`w-full h-96 rounded-lg border-2 border-gray-300 shadow-lg ${!mapLoaded ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`}
        />
        {loading && mapLoaded && (
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
      {mapLoaded && (
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
              <button
                type="button"
                onClick={handleResetOrigin}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Cambiar
              </button>
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
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-2 border-blue-300">
              <div className="flex items-center gap-2">
                <span className="text-xl">📏</span>
                <div>
                  <p className="text-xs font-semibold text-blue-800">Distancia Calculada</p>
                  <p className="text-lg font-bold text-blue-600">{distance.toFixed(2)} km</p>
                </div>
              </div>
              <div className="text-xs text-gray-600">
                ✓ Ruta trazada en el mapa
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instrucciones */}
      {mapLoaded && !origin && !destination && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600">
            💡 <strong>Instrucciones:</strong> Haz clic en el mapa para seleccionar el origen (marcador verde), 
            luego haz clic nuevamente para seleccionar el destino (marcador rojo). 
            Puedes arrastrar los marcadores para ajustar las ubicaciones.
          </p>
        </div>
      )}
    </div>
  );
}
