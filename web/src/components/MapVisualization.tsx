import React, { useState } from 'react'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import { Result } from '../api'

// GeoJSON URL for world map
const geoUrl = 'https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json'

// Approximate coordinates for DNS server regions
const regionCoordinates: Record<string, [number, number]> = {
  // North America
  'US': [-95, 37],
  // Europe
  'EU': [10, 50],
  // China
  'CN': [105, 35],
  // Taiwan
  'TW': [121, 24],
  // Asia-Pacific
  'AP': [135, -25],
  // Australia
  'AU': [133, -27],
  // Brazil
  'BR': [-55, -10],
}

interface ServerLocation {
  name: string
  coordinates: [number, number]
  status: string
  count: number
  servers: Result[]
}

interface MapVisualizationProps {
  results: Result[]
}

export default function MapVisualization({ results }: MapVisualizationProps) {
  const [tooltipContent, setTooltipContent] = useState<string>('')
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  // Group servers by region and aggregate their status
  const serverLocations: ServerLocation[] = []
  const regionMap = new Map<string, Result[]>()

  results.forEach(result => {
    if (!result.region) return
    
    // Extract region code (e.g., "US" from "US/Google")
    const regionCode = result.region.split('/')[0]
    
    if (!regionMap.has(regionCode)) {
      regionMap.set(regionCode, [])
    }
    regionMap.get(regionCode)!.push(result)
  })

  // Create server locations with aggregated status
  regionMap.forEach((servers, regionCode) => {
    const coords = regionCoordinates[regionCode]
    if (!coords) return

    // Determine overall status (ok > timeout > error)
    let status = 'error'
    if (servers.some(s => s.status === 'ok')) {
      status = 'ok'
    } else if (servers.some(s => s.status === 'timeout')) {
      status = 'timeout'
    }

    serverLocations.push({
      name: regionCode,
      coordinates: coords,
      status,
      count: servers.length,
      servers,
    })
  })

  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'ok':
        return '#10b981' // green-500
      case 'timeout':
        return '#f59e0b' // yellow-500
      case 'error':
      case 'servfail':
        return '#ef4444' // red-500
      case 'nxdomain':
        return '#f97316' // orange-500
      default:
        return '#6b7280' // gray-500
    }
  }

  const handleMarkerMouseEnter = (location: ServerLocation, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const okCount = location.servers.filter(s => s.status === 'ok').length
    const content = `${location.name}: ${okCount}/${location.count} servers OK`
    setTooltipContent(content)
    setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top })
  }

  const handleMarkerMouseLeave = () => {
    setTooltipContent('')
    setTooltipPosition(null)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Global Server Map</h3>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-600 dark:text-gray-400">OK</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-600 dark:text-gray-400">Timeout</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600 dark:text-gray-400">Error</span>
          </div>
        </div>
      </div>

      <div className="relative bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden" style={{ height: '400px' }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 120,
          }}
        >
          <ZoomableGroup>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#E5E7EB"
                    stroke="#9CA3AF"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', fill: '#D1D5DB' },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>
            
            {serverLocations.map((location) => (
              <Marker
                key={location.name}
                coordinates={location.coordinates}
                onMouseEnter={(e) => handleMarkerMouseEnter(location, e)}
                onMouseLeave={handleMarkerMouseLeave}
              >
                <circle
                  r={8}
                  fill={getMarkerColor(location.status)}
                  stroke="#fff"
                  strokeWidth={2}
                  style={{ cursor: 'pointer' }}
                />
                <text
                  textAnchor="middle"
                  y={-12}
                  className="text-xs font-semibold fill-gray-900 dark:fill-white"
                  style={{ pointerEvents: 'none' }}
                >
                  {location.count}
                </text>
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip */}
        {tooltipContent && tooltipPosition && (
          <div
            className="absolute z-10 px-3 py-2 text-sm bg-gray-900 dark:bg-gray-700 text-white rounded-lg shadow-lg pointer-events-none"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y - 40}px`,
              transform: 'translateX(-50%)',
            }}
          >
            {tooltipContent}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
        Hover over markers to see server details. Numbers indicate server count per region.
      </p>
    </div>
  )
}

