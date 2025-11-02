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
	Latitude  float64
	Longitude float64
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
	// North America - US West
	"1.1.1.1":         "San Francisco, CA, Cloudflare",
	"1.0.0.1":         "San Francisco, CA, Cloudflare",
	"8.8.8.8":         "Mountain View, CA, Google",
	"8.8.4.4":         "Mountain View, CA, Google",
	"9.9.9.9":         "Berkeley, CA, Quad9",
	"149.112.112.112": "Berkeley, CA, Quad9",
	"208.67.222.222":  "San Francisco, CA, OpenDNS",
	"208.67.220.220":  "San Francisco, CA, OpenDNS",
	
	// North America - US East
	"156.154.70.1":    "Ashburn, VA, Neustar",
	"156.154.71.1":    "Ashburn, VA, Neustar",
	"4.2.2.1":         "Broomfield, CO, Level3",
	"4.2.2.2":         "Broomfield, CO, Level3",
	
	// North America - Canada
	"76.76.2.0":  "Toronto, ON, ControlD",
	"76.76.10.0": "Toronto, ON, ControlD",
	
	// Europe - Western
	"94.140.14.14":  "Limassol, Cyprus, AdGuard",
	"94.140.15.15":  "Limassol, Cyprus, AdGuard",
	"185.228.168.9": "Amsterdam, Netherlands, CleanBrowsing",
	"185.228.169.9": "Amsterdam, Netherlands, CleanBrowsing",
	
	// Europe - Eastern
	"77.88.8.8": "Moscow, Russia, Yandex",
	"77.88.8.1": "Moscow, Russia, Yandex",
	
	// Asia - China
	"114.114.114.114": "Nanjing, Jiangsu, 114DNS",
	"114.114.115.115": "Nanjing, Jiangsu, 114DNS",
	"223.5.5.5":       "Hangzhou, Zhejiang, Alibaba DNS",
	"223.6.6.6":       "Hangzhou, Zhejiang, Alibaba DNS",
	"119.29.29.29":    "Shenzhen, Guangdong, DNSPod",
	
	// Asia - Taiwan
	"168.95.1.1":   "Taipei, Taiwan, HiNet",
	"168.95.192.1": "Taipei, Taiwan, HiNet",
	
	// Asia-Pacific
	"1.1.1.2": "Sydney, NSW, Cloudflare",
	"1.0.0.2": "Sydney, NSW, Cloudflare",
	
	// South America
	"200.221.11.100": "Rio de Janeiro, Brazil, NET",
}

// serverCoordinates maps DNS server IPs to their approximate datacenter locations [latitude, longitude]
// These coordinates represent major datacenter/city locations for each DNS provider
var serverCoordinates = map[string][2]float64{
	// North America - US West - Cloudflare (San Francisco)
	"1.1.1.1": {37.7749, -122.4194},
	"1.0.0.1": {37.7849, -122.4094}, // Slightly offset
	
	// North America - US West - Google (Mountain View, CA)
	"8.8.8.8": {37.4220, -122.0841},
	"8.8.4.4": {37.4320, -122.0741}, // Slightly offset
	
	// North America - US West - Quad9 (Berkeley, CA)
	"9.9.9.9":         {37.8715, -122.2730},
	"149.112.112.112": {37.8815, -122.2630}, // Slightly offset
	
	// North America - US West - OpenDNS/Cisco (San Francisco)
	"208.67.222.222": {37.7849, -122.4394},
	"208.67.220.220": {37.7949, -122.4294}, // Slightly offset
	
	// North America - US East - Neustar/UltraDNS (Ashburn, VA)
	"156.154.70.1": {39.0438, -77.4874},
	"156.154.71.1": {39.0538, -77.4774}, // Slightly offset
	
	// North America - US Central - Level3 (Broomfield, CO)
	"4.2.2.1": {39.9142, -105.0519},
	"4.2.2.2": {39.9242, -105.0419}, // Slightly offset
	
	// North America - Canada - ControlD (Toronto)
	"76.76.2.0":  {43.6532, -79.3832},
	"76.76.10.0": {43.6632, -79.3732}, // Slightly offset
	
	// Europe - Western - AdGuard (Limassol, Cyprus)
	"94.140.14.14": {34.7070, 33.0220},
	"94.140.15.15": {34.7170, 33.0320}, // Slightly offset
	
	// Europe - Western - CleanBrowsing (Amsterdam, Netherlands)
	"185.228.168.9": {52.3676, 4.9041},
	"185.228.169.9": {52.3776, 4.9141}, // Slightly offset
	
	// Europe - Eastern - Yandex (Moscow, Russia)
	"77.88.8.8": {55.7558, 37.6173},
	"77.88.8.1": {55.7658, 37.6273}, // Slightly offset
	
	// Asia - China - 114DNS (Nanjing)
	"114.114.114.114": {32.0603, 118.7969},
	"114.114.115.115": {32.0703, 118.8069}, // Slightly offset
	
	// Asia - China - AliDNS/Alibaba (Hangzhou)
	"223.5.5.5": {30.2741, 120.1551},
	"223.6.6.6": {30.2841, 120.1651}, // Slightly offset
	
	// Asia - China - DNSPod/Tencent (Shenzhen)
	"119.29.29.29": {22.5431, 114.0579},
	
	// Asia - Taiwan - HiNet (Taipei)
	"168.95.1.1":   {25.0330, 121.5654},
	"168.95.192.1": {25.0430, 121.5754}, // Slightly offset
	
	// Asia-Pacific - Cloudflare (Sydney, Australia)
	"1.1.1.2": {-33.8688, 151.2093},
	"1.0.0.2": {-33.8588, 151.2193}, // Slightly offset
	
	// South America - NET (Rio de Janeiro, Brazil)
	"200.221.11.100": {-22.9068, -43.1729},
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
	lat, lon := coordinatesFor(server)
	result := Result{
		Server:    normalizeServer(server),
		Region:    regionFor(server),
		Latitude:  lat,
		Longitude: lon,
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

func coordinatesFor(server string) (float64, float64) {
	host, _, err := net.SplitHostPort(server)
	if err != nil {
		host = server
	}
	if coords, ok := serverCoordinates[host]; ok {
		return coords[0], coords[1]
	}
	// Return 0,0 for unknown servers (will be filtered out on frontend)
	return 0, 0
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
