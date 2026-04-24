import { computed, reactive } from "vue"
import { getCurrentUserSettings, saveCurrentUserSettings } from "../utils/storage"

const FONT_SIZE_VALUE_MAP = {
  small: "12px",
  medium: "14px",
  large: "16px"
}

const THEME_NAV_MAP = {
  fresh: { backgroundColor: "#2f8f63", frontColor: "#ffffff" },
  ocean: { backgroundColor: "#5c7bbf", frontColor: "#ffffff" }
}

const THEME_VAR_MAP = {
  fresh: {
    "--color-primary": "#32936f",
    "--color-danger": "#de675a",
    "--text-primary": "#1d3340",
    "--text-secondary": "#6d818d",
    "--bg-page": "#f6fbf8",
    "--bg-card": "#ffffff",
    "--bg-soft": "#edf6f1",
    "--line-soft": "rgba(29, 51, 64, 0.08)",
    "--shadow-card": "0 14rpx 34rpx rgba(24, 45, 66, 0.07)",
    "--app-page-gradient": "radial-gradient(circle at 12% 8%, rgba(50, 147, 111, 0.16), transparent 34%), linear-gradient(176deg, #f6fcf9 0%, #f0f7f5 42%, #fbfcfd 100%)"
  },
  ocean: {
    "--color-primary": "#6d84be",
    "--color-danger": "#db786a",
    "--text-primary": "#26334f",
    "--text-secondary": "#7a86a4",
    "--bg-page": "#f5f7fc",
    "--bg-card": "linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 248, 255, 0.96) 100%)",
    "--bg-soft": "#eef2fb",
    "--line-soft": "rgba(38, 51, 79, 0.1)",
    "--shadow-card": "0 18rpx 42rpx rgba(68, 86, 130, 0.12)",
    "--app-page-gradient": "radial-gradient(circle at 14% 10%, rgba(109, 132, 190, 0.18), transparent 34%), linear-gradient(176deg, #f8f9fe 0%, #f1f4fb 46%, #fbfbfe 100%)"
  }
}

const appearanceState = reactive({
  theme: "fresh",
  fontSize: "medium",
  fontSizeValue: FONT_SIZE_VALUE_MAP.medium
})

function buildFontOverrideCss(fontSizeValue) {
  return `
page, page *,
.uni-page, .uni-page *,
.uni-page-body, .uni-page-body *,
view, text, button, input, textarea, picker, label,
uni-view, uni-text, uni-button, uni-input, uni-textarea, uni-picker, uni-label,
.uni-input-input, .uni-easyinput__content-input, .uni-textarea-textarea {
  font-size: ${fontSizeValue} !important;
}
`
}

function applyFontOverrideStyle(doc, fontSizeValue) {
  if (!doc) {
    return
  }

  try {
    let styleEl = doc.getElementById("mm-font-override-style")
    if (!styleEl) {
      styleEl = doc.createElement("style")
      styleEl.id = "mm-font-override-style"
      doc.head && doc.head.appendChild(styleEl)
    }
    styleEl.textContent = buildFontOverrideCss(fontSizeValue)
  } catch (error) {
    console.warn("[appearance] applyFontOverrideStyle failed:", error)
  }
}

function applyAppearanceVarsToElement(el) {
  if (!el || !el.classList || !el.style) {
    return
  }

  el.classList.remove("theme-fresh", "theme-ocean")
  el.classList.add(`theme-${appearanceState.theme}`)
  if (typeof el.setAttribute === "function") {
    el.setAttribute("data-theme", appearanceState.theme)
  }

  const themeVars = THEME_VAR_MAP[appearanceState.theme] || THEME_VAR_MAP.fresh
  Object.keys(themeVars).forEach((key) => {
    el.style.setProperty(key, themeVars[key])
  })

  el.style.setProperty("--font-size-multiplier", "1")
  el.style.setProperty("--app-scale", "1")
  el.style.setProperty("--font-size-base", appearanceState.fontSizeValue)
}

function syncDocumentAppearance() {
  if (typeof document === "undefined") {
    return
  }

  applyAppearanceVarsToElement(document.documentElement)
  applyAppearanceVarsToElement(document.body)
  applyAppearanceVarsToElement(document.getElementById("app"))
  applyAppearanceVarsToElement(document.querySelector(".uni-app"))
  applyAppearanceVarsToElement(document.querySelector(".uni-page-body"))

  const wrappers = document.querySelectorAll(".uni-page-wrapper")
  wrappers.forEach((el) => applyAppearanceVarsToElement(el))
}

function syncNativeAppearance() {
  if (typeof uni === "undefined") {
    return
  }

  const nav = THEME_NAV_MAP[appearanceState.theme] || THEME_NAV_MAP.fresh

  if (typeof uni.setNavigationBarColor === "function") {
    try {
      uni.setNavigationBarColor({
        frontColor: nav.frontColor,
        backgroundColor: nav.backgroundColor
      })
    } catch (error) {
      console.warn("[appearance] setNavigationBarColor failed:", error)
    }
  }

  if (typeof uni.setTabBarStyle === "function") {
    try {
      uni.setTabBarStyle({
        backgroundColor: "#ffffff",
        color: appearanceState.theme === "ocean" ? "#7b88a6" : "#7a8693",
        selectedColor: appearanceState.theme === "ocean" ? "#5c7bbf" : "#2f8f63",
        borderStyle: "black"
      })
    } catch (error) {
      console.warn("[appearance] setTabBarStyle failed:", error)
    }
  }

  if (typeof uni.setBackgroundColor === "function") {
    try {
      uni.setBackgroundColor({
        backgroundColor: appearanceState.theme === "ocean" ? "#f4f7fd" : "#f5faf7",
        backgroundColorTop: appearanceState.theme === "ocean" ? "#f4f7fd" : "#f5faf7",
        backgroundColorBottom: appearanceState.theme === "ocean" ? "#f4f7fd" : "#f5faf7"
      })
    } catch (error) {
      console.warn("[appearance] setBackgroundColor failed:", error)
    }
  }
}

