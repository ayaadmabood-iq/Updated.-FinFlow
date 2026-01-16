/**
 * URL validation utilities to prevent SSRF attacks
 */

// Private IP ranges that should be blocked
const PRIVATE_IP_PATTERNS = [
  /^127\./,                           // Loopback (127.0.0.0/8)
  /^10\./,                            // RFC 1918 (10.0.0.0/8)
  /^192\.168\./,                      // RFC 1918 (192.168.0.0/16)
  /^172\.(1[6-9]|2\d|3[01])\./,       // RFC 1918 (172.16.0.0/12)
  /^169\.254\./,                      // Link-local (169.254.0.0/16)
  /^0\./,                             // Current network (0.0.0.0/8)
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // Shared address space (100.64.0.0/10)
  /^198\.1[89]\./,                    // Benchmark testing (198.18.0.0/15)
  /^192\.0\.0\./,                     // IETF Protocol Assignments (192.0.0.0/24)
  /^192\.0\.2\./,                     // TEST-NET-1 (192.0.2.0/24)
  /^198\.51\.100\./,                  // TEST-NET-2 (198.51.100.0/24)
  /^203\.0\.113\./,                   // TEST-NET-3 (203.0.113.0/24)
  /^224\./,                           // Multicast (224.0.0.0/4)
  /^240\./,                           // Reserved (240.0.0.0/4)
  /^255\.255\.255\.255$/,             // Broadcast
];

// IPv6 private patterns
const PRIVATE_IPV6_PATTERNS = [
  /^::1$/i,                           // Loopback
  /^fe80:/i,                          // Link-local
  /^fc00:/i,                          // Unique local address
  /^fd[0-9a-f]{2}:/i,                 // Unique local address
  /^::$/,                             // Unspecified address
  /^::ffff:/i,                        // IPv4-mapped IPv6 (check the IPv4 part separately)
];

// Dangerous hostnames that should be blocked
const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  'metadata.google.com',
  'metadata',
  'kubernetes.default',
  'kubernetes.default.svc',
  'kubernetes.default.svc.cluster.local',
];

// Cloud metadata IP addresses
const CLOUD_METADATA_IPS = [
  '169.254.169.254',  // AWS, GCP, Azure, DigitalOcean
  '169.254.170.2',    // AWS ECS task metadata
  'fd00:ec2::254',    // AWS IPv6
];

export interface UrlValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedUrl?: string;
}

/**
 * Check if an IP address is private/internal
 */
export function isPrivateIP(ip: string): boolean {
  // Check cloud metadata IPs first
  if (CLOUD_METADATA_IPS.includes(ip)) {
    return true;
  }

  // Check IPv4 patterns
  if (PRIVATE_IP_PATTERNS.some(pattern => pattern.test(ip))) {
    return true;
  }

  // Check IPv6 patterns
  if (PRIVATE_IPV6_PATTERNS.some(pattern => pattern.test(ip))) {
    return true;
  }

  return false;
}

/**
 * Check if a hostname is blocked
 */
export function isBlockedHostname(hostname: string): boolean {
  const lowerHostname = hostname.toLowerCase();
  
  // Check exact matches
  if (BLOCKED_HOSTNAMES.includes(lowerHostname)) {
    return true;
  }

  // Check if it's an IP address directly
  if (/^[\d.]+$/.test(hostname)) {
    return isPrivateIP(hostname);
  }

  // Check for metadata subdomain patterns
  if (lowerHostname.includes('metadata') && 
      (lowerHostname.includes('google') || 
       lowerHostname.includes('aws') || 
       lowerHostname.includes('azure') ||
       lowerHostname.includes('169.254'))) {
    return true;
  }

  return false;
}

/**
 * Validate a URL to prevent SSRF attacks
 */
export function validateUrl(urlString: string): UrlValidationResult {
  try {
    // Parse the URL
    const url = new URL(urlString);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return {
        isValid: false,
        error: `Protocol not allowed: ${url.protocol}. Only http and https are permitted.`,
      };
    }

    // Check if hostname is blocked
    if (isBlockedHostname(url.hostname)) {
      return {
        isValid: false,
        error: 'Access to this host is not allowed for security reasons.',
      };
    }

    // Check if hostname looks like an IP address
    const ipv4Match = url.hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      // Validate IP octets
      const octets = ipv4Match.slice(1).map(Number);
      if (octets.some(o => o > 255)) {
        return {
          isValid: false,
          error: 'Invalid IP address format.',
        };
      }

      if (isPrivateIP(url.hostname)) {
        return {
          isValid: false,
          error: 'Access to private IP addresses is not allowed.',
        };
      }
    }

    // Check for IPv6 in brackets
    if (url.hostname.startsWith('[') && url.hostname.endsWith(']')) {
      const ipv6 = url.hostname.slice(1, -1);
      if (PRIVATE_IPV6_PATTERNS.some(pattern => pattern.test(ipv6))) {
        return {
          isValid: false,
          error: 'Access to private IPv6 addresses is not allowed.',
        };
      }
    }

    // Block numeric IP representations (decimal, octal, hex)
    // e.g., http://2130706433 (127.0.0.1 in decimal)
    if (/^\d+$/.test(url.hostname)) {
      return {
        isValid: false,
        error: 'Numeric IP addresses are not allowed.',
      };
    }

    // Block hex-encoded hostnames
    if (/^0x[0-9a-f]+$/i.test(url.hostname)) {
      return {
        isValid: false,
        error: 'Hex-encoded IP addresses are not allowed.',
      };
    }

    // Check port - block common internal service ports if explicitly specified
    const blockedPorts = [22, 23, 25, 110, 143, 445, 3306, 5432, 6379, 27017, 11211];
    if (url.port && blockedPorts.includes(parseInt(url.port, 10))) {
      return {
        isValid: false,
        error: `Port ${url.port} is not allowed for security reasons.`,
      };
    }

    // Return sanitized URL (removes credentials if present)
    const sanitizedUrl = new URL(urlString);
    sanitizedUrl.username = '';
    sanitizedUrl.password = '';

    return {
      isValid: true,
      sanitizedUrl: sanitizedUrl.toString(),
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid URL format.',
    };
  }
}

/**
 * Additional DNS resolution validation (to be used before actual fetch)
 * This helps prevent DNS rebinding attacks
 */
export async function validateResolvedIP(hostname: string): Promise<UrlValidationResult> {
  try {
    // Use Deno's DNS resolution
    const addresses = await Deno.resolveDns(hostname, 'A');
    
    for (const ip of addresses) {
      if (isPrivateIP(ip)) {
        return {
          isValid: false,
          error: `Hostname resolves to private IP address: ${ip}`,
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    // If DNS resolution fails, we might still want to allow the fetch
    // as the URL might use IP directly
    console.warn('DNS resolution check failed:', error);
    return { isValid: true };
  }
}
