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
    ok: 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border-2 border-emerald-300 dark:from-emerald-900/40 dark:to-green-900/40 dark:text-emerald-200 dark:border-emerald-700 shadow-sm shadow-emerald-500/20',
    error: 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-2 border-red-300 dark:from-red-900/40 dark:to-rose-900/40 dark:text-red-200 dark:border-red-700 shadow-sm shadow-red-500/20',
    timeout: 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-2 border-amber-300 dark:from-amber-900/40 dark:to-yellow-900/40 dark:text-amber-200 dark:border-amber-700 shadow-sm shadow-amber-500/20',
    nxdomain: 'bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 border-2 border-orange-300 dark:from-orange-900/40 dark:to-amber-900/40 dark:text-orange-200 dark:border-orange-700 shadow-sm shadow-orange-500/20',
    servfail: 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-2 border-red-300 dark:from-red-900/40 dark:to-rose-900/40 dark:text-red-200 dark:border-red-700 shadow-sm shadow-red-500/20',
    noanswer: 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-800 border-2 border-slate-300 dark:from-slate-800 dark:to-gray-800 dark:text-slate-200 dark:border-slate-600 shadow-sm'
  }
  
  const className = styles[status] || 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-800 border-2 border-slate-300 dark:from-slate-800 dark:to-gray-800 dark:text-slate-200 dark:border-slate-600 shadow-sm'
  
  return (
    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide uppercase border backdrop-blur-sm ${className}`}>
      {status.toUpperCase()}
    </span>
  )
}

function PropagationSummary({ stats }: { stats: PropagationStats }) {
  return (
    <div className="relative backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-8 mb-8 ring-1 ring-slate-900/5 dark:ring-slate-100/10">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">Propagation Summary</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="relative backdrop-blur-sm bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/50 dark:to-indigo-900/30 rounded-xl p-6 border-2 border-indigo-200/50 dark:border-indigo-800/50 shadow-lg shadow-indigo-500/10">
          <div className="text-4xl font-extrabold text-indigo-700 dark:text-indigo-300 mb-2">{stats.totalServers}</div>
          <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Total Servers</div>
        </div>
        
        <div className="relative backdrop-blur-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30 rounded-xl p-6 border-2 border-emerald-200/50 dark:border-emerald-800/50 shadow-lg shadow-emerald-500/10">
          <div className="text-4xl font-extrabold text-emerald-700 dark:text-emerald-300 mb-2">{stats.successfulServers}</div>
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Successful Responses</div>
        </div>
        
        <div className="relative backdrop-blur-sm bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30 rounded-xl p-6 border-2 border-purple-200/50 dark:border-purple-800/50 shadow-lg shadow-purple-500/10">
          <div className="text-4xl font-extrabold text-purple-700 dark:text-purple-300 mb-2">{stats.propagationPercentage}%</div>
          <div className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Propagation Rate</div>
        </div>
      </div>
      
      {stats.allAgree ? (
        <div className="relative backdrop-blur-sm bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-2 border-emerald-200/50 dark:border-emerald-800/50 rounded-xl p-5 flex items-start shadow-lg shadow-emerald-500/10">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500 dark:bg-emerald-600 flex items-center justify-center mr-4 shadow-lg shadow-emerald-500/30">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-emerald-900 dark:text-emerald-200 text-lg mb-1">Fully Propagated</p>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">All DNS servers returned the same result.</p>
          </div>
        </div>
      ) : (
        <div className="relative backdrop-blur-sm bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-2 border-amber-200/50 dark:border-amber-800/50 rounded-xl p-5 flex items-start shadow-lg shadow-amber-500/10">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500 dark:bg-amber-600 flex items-center justify-center mr-4 shadow-lg shadow-amber-500/30">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-amber-900 dark:text-amber-200 text-lg mb-1">Mixed Results Detected</p>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-3">
              DNS servers are returning {stats.uniqueAnswers.size} different result{stats.uniqueAnswers.size > 1 ? 's' : ''}.
            </p>
            <div className="space-y-2">
              {Array.from(stats.uniqueAnswers.entries()).map(([answerKey, servers], idx) => (
                <div key={idx} className="text-sm font-medium">
                  <span className="text-amber-900 dark:text-amber-200">
                    {servers.length} server{servers.length > 1 ? 's' : ''}:
                  </span>
                  <span className="text-amber-700 dark:text-amber-300 ml-2 font-mono">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 dark:bg-purple-900/20 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 dark:bg-blue-900/20 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-300 dark:bg-indigo-900/20 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 dark:from-indigo-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">wtfdns</h1>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5 tracking-wide">What the DNS is going on?</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm text-xs font-medium text-slate-700 dark:text-slate-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{data ? data.results.length : 30} servers</span>
              </div>
              <button
                onClick={toggleDarkMode}
                className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-all duration-200 hover:scale-105 active:scale-95"
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
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Query Form */}
        <div className="relative backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-8 mb-8 ring-1 ring-slate-900/5 dark:ring-slate-100/10">
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-6">
                <label htmlFor="domain" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2.5 tracking-tight">
                  Domain Name
                </label>
                <input
                  id="domain"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="example.com"
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                />
              </div>

              <div className="md:col-span-3">
                <label htmlFor="recordType" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2.5 tracking-tight">
                  Record Type
                </label>
                <select
                  id="recordType"
                  value={type}
                  onChange={e => setType(e.target.value as RT)}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 font-medium cursor-pointer"
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
                  className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 dark:shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Checking...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Check DNS
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-6 pt-2">
              <label className="flex items-center space-x-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={dnssec}
                  onChange={e => setDnssec(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-2 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-500 focus:ring-2 transition cursor-pointer"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Enable DNSSEC validation</span>
                <div className="relative inline-block">
                  <svg 
                    className="w-4 h-4 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition cursor-help" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                    aria-label="DNSSEC information"
                  >
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 p-3 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-10 border border-slate-700">
                    <div className="font-semibold mb-1">DNSSEC (DNS Security Extensions)</div>
                    <p className="text-slate-300">
                      Adds cryptographic signatures to DNS records to verify authenticity and prevent DNS spoofing attacks. 
                      When enabled, the query sets the DO (DNSSEC OK) flag and checks for the AD (Authenticated Data) bit in responses.
                    </p>
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
                  </div>
                </div>
              </label>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="relative backdrop-blur-xl bg-red-50/90 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800/50 rounded-2xl p-5 mb-8 flex items-start shadow-lg shadow-red-500/10 ring-1 ring-red-900/5 dark:ring-red-100/10">
            <svg className="w-6 h-6 text-red-500 dark:text-red-400 mt-0.5 mr-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-bold text-red-900 dark:text-red-200 text-lg mb-1">Error</p>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {data && stats && (
          <>
            <PropagationSummary stats={stats} />

            {/* Global Server Map */}
            <MapVisualization results={data.results} stats={stats} />

            {/* Results Table */}
            <div className="relative backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden ring-1 ring-slate-900/5 dark:ring-slate-100/10">
              <div className="px-8 py-6 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/50 to-transparent dark:from-slate-800/50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Results for <span className="font-mono">{data.name}</span> ({data.type})
                  </h3>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1.5">
                    {data.results.length} DNS server{data.results.length !== 1 ? 's' : ''} queried
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={exportJSON}
                    className="px-4 py-2 text-sm font-semibold backdrop-blur-sm bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-all duration-200 hover:scale-105 active:scale-95 border border-slate-200 dark:border-slate-700"
                  >
                    Export JSON
                  </button>
                  <button
                    onClick={exportCSV}
                    className="px-4 py-2 text-sm font-semibold backdrop-blur-sm bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-all duration-200 hover:scale-105 active:scale-95 border border-slate-200 dark:border-slate-700"
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Answer Group Legend */}
              {stats && stats.uniqueAnswers.size > 1 && (
                <div className="mx-8 mt-6 mb-6 backdrop-blur-sm bg-indigo-50/80 dark:bg-indigo-950/30 border-2 border-indigo-200/50 dark:border-indigo-800/50 rounded-xl p-5 shadow-lg shadow-indigo-500/10">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-500 dark:bg-indigo-600 flex items-center justify-center mr-4 shadow-lg shadow-indigo-500/30">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-2 tracking-tight">
                        Color-Coded Answer Groups
                      </h4>
                      <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-4">
                        Rows are color-coded by answer groups. Servers returning the same IP addresses share the same color.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Array.from(stats.uniqueAnswers.entries()).map(([answerKey, servers], idx) => {
                          const color = answerGroupColors[idx % answerGroupColors.length]
                          return (
                            <div key={idx} className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl ${color.bg} ${color.border} shadow-sm`}>
                              <span className={`text-xs font-bold ${color.text}`}>
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
                  <thead className="bg-gradient-to-r from-slate-50/80 to-slate-100/50 dark:from-slate-800/80 dark:to-slate-900/50 backdrop-blur-sm border-b-2 border-slate-200/50 dark:border-slate-700/50">
                    <tr>
                      <th
                        onClick={() => handleSort('server')}
                        className="px-8 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <span>Server</span>
                          {sortBy === 'server' && (
                            <svg className={`w-4 h-4 transform transition-transform ${sortAsc ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="px-8 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Region
                      </th>
                      <th
                        onClick={() => handleSort('status')}
                        className="px-8 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <span>Status</span>
                          {sortBy === 'status' && (
                            <svg className={`w-4 h-4 transform transition-transform ${sortAsc ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('rtt')}
                        className="px-8 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <span>RTT</span>
                          {sortBy === 'rtt' && (
                            <svg className={`w-4 h-4 transform transition-transform ${sortAsc ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="px-8 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Answers
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/50 dark:bg-slate-900/50 divide-y divide-slate-200/50 dark:divide-slate-700/50">
                    {sortedResults.map((r, i) => {
                      const colorGroup = getAnswerGroupColor(r)
                      return (
                        <tr 
                          key={i} 
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all duration-150 ${colorGroup ? `${colorGroup.bg} ${colorGroup.border}` : ''}`}
                        >
                          <td className="px-8 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white font-mono">{r.server}</div>
                          </td>
                        <td className="px-8 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-600 dark:text-slate-400">{r.region || '-'}</div>
                        </td>
                        <td className="px-8 py-4 whitespace-nowrap">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-8 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {r.rtt_ms ? `${r.rtt_ms.toFixed(1)} ms` : '-'}
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          {r.answers && r.answers.length > 0 ? (
                            <div className="space-y-1.5">
                              {r.answers.map((a, j) => (
                                <div key={j} className="text-sm">
                                  <span className="text-slate-900 dark:text-white font-mono font-semibold">{a.value}</span>
                                  <span className="text-slate-500 dark:text-slate-400 text-xs ml-2 font-medium">(TTL: {a.ttl}s)</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400 dark:text-slate-500 font-medium">No answers</span>
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
      <footer className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-12">
        <div className="text-center space-y-3">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Powered by {data ? data.results.length : 30} global DNS resolvers across 5 continents
          </p>
          <div className="flex items-center justify-center space-x-4 text-xs font-medium text-slate-400 dark:text-slate-500">
            <a 
              href="https://github.com/legertom/dnsprop" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              <span>GitHub</span>
            </a>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="flex items-center space-x-1.5">
              <span>Hosted on</span>
              <a 
                href="https://railway.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-semibold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Railway</span>
              </a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
