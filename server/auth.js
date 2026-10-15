import { createRemoteJWKSet, jwtVerify } from 'jose';
const keysets = new Map();
export async function authorize(request, env, verify = jwtVerify) {
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_ISSUER || '') || !env.ACCESS_AUD) return new Response('Dashboard access is not configured.', { status: 503 });
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return new Response('Authentication required.', { status: 401 });
  try {
    if (!keysets.has(env.ACCESS_ISSUER)) keysets.set(env.ACCESS_ISSUER, createRemoteJWKSet(new URL(`${env.ACCESS_ISSUER}/cdn-cgi/access/certs`)));
    await verify(token, keysets.get(env.ACCESS_ISSUER), { issuer: env.ACCESS_ISSUER, audience: env.ACCESS_AUD, algorithms: ['RS256'], requiredClaims: ['exp', 'iat', 'sub'] });
  } catch { return new Response('Authentication required.', { status: 401 }); }
  if (!['GET', 'HEAD'].includes(request.method) && request.headers.get('Origin') !== new URL(request.url).origin) return new Response('Origin rejected.', { status: 403 });
  return null;
}
