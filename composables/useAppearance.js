import { computed, reactive } from "vue"
import { getCurrentUserSettings, saveCurrentUserSettings } from "../utils/storage"

const FONT_MULTIPLIER_MAP = {
  small: 0.9,
  medium: 1,
  large: 1.12
}

const THEME_NAV_MAP = {
  fresh: { backgroundColor: "#1f7a4d", frontColor: "#ffffff" },
  ocean: { backgroundColor: "#1f4f9b", frontColor: "#ffffff" },
  night: { backgroundColor: "#121a2f", frontColor: "#ffffff" }
}

const appearanceState = reactive({
  theme: "fresh",
  fontSize: "medium",
  fontMultiplier: 1
})

function syncDocumentAppearance() {
  if (typeof document === "undefined") {
    return
  }

  const root = document.documentElement
  root.classList.remove("theme-fresh", "theme-ocean", "theme-night")
  root.classList.add(`theme-${appearanceState.theme}`)
  root.setAttribute("data-theme", appearanceState.theme)
  root.style.setProperty("--font-size-multiplier", String(appearanceState.fontMultiplier))
  root.style.setProperty("--app-scale", String(appearanceState.fontMultiplier))
}

function syncNativeAppearance() {
  if (typeof uni === "undefined") {
    return
  }

  const nav = THEME_NAV_MAP[appearanceState.theme] || THEME_NAV_MAP.fresh

  if (typeof uni.setNavigationBarColor === "function") {
    uni.setNavigationBarColor({
      frontColor: nav.frontColor,
      backgroundColor: nav.backgroundColor
    })
  }

  if (typeof uni.setTabBarStyle === "function") {
    uni.setTabBarStyle({
      backgroundColor: appearanceState.theme === "night" ? "#11182a" : "#ffffff",
      color: appearanceState.theme === "night" ? "#94a3b8" : "#7a7e83",
      selectedColor: appearanceState.theme === "night" ? "#66d8a8" : "#2b7a4b",
      borderStyle: appearanceState.theme === "night" ? "white" : "black"
    })
  }
}

function updateAppearanceState(nextTheme, nextFontSize) {
  appearanceState.theme = ["fresh", "ocean", "night"].includes(nextTheme) ? nextTheme : "fresh"
  appearanceState.fontSize = ["small", "medium", "large"].includes(nextFontSize) ? nextFontSize : "medium"
  appearanceState.fontMultiplier = FONT_MULTIPLIER_MAP[appearanceState.fontSize] || 1

  syncDocumentAppearance()
  syncNativeAppearance()
}

export function loadAndApplyAppearance() {
  const settings = getCurrentUserSettings()
  updateAppearanceState(settings.theme, settings.fontSize)
  return {
    ...appearanceState
  }
}

export function applyAppearance(theme, fontSize) {
  updateAppearanceState(theme, fontSize)
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
    fontSize: computed(() => appearanceState.fontSize),
    fontMultiplier: computed(() => appearanceState.fontMultiplier),
    loadAndApplyAppearance,
    applyAppearance,
    saveAndApplyAppearance
  }
}
