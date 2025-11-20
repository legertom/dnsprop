import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import { Result } from '../api'

// Using a reliable TopoJSON URL from Natural Earth
const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

interface PropagationStats {
  totalServers: number
  successfulServers: number
  uniqueAnswers: Map<string, Result[]>
  propagationPercentage: number
  allAgree: boolean
}

interface MapVisualizationProps {
  results: Result[]
  stats?: PropagationStats | null
}

// Color palette for answer groups - matches App.tsx
const answerGroupColorHex = [
  '#3b82f6', // blue-500
  '#a855f7', // purple-500
  '#10b981', // green-500 (emerald)
  '#f97316', // orange-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#6366f1', // indigo-500
  '#f43f5e', // rose-500
]

// Fallback colors for status-based coloring (when no answer groups)
const statusColorHex: Record<string, string> = {
  ok: '#10b981', // emerald-500
  timeout: '#f59e0b', // amber-500
  error: '#ef4444', // red-500
  servfail: '#ef4444', // red-500
  nxdomain: '#f97316', // orange-500
  noanswer: '#9ca3af', // gray-400
}

// Tooltip component that positions itself near cursor and avoids viewport edges
function Tooltip({ content, x, y }: { content: string; x: number; y: number }) {
  // Calculate position immediately - x and y are already in viewport coordinates (clientX/clientY)
  const tooltipWidth = 320 // max-w-xs = 320px
  const tooltipHeight = 120 // approximate height
  const padding = 15
  const offsetX = 15
  const offsetY = 15
  
  // Calculate position above and to the right of cursor (final position, no transform needed)
  let left = x + offsetX
  let top = y - tooltipHeight - offsetY // Position above cursor
  
  // Adjust if tooltip would go off right edge
  if (left + tooltipWidth + padding > window.innerWidth) {
    left = x - tooltipWidth - offsetX
  }
  
  // Adjust if tooltip would go off left edge
  if (left < padding) {
    left = padding
  }
  
  // Check if positioned above would go off top edge
  if (top < padding) {
    // Position below cursor instead
    top = y + offsetY
  }
  
  // Adjust if tooltip would go off bottom edge (when positioned below)
  if (top + tooltipHeight + padding > window.innerHeight) {
    top = window.innerHeight - tooltipHeight - padding
  }
  
  // Ensure tooltip doesn't go off top edge (when above)
  if (top < padding) {
    top = padding
  }
  
  const tooltipElement = (
    <div
      className="fixed z-[9999] px-4 py-3 text-sm font-medium bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-2xl pointer-events-none border border-slate-700 backdrop-blur-sm max-w-xs"
      style={{
        left: `${left}px`,
        top: `${top}px`
      }}
    >
      {content.split('\n').map((line, i) => (
        <div key={i} className={i === 0 ? 'font-bold text-base mb-1.5' : i === 1 ? 'font-semibold mb-1.5 text-emerald-300' : i === 2 ? 'font-medium mb-1.5 text-slate-300' : 'font-mono text-xs opacity-75 break-all'}>
          {line}
        </div>
      ))}
    </div>
  )
  
  // Render tooltip via portal at document body level for proper fixed positioning
  return typeof document !== 'undefined' ? createPortal(tooltipElement, document.body) : null
}

