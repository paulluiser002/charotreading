const measurementId = 'G-XE6T7Y5VCY';
const enabled = !['localhost', '127.0.0.1', '[::1]', '::1'].includes(window.location.hostname);

if (enabled) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.append(script);
}

export function track(name, parameters = {}) {
  // Measurement must never interrupt a reading when Google is blocked or unavailable.
  try { if (enabled) window.gtag?.('event', name, parameters); } catch {}
}
