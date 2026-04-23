const STORAGE_KEYS = {
  USER_LIST: "app_users",
  CURRENT_USER: "current_user",
  USER_DATA_PREFIX: "data_"
}

const THEME_MODES = ["fresh", "ocean", "night"]
const FONT_SIZE_LEVELS = ["small", "medium", "large"]

export function getStorageSync(key) {
  if (!key) return null
  try {
    const value = uni.getStorageSync(key)
    return value === "" ? null : value
  } catch (error) {
    console.error("[storage] getStorageSync error:", error)
    return null
  }
}

export function setStorageSync(key, value) {
  if (!key) return false
  try {
    uni.setStorageSync(key, value)
    return true
  } catch (error) {
    console.error("[storage] setStorageSync error:", error)
    return false
  }
}

export function removeStorageSync(key) {
  if (!key) return false
  try {
    uni.removeStorageSync(key)
    return true
  } catch (error) {
    console.error("[storage] removeStorageSync error:", error)
    return false
  }
}

function getUserDataKey(username) {
  return `${STORAGE_KEYS.USER_DATA_PREFIX}${username}`
}

export function getUserData(username) {
  if (!username) return null
  return getStorageSync(getUserDataKey(username))
}

export function setUserData(username, data) {
  if (!username) return false
  return setStorageSync(getUserDataKey(username), data || {})
}

export function removeUserData(username) {
  if (!username) return false
  return removeStorageSync(getUserDataKey(username))
}

export function getUserList() {
  const list = getStorageSync(STORAGE_KEYS.USER_LIST)
  return Array.isArray(list) ? list : []
}

export function saveUserList(list) {
  if (!Array.isArray(list)) return false
  return setStorageSync(STORAGE_KEYS.USER_LIST, list)
}

export function getUserByUsername(username) {
  if (!username) return null
  return getUserList().find((item) => item.username === username) || null
}

export function getCurrentUser() {
  return getStorageSync(STORAGE_KEYS.CURRENT_USER)
}

export function clearCurrentUser() {
  return removeStorageSync(STORAGE_KEYS.CURRENT_USER)
}

export function setCurrentUser(username) {
  if (!username) return clearCurrentUser()
  return setStorageSync(STORAGE_KEYS.CURRENT_USER, username)
}

export function getCurrentUserData() {
  const username = getCurrentUser()
  if (!username) return null
  return getUserData(username)
}

