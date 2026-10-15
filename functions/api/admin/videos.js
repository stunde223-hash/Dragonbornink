const maxBytes = 50 * 1024 * 1024;
const validKey = key => /^videos\/[a-f0-9-]{36}\.(mp4|webm)$/.test(key || '');
const json = (data, status = 200) => Response.json(data, { status });
export async function onRequest({ request, env }) {
  if (!env.VIDEOS) return json({ error: 'Video storage is not configured.' }, 503);
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (request.method === 'GET') {
    if (key) {
      if (!validKey(key)) return json({ error: 'Invalid video.' }, 400);
      const object = await env.VIDEOS.get(key, { range: request.headers });
      if (!object) return json({ error: 'Video not found.' }, 404);
      const headers = new Headers({ 'Content-Type': object.httpMetadata?.contentType || 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
      if (object.range) {
        const offset = object.range.offset ?? Math.max(0, object.size - object.range.suffix);
        const length = object.range.length ?? object.size - offset;
        headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
        headers.set('Content-Length', String(length));
      } else headers.set('Content-Length', String(object.size));
      return new Response(object.body, { status: object.range ? 206 : 200, headers });
    }
    const result = await env.VIDEOS.list({ prefix: 'videos/', limit: 100, cursor: url.searchParams.get('cursor') || undefined, include: ['customMetadata'] });
    return json({ videos: result.objects.map(o => ({ key: o.key, name: o.customMetadata?.name || o.key, size: o.size, uploaded: o.uploaded })), cursor: result.truncated ? result.cursor : null });
  }
  if (request.method === 'POST') {
    const type = request.headers.get('Content-Type');
    if (!['video/mp4', 'video/webm'].includes(type)) return json({ error: 'Choose an MP4 or WebM video.' }, 415);
    if (Number(request.headers.get('Content-Length')) > maxBytes) return json({ error: 'Maximum file size is 50 MiB.' }, 413);
    if (!request.body) return json({ error: 'Empty video.' }, 400);
    const reader = request.body.getReader(); const chunks = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > maxBytes) { await reader.cancel(); return json({ error: 'Maximum file size is 50 MiB.' }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const mp4 = size >= 12 && new TextDecoder().decode(bytes.slice(4, 8)) === 'ftyp';
    const webm = size >= 4 && [0x1a, 0x45, 0xdf, 0xa3].every((v, i) => bytes[i] === v);
    if (!(type === 'video/mp4' ? mp4 : webm)) return json({ error: 'The file does not match the selected video format.' }, 400);
    const key = `videos/${crypto.randomUUID()}.${mp4 ? 'mp4' : 'webm'}`;
    const name = (url.searchParams.get('name') || 'Untitled video').slice(0, 180).replace(/[\u0000-\u001f]/g, '');
    await env.VIDEOS.put(key, bytes, { httpMetadata: { contentType: type }, customMetadata: { name } });
    return json({ key }, 201);
  }
  if (request.method === 'DELETE') {
    if (!validKey(key)) return json({ error: 'Invalid video.' }, 400);
    await env.VIDEOS.delete(key); return new Response(null, { status: 204 });
  }
  return new Response('Method not allowed.', { status: 405, headers: { Allow: 'GET, POST, DELETE' } });
}
