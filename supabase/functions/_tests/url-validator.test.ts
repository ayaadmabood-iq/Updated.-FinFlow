/**
 * Tests for URL Validator (SSRF Prevention)
 * Covers: Private IP blocking, hostname validation, protocol restrictions
 */

import { 
  assertEquals,
  generatePrivateIPs,
  generatePublicURLs,
} from './setup.ts';

import {
  validateUrl,
  isPrivateIP,
  isBlockedHostname,
} from '../_shared/url-validator.ts';

// ============= Private IP Detection Tests =============

Deno.test('URL Validator - Detects loopback addresses', () => {
  const loopbackIPs = ['127.0.0.1', '127.0.0.255', '127.255.255.255'];
  
  for (const ip of loopbackIPs) {
    assertEquals(isPrivateIP(ip), true, `Should block loopback: ${ip}`);
  }
});

Deno.test('URL Validator - Detects RFC 1918 private IPs (10.x.x.x)', () => {
  const class10IPs = ['10.0.0.1', '10.255.255.255', '10.1.2.3'];
  
  for (const ip of class10IPs) {
    assertEquals(isPrivateIP(ip), true, `Should block 10.x: ${ip}`);
  }
});

Deno.test('URL Validator - Detects RFC 1918 private IPs (192.168.x.x)', () => {
  const class192IPs = ['192.168.0.1', '192.168.1.1', '192.168.255.255'];
  
  for (const ip of class192IPs) {
    assertEquals(isPrivateIP(ip), true, `Should block 192.168.x: ${ip}`);
  }
});

Deno.test('URL Validator - Detects RFC 1918 private IPs (172.16-31.x.x)', () => {
  const class172IPs = ['172.16.0.1', '172.20.5.5', '172.31.255.255'];
  
  for (const ip of class172IPs) {
    assertEquals(isPrivateIP(ip), true, `Should block 172.16-31.x: ${ip}`);
  }
  
  // 172.15.x.x and 172.32.x.x should NOT be blocked
  assertEquals(isPrivateIP('172.15.0.1'), false);
  assertEquals(isPrivateIP('172.32.0.1'), false);
});

Deno.test('URL Validator - Detects link-local addresses', () => {
  const linkLocalIPs = ['169.254.0.1', '169.254.169.254', '169.254.255.255'];
  
  for (const ip of linkLocalIPs) {
    assertEquals(isPrivateIP(ip), true, `Should block link-local: ${ip}`);
  }
});

Deno.test('URL Validator - Detects cloud metadata IPs', () => {
  const metadataIPs = [
    '169.254.169.254',  // AWS/GCP/Azure
    '169.254.170.2',    // AWS ECS
  ];
  
  for (const ip of metadataIPs) {
    assertEquals(isPrivateIP(ip), true, `Should block metadata: ${ip}`);
  }
});

Deno.test('URL Validator - Allows public IPs', () => {
  const publicIPs = [
    '8.8.8.8',          // Google DNS
    '1.1.1.1',          // Cloudflare
    '208.67.222.222',   // OpenDNS
    '93.184.216.34',    // example.com
  ];
  
  for (const ip of publicIPs) {
    assertEquals(isPrivateIP(ip), false, `Should allow public: ${ip}`);
  }
});

// ============= Blocked Hostname Tests =============

Deno.test('URL Validator - Blocks localhost', () => {
  assertEquals(isBlockedHostname('localhost'), true);
  assertEquals(isBlockedHostname('LOCALHOST'), true);
  assertEquals(isBlockedHostname('LocalHost'), true);
});

Deno.test('URL Validator - Blocks cloud metadata hostnames', () => {
  const metadataHosts = [
    'metadata.google.internal',
    'metadata.google.com',
    'metadata',
  ];
  
  for (const host of metadataHosts) {
    assertEquals(isBlockedHostname(host), true, `Should block: ${host}`);
  }
});

Deno.test('URL Validator - Blocks Kubernetes internal hostnames', () => {
  const k8sHosts = [
    'kubernetes.default',
    'kubernetes.default.svc',
    'kubernetes.default.svc.cluster.local',
  ];
  
  for (const host of k8sHosts) {
    assertEquals(isBlockedHostname(host), true, `Should block: ${host}`);
  }
});

Deno.test('URL Validator - Allows normal hostnames', () => {
  const normalHosts = [
    'example.com',
    'api.github.com',
    'cdn.example.org',
    'my-app.vercel.app',
  ];
  
  for (const host of normalHosts) {
    assertEquals(isBlockedHostname(host), false, `Should allow: ${host}`);
  }
});

// ============= Full URL Validation Tests =============

Deno.test('URL Validator - Validates public HTTPS URLs', () => {
  const publicURLs = generatePublicURLs();
  
  for (const url of publicURLs) {
    const result = validateUrl(url);
    assertEquals(result.isValid, true, `Should allow: ${url}`);
  }
});

Deno.test('URL Validator - Blocks private IP URLs', () => {
  const privateIPs = generatePrivateIPs().filter(ip => ip !== 'localhost');
  
  for (const ip of privateIPs) {
    const result = validateUrl(`http://${ip}/test`);
    assertEquals(result.isValid, false, `Should block: ${ip}`);
  }
});

