import React, { useState, useEffect } from 'react'
import { resolveDNS, type ResolveRequest, type ResolveResponse, type Result } from './api'
import MapVisualization from './components/MapVisualization'

const recordTypes = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SOA'] as const
type RT = typeof recordTypes[number]

interface PropagationStats {
  totalServers: number
  successfulServers: number
  uniqueAnswers: Map<string, Result[]>
  propagationPercentage: number
  allAgree: boolean
}

function calculatePropagationStats(results: Result[]): PropagationStats {
  const successfulResults = results.filter(r => r.status === 'ok' && r.answers && r.answers.length > 0)
  const uniqueAnswers = new Map<string, Result[]>()
  
  // Group results by unique answer sets
  successfulResults.forEach(result => {
    const answerKey = result.answers
      ?.map(a => a.value)
      .sort()
      .join('|') || 'no-answer'
    
    if (!uniqueAnswers.has(answerKey)) {
      uniqueAnswers.set(answerKey, [])
    }
    uniqueAnswers.get(answerKey)!.push(result)
  })
  
  // Find the most common answer
  let maxCount = 0
  uniqueAnswers.forEach(servers => {
    if (servers.length > maxCount) {
      maxCount = servers.length
    }
  })
  
  const propagationPercentage = results.length > 0 
    ? Math.round((maxCount / results.length) * 100) 
    : 0
  
  return {
    totalServers: results.length,
    successfulServers: successfulResults.length,
    uniqueAnswers,
    propagationPercentage,
    allAgree: uniqueAnswers.size === 1 && successfulResults.length === results.length
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ok: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
    error: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
    timeout: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700',
    nxdomain: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700',
    servfail: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
    noanswer: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
  }
  
  const className = styles[status] || 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
  
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${className}`}>
      {status.toUpperCase()}
    </span>
  )
}

function PropagationSummary({ stats }: { stats: PropagationStats }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Propagation Summary</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">{stats.totalServers}</div>
          <div className="text-sm text-blue-700 dark:text-blue-300">Total Servers</div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold text-green-900 dark:text-green-200">{stats.successfulServers}</div>
          <div className="text-sm text-green-700 dark:text-green-300">Successful Responses</div>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-200">{stats.propagationPercentage}%</div>
          <div className="text-sm text-purple-700 dark:text-purple-300">Propagation Rate</div>
        </div>
      </div>
      
      {stats.allAgree ? (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-4 flex items-start">
          <svg className="w-5 h-5 text-green-500 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium text-green-900 dark:text-green-200">Fully Propagated</p>
            <p className="text-sm text-green-700 dark:text-green-300">All DNS servers returned the same result.</p>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4 flex items-start">
          <svg className="w-5 h-5 text-yellow-500 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="font-medium text-yellow-900 dark:text-yellow-200">Mixed Results Detected</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
              DNS servers are returning {stats.uniqueAnswers.size} different result{stats.uniqueAnswers.size > 1 ? 's' : ''}.
            </p>
            <div className="space-y-2">
              {Array.from(stats.uniqueAnswers.entries()).map(([answerKey, servers], idx) => (
                <div key={idx} className="text-sm">
                  <span className="font-medium text-yellow-900 dark:text-yellow-200">
                    {servers.length} server{servers.length > 1 ? 's' : ''}:
                  </span>
                  <span className="text-yellow-700 dark:text-yellow-300 ml-2">
                    {servers[0].answers?.map(a => a.value).join(', ') || 'No answer'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [name, setName] = useState('')
  const [type, setType] = useState<RT>('A')
  const [dnssec, setDnssec] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ResolveResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'server' | 'status' | 'rtt'>('server')
  const [sortAsc, setSortAsc] = useState(true)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark'
    }
    return false
  })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const req: ResolveRequest = { name, type, dnssec }
      const res = await resolveDNS(req)
      setData(res)
    } catch (err: any) {
      setError(err?.message ?? 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (column: 'server' | 'status' | 'rtt') => {
    if (sortBy === column) {
      setSortAsc(!sortAsc)
    } else {
      setSortBy(column)
      setSortAsc(true)
    }
  }

  const sortedResults = data ? [...data.results].sort((a, b) => {
    let comparison = 0
    if (sortBy === 'server') {
      comparison = a.server.localeCompare(b.server)
    } else if (sortBy === 'status') {
      comparison = a.status.localeCompare(b.status)
    } else if (sortBy === 'rtt') {
      comparison = (a.rtt_ms || 0) - (b.rtt_ms || 0)
    }
    return sortAsc ? comparison : -comparison
  }) : []

  const stats = data ? calculatePropagationStats(data.results) : null

  // Color palette for answer groups (8 distinct colors)
  const answerGroupColors = [
    { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-l-4 border-blue-500', text: 'text-blue-700 dark:text-blue-300' },
    { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-l-4 border-purple-500', text: 'text-purple-700 dark:text-purple-300' },
    { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-l-4 border-green-500', text: 'text-green-700 dark:text-green-300' },
    { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-l-4 border-orange-500', text: 'text-orange-700 dark:text-orange-300' },
    { bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-l-4 border-pink-500', text: 'text-pink-700 dark:text-pink-300' },
    { bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-l-4 border-teal-500', text: 'text-teal-700 dark:text-teal-300' },
    { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-l-4 border-indigo-500', text: 'text-indigo-700 dark:text-indigo-300' },
    { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-l-4 border-rose-500', text: 'text-rose-700 dark:text-rose-300' },
  ]

  // Create a map of answer key to color index
  const getAnswerGroupColor = (result: Result) => {
    if (!stats || !result.answers || result.answers.length === 0 || result.status !== 'ok') {
      return null
    }
    
    const answerKey = result.answers.map(a => a.value).sort().join('|')
    const uniqueAnswers = Array.from(stats.uniqueAnswers.keys())
    const colorIndex = uniqueAnswers.indexOf(answerKey)
    
    return colorIndex >= 0 ? answerGroupColors[colorIndex % answerGroupColors.length] : null
  }

  const exportJSON = () => {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dns-${data.name}-${data.type}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportCSV = () => {
    if (!data) return
    const headers = ['Server', 'Region', 'Status', 'RTT (ms)', 'Answers', 'TTLs']
    const rows = data.results.map(r => [
      r.server,
      r.region || '',
      r.status,
      r.rtt_ms?.toFixed(1) || '',
      r.answers?.map(a => a.value).join('; ') || '',
      r.answers?.map(a => a.ttl).join('; ') || ''
    ])
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dns-${data.name}-${data.type}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">dnsprop</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">DNS Propagation Checker</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{data ? data.results.length : 30} global DNS servers</span>
              </div>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Query Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6">
                <label htmlFor="domain" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Domain Name
                </label>
                <input
                  id="domain"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="example.com"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div className="md:col-span-3">
                <label htmlFor="recordType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Record Type
                </label>
                <select
                  id="recordType"
                  value={type}
                  onChange={e => setType(e.target.value as RT)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  {recordTypes.map(rt => (
                    <option key={rt} value={rt}>
                      {rt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Checking...
                    </span>
                  ) : (
                    'Check DNS'
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={dnssec}
                  onChange={e => setDnssec(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Enable DNSSEC validation</span>
                <div className="relative inline-block">
                  <svg 
                    className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition cursor-help" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                    aria-label="DNSSEC information"
                  >
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-10">
                    <div className="font-semibold mb-1">DNSSEC (DNS Security Extensions)</div>
                    <p className="text-gray-200 dark:text-gray-300">
                      Adds cryptographic signatures to DNS records to verify authenticity and prevent DNS spoofing attacks. 
                      When enabled, the query sets the DO (DNSSEC OK) flag and checks for the AD (Authenticated Data) bit in responses.
                    </p>
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                  </div>
                </div>
              </label>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6 flex items-start">
            <svg className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium text-red-900 dark:text-red-200">Error</p>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {data && stats && (
          <>
            <PropagationSummary stats={stats} />

            {/* Global Server Map */}
            <MapVisualization results={data.results} />

            {/* Results Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Results for {data.name} ({data.type})
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {data.results.length} DNS server{data.results.length !== 1 ? 's' : ''} queried
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={exportJSON}
                    className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                  >
                    Export JSON
                  </button>
                  <button
                    onClick={exportCSV}
                    className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Answer Group Legend */}
              {stats && stats.uniqueAnswers.size > 1 && (
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                        Color-Coded Answer Groups
                      </h4>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                        Rows are color-coded by answer groups. Servers returning the same IP addresses share the same color.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {Array.from(stats.uniqueAnswers.entries()).map(([answerKey, servers], idx) => {
                          const color = answerGroupColors[idx % answerGroupColors.length]
                          return (
                            <div key={idx} className={`flex items-center space-x-2 px-3 py-2 rounded ${color.bg} ${color.border}`}>
                              <span className={`text-xs font-medium ${color.text}`}>
                                {servers.length} server{servers.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th
                        onClick={() => handleSort('server')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Server</span>
                          {sortBy === 'server' && (
                            <svg className={`w-4 h-4 transform ${sortAsc ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Region
                      </th>
                      <th
                        onClick={() => handleSort('status')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Status</span>
                          {sortBy === 'status' && (
                            <svg className={`w-4 h-4 transform ${sortAsc ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('rtt')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>RTT</span>
                          {sortBy === 'rtt' && (
                            <svg className={`w-4 h-4 transform ${sortAsc ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Answers
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sortedResults.map((r, i) => {
                      const colorGroup = getAnswerGroupColor(r)
                      return (
                        <tr 
                          key={i} 
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${colorGroup ? `${colorGroup.bg} ${colorGroup.border}` : ''}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{r.server}</div>
                          </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 dark:text-gray-400">{r.region || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {r.rtt_ms ? `${r.rtt_ms.toFixed(1)} ms` : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {r.answers && r.answers.length > 0 ? (
                            <div className="space-y-1">
                              {r.answers.map((a, j) => (
                                <div key={j} className="text-sm">
                                  <span className="text-gray-900 dark:text-white font-mono">{a.value}</span>
                                  <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">(TTL: {a.ttl}s)</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">No answers</span>
                          )}
                        </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-12">
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Powered by {data ? data.results.length : 30} global DNS resolvers across 5 continents</p>
        </div>
      </footer>
    </div>
  )
}
