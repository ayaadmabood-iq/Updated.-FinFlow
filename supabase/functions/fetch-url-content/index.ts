import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FetchUrlRequest {
  data_source_id: string;
}

// ============= SSRF Protection =============

// Private IP ranges that should be blocked
const PRIVATE_IP_PATTERNS = [
  /^127\./,                           // Loopback (127.0.0.0/8)
  /^10\./,                            // RFC 1918 (10.0.0.0/8)
  /^192\.168\./,                      // RFC 1918 (192.168.0.0/16)
  /^172\.(1[6-9]|2\d|3[01])\./,       // RFC 1918 (172.16.0.0/12)
  /^169\.254\./,                      // Link-local (169.254.0.0/16)
  /^0\./,                             // Current network (0.0.0.0/8)
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // Shared address space
  /^192\.0\.0\./,                     // IETF Protocol Assignments
  /^192\.0\.2\./,                     // TEST-NET-1
  /^198\.51\.100\./,                  // TEST-NET-2
  /^203\.0\.113\./,                   // TEST-NET-3
  /^224\./,                           // Multicast
  /^240\./,                           // Reserved
  /^255\.255\.255\.255$/,             // Broadcast
];

// Cloud metadata IPs and blocked hostnames
const CLOUD_METADATA_IPS = ['169.254.169.254', '169.254.170.2'];
const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  'metadata.google.com',
  'metadata',
  'kubernetes.default',
  'kubernetes.default.svc',
];

function isPrivateIP(ip: string): boolean {
  if (CLOUD_METADATA_IPS.includes(ip)) return true;
  return PRIVATE_IP_PATTERNS.some(pattern => pattern.test(ip));
}

function isBlockedHostname(hostname: string): boolean {
  const lowerHostname = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(lowerHostname)) return true;
  if (/^[\d.]+$/.test(hostname)) return isPrivateIP(hostname);
  if (lowerHostname.includes('metadata') && 
      (lowerHostname.includes('google') || lowerHostname.includes('aws') || lowerHostname.includes('azure'))) {
    return true;
  }
  return false;
}

interface UrlValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedUrl?: string;
}

function validateUrl(urlString: string): UrlValidationResult {
  try {
    const url = new URL(urlString);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { isValid: false, error: `Protocol not allowed: ${url.protocol}` };
    }

    // Check if hostname is blocked
    if (isBlockedHostname(url.hostname)) {
      return { isValid: false, error: 'Access to this host is not allowed for security reasons.' };
    }

    // Check if hostname is an IP address
    const ipv4Match = url.hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const octets = ipv4Match.slice(1).map(Number);
      if (octets.some(o => o > 255)) {
        return { isValid: false, error: 'Invalid IP address format.' };
      }
      if (isPrivateIP(url.hostname)) {
        return { isValid: false, error: 'Access to private IP addresses is not allowed.' };
      }
    }

    // Block numeric IP representations (decimal, octal, hex)
    if (/^\d+$/.test(url.hostname) || /^0x[0-9a-f]+$/i.test(url.hostname)) {
      return { isValid: false, error: 'Numeric/hex IP addresses are not allowed.' };
    }

    // Block common internal service ports
    const blockedPorts = [22, 23, 25, 110, 143, 445, 3306, 5432, 6379, 27017, 11211];
    if (url.port && blockedPorts.includes(parseInt(url.port, 10))) {
      return { isValid: false, error: `Port ${url.port} is not allowed.` };
    }

    // Return sanitized URL (remove credentials)
    const sanitizedUrl = new URL(urlString);
    sanitizedUrl.username = '';
    sanitizedUrl.password = '';

    return { isValid: true, sanitizedUrl: sanitizedUrl.toString() };
  } catch (error) {
    return { isValid: false, error: error instanceof Error ? error.message : 'Invalid URL format.' };
  }
}

// ============= HTML Processing (Robust Sanitization) =============

/**
 * Extract clean, readable text from HTML content
 * Removes all code, scripts, styles, and markup - keeping only readable text
 */
