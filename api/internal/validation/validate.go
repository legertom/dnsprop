package validation

import (
	"errors"
	"fmt"
	"net"
	"strings"

	"golang.org/x/net/idna"
)

var supportedRecordTypes = map[string]bool{
	"A":     true,
	"AAAA":  true,
	"CNAME": true,
	"TXT":   true,
	"MX":    true,
	"NS":    true,
	"SOA":   true,
}

// ValidateDomainName validates and normalizes a domain name.
// It converts internationalized domains to punycode and checks length/label constraints.
// Returns the normalized (ASCII) domain name or an error.
func ValidateDomainName(name string) (string, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return "", errors.New("domain name cannot be empty")
	}

	// Remove trailing dot if present
	name = strings.TrimSuffix(name, ".")

	// Convert to ASCII (handles IDNA/punycode for internationalized domains)
	asciiName, err := idna.ToASCII(name)
	if err != nil {
		return "", fmt.Errorf("invalid domain name: %w", err)
	}

	// Check total length (max 253 characters per RFC 1035)
	if len(asciiName) > 253 {
		return "", fmt.Errorf("domain name too long: %d characters (max 253)", len(asciiName))
	}

	// Split into labels and validate each
	labels := strings.Split(asciiName, ".")
	if len(labels) == 0 {
		return "", errors.New("domain name must have at least one label")
	}

	for _, label := range labels {
		if len(label) == 0 {
			return "", errors.New("domain name cannot have empty labels")
		}
		if len(label) > 63 {
			return "", fmt.Errorf("label '%s' too long: %d characters (max 63)", label, len(label))
		}
		// Labels must start and end with alphanumeric
		if !isAlphanumeric(label[0]) {
			return "", fmt.Errorf("label '%s' must start with letter or digit", label)
		}
		if !isAlphanumeric(label[len(label)-1]) {
			return "", fmt.Errorf("label '%s' must end with letter or digit", label)
		}
		// Check all characters are valid (alphanumeric or hyphen)
		for _, ch := range label {
			if !isAlphanumeric(byte(ch)) && ch != '-' {
				return "", fmt.Errorf("label '%s' contains invalid character '%c'", label, ch)
			}
		}
	}

	return asciiName, nil
}

// ValidateRecordType checks if the record type is supported.
func ValidateRecordType(rtype string) error {
	rtype = strings.ToUpper(strings.TrimSpace(rtype))
	if rtype == "" {
		return errors.New("record type cannot be empty")
	}
	if !supportedRecordTypes[rtype] {
		return fmt.Errorf("unsupported record type '%s' (supported: A, AAAA, CNAME, TXT, MX, NS, SOA)", rtype)
	}
	return nil
}

// ValidateServers validates a list of DNS server addresses.
// Servers must be valid IPv4 or IPv6 addresses (with optional port).
// Returns an error if any server is invalid or if the count exceeds maxCount.
func ValidateServers(servers []string, maxCount int) error {
	if len(servers) > maxCount {
		return fmt.Errorf("too many servers: %d (max %d)", len(servers), maxCount)
	}

	for _, server := range servers {
		server = strings.TrimSpace(server)
		if server == "" {
			continue // empty entries will be filtered out by dedupe
		}

		// Try to parse as IP:port first
		host, _, err := net.SplitHostPort(server)
		if err != nil {
			// No port specified, try as bare IP
			host = server
		}

		// Validate it's a valid IP address (not a hostname)
		if net.ParseIP(host) == nil {
			return fmt.Errorf("invalid server address '%s': must be a valid IPv4 or IPv6 address", server)
		}
	}

	return nil
}

func isAlphanumeric(ch byte) bool {
	return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9')
}
