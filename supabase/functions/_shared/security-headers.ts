// ============= Security Headers for Edge Functions =============
// Comprehensive security headers for all API responses

// ============= CORS Headers (Required for Browser Access) =============

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400', // 24 hours
};

// ============= Security Headers =============

export const securityHeaders = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // XSS Protection (legacy, but still useful for older browsers)
  'X-XSS-Protection': '1; mode=block',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Referrer policy - don't leak referrer info
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Content Security Policy for API responses
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  
  // Permissions Policy - restrict features
  'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  
  // Cache control for sensitive data
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// ============= Combined Headers =============

/**
 * Get all headers for API responses
 */
export function getSecureHeaders(): Record<string, string> {
  return {
    ...corsHeaders,
    ...securityHeaders,
    'Content-Type': 'application/json',
  };
}

/**
 * Get headers for streaming responses (SSE)
 */
export function getStreamingHeaders(): Record<string, string> {
  return {
    ...corsHeaders,
    ...securityHeaders,
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };
}

/**
 * Get headers for file downloads
 */
export function getDownloadHeaders(filename: string, contentType: string): Record<string, string> {
  return {
    ...corsHeaders,
    'X-Content-Type-Options': 'nosniff',
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '\\"')}"`,
    'Cache-Control': 'private, no-cache',
  };
}

// ============= CORS Preflight Handler =============

/**
 * Handle CORS preflight OPTIONS request
 */
export function handleCorsPreflightRequest(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// ============= Error Response Helpers =============

/**
 * Create a secure error response
 */
export function createErrorResponse(
  error: string,
  status: number = 500,
  additionalHeaders?: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error }),
    {
      status,
      headers: {
        ...getSecureHeaders(),
        ...additionalHeaders,
      },
    }
  );
}

/**
 * Create a secure success response
 */
export function createSuccessResponse(
  data: unknown,
  status: number = 200,
  additionalHeaders?: Record<string, string>
): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...getSecureHeaders(),
        ...additionalHeaders,
      },
    }
  );
}

// ============= Auth Error Responses =============

export function createUnauthorizedResponse(message = 'Unauthorized'): Response {
  return createErrorResponse(message, 401);
}

export function createForbiddenResponse(message = 'Forbidden'): Response {
  return createErrorResponse(message, 403);
}

export function createBadRequestResponse(message = 'Bad Request'): Response {
  return createErrorResponse(message, 400);
}

export function createNotFoundResponse(message = 'Not Found'): Response {
  return createErrorResponse(message, 404);
}

// ============= Input Validation Error =============

export function createValidationErrorResponse(errors: string[]): Response {
  return new Response(
    JSON.stringify({
      error: 'Validation failed',
      details: errors,
    }),
    {
      status: 400,
      headers: getSecureHeaders(),
    }
  );
}
