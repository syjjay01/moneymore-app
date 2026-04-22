import {
  getUserList,
  getUserData,
  saveUserList,
  setUserData,
  setCurrentUser,
  removeStorageSync
} from "./storage"

const BACKUP_FILE_PREFIX = "moneymore-backup"
const USER_DATA_KEY_PREFIX = "data_"

function wrapAsync(api, options = {}) {
  return new Promise((resolve, reject) => {
    api({
      ...options,
      success: resolve,
      fail: reject
    })
  })
}

function formatDateLabel(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  const second = String(date.getSeconds()).padStart(2, "0")
  return `${year}${month}${day}-${hour}${minute}${second}`
}

function getDefaultAppVersion() {
  // H5/小程序下通常拿不到运行时版本号，这里给出兜底值。
  if (typeof plus !== "undefined" && plus.runtime) {
    return plus.runtime.version || "unknown"
  }
  return "1.0.0"
}

function downloadInH5(jsonText, fileName) {
  const blob = new Blob([jsonText], { type: "application/json;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function writeByFsManager(jsonText, fileName) {
  const fs = uni.getFileSystemManager ? uni.getFileSystemManager() : null
  const userDataPath = uni.env && uni.env.USER_DATA_PATH
  if (!fs || !userDataPath) {
    return Promise.reject(new Error("当前平台不支持 getFileSystemManager 写文件"))
  }

  const filePath = `${userDataPath}/${fileName}`
  return new Promise((resolve, reject) => {
    fs.writeFile({
      filePath,
      data: jsonText,
      encoding: "utf8",
      success: () => resolve(filePath),
      fail: reject
    })
  })
}

function writeByPlusIO(jsonText, fileName) {
  if (typeof plus === "undefined" || !plus.io) {
    return Promise.reject(new Error("当前平台不支持 plus.io 写文件"))
  }

  return new Promise((resolve, reject) => {
    plus.io.requestFileSystem(
      plus.io.PRIVATE_DOC,
      (fs) => {
        fs.root.getFile(
          fileName,
          { create: true },
          (entry) => {
            entry.createWriter(
              (writer) => {
                writer.onwrite = () => resolve(entry.toLocalURL())
                writer.onerror = reject
                writer.write(jsonText)
              },
              reject
            )
          },
          reject
        )
      },
      reject
    )
  })
}

async function trySaveOrShareFile(filePath) {
  // 1) 小程序优先 saveFile
  if (typeof uni.saveFile === "function") {
    try {
      const saved = await wrapAsync(uni.saveFile, { tempFilePath: filePath })
      return {
        mode: "saveFile",
        filePath: saved.savedFilePath || filePath
      }
    } catch (error) {
      // 忽略，继续尝试分享
    }
  }

  // 2) App 端使用系统分享
  if (typeof plus !== "undefined" && plus.share && plus.share.sendWithSystem) {
    await new Promise((resolve, reject) => {
      plus.share.sendWithSystem(
        {
          type: "file",
          files: [filePath]
        },
        resolve,
        reject
      )
    })
    return {
      mode: "share",
      filePath
    }
  }

  return {
    mode: "none",
    filePath
  }
}

export function buildBackupPayload(appVersion = getDefaultAppVersion()) {
  const users = getUserList()
  const allUserData = {}

  users.forEach((user) => {
    const username = user.username
    allUserData[username] = getUserData(username) || null
  })

  return {
    exportTime: new Date().toISOString(),
    appVersion,
    users,
    allUserData
  }
}

export async function exportBackupFile(appVersion) {
  const payload = buildBackupPayload(appVersion)
  const jsonText = JSON.stringify(payload, null, 2)
  const fileName = `${BACKUP_FILE_PREFIX}-${formatDateLabel()}.json`

  // H5 无法直接使用 uni.writeFile，这里采用浏览器下载。
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    downloadInH5(jsonText, fileName)
    return {
      mode: "download",
      filePath: fileName
    }
  }

  // 小程序优先走 fsManager，App 端回退到 plus.io。
  let filePath = ""
  try {
    filePath = await writeByFsManager(jsonText, fileName)
  } catch (error) {
    filePath = await writeByPlusIO(jsonText, fileName)
  }

  return trySaveOrShareFile(filePath)
}

function validateBackupData(data) {
  if (!data || typeof data !== "object") {
    throw new Error("备份文件不是有效对象")
  }
  if (!Array.isArray(data.users)) {
    throw new Error("备份文件缺少 users 列表")
  }
  if (!data.allUserData || typeof data.allUserData !== "object") {
    throw new Error("备份文件缺少 allUserData")
  }
}

async function chooseBackupFile() {
  // H5 推荐 chooseFile；小程序/App 优先 chooseMessageFile。
  if (typeof uni.chooseMessageFile === "function") {
    try {
      const messageRes = await wrapAsync(uni.chooseMessageFile, {
        count: 1,
        type: "file",
        extension: ["json"]
      })
      if (messageRes.tempFiles && messageRes.tempFiles.length) {
        return messageRes.tempFiles[0]
      }
    } catch (error) {
      // 忽略，继续尝试 chooseFile
    }
  }

  if (typeof uni.chooseFile === "function") {
    const fileRes = await wrapAsync(uni.chooseFile, {
      count: 1,
      extension: ["json"]
    })
    if (fileRes.tempFiles && fileRes.tempFiles.length) {
      return fileRes.tempFiles[0]
    }
  }

  throw new Error("当前平台不支持文件选择")
}

function readH5FileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = reject
    reader.readAsText(file, "utf-8")
  })
}

function readByFs(filePath) {
  const fs = uni.getFileSystemManager ? uni.getFileSystemManager() : null
  if (!fs || !filePath) {
    return Promise.reject(new Error("当前平台不支持文件读取"))
  }

  return new Promise((resolve, reject) => {
    fs.readFile({
      filePath,
      encoding: "utf8",
      success: (res) => resolve(String(res.data || "")),
      fail: reject
    })
  })
}

async function readBackupJsonText(fileInfo) {
  // H5 的 tempFiles[0] 通常带 file 对象。
  if (fileInfo.file) {
    return readH5FileText(fileInfo.file)
  }

  const filePath = fileInfo.path || fileInfo.tempFilePath || ""
  return readByFs(filePath)
}

export async function pickAndParseBackup() {
  const fileInfo = await chooseBackupFile()
  const jsonText = await readBackupJsonText(fileInfo)
  const parsed = JSON.parse(jsonText)
  validateBackupData(parsed)
  return parsed
}

export function applyBackupData(backupData) {
  validateBackupData(backupData)

  const currentUsers = getUserList()
  currentUsers.forEach((user) => {
    if (user && user.username) {
      removeStorageSync(`${USER_DATA_KEY_PREFIX}${user.username}`)
    }
  })

  saveUserList(backupData.users)
  backupData.users.forEach((user) => {
    const username = user.username
    setUserData(username, backupData.allUserData[username] || {})
  })

  // 导入后清空登录态，让用户重新登录，避免旧会话引用无效数据。
  setCurrentUser()
}