Deno.test('URL Validator - Blocks localhost URLs', () => {
  const localhostURLs = [
    'http://localhost',
    'http://localhost:8080',
    'https://localhost/path',
    'http://127.0.0.1',
    'http://127.0.0.1:3000',
  ];
  
  for (const url of localhostURLs) {
    const result = validateUrl(url);
    assertEquals(result.isValid, false, `Should block: ${url}`);
  }
});

Deno.test('URL Validator - Blocks non-HTTP protocols', () => {
  const nonHTTPUrls = [
    'ftp://example.com/file',
    'file:///etc/passwd',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'gopher://example.com',
  ];
  
  for (const url of nonHTTPUrls) {
    const result = validateUrl(url);
    assertEquals(result.isValid, false, `Should block: ${url}`);
  }
});

Deno.test('URL Validator - Allows HTTP and HTTPS', () => {
  assertEquals(validateUrl('http://example.com').isValid, true);
  assertEquals(validateUrl('https://example.com').isValid, true);
});

Deno.test('URL Validator - Blocks dangerous ports', () => {
  const dangerousPorts = [22, 23, 25, 110, 143, 445, 3306, 5432, 6379, 27017, 11211];
  
  for (const port of dangerousPorts) {
    const result = validateUrl(`http://example.com:${port}/`);
    assertEquals(result.isValid, false, `Should block port: ${port}`);
  }
});

Deno.test('URL Validator - Allows common web ports', () => {
  const safePorts = [80, 443, 8080, 8443, 3000, 5000];
  
  for (const port of safePorts) {
    const result = validateUrl(`http://example.com:${port}/`);
    assertEquals(result.isValid, true, `Should allow port: ${port}`);
  }
});

Deno.test('URL Validator - Blocks numeric IP representations', () => {
  // 2130706433 = 127.0.0.1 in decimal
  const numericURLs = [
    'http://2130706433',  // Decimal IP
    'http://0x7f000001',  // Hex IP
  ];
  
  for (const url of numericURLs) {
    const result = validateUrl(url);
    assertEquals(result.isValid, false, `Should block numeric: ${url}`);
  }
});

Deno.test('URL Validator - Removes credentials from sanitized URL', () => {
  const result = validateUrl('https://user:pass@example.com/path');
  
  assertEquals(result.isValid, true);
  assertEquals(result.sanitizedUrl?.includes('user'), false);
  assertEquals(result.sanitizedUrl?.includes('pass'), false);
});

Deno.test('URL Validator - Handles invalid URL format', () => {
  const invalidURLs = [
    'not-a-url',
    '',
    '   ',
    'http://',
    '://missing-protocol.com',
  ];
  
  for (const url of invalidURLs) {
    const result = validateUrl(url);
    assertEquals(result.isValid, false, `Should be invalid: ${url}`);
  }
});

// ============= IPv6 Tests =============

Deno.test('URL Validator - Blocks IPv6 loopback', () => {
  assertEquals(isPrivateIP('::1'), true);
});

Deno.test('URL Validator - Blocks IPv6 link-local', () => {
  assertEquals(isPrivateIP('fe80::1'), true);
});

Deno.test('URL Validator - Blocks IPv6 unique local', () => {
  assertEquals(isPrivateIP('fc00::1'), true);
  assertEquals(isPrivateIP('fd00::1'), true);
});

// ============= Edge Cases =============

Deno.test('URL Validator - Handles URL with path and query', () => {
  const result = validateUrl('https://example.com/path/to/resource?query=value&other=123');
  
  assertEquals(result.isValid, true);
  assertEquals(result.sanitizedUrl?.includes('/path/to/resource'), true);
  assertEquals(result.sanitizedUrl?.includes('query=value'), true);
});

Deno.test('URL Validator - Handles URL with fragment', () => {
  const result = validateUrl('https://example.com/page#section');
  
  assertEquals(result.isValid, true);
});

Deno.test('URL Validator - Handles international domain names', () => {
  // IDN domains should be allowed (they get converted to punycode)
  const result = validateUrl('https://例え.jp/');
  
  assertEquals(result.isValid, true);
});

Deno.test('URL Validator - Blocks metadata subdomain patterns', () => {
  const metadataURLs = [
    'http://metadata.aws.example.com',
    'http://metadata.azure.internal',
    'http://169.254.metadata.com',
  ];
  
  for (const url of metadataURLs) {
    const result = validateUrl(url);
    assertEquals(result.isValid, false, `Should block metadata subdomain: ${url}`);
  }
});

Deno.test('URL Validator - Invalid IP octets are rejected', () => {
  const invalidIPUrls = [
    'http://256.0.0.1',
    'http://192.168.300.1',
    'http://10.0.0.999',
  ];
  
  for (const url of invalidIPUrls) {
    const result = validateUrl(url);
    assertEquals(result.isValid, false, `Should reject invalid IP: ${url}`);
  }
});