function applyAppearancePayload(payload) {
  if (typeof document === "undefined") {
    return
  }
  try {
    applyFontOverrideStyle(document, payload.fontSizeValue)

    const targets = [
      document.documentElement,
      document.body,
      document.getElementById("app"),
      document.querySelector(".uni-app"),
      document.querySelector(".uni-page-body")
    ]
    const wrappers = document.querySelectorAll(".uni-page-wrapper")
    wrappers.forEach((el) => targets.push(el))

    const applyTo = (el) => {
      if (!el || !el.classList || !el.style) {
        return
      }
      el.classList.remove("theme-fresh", "theme-ocean")
      el.classList.add(`theme-${payload.theme}`)
      if (typeof el.setAttribute === "function") {
        el.setAttribute("data-theme", payload.theme)
      }
      Object.keys(payload.themeVars || {}).forEach((key) => {
        el.style.setProperty(key, payload.themeVars[key])
      })
      el.style.setProperty("--font-size-multiplier", "1")
      el.style.setProperty("--app-scale", "1")
      el.style.setProperty("--font-size-base", payload.fontSizeValue)
    }

    targets.forEach((el) => applyTo(el))
  } catch (error) {
    console.warn("[appearance] applyAppearancePayload failed:", error)
  }
}

function syncAppPlusWebviews() {
  // #ifdef APP-PLUS
  const payload = {
    theme: appearanceState.theme,
    fontSizeValue: appearanceState.fontSizeValue,
    themeVars: THEME_VAR_MAP[appearanceState.theme] || THEME_VAR_MAP.fresh
  }
  const nav = THEME_NAV_MAP[appearanceState.theme] || THEME_NAV_MAP.fresh
  const fontCss = buildFontOverrideCss(payload.fontSizeValue)
  const payloadJson = JSON.stringify(payload)
  const fontCssJson = JSON.stringify(fontCss)

  const runSync = () => {
    try {
      if (typeof plus === "undefined" || !plus?.webview) {
        return
      }

      const allWebviews = plus.webview.all() || []
      const script = `;(() => {
  try {
    const p = ${payloadJson}
    const fontCss = ${fontCssJson}
    window.__MM_APPEARANCE__ = p

    let styleEl = document.getElementById("mm-font-override-style")
    if (!styleEl) {
      styleEl = document.createElement("style")
      styleEl.id = "mm-font-override-style"
      document.head && document.head.appendChild(styleEl)
    }
    styleEl.textContent = fontCss

    const targets = [document.documentElement, document.body, document.getElementById("app"), document.querySelector(".uni-app"), document.querySelector(".uni-page-body")]
    const wrappers = document.querySelectorAll(".uni-page-wrapper")
    wrappers.forEach((el) => targets.push(el))

    const applyTo = (el) => {
      if (!el || !el.classList || !el.style) return
      el.classList.remove("theme-fresh", "theme-ocean")
      el.classList.add("theme-" + p.theme)
      if (typeof el.setAttribute === "function") el.setAttribute("data-theme", p.theme)
      Object.keys(p.themeVars || {}).forEach((k) => el.style.setProperty(k, p.themeVars[k]))
      el.style.setProperty("--font-size-multiplier", "1")
      el.style.setProperty("--app-scale", "1")
      el.style.setProperty("--font-size-base", p.fontSizeValue)
    }

    targets.forEach(applyTo)
  } catch (e) {}
})();`

      allWebviews.forEach((webviewItem) => {
        try {
          webviewItem.evalJS(script)
          webviewItem.setStyle({
            background: payload.themeVars["--bg-page"],
            titleNView: {
              backgroundColor: nav.backgroundColor,
              titleColor: nav.frontColor
            }
          })
        } catch (error) {
          console.warn("[appearance] sync webview failed:", error)
        }
      })
    } catch (error) {
      console.warn("[appearance] syncAppPlusWebviews failed:", error)
    }
  }

  if (typeof plus === "undefined") {
    if (typeof document !== "undefined") {
      document.addEventListener("plusready", runSync, { once: true })
    }
  } else {
    runSync()
  }
  // #endif
}

function runSyncWithRetry() {
  const payload = {
    theme: appearanceState.theme,
    fontSizeValue: appearanceState.fontSizeValue,
    themeVars: THEME_VAR_MAP[appearanceState.theme] || THEME_VAR_MAP.fresh
  }

  applyAppearancePayload(payload)
  syncDocumentAppearance()
  syncNativeAppearance()
  syncAppPlusWebviews()

  ;[80, 180, 360, 640].forEach((delay) => {
    setTimeout(() => {
      applyAppearancePayload(payload)
      syncDocumentAppearance()
      syncNativeAppearance()
      syncAppPlusWebviews()
    }, delay)
  })
}

function updateAppearanceState(nextTheme, nextFontSize) {
  appearanceState.theme = ["fresh", "ocean"].includes(nextTheme) ? nextTheme : "fresh"
  appearanceState.fontSize = ["small", "medium", "large"].includes(nextFontSize) ? nextFontSize : "medium"
  appearanceState.fontSizeValue = FONT_SIZE_VALUE_MAP[appearanceState.fontSize] || FONT_SIZE_VALUE_MAP.medium

  runSyncWithRetry()
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
    fontSizeValue: computed(() => appearanceState.fontSizeValue),
    loadAndApplyAppearance,
    applyAppearance,
    saveAndApplyAppearance
  }
}
