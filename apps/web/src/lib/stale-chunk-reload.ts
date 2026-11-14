// After a redeploy, pages that were loaded from the previous build keep
// referencing hashed JS chunks that no longer exist on the server. Loading
// one of those lazy chunks then fails with "Failed to fetch dynamically
// imported module" and the router error boundary whites out the page.
// Reloading once picks up the fresh index.html and its new chunk names.
// A timestamp guard keeps a genuinely broken deploy from looping forever.

const RELOAD_MARK_KEY = "lanqin:stale-chunk-reload-at"
const RELOAD_GUARD_MS = 15_000

function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_MARK_KEY) ?? 0)
    if (Number.isFinite(last) && Date.now() - last < RELOAD_GUARD_MS) return
    sessionStorage.setItem(RELOAD_MARK_KEY, String(Date.now()))
  } catch {
    // Storage unavailable (private mode etc.): still reload; the browser
    // event itself fires at most once per failed navigation in practice.
  }
  window.location.reload()
}

function isStaleChunkError(value: unknown): boolean {
  const message = value instanceof Error ? value.message : typeof value === "string" ? value : ""
  return /failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module/i.test(
    message
  )
}

export function installStaleChunkReload() {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault()
    reloadOnce()
  })
  window.addEventListener("unhandledrejection", (event) => {
    if (isStaleChunkError(event.reason)) reloadOnce()
  })
  window.addEventListener(
    "error",
    (event) => {
      if (isStaleChunkError(event.message)) reloadOnce()
    },
    true
  )
}
