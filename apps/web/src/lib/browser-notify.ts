// System notifications for new mail.
//
// Chrome on Android (and several WebViews) make the Notification constructor
// itself illegal — notifications must go through
// ServiceWorkerRegistration.showNotification(). This module registers a
// minimal service worker (apps/web/public/sw.js, notification clicks only,
// no offline caching) and prefers the service-worker path, falling back to
// the legacy constructor where that is all a browser supports. Every failure
// is swallowed: a missed system notification must never break the mail page,
// and the in-page toast remains the primary surface.

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null

function loadRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return Promise.resolve(null)
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker.register("/sw.js").catch(() => null)
  }
  return registrationPromise
}

export function registerMailServiceWorker() {
  if (!("serviceWorker" in navigator)) return
  if (document.readyState === "complete") {
    void loadRegistration()
    return
  }
  window.addEventListener("load", () => void loadRegistration(), {
    once: true,
  })
}

export type BrowserNotificationOptions = {
  body?: string
  tag?: string
  url?: string
  icon?: string
}

export async function showBrowserNotification(
  title: string,
  options: BrowserNotificationOptions,
  onLegacyClick?: () => void
): Promise<void> {
  const icon = options.icon ?? "/icons/icon.svg"
  try {
    const registration = await loadRegistration()
    if (registration) {
      await registration.showNotification(title, {
        body: options.body,
        tag: options.tag,
        icon,
        data: { url: options.url ?? window.location.href },
      })
      return
    }
  } catch {
    // Fall through to the legacy constructor below.
  }
  try {
    const notification = new Notification(title, {
      body: options.body,
      tag: options.tag,
      icon,
    })
    if (onLegacyClick) {
      notification.onclick = () => {
        window.focus()
        onLegacyClick()
        notification.close()
      }
    }
  } catch {
    // Unsupported environment (e.g. Android without a service worker):
    // stay silent, the in-page toast already surfaced the new mail.
  }
}
