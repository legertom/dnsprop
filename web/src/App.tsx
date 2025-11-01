import React, { useState } from 'react'
import { resolveDNS, type ResolveRequest, type ResolveResponse } from './api'

const recordTypes = ['A','AAAA','CNAME','TXT','MX','NS','SOA'] as const

type RT = typeof recordTypes[number]

export default function App() {
  const [name, setName] = useState('')
  const [type, setType] = useState<RT>('A')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ResolveResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const req: ResolveRequest = { name, type }
      const res = await resolveDNS(req)
      setData(res)
    } catch (err: any) {
      setError(err?.message ?? 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{margin: '2rem', fontFamily: 'system-ui, sans-serif'}}>
      <h1>dnsprop</h1>
      <form onSubmit={onSubmit} style={{display:'flex', gap: '0.5rem', alignItems:'center', flexWrap:'wrap'}}>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="example.com" required />
        <select value={type} onChange={e=>setType(e.target.value as RT)}>
          {recordTypes.map(rt=> <option key={rt} value={rt}>{rt}</option>)}
        </select>
        <button type="submit" disabled={loading}>{loading ? 'Checking…' : 'Check'}</button>
      </form>
      {error && <p style={{color:'crimson'}}>{error}</p>}
      {data && (
        <div style={{marginTop:'1rem'}}>
          <h2>{data.name} ({data.type})</h2>
          <table border={1} cellPadding={6} style={{borderCollapse:'collapse', fontSize:'0.9rem'}}>
            <thead>
              <tr>
                <th>Server</th>
                <th>Region</th>
                <th>Status</th>
                <th>RTT (ms)</th>
                <th>Answers</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((r,i)=>(
                <tr key={i}>
                  <td>{r.server}</td>
                  <td>{r.region ?? ''}</td>
                  <td>{r.status}</td>
                  <td>{r.rtt_ms?.toFixed?.(1) ?? ''}</td>
                  <td>{(r.answers ?? []).map(a => a.value + (a.ttl ? ` (ttl:${a.ttl})` : '')).join(', ')}</td>
                  <td>{r.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
