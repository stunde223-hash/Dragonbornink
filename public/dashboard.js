const status = document.querySelector('#status');
const list = document.querySelector('#videos');
const more = document.querySelector('#more');
let cursor;
async function api(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) { let message = 'Request failed. Check your sign-in and try again.'; try { message = (await response.json()).error || message; } catch {} throw new Error(message); }
  return response;
}
async function load(append = false) {
  const response = await api('/api/admin/videos' + (append && cursor ? '?cursor=' + encodeURIComponent(cursor) : ''));
  const data = await response.json(); if (!append) list.replaceChildren();
  for (const item of data.videos) {
    const article = document.createElement('article');
    const title = document.createElement('h2'); title.textContent = item.name;
    const video = document.createElement('video'); video.controls = true; video.preload = 'none'; video.src = '/api/admin/videos?key=' + encodeURIComponent(item.key); video.setAttribute('aria-label', item.name);
    const info = document.createElement('p'); info.textContent = `${(item.size / 1048576).toFixed(1)} MiB · ${new Date(item.uploaded).toLocaleDateString()}`;
    const remove = document.createElement('button'); remove.textContent = 'Delete video';
    remove.onclick = async () => { if (!confirm(`Permanently delete “${item.name}”?`)) return; remove.disabled = true; try { await api(video.src, { method: 'DELETE' }); video.pause(); article.remove(); status.textContent = 'Video deleted.'; } catch (error) { status.textContent = error.message; remove.disabled = false; } };
    article.append(title, video, info, remove); list.append(article);
  }
  cursor = data.cursor; more.hidden = !cursor;
  if (!list.children.length) status.textContent = 'No videos uploaded yet.';
}
document.querySelector('#upload').onsubmit = async event => {
  event.preventDefault(); const form = event.currentTarget; const file = document.querySelector('#video').files[0];
  if (!file || !['video/mp4', 'video/webm'].includes(file.type) || file.size > 50 * 1048576 || !file.size) { status.textContent = 'Choose an MP4 or WebM video up to 50 MiB.'; return; }
  const button = form.querySelector('button'); button.disabled = true; status.textContent = 'Uploading… Keep this page open.';
  try { await api('/api/admin/videos?name=' + encodeURIComponent(file.name), { method: 'POST', headers: { 'Content-Type': file.type }, body: file }); form.reset(); await load(); status.textContent = 'Video uploaded privately.'; }
  catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; }
};
more.onclick = () => load(true).catch(error => status.textContent = error.message);
load().catch(error => status.textContent = error.message);
