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
}

var defaultRegions = map[string]string{
	"1.1.1.1":           "Cloudflare",
	"1.0.0.1":           "Cloudflare",
	"8.8.8.8":           "Google",
	"8.8.4.4":           "Google",
	"9.9.9.9":           "Quad9",
	"149.112.112.112":   "Quad9",
	"208.67.222.222":    "OpenDNS",
	"208.67.220.220":    "OpenDNS",
}

func Resolve(ctx context.Context, name, qtype string, servers []string, dnssec bool, perQueryTimeout time.Duration) []Result {
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
			res := queryOne(ctx, server, name, qtype, dnssec, perQueryTimeout)
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
	result := Result{
		Server: normalizeServer(server),
		Region: regionFor(server),
		When:   time.Now().UTC(),
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
	} else {
		result.Status = "ok"
		result.Answers = answers
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
		return "Global/" + label
	}
	return ""
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