export function createDefaultUserData(username) {
  return {
    username,
    incomeItems: [
      { id: "income_salary", name: "工资", type: "fixed", defaultAmount: 0 },
      { id: "income_sideline", name: "副业", type: "variable", defaultAmount: 0 },
      { id: "income_other", name: "其他", type: "other", defaultAmount: 0 }
    ],
    fixedExpenseItems: [
      { id: "fixed_mortgage", name: "房贷", defaultAmount: 0 },
      { id: "fixed_support", name: "赡养费", defaultAmount: 0 },
      { id: "fixed_utilities", name: "水电费", defaultAmount: 0 },
      { id: "fixed_property", name: "物业费", defaultAmount: 0 },
      { id: "fixed_network", name: "宽带话费", defaultAmount: 0 },
      { id: "fixed_education", name: "小孩教育费", defaultAmount: 0 }
    ],
    expenseTags: [
      { id: "tag_food", name: "吃饭" },
      { id: "tag_grocery", name: "买菜" },
      { id: "tag_fun", name: "娱乐" },
      { id: "tag_snack", name: "零食" },
      { id: "tag_household", name: "家庭耗材" },
      { id: "tag_clothes", name: "衣鞋类" },
      { id: "tag_transport", name: "出行类" }
    ],
    transactions: [],
    settings: {
      monthlyBudget: 5000,
      theme: "fresh",
      fontSize: "medium"
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

function normalizeTheme(theme) {
  return THEME_MODES.includes(theme) ? theme : "fresh"
}

function normalizeFontSize(fontSize) {
  return FONT_SIZE_LEVELS.includes(fontSize) ? fontSize : "medium"
}

function normalizeSettings(settings = {}) {
  const budgetRaw = Number(settings.monthlyBudget ?? settings.monthly_budget ?? 5000)
  const monthlyBudget = Number.isNaN(budgetRaw) ? 5000 : budgetRaw

  return {
    ...settings,
    monthlyBudget,
    monthly_budget: monthlyBudget,
    theme: normalizeTheme(settings.theme),
    fontSize: normalizeFontSize(settings.fontSize)
  }
}

export function registerUser({ username, passwordHash, salt }) {
  const userList = getUserList()

  if (userList.some((item) => item.username === username)) {
    return {
      success: false,
      message: "用户名已存在"
    }
  }

  const nextUser = {
    username,
    passwordHash,
    salt,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  const saved = saveUserList([...userList, nextUser])
  const initialized = setUserData(username, createDefaultUserData(username))

  return {
    success: saved && initialized,
    message: saved && initialized ? "注册成功" : "注册失败",
    user: saved && initialized ? nextUser : null
  }
}

export function updateUserPassword(username, passwordHash, salt) {
  const userList = getUserList()
  const index = userList.findIndex((item) => item.username === username)

  if (index === -1) {
    return false
  }

  const nextList = [...userList]
  nextList[index] = {
    ...nextList[index],
    passwordHash,
    salt,
    updatedAt: Date.now()
  }

  return saveUserList(nextList)
}

export function deleteUserAccount(username) {
  if (!username) return false

  const saved = saveUserList(getUserList().filter((item) => item.username !== username))
  const removed = removeUserData(username)

  if (getCurrentUser() === username) {
    clearCurrentUser()
  }

  return saved && removed
}

export function updateUserData(username, updater) {
  if (!username) return false

  const currentData = getUserData(username) || createDefaultUserData(username)
  const nextData = typeof updater === "function" ? updater(currentData) : updater

  return setUserData(username, {
    ...nextData,
    updatedAt: Date.now()
  })
}

export function getUserSettings(username) {
  if (!username) {
    return normalizeSettings()
  }

  const userData = getUserData(username)
  return normalizeSettings(userData?.settings || {})
}

export function saveUserSettings(username, nextSettings) {
  if (!username || !nextSettings || typeof nextSettings !== "object") {
    return false
  }

  return updateUserData(username, (userData) => {
    const mergedSettings = normalizeSettings({
      ...(userData?.settings || {}),
      ...nextSettings
    })

    return {
      ...userData,
      settings: mergedSettings
    }
  })
}

export function getCurrentUserSettings() {
  const username = getCurrentUser()
  return getUserSettings(username)
}

export function saveCurrentUserSettings(nextSettings) {
  const username = getCurrentUser()
  if (!username) {
    return false
  }

  return saveUserSettings(username, nextSettings)
}

export function saveUserTransaction(username, transaction) {
  if (!username || !transaction) return false

  return updateUserData(username, (userData) => ({
    ...userData,
    transactions: [...(userData.transactions || []), transaction]
  }))
}

export function upsertMonthlyTransaction(username, transaction, keyName) {
  if (!username || !transaction || !keyName || !transaction[keyName]) {
    return false
  }

  return updateUserData(username, (userData) => {
    const transactions = [...(userData.transactions || [])]
    const targetMonth = String(transaction.date || "").slice(0, 7)
    const matchIndex = transactions.findIndex((item) => {
      if (!item || item.type !== transaction.type) {
        return false
      }

      if (item[keyName] !== transaction[keyName]) {
        return false
      }

      return String(item.date || "").slice(0, 7) === targetMonth
    })

    if (matchIndex > -1) {
      transactions[matchIndex] = {
        ...transactions[matchIndex],
        ...transaction,
        id: transactions[matchIndex].id,
        createdAt: transactions[matchIndex].createdAt,
        updatedAt: Date.now()
      }
    } else {
      transactions.push(transaction)
    }

    return {
      ...userData,
      transactions
    }
  })
}

export function replaceUserCollection(username, key, list) {
  if (!username || !key || !Array.isArray(list)) {
    return false
  }

  return updateUserData(username, (userData) => ({
    ...userData,
    [key]: list
  }))
}

export function updateUserTransaction(username, transactionId, updater) {
  if (!username || !transactionId) {
    return false
  }

  return updateUserData(username, (userData) => ({
    ...userData,
    transactions: (userData.transactions || []).map((item) => {
      if (item.id !== transactionId) {
        return item
      }

      const nextItem = typeof updater === "function" ? updater(item) : updater
      return {
        ...item,
        ...nextItem,
        id: item.id,
        updatedAt: Date.now()
      }
    })
  }))
}

export function removeUserTransaction(username, transactionId) {
  if (!username || !transactionId) {
    return false
  }

  return updateUserData(username, (userData) => ({
    ...userData,
    transactions: (userData.transactions || []).filter((item) => item.id !== transactionId)
  }))
}
