import { computed, reactive } from "vue"
import { getCurrentUserSettings, saveCurrentUserSettings } from "../utils/storage"

const FONT_MULTIPLIER_MAP = {
  small: 0.9,
  medium: 1,
  large: 1.1
}

const appearanceState = reactive({
  theme: "system",
  resolvedTheme: "light",
  fontSize: "medium",
  fontMultiplier: 1
})

let mediaQuery = null
let mediaListener = null
let uniThemeListenerRegistered = false

function getSystemTheme() {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }

  return "light"
}

function resolveTheme(theme) {
  if (theme === "system") {
    return getSystemTheme()
  }

  return theme === "dark" ? "dark" : "light"
}

function syncDocumentAppearance() {
  if (typeof document === "undefined") {
    return
  }

  const root = document.documentElement
  root.classList.remove("theme-light", "theme-dark")
  root.classList.add(`theme-${appearanceState.resolvedTheme}`)
  root.setAttribute("data-theme", appearanceState.resolvedTheme)
  root.style.setProperty("--font-size-multiplier", String(appearanceState.fontMultiplier))
}

function updateAppearanceState(nextTheme, nextFontSize) {
  appearanceState.theme = ["light", "dark", "system"].includes(nextTheme) ? nextTheme : "system"
  appearanceState.fontSize = ["small", "medium", "large"].includes(nextFontSize) ? nextFontSize : "medium"
  appearanceState.fontMultiplier = FONT_MULTIPLIER_MAP[appearanceState.fontSize] || 1
  appearanceState.resolvedTheme = resolveTheme(appearanceState.theme)
  syncDocumentAppearance()
}

function stopSystemThemeWatcher() {
  if (!mediaQuery || !mediaListener) {
    return
  }

  if (mediaQuery.removeEventListener) {
    mediaQuery.removeEventListener("change", mediaListener)
  } else if (mediaQuery.removeListener) {
    mediaQuery.removeListener(mediaListener)
  }

  mediaQuery = null
  mediaListener = null
}

function startSystemThemeWatcher() {
  stopSystemThemeWatcher()

  if (appearanceState.theme !== "system") {
    return
  }

  if (typeof window === "undefined" || !window.matchMedia) {
    if (
      typeof uni !== "undefined" &&
      typeof uni.onThemeChange === "function" &&
      !uniThemeListenerRegistered
    ) {
      uni.onThemeChange(() => {
        if (appearanceState.theme !== "system") {
          return
        }
        appearanceState.resolvedTheme = resolveTheme("system")
        syncDocumentAppearance()
      })
      uniThemeListenerRegistered = true
    }
    return
  }

  mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  mediaListener = () => {
    appearanceState.resolvedTheme = resolveTheme("system")
    syncDocumentAppearance()
  }

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", mediaListener)
  } else if (mediaQuery.addListener) {
    mediaQuery.addListener(mediaListener)
  }
}

export function loadAndApplyAppearance() {
  const settings = getCurrentUserSettings()
  updateAppearanceState(settings.theme, settings.fontSize)
  startSystemThemeWatcher()
  return {
    ...appearanceState
  }
}

export function applyAppearance(theme, fontSize) {
  updateAppearanceState(theme, fontSize)
  startSystemThemeWatcher()
}

export function saveAndApplyAppearance(theme, fontSize) {
  const saved = saveCurrentUserSettings({
    theme,
    fontSize
  })

  if (saved) {
    applyAppearance(theme, fontSize)
  }

  return saved
}

export function useAppearance() {
  return {
    theme: computed(() => appearanceState.theme),
    resolvedTheme: computed(() => appearanceState.resolvedTheme),
    fontSize: computed(() => appearanceState.fontSize),
    fontMultiplier: computed(() => appearanceState.fontMultiplier),
    loadAndApplyAppearance,
    applyAppearance,
    saveAndApplyAppearance
  }
}
