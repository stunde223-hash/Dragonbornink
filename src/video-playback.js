// Select a lighter stream on phones and connections that request less data.
export function filmSource(id) {
  const compact = id !== 'snake-floral' && (matchMedia('(max-width: 680px)').matches || navigator.connection?.saveData);
  return `/media/${id}${compact ? '-mobile' : ''}.mp4`;
}

export function setupScrollPlayback(video, dialog) {
  let inView = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const canPlay = () => inView && !document.hidden && !dialog.open;
  video.muted = true;

  function sync() {
    if (!canPlay()) {
      video.pause();
      return;
    }
    if (reducedMotion.matches || navigator.connection?.saveData || video.ended) return;
    // Autoplay can be declined by the browser. Native controls still work.
    const attempt = video.play();
    attempt?.catch(() => {});
  }

  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting && entry.intersectionRatio >= 0.25;
    sync();
  }, { threshold: [0, 0.25] });
  observer.observe(video);
  video.addEventListener('play', () => {
    // Also covers a pending play promise resolving after the user scrolls away.
    if (!canPlay()) video.pause();
  });
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => video.pause());
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) video.pause();
    else sync();
  });
  new MutationObserver(sync).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  return sync;
}