export default function MapVisualization({ results, stats }: MapVisualizationProps) {
  const [hoveredServer, setHoveredServer] = useState<string | null>(null)
  const [tooltipContent, setTooltipContent] = useState<string>('')
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  // Filter results that have valid coordinates
  const serversWithCoordinates = results.filter(
    r => r.latitude !== undefined && r.longitude !== undefined && r.latitude !== 0 && r.longitude !== 0
  )

  // Get marker color based on answer group (if stats available) or fallback to status
  const getMarkerColor = (result: Result): string => {
    // If we have stats and answer groups, use answer group colors
    if (stats && result.answers && result.answers.length > 0 && result.status === 'ok') {
      const answerKey = result.answers.map(a => a.value).sort().join('|')
      const uniqueAnswers = Array.from(stats.uniqueAnswers.keys())
      const colorIndex = uniqueAnswers.indexOf(answerKey)
      
      if (colorIndex >= 0) {
        return answerGroupColorHex[colorIndex % answerGroupColorHex.length]
      }
    }
    
    // Fallback to status-based colors
    return statusColorHex[result.status] || '#6b7280'
  }

  const handleMarkerMouseEnter = (result: Result, event: React.MouseEvent) => {
    setHoveredServer(result.server)
    
    const answerCount = result.answers?.length || 0
    const rtt = result.rtt_ms ? `${result.rtt_ms.toFixed(1)}ms` : 'N/A'
    const answers = result.answers?.map(a => a.value).join(', ') || 'No answers'
    const dnssec = result.ad ? ' • DNSSEC' : ''
    const content = `${result.region || result.server}\n${result.status.toUpperCase()} • ${rtt}${dnssec}\n${answerCount} answer(s)\n${answers}`
    
    setTooltipContent(content)
    
    // Use mouse cursor position - try nativeEvent first for more accurate SVG coordinates
    // Fallback to regular event if nativeEvent not available
    const nativeEvent = event.nativeEvent as MouseEvent
    const clientX = nativeEvent?.clientX ?? event.clientX
    const clientY = nativeEvent?.clientY ?? event.clientY
    
    // Use clientX/clientY which are relative to the viewport, perfect for fixed positioning
    setTooltipPosition({ 
      x: clientX, 
      y: clientY
    })
  }

  const handleMarkerMouseLeave = () => {
    setHoveredServer(null)
    setTooltipContent('')
    setTooltipPosition(null)
  }

  return (
    <div className="relative backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-8 mb-8 ring-1 ring-slate-900/5 dark:ring-slate-100/10">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Global Server Map</h3>
        {stats && stats.uniqueAnswers.size > 1 ? (
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400">Colors represent answer groups</span>
            <div className="flex items-center space-x-1">
              {Array.from(stats.uniqueAnswers.entries()).slice(0, 5).map(([answerKey, servers], idx) => {
                const color = answerGroupColorHex[idx % answerGroupColorHex.length]
                return (
                  <div key={idx} className="flex items-center space-x-1 px-2 py-1 rounded backdrop-blur-sm bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: color }}></div>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-[10px]">{servers.length}</span>
                  </div>
                )
              })}
              {stats.uniqueAnswers.size > 5 && (
                <span className="font-medium text-slate-500 dark:text-slate-400 text-[10px]">+{stats.uniqueAnswers.size - 5}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg backdrop-blur-sm bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">OK</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg backdrop-blur-sm bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50"></div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Timeout</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg backdrop-blur-sm bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50"></div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Error</span>
            </div>
          </div>
        )}
      </div>

      <div className="relative backdrop-blur-sm bg-gradient-to-br from-slate-50/80 to-slate-100/50 dark:from-slate-900/80 dark:to-slate-950/50 rounded-xl border-2 border-slate-200/50 dark:border-slate-700/50 shadow-inner" style={{ height: '400px', overflow: 'hidden' }}>
        {serversWithCoordinates.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">No server location data available</p>
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', position: 'relative', padding: '15px' }}>
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{
                scale: 120,
                center: [0, 20]
              }}
              style={{ width: '100%', height: '100%' }}
              width={800}
              height={400}
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
                  const markerColor = getMarkerColor(result)
                  
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
                          zIndex: isHovered ? 1000 : index,
                          pointerEvents: 'all'
                        }}
                      >
                        <circle
                          r={isHovered ? 10 : 7}
                          fill={markerColor}
                          stroke="#fff"
                          strokeWidth={isHovered ? 3 : 2}
                          opacity={opacity}
                          style={{
                            transition: 'all 0.2s ease-in-out',
                            filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                            pointerEvents: 'all'
                          }}
                        />
                        {isHovered && (
                          <circle
                            r={14}
                            fill="none"
                            stroke={markerColor}
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
          </div>
        )}
      </div>

      {/* Tooltip - rendered outside map container */}
      {tooltipContent && tooltipPosition && (
        <Tooltip
          content={tooltipContent}
          x={tooltipPosition.x}
          y={tooltipPosition.y}
        />
      )}

      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-5 text-center">
        Hover over markers to see server details. Showing {serversWithCoordinates.length} of {results.length} servers with location data.
      </p>
    </div>
  )
}
