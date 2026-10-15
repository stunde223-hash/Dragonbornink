import { authorize } from '../server/auth.js';
export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;
  if (/^\/(admin|api\/admin)(\/|$)/.test(path)) {
    const denied = await authorize(context.request, context.env);
    const response = denied || await context.next();
    const secured = new Response(response.body, response);
    secured.headers.set('Cache-Control', 'no-store');
    secured.headers.set('X-Content-Type-Options', 'nosniff');
    secured.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; media-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    return secured;
  }
  return context.next();
}