function extractCleanTextFromHTML(html: string): string {
  let text = html;
  
  // Step 1: Remove entire blocks that contain no useful text
  const blocksToRemove = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    /<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi,
    /<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<canvas\b[^<]*(?:(?!<\/canvas>)<[^<]*)*<\/canvas>/gi,
    /<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi,
    /<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi,
    /<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi,
    /<embed\b[^>]*\/?>/gi,
    /<link\b[^>]*\/?>/gi,
    /<meta\b[^>]*\/?>/gi,
    /<input\b[^>]*\/?>/gi,
    /<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi,
    /<!--[\s\S]*?-->/g,
    /<!DOCTYPE[^>]*>/gi,
    /<\?xml[^>]*\?>/gi,
  ];
  
  for (const pattern of blocksToRemove) {
    text = text.replace(pattern, ' ');
  }
  
  // Step 2: Remove inline event handlers, styles, classes and data attributes
  text = text.replace(/\s(on\w+|style|class|id|data-[\w-]+|aria-[\w-]+|role)="[^"]*"/gi, '');
  text = text.replace(/\s(on\w+|style|class|id|data-[\w-]+|aria-[\w-]+|role)='[^']*'/gi, '');
  
  // Step 3: Add line breaks for block elements, then remove all tags
  text = text.replace(/<(br|hr)[^>]*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|li|tr|h[1-6]|article|section|blockquote|pre|td|th)>/gi, '\n');
  text = text.replace(/<(p|div|li|tr|h[1-6]|article|section|blockquote|pre|td|th)[^>]*>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Step 4: Decode HTML entities
  const entities: Record<string, string> = {
    '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>',
    '&quot;': '"', '&#39;': "'", '&apos;': "'",
    '&mdash;': '—', '&ndash;': '–', '&hellip;': '…',
    '&copy;': '©', '&reg;': '®', '&trade;': '™',
    '&laquo;': '«', '&raquo;': '»',
    '&bull;': '•', '&middot;': '·',
    '&ldquo;': '"', '&rdquo;': '"',
    '&lsquo;': "'", '&rsquo;': "'",
    '&pound;': '£', '&euro;': '€', '&yen;': '¥',
  };
  for (const [entity, char] of Object.entries(entities)) {
    text = text.replace(new RegExp(entity, 'gi'), char);
  }
  // Numeric entities (decimal and hex)
  text = text.replace(/&#(\d+);/g, (_, num) => {
    const code = parseInt(num, 10);
    return code > 0 && code < 65536 ? String.fromCharCode(code) : '';
  });
  text = text.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    const code = parseInt(hex, 16);
    return code > 0 && code < 65536 ? String.fromCharCode(code) : '';
  });
  
  // Step 5: Remove remaining code-like patterns
  const codePatterns = [
    /\{[^}]{0,500}\}/g,              // CSS-like blocks
    /function\s*\([^)]*\)\s*\{/g,    // Function declarations
    /=>\s*\{/g,                       // Arrow functions
    /var\s+\w+\s*=/g,                // var declarations
    /const\s+\w+\s*=/g,              // const declarations
    /let\s+\w+\s*=/g,                // let declarations
    /import\s+.*from\s+['"][^'"]+['"]/g, // import statements
    /export\s+(default\s+)?/g,       // export statements
    /require\s*\(['"]/g,             // require statements
    /\$\(['"]/g,                     // jQuery selectors
    /document\.(getElementById|querySelector)/g, // DOM methods
    /console\.(log|error|warn)/g,   // console methods
    /@media\s*\([^)]*\)/g,          // Media queries
    /@import\s+/g,                  // CSS imports
    /\.[\w-]+\s*\{/g,               // CSS class selectors
    /#[\w-]+\s*\{/g,                // CSS ID selectors
  ];
  
  for (const pattern of codePatterns) {
    text = text.replace(pattern, ' ');
  }
  
  // Step 6: Clean up whitespace
  text = text
    .replace(/[\t ]+/g, ' ')           // Multiple spaces/tabs to single space
    .replace(/\n[ \t]+/g, '\n')        // Remove leading whitespace from lines
    .replace(/[ \t]+\n/g, '\n')        // Remove trailing whitespace from lines
    .replace(/\n{3,}/g, '\n\n')        // Multiple newlines to double
    .trim();
  
  // Step 7: Remove lines that are too short or look like code artifacts
  const lines = text.split('\n');
  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return true;
    // Skip lines that are just punctuation/symbols
    if (/^[^\w\s\u0600-\u06FF\u0750-\u077F\u4E00-\u9FFF\u3040-\u30FF]+$/.test(trimmed)) return false;
    // Skip very short lines that look like code
    if (trimmed.length < 3 && /[{}[\]();]/.test(trimmed)) return false;
    // Skip lines that look like CSS properties
    if (/^[\w-]+:\s*[^;]+;?$/.test(trimmed)) return false;
    return true;
  });
  
  text = cleanedLines.join('\n');
  
  // Step 8: Final cleanup
  text = text
    .replace(/[<>{}[\]]/g, ' ')        // Remove remaining brackets
    .replace(/\s+/g, ' ')              // Final whitespace cleanup
    .replace(/\n /g, '\n')             // Clean up newline followed by space
    .replace(/ \n/g, '\n')             // Clean up space followed by newline
    .replace(/\n{3,}/g, '\n\n')        // Normalize newlines again
    .trim();
  
  return text;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(supabase, user.id, 'default', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: FetchUrlRequest = await req.json();
    

    if (!body.data_source_id) {
      return new Response(
        JSON.stringify({ error: 'Missing data_source_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the data source
    const { data: dataSource, error: fetchError } = await supabase
      .from('data_sources')
      .select('*')
      .eq('id', body.data_source_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !dataSource) {
      return new Response(
        JSON.stringify({ error: 'Data source not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (dataSource.source_type !== 'url' || !dataSource.original_url) {
      return new Response(
        JSON.stringify({ error: 'Data source is not a URL type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= SSRF Protection: Validate URL before fetching =============
    const validation = validateUrl(dataSource.original_url);
    if (!validation.isValid) {
      console.error('URL validation failed:', validation.error);
      
      // Update with error
      await supabase
        .from('data_sources')
        .update({
          status: 'failed',
          error_message: validation.error,
        })
        .eq('id', body.data_source_id);

      return new Response(
        JSON.stringify({ error: 'URL validation failed', details: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const safeUrl = validation.sanitizedUrl!;
    console.log('Fetching validated URL:', safeUrl);

    // Update status to processing
    await supabase
      .from('data_sources')
      .update({ status: 'processing' })
      .eq('id', body.data_source_id);

    try {
      // Fetch the URL content using validated/sanitized URL
      const response = await fetch(safeUrl, {
        headers: {
          'User-Agent': 'FineFlow/1.0 (Data Collection Bot)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      let rawContent: string;

      if (contentType.includes('text/html')) {
        const html = await response.text();
        rawContent = extractCleanTextFromHTML(html);
        console.log(`HTML sanitization: ${html.length} chars -> ${rawContent.length} chars`);
      } else if (contentType.includes('text/plain') || contentType.includes('application/json')) {
        rawContent = await response.text();
      } else {
        throw new Error(`Unsupported content type: ${contentType}`);
      }

      // Update with content
      const { data: updated, error: updateError } = await supabase
        .from('data_sources')
        .update({
          raw_content: rawContent.slice(0, 1000000), // Limit to 1MB
          status: 'completed',
          metadata: {
            content_type: contentType,
            content_length: rawContent.length,
            fetched_at: new Date().toISOString(),
          },
        })
        .eq('id', body.data_source_id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      

      return new Response(
        JSON.stringify({ data: updated }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (fetchErr) {
      console.error('Fetch error:', fetchErr);
      
      // Update with error
      await supabase
        .from('data_sources')
        .update({
          status: 'failed',
          error_message: fetchErr instanceof Error ? fetchErr.message : 'Unknown error',
        })
        .eq('id', body.data_source_id);

      return new Response(
        JSON.stringify({ error: 'Failed to fetch URL content', details: fetchErr instanceof Error ? fetchErr.message : 'Unknown error' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in fetch-url-content:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
