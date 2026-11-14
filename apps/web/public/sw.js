// LanQin Email service worker.
//
// Its only job is to make system notifications work on browsers where the
// Notification constructor is illegal (Chrome on Android, WebViews):
// notifications are shown via ServiceWorkerRegistration.showNotification()
// and clicks are handled here. It deliberately does NOT cache anything, so
// it can never serve a stale app shell after a redeploy.

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target =
    (event.notification.data && event.notification.data.url) || "/"
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      for (const client of windows) {
        if (!("focus" in client)) continue
        await client.focus()
        if ("navigate" in client && client.url !== target) {
          try {
            await client.navigate(target)
          } catch {
            // Navigation can fail if the tab navigated meanwhile; the
            // focused tab still shows the mailbox, which is enough.
          }
        }
        return
      }
      await self.clients.openWindow(target)
    })()
  )
})
