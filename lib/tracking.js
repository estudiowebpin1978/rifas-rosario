const CONSENT_KEY = 'eco_rifas_consent';

export function getConsent() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CONSENT_KEY) === 'true';
}

export function setConsent(value) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONSENT_KEY, value ? 'true' : 'false');
  if (value) loadTrackingScripts();
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

function loadScript(id, src, attrs = {}) {
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.src = src;
  s.async = true;
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.head.appendChild(s);
}

function loadScriptContent(id, content) {
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.textContent = content;
  document.head.appendChild(s);
}

export function loadTrackingScripts() {
  if (typeof window === 'undefined') return;

  if (GA_ID) {
    loadScript('gtag-base', `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);
    loadScriptContent('gtag-init', `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA_ID}');
    `);
  }

  if (META_PIXEL_ID) {
    loadScriptContent('fbq-init', `
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
      (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${META_PIXEL_ID}');
      fbq('track', 'PageView');
    `);
  }

  if (TIKTOK_PIXEL_ID) {
    loadScriptContent('ttq-init', `
      !function(w,d,e,t){if(w.ttq)return;w.ttq=function(){w.ttq.exec?w.ttq.exec
      (w.ttq.callQueue):w.ttq.callQueue.push(arguments)};w.ttq.callQueue=[];
      w.ttq.exec=function(e){return"function"==typeof e?e(w.ttq):void 0};
      var s=d.createElement(e);s.async=!0;s.src=t;
      var g=d.getElementsByTagName(e)[0];g.parentNode.insertBefore(s,g)}
      (window,document,'script','https://analytics.tiktok.com/i18n/pixel/events.js');
      ttq.init('${TIKTOK_PIXEL_ID}');
      ttq.page();
    `);
  }
}

export function trackEvent(name, params = {}) {
  if (typeof window === 'undefined') return;
  if (!getConsent()) return;

  try {
    if (typeof gtag === 'function') {
      gtag('event', name, params);
    }
  } catch {}

  try {
    if (typeof fbq === 'function') {
      fbq('track', name, params);
    }
  } catch {}

  try {
    if (typeof ttq === 'function') {
      ttq.track(name, params);
    }
  } catch {}
}

export function trackPurchase(value, currency = 'ARS', items = []) {
  trackEvent('Purchase', { value, currency, items });
  try { if (typeof fbq === 'function') fbq('track', 'Purchase', { value, currency }); } catch {}
}

export function trackAddToCart(contentId, value, currency = 'ARS') {
  trackEvent('AddToCart', { content_id: contentId, value, currency });
}

export function trackCompleteRegistration(method = 'email') {
  trackEvent('CompleteRegistration', { method });
}

export function trackLead() {
  trackEvent('Lead');
}

export function trackViewContent(contentId, contentType, value, currency = 'ARS') {
  trackEvent('ViewContent', { content_id: contentId, content_type: contentType, value, currency });
}
