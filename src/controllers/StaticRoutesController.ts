import { Elysia } from 'elysia';

export const staticRoutesController = new Elysia()
  .get('/favicon.ico', () => new Response(null, { status: 204 }))
  .get('/robots.txt', () => new Response('User-agent: *\nDisallow: /', {
    headers: { 'Content-Type': 'text/plain' }
  }))
  .get('/.well-known/*', () => new Response(null, { status: 404 }))
  .get('/manifest.json', () => new Response('{}', { 
    headers: { 'Content-Type': 'application/json' } 
  }))
  .get('/*ServiceWorker.js', () => new Response('// No service worker', { 
    headers: { 'Content-Type': 'application/javascript' } 
  }))
  .get('/service-worker.js', () => new Response('// No service worker', { 
    headers: { 'Content-Type': 'application/javascript' } 
  }))
  .get('/sw.js', () => new Response('// No service worker', { 
    headers: { 'Content-Type': 'application/javascript' } 
  }));
