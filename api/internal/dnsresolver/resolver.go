package dnsresolver

import (
	"context"
	"net"
	"strings"
	"time"

	"github.com/miekg/dns"
)

type Answer struct {
	Value string
	TTL   uint32
}

type Result struct {
	Server    string
	Region    string
	Status    string
	RTTMs     float64
	Answers   []Answer
	Authority []string
	When      time.Time
	// CacheTTL is the recommended TTL for this result; not serialized in API JSON
	CacheTTL time.Duration `json:"-"`
	// QueriedAt is when this result was originally obtained; not serialized, used for cache expiry
	QueriedAt time.Time `json:"-"`
}

var defaultRegions = map[string]string{
	// North America
	"1.1.1.1":         "US/Cloudflare",
	"1.0.0.1":         "US/Cloudflare",
	"8.8.8.8":         "US/Google",
	"8.8.4.4":         "US/Google",
	"9.9.9.9":         "US/Quad9",
	"149.112.112.112": "US/Quad9",
	"208.67.222.222":  "US/OpenDNS",
	"208.67.220.220":  "US/OpenDNS",
	"64.6.64.6":       "US/Verisign",
	"64.6.65.6":       "US/Verisign",
	
	// Europe
	"94.140.14.14":    "EU/AdGuard",
	"94.140.15.15":    "EU/AdGuard",
	"185.228.168.9":   "EU/CleanBrowsing",
	"185.228.169.9":   "EU/CleanBrowsing",
	"77.88.8.8":       "EU/Yandex",
	"77.88.8.1":       "EU/Yandex",
	
	// Asia
	"114.114.114.114": "CN/114DNS",
	"114.114.115.115": "CN/114DNS",
	"223.5.5.5":       "CN/AliDNS",
	"223.6.6.6":       "CN/AliDNS",
	"168.95.1.1":      "TW/HiNet",
	"168.95.192.1":    "TW/HiNet",
	
	// Asia-Pacific
	"1.1.1.2":         "AP/Cloudflare",
	"1.0.0.2":         "AP/Cloudflare",
	
	// Oceania
	"210.2.4.8":       "AU/Telstra",
	"139.130.4.5":     "AU/Aussie",
	
	// South America
	"200.252.98.162":  "BR/GVT",
	"200.221.11.100":  "BR/NET",
}

// Cache defines the minimal interface used by resolver for caching.
type Cache interface {
	Get(key string) (Result, bool)
	Add(key string, val Result, ttl time.Duration)
}

func Resolve(ctx context.Context, name, qtype string, servers []string, dnssec bool, perQueryTimeout time.Duration, cache Cache, maxCacheTTL time.Duration) []Result {
	maxParallel := 20
	if len(servers) < maxParallel {
		maxParallel = len(servers)
	}
	sem := make(chan struct{}, maxParallel)
	out := make(chan Result, len(servers))

	for _, s := range servers {
		server := s
		sem <- struct{}{}
		go func() {
			defer func() { <-sem }()

			key := cacheKey(name, qtype, server, dnssec)
			if cache != nil {
				if cached, ok := cache.Get(key); ok {
					if cached.CacheTTL > 0 && time.Since(cached.QueriedAt) <= cached.CacheTTL {
						cached.When = time.Now().UTC()
						out <- cached
						return
					}
					// stale -> fall through to requery
				}
			}

			res := queryOne(ctx, server, name, qtype, dnssec, perQueryTimeout)
			// Cap TTL by maxCacheTTL if provided (>0)
			if maxCacheTTL > 0 && (res.CacheTTL <= 0 || res.CacheTTL > maxCacheTTL) {
				res.CacheTTL = maxCacheTTL
			}
			if cache != nil && res.Status != "error" {
				cache.Add(key, res, res.CacheTTL)
			}
			out <- res
		}()
	}

	for i := 0; i < cap(sem); i++ {
		sem <- struct{}{}
	}
	close(out)

	results := make([]Result, 0, len(servers))
	for r := range out {
		results = append(results, r)
	}
	return results
}

