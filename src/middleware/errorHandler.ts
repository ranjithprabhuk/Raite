import type { ErrorHandler } from 'elysia';

export const errorHandler: ErrorHandler = ({ code, error, set, request }) => {
  // Don't log 404s for common browser requests (favicon, etc.)
  const url = new URL(request.url);
  const isCommonBrowserRequest = [
    '/favicon.ico',
    '/apple-touch-icon.png',
    '/robots.txt',
    '/sitemap.xml',
    '/manifest.json',
    '/service-worker.js',
    '/sw.js'
  ].includes(url.pathname) || 
  url.pathname.startsWith('/.well-known/') ||     // Chrome DevTools and other well-known paths
  url.pathname.startsWith('/assets/') ||          // Static assets
  url.pathname.startsWith('/static/') ||          // Static files
  url.pathname.endsWith('.js') ||                 // JavaScript files (service workers, etc.)
  url.pathname.endsWith('.css') ||                // CSS files
  url.pathname.endsWith('.png') ||                // Image files
  url.pathname.endsWith('.ico') ||                // Icon files
  url.pathname.endsWith('.svg') ||                // SVG files
  url.pathname.includes('ServiceWorker');         // Any service worker related requests

  // Only log 404s that aren't common browser requests
  if (code === 'NOT_FOUND' && !isCommonBrowserRequest) {
    console.error(`API 404 Error: ${url.pathname}`, error);
  } else if (code !== 'NOT_FOUND') {
    console.error('API Error:', error, code);
  }

  switch (code) {
    case 'VALIDATION':
      set.status = 400;
      return {
        success: false,
        error: 'Validation Error',
        message: error.message,
        details: error,
      };

    case 'NOT_FOUND':
      set.status = 404;
      return {
        success: false,
        error: 'Not Found',
        message: 'The requested resource was not found',
      };

    case 'INTERNAL_SERVER_ERROR':
      set.status = 500;
      return {
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      };

    default:
      set.status = 500;
      return {
        success: false,
        error: 'Unknown Error',
        message: error.message || 'An unexpected error occurred',
      };
  }
};
