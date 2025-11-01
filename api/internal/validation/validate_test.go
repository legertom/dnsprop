package validation

import (
	"strings"
	"testing"
)

func TestValidateDomainName(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		want      string
		wantError bool
	}{
		{"valid simple domain", "example.com", "example.com", false},
		{"valid subdomain", "www.example.com", "www.example.com", false},
		{"valid with trailing dot", "example.com.", "example.com", false},
		{"valid with hyphens", "my-site.example-domain.com", "my-site.example-domain.com", false},
		{"valid international domain", "münchen.de", "xn--mnchen-3ya.de", false},
		{"empty string", "", "", true},
		{"whitespace only", "   ", "", true},
		{"too long domain", strings.Repeat("a", 254), "", true},
		{"label too long", strings.Repeat("a", 64) + ".com", "", true},
		{"label starts with hyphen", "-example.com", "", true},
		{"label ends with hyphen", "example-.com", "", true},
		{"double dots", "example..com", "", true},
		{"invalid characters", "ex@mple.com", "", true},
		{"single label", "localhost", "localhost", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ValidateDomainName(tt.input)
			if (err != nil) != tt.wantError {
				t.Errorf("ValidateDomainName(%q) error = %v, wantError %v", tt.input, err, tt.wantError)
				return
			}
			if !tt.wantError && got != tt.want {
				t.Errorf("ValidateDomainName(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestValidateRecordType(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		wantError bool
	}{
		{"valid A", "A", false},
		{"valid AAAA", "AAAA", false},
		{"valid CNAME", "CNAME", false},
		{"valid TXT", "TXT", false},
		{"valid MX", "MX", false},
		{"valid NS", "NS", false},
		{"valid SOA", "SOA", false},
		{"lowercase valid", "a", false},
		{"mixed case valid", "AaAa", false},
		{"invalid type", "INVALID", true},
		{"empty string", "", true},
		{"whitespace only", "   ", true},
		{"unsupported PTR", "PTR", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateRecordType(tt.input)
			if (err != nil) != tt.wantError {
				t.Errorf("ValidateRecordType(%q) error = %v, wantError %v", tt.input, err, tt.wantError)
			}
		})
	}
}

func TestValidateServers(t *testing.T) {
	tests := []struct {
		name      string
		servers   []string
		maxCount  int
		wantError bool
	}{
		{"valid IPv4", []string{"8.8.8.8", "1.1.1.1"}, 10, false},
		{"valid IPv4 with port", []string{"8.8.8.8:53", "1.1.1.1:5353"}, 10, false},
		{"valid IPv6", []string{"2001:4860:4860::8888"}, 10, false},
		{"valid IPv6 with port", []string{"[2001:4860:4860::8888]:53"}, 10, false},
		{"mixed IPv4 and IPv6", []string{"8.8.8.8", "2001:4860:4860::8888"}, 10, false},
		{"empty list", []string{}, 10, false},
		{"whitespace entries", []string{"8.8.8.8", "  ", "1.1.1.1"}, 10, false},
		{"too many servers", []string{"1.1.1.1", "8.8.8.8", "9.9.9.9"}, 2, true},
		{"invalid hostname", []string{"dns.google.com"}, 10, true},
		{"invalid IP", []string{"999.999.999.999"}, 10, true},
		{"invalid format", []string{"not-an-ip"}, 10, true},
		{"partial IP", []string{"8.8.8"}, 10, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateServers(tt.servers, tt.maxCount)
			if (err != nil) != tt.wantError {
				t.Errorf("ValidateServers(%v, %d) error = %v, wantError %v", tt.servers, tt.maxCount, err, tt.wantError)
			}
		})
	}
}
