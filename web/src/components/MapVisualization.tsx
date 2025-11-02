import React, { useState } from 'react'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import { Result } from '../api'

// Using a reliable TopoJSON URL from Natural Earth
const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

interface MapVisualizationProps {
  results: Result[]
}

export default function MapVisualization({ results }: MapVisualizationProps) {
  const [hoveredServer, setHoveredServer] = useState<string | null>(null)
  const [tooltipContent, setTooltipContent] = useState<string>('')
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  // Filter results that have valid coordinates
  const serversWithCoordinates = results.filter(
    r => r.latitude !== undefined && r.longitude !== undefined && r.latitude !== 0 && r.longitude !== 0
  )

  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'ok':
        return '#10b981' // green-500
      case 'timeout':
        return '#f59e0b' // amber-500
      case 'error':
      case 'servfail':
        return '#ef4444' // red-500
      case 'nxdomain':
        return '#f97316' // orange-500
      case 'noanswer':
        return '#9ca3af' // gray-400
      default:
        return '#6b7280' // gray-500
    }
  }

  const handleMarkerMouseEnter = (result: Result, event: React.MouseEvent) => {
    setHoveredServer(result.server)
    
    const answerCount = result.answers?.length || 0
    const rtt = result.rtt_ms ? `${result.rtt_ms.toFixed(1)}ms` : 'N/A'
    const content = `${result.region || result.server}\n${result.status.toUpperCase()} • ${rtt}\n${answerCount} answer(s)`
    
    setTooltipContent(content)
    setTooltipPosition({ 
      x: event.clientX, 
      y: event.clientY
    })
  }

  const handleMarkerMouseLeave = () => {
    setHoveredServer(null)
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
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-gray-600 dark:text-gray-400">Timeout</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600 dark:text-gray-400">Error</span>
          </div>
        </div>
      </div>

      <div className="relative bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden" style={{ height: '400px' }}>
        {serversWithCoordinates.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">No server location data available</p>
          </div>
        ) : (
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 140,
              center: [0, 20]
            }}
            style={{ width: '100%', height: '100%' }}
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
                      className="dark:fill-gray-700 dark:stroke-gray-600"
                    />
                  ))
                }
              </Geographies>
              
              {/* Render individual server markers */}
              {serversWithCoordinates.map((result, index) => {
                const isHovered = hoveredServer === result.server
                const opacity = hoveredServer && !isHovered ? 0.4 : 1
                
                return (
                  <Marker
                    key={`${result.server}-${index}`}
                    coordinates={[result.longitude!, result.latitude!]}
                  >
                    <g
                      onMouseEnter={(e) => handleMarkerMouseEnter(result, e)}
                      onMouseLeave={handleMarkerMouseLeave}
                      style={{ 
                        cursor: 'pointer',
                        zIndex: isHovered ? 1000 : index 
                      }}
                    >
                      <circle
                        r={isHovered ? 8 : 6}
                        fill={getMarkerColor(result.status)}
                        stroke="#fff"
                        strokeWidth={2}
                        opacity={opacity}
                        style={{
                          transition: 'all 0.2s ease-in-out'
                        }}
                      />
                      {isHovered && (
                        <circle
                          r={12}
                          fill="none"
                          stroke={getMarkerColor(result.status)}
                          strokeWidth={2}
                          opacity={0.5}
                          style={{
                            animation: 'pulse 1.5s ease-in-out infinite'
                          }}
                        />
                      )}
                    </g>
                  </Marker>
                )
              })}
            </ZoomableGroup>
          </ComposableMap>
        )}

        {/* Tooltip */}
        {tooltipContent && tooltipPosition && (
          <div
            className="fixed z-50 px-3 py-2 text-sm bg-gray-900 dark:bg-gray-700 text-white rounded-lg shadow-lg pointer-events-none whitespace-pre-line"
            style={{
              left: `${tooltipPosition.x + 10}px`,
              top: `${tooltipPosition.y - 10}px`,
            }}
          >
            {tooltipContent}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
        Hover over markers to see server details. Showing {serversWithCoordinates.length} of {results.length} servers with location data.
      </p>
    </div>
  )
}