func queryOne(ctx context.Context, server, name, qtype string, dnssec bool, perQueryTimeout time.Duration) Result {
	now := time.Now().UTC()
	result := Result{
		Server:    normalizeServer(server),
		Region:    regionFor(server),
		When:      now,
		QueriedAt: now,
	}

	qtypeCode := mapType(qtype)
	if qtypeCode == 0 {
		result.Status = "error"
		return result
	}

	m := new(dns.Msg)
	m.SetQuestion(dns.Fqdn(name), qtypeCode)
	m.RecursionDesired = true
	m.SetEdns0(1232, dnssec)

	addr := server
	if !strings.Contains(server, ":") {
		addr = net.JoinHostPort(server, "53")
	}

	timeout := perQueryTimeout
	if dl, ok := ctx.Deadline(); ok {
		rem := time.Until(dl)
		if rem > 0 && rem < timeout {
			timeout = rem
		}
	}

	client := &dns.Client{Net: "udp", Timeout: timeout}
	r, rtt, err := client.ExchangeContext(ctx, m, addr)
	if err != nil {
		if isTimeout(err) {
			result.Status = "timeout"
		} else {
			result.Status = "error"
		}
		return result
	}
	if r != nil && r.Truncated {
		clientTCP := &dns.Client{Net: "tcp", Timeout: timeout}
		r2, rtt2, err2 := clientTCP.ExchangeContext(ctx, m, addr)
		if err2 == nil && r2 != nil {
			r = r2
			rtt = rtt2
		}
	}

	result.RTTMs = float64(rtt.Microseconds()) / 1000.0

	switch r.Rcode {
	case dns.RcodeSuccess:
		// OK
	case dns.RcodeNameError:
		result.Status = "nxdomain"
		result.Authority = extractNames(r.Ns)
		return result
	case dns.RcodeServerFailure:
		result.Status = "servfail"
		return result
	default:
		result.Status = strings.ToLower(dns.RcodeToString[r.Rcode])
		return result
	}

	answers := parseAnswers(r.Answer)
	if len(answers) == 0 {
		result.Status = "noanswer"
		result.CacheTTL = negativeTTLFromNs(r.Ns)
	} else {
		result.Status = "ok"
		result.Answers = answers
		result.CacheTTL = minAnswerTTL(answers)
	}
	if len(r.Ns) > 0 {
		result.Authority = extractNames(r.Ns)
	}
	return result
}

func parseAnswers(rrs []dns.RR) []Answer {
	out := make([]Answer, 0, len(rrs))
	for _, rr := range rrs {
		hdr := rr.Header()
		ttl := hdr.Ttl
		switch v := rr.(type) {
		case *dns.A:
			out = append(out, Answer{Value: v.A.String(), TTL: ttl})
		case *dns.AAAA:
			out = append(out, Answer{Value: v.AAAA.String(), TTL: ttl})
		case *dns.CNAME:
			out = append(out, Answer{Value: v.Target, TTL: ttl})
		case *dns.TXT:
			out = append(out, Answer{Value: strings.Join(v.Txt, ""), TTL: ttl})
		case *dns.MX:
			out = append(out, Answer{Value: v.Mx, TTL: ttl})
		case *dns.NS:
			out = append(out, Answer{Value: v.Ns, TTL: ttl})
		case *dns.SOA:
			out = append(out, Answer{Value: v.Ns + " " + v.Mbox, TTL: ttl})
		default:
			// ignore others
		}
	}
	return out
}

func minAnswerTTL(ans []Answer) time.Duration {
	if len(ans) == 0 {
		return 0
	}
	min := ans[0].TTL
	for _, a := range ans[1:] {
		if a.TTL < min {
			min = a.TTL
		}
	}
	return time.Duration(min) * time.Second
}

func negativeTTLFromNs(rrs []dns.RR) time.Duration {
	// Default negative TTL cap if SOA not present
	const def = 30 * time.Second
	if len(rrs) == 0 {
		return def
	}
	for _, rr := range rrs {
		if soa, ok := rr.(*dns.SOA); ok {
			if soa.Minttl > 0 {
				return time.Duration(soa.Minttl) * time.Second
			}
		}
	}
	return def
}

func extractNames(rrs []dns.RR) []string {
	out := make([]string, 0, len(rrs))
	for _, rr := range rrs {
		out = append(out, rr.Header().Name)
	}
	return out
}

func regionFor(server string) string {
	host, _, err := net.SplitHostPort(server)
	if err != nil {
		host = server
	}
	if label, ok := defaultRegions[host]; ok {
		return label
	}
	return "Unknown"
}

func normalizeServer(server string) string {
	host, _, err := net.SplitHostPort(server)
	if err != nil {
		return server
	}
	return host
}

func isTimeout(err error) bool {
	if ne, ok := err.(net.Error); ok && ne.Timeout() {
		return true
	}
	return strings.Contains(strings.ToLower(err.Error()), "timeout")
}

func cacheKey(name, qtype, server string, dnssec bool) string {
	// normalize components to avoid cache misses due to case/port
	return normalizeServer(server) + "|" + strings.ToLower(name) + "|" + strings.ToUpper(qtype) + "|dnssec=" + boolToStr(dnssec)
}

func boolToStr(b bool) string {
	if b {
		return "1"
	}
	return "0"
}

func mapType(t string) uint16 {
	switch strings.ToUpper(t) {
	case "A":
		return dns.TypeA
	case "AAAA":
		return dns.TypeAAAA
	case "CNAME":
		return dns.TypeCNAME
	case "TXT":
		return dns.TypeTXT
	case "MX":
		return dns.TypeMX
	case "NS":
		return dns.TypeNS
	case "SOA":
		return dns.TypeSOA
	default:
		return 0
	}
}
