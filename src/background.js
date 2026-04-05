const MAX_HISTORY_ITEMS = 5000;
const DECISION_TTL_MS = 5 * 60 * 1000;

const completedByFileKey = new Map();
const completedByUrlKey = new Map();

const activeFileKeyById = new Map();
const activeUrlKeyById = new Map();
const activeFileKeyCounts = new Map();
const activeUrlKeyCounts = new Map();
const downloadTabIdByDownloadId = new Map();

const alertedDownloadIds = new Set();
const pendingDecisionByToken = new Map();
const allowOnceSignatures = new Map();

const MESSAGES = {
  ko: {
    decisionTitle: "중복 다운로드 감지",
    duplicateDetected: "중복 다운로드 가능성이 감지되었습니다.",
    unknownFile: "이름을 확인할 수 없는 파일",
    reasonFileName: "유사한 파일명",
    reasonUrl: "동일 다운로드 URL",
    fileLabel: "파일",
    reasonLabel: "근거",
    previousDateLabel: "이전 다운로드 일자",
    unknownDate: "확인 불가",
    continueLabel: "계속",
    cancelLabel: "취소",
    continueFailed: "다운로드를 다시 시작하지 못했습니다.",
  },
  en: {
    decisionTitle: "Possible duplicate download detected",
    duplicateDetected: "Possible duplicate download detected.",
    unknownFile: "Unknown filename",
    reasonFileName: "similar filename",
    reasonUrl: "same download URL",
    fileLabel: "File",
    reasonLabel: "Reason",
    previousDateLabel: "Previous download date",
    unknownDate: "Unknown",
    continueLabel: "Continue",
    cancelLabel: "Cancel",
    continueFailed: "Failed to restart the download.",
  },
};

function incrementCount(map, key) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function decrementCount(map, key) {
  if (!key) return;

  const current = map.get(key) || 0;
  if (current <= 1) {
    map.delete(key);
    return;
  }

  map.set(key, current - 1);
}

function consumeCount(map, key) {
  if (!key) return false;

  const current = map.get(key) || 0;
  if (current <= 0) return false;

  if (current === 1) {
    map.delete(key);
  } else {
    map.set(key, current - 1);
  }

  return true;
}

function resolveLanguage() {
  const uiLanguage = chrome.i18n?.getUILanguage?.() || "en";
  return uiLanguage.toLowerCase().startsWith("ko") ? "ko" : "en";
}

function getMessageSet(language) {
  return MESSAGES[language] || MESSAGES.en;
}

function getLeafFilename(rawFilename) {
  if (!rawFilename) return "";
  return rawFilename.split(/[\\/]/).pop() || "";
}

function toDownloadFilename(rawFilename) {
  const filename = getLeafFilename(rawFilename).trim();
  return filename || "";
}

function normalizeFilename(rawFilename) {
  const name = getLeafFilename(rawFilename);
  if (!name) return "";

  const dotIndex = name.lastIndexOf(".");
  const ext = dotIndex > 0 ? name.slice(dotIndex).toLowerCase() : "";
  let stem = dotIndex > 0 ? name.slice(0, dotIndex) : name;

  stem = stem.replace(/\s\(\d+\)$/, "").trim().toLowerCase();
  return stem ? `${stem}${ext}` : "";
}

function normalizeUrl(rawUrl) {
  if (!rawUrl) return "";

  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    const path = url.pathname.replace(/\/+$/, "").toLowerCase();
    return `${host}${path}`;
  } catch {
    return rawUrl.toLowerCase();
  }
}

function makeDownloadSignature(fileKey, urlKey) {
  if (!fileKey && !urlKey) return "";
  return `${fileKey}::${urlKey}`;
}

function updateActiveKey(idToKeyMap, keyCountMap, downloadId, nextKey) {
  const prevKey = idToKeyMap.get(downloadId) || "";
  if (prevKey === nextKey) return;

  if (prevKey) {
    decrementCount(keyCountMap, prevKey);
  }

  if (nextKey) {
    idToKeyMap.set(downloadId, nextKey);
    incrementCount(keyCountMap, nextKey);
  } else {
    idToKeyMap.delete(downloadId);
  }
}

function clearActiveTracking(downloadId) {
  const fileKey = activeFileKeyById.get(downloadId) || "";
  const urlKey = activeUrlKeyById.get(downloadId) || "";

  if (fileKey) {
    decrementCount(activeFileKeyCounts, fileKey);
    activeFileKeyById.delete(downloadId);
  }

  if (urlKey) {
    decrementCount(activeUrlKeyCounts, urlKey);
    activeUrlKeyById.delete(downloadId);
  }

  downloadTabIdByDownloadId.delete(downloadId);
  alertedDownloadIds.delete(downloadId);
}

function getDownloadTimestamp(item) {
  const raw = item?.endTime || item?.startTime;
  if (!raw) return null;

  const timestamp = Date.parse(raw);
  if (Number.isNaN(timestamp)) return null;

  return timestamp;
}

function formatTimestamp(timestamp, language) {
  if (!Number.isFinite(timestamp)) return "";

  const locale = language === "ko" ? "ko-KR" : "en-US";

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleString(locale);
  }
}

function getStat(map, key) {
  if (!key) return null;
  return map.get(key) || null;
}

function upsertCompletedStat(map, key, timestamp) {
  if (!key) return;

  const stat = map.get(key) || { count: 0, lastTimestamp: null };
  stat.count += 1;

  if (Number.isFinite(timestamp)) {
    if (!Number.isFinite(stat.lastTimestamp) || timestamp > stat.lastTimestamp) {
      stat.lastTimestamp = timestamp;
    }
  }

  map.set(key, stat);
}

function getCompletedCount(map, key) {
  return getStat(map, key)?.count || 0;
}

function recordCompletedItem(item) {
  const fileKey = normalizeFilename(item.filename);
  const urlKey = normalizeUrl(item.finalUrl || item.url);
  const timestamp = getDownloadTimestamp(item);

  upsertCompletedStat(completedByFileKey, fileKey, timestamp);
  upsertCompletedStat(completedByUrlKey, urlKey, timestamp);
}

function getPreviousDownloadTimestamp(fileKey, urlKey, fileDuplicate, urlDuplicate) {
  const candidates = [];

  if (fileDuplicate) {
    const fileTimestamp = getStat(completedByFileKey, fileKey)?.lastTimestamp;
    if (Number.isFinite(fileTimestamp)) {
      candidates.push(fileTimestamp);
    }
  }

  if (urlDuplicate) {
    const urlTimestamp = getStat(completedByUrlKey, urlKey)?.lastTimestamp;
    if (Number.isFinite(urlTimestamp)) {
      candidates.push(urlTimestamp);
    }
  }

  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

function searchDownloads(options) {
  return new Promise((resolve, reject) => {
    chrome.downloads.search(options, (items) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(items);
    });
  });
}

function queryActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(tabs[0] || null);
    });
  });
}

function sendMessageToTab(tabId, payload) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

function isIgnorableCancelError(message) {
  const normalized = String(message || "").toLowerCase();

  return (
    normalized.includes("download must be in progress") ||
    normalized.includes("invalid operation")
  );
}

function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error || "");
}

async function cancelDownload(downloadId) {
  const [item] = await searchDownloads({ id: downloadId });

  if (!item || item.state !== "in_progress") {
    return;
  }

  try {
    await chrome.downloads.cancel(downloadId);
    return;
  } catch (error) {
    const message = getErrorMessage(error);
    if (isIgnorableCancelError(message)) {
      return;
    }
  }

  return new Promise((resolve, reject) => {
    chrome.downloads.cancel(downloadId, () => {
      if (chrome.runtime.lastError) {
        const message = chrome.runtime.lastError.message || "";

        if (isIgnorableCancelError(message)) {
          resolve();
          return;
        }

        reject(new Error(message));
        return;
      }

      resolve();
    });
  });
}

function startDownload(options) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(options, (id) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (typeof id !== "number") {
        reject(new Error("Failed to start download."));
        return;
      }

      resolve(id);
    });
  });
}

function shouldRetryWithoutFilename(error) {
  const message = String(error?.message || error).toLowerCase();

  return (
    message.includes("filename") ||
    message.includes("path") ||
    message.includes("file") ||
    message.includes("not found")
  );
}

async function startDuplicateDownload(pending) {
  const baseOptions = {
    url: pending.url,
    saveAs: false,
    conflictAction: "uniquify",
  };

  if (pending.suggestedFilename) {
    try {
      return await startDownload({
        ...baseOptions,
        filename: pending.suggestedFilename,
      });
    } catch (error) {
      if (!shouldRetryWithoutFilename(error)) {
        throw error;
      }

      console.warn(
        "[NoDupDownload] Retry download without filename due to path/filename error:",
        error
      );
    }
  }

  return startDownload(baseOptions);
}

function createDecisionToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createDecisionWindow(message, language, token) {
  return new Promise((resolve, reject) => {
    const url = chrome.runtime.getURL(
      `ui/alert.html?lang=${encodeURIComponent(
        language
      )}&token=${encodeURIComponent(token)}&message=${encodeURIComponent(message)}`
    );

    chrome.windows.create(
      {
        url,
        type: "popup",
        width: 500,
        height: 280,
      },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve();
      }
    );
  });
}

function scheduleDecisionExpiry(token) {
  setTimeout(() => {
    pendingDecisionByToken.delete(token);
  }, DECISION_TTL_MS);
}

async function tryShowDecisionOverlay(tabId, payload) {
  if (typeof tabId !== "number") return false;

  try {
    const response = await sendMessageToTab(tabId, payload);
    return response?.shown === true;
  } catch {
    return false;
  }
}

async function showDecisionPrompt(token, message, language, preferredTabId) {
  const messageSet = getMessageSet(language);

  const payload = {
    type: "NODUPDOWNLOAD_SHOW_DECISION_OVERLAY",
    token,
    title: messageSet.decisionTitle,
    message,
    continueLabel: messageSet.continueLabel,
    cancelLabel: messageSet.cancelLabel,
    continueFailed: messageSet.continueFailed,
  };

  if (await tryShowDecisionOverlay(preferredTabId, payload)) {
    return;
  }

  try {
    const activeTab = await queryActiveTab();
    const activeTabId = typeof activeTab?.id === "number" ? activeTab.id : null;

    if (
      activeTabId !== preferredTabId &&
      (await tryShowDecisionOverlay(activeTabId, payload))
    ) {
      return;
    }
  } catch {
    // Fallback handled below.
  }

  await createDecisionWindow(message, language, token);
}

async function hydrateCompletedHistory() {
  completedByFileKey.clear();
  completedByUrlKey.clear();

  try {
    const items = await searchDownloads({
      state: "complete",
      limit: MAX_HISTORY_ITEMS,
    });

    for (const item of items) {
      recordCompletedItem(item);
    }
  } catch (error) {
    console.error("[NoDupDownload] Failed to hydrate history:", error);
  }
}

async function markComplete(downloadId) {
  try {
    const [item] = await searchDownloads({ id: downloadId });
    if (!item) return;

    recordCompletedItem(item);
  } catch (error) {
    console.error("[NoDupDownload] Failed to update complete cache:", error);
  }
}

function buildAlertMessage(
  item,
  fileDuplicate,
  urlDuplicate,
  language,
  fileKey,
  urlKey
) {
  const messageSet = getMessageSet(language);
  const displayName = getLeafFilename(item.filename) || messageSet.unknownFile;
  const reasons = [];

  if (fileDuplicate) reasons.push(messageSet.reasonFileName);
  if (urlDuplicate) reasons.push(messageSet.reasonUrl);

  const previousTimestamp = getPreviousDownloadTimestamp(
    fileKey,
    urlKey,
    fileDuplicate,
    urlDuplicate
  );
  const previousDateText =
    formatTimestamp(previousTimestamp, language) || messageSet.unknownDate;

  return [
    messageSet.duplicateDetected,
    `${messageSet.fileLabel}: ${displayName}`,
    `${messageSet.reasonLabel}: ${reasons.join(", ")}`,
    `${messageSet.previousDateLabel}: ${previousDateText}`,
  ].join("\n");
}

async function blockDuplicateDownload(
  item,
  fileDuplicate,
  urlDuplicate,
  language,
  signature,
  fileKey,
  urlKey,
  preferredTabId
) {
  const token = createDecisionToken();
  const url = item.finalUrl || item.url || "";

  pendingDecisionByToken.set(token, {
    url,
    suggestedFilename: toDownloadFilename(item.filename),
    signature,
    expiresAt: Date.now() + DECISION_TTL_MS,
  });
  scheduleDecisionExpiry(token);

  try {
    await cancelDownload(item.id);
  } catch (error) {
    console.error("[NoDupDownload] Failed to cancel duplicate download:", error);
  }

  try {
    await showDecisionPrompt(
      token,
      buildAlertMessage(item, fileDuplicate, urlDuplicate, language, fileKey, urlKey),
      language,
      preferredTabId
    );
  } catch (error) {
    pendingDecisionByToken.delete(token);
    console.error("[NoDupDownload] Failed to show decision prompt:", error);
  }
}

async function handleDuplicateDecision(message) {
  const token = message?.token;
  const decision = message?.decision;

  if (!token || (decision !== "continue" && decision !== "cancel")) {
    return { continued: false };
  }

  const pending = pendingDecisionByToken.get(token);
  if (!pending) {
    if (decision === "continue") {
      throw new Error("Decision expired. Start the download again.");
    }

    return { continued: false };
  }

  if (pending.expiresAt <= Date.now()) {
    pendingDecisionByToken.delete(token);
    throw new Error("Decision expired. Start the download again.");
  }

  pendingDecisionByToken.delete(token);

  if (decision !== "continue") {
    return { continued: false };
  }

  if (!pending.url) {
    throw new Error("No download URL is available.");
  }

  if (pending.signature) {
    incrementCount(allowOnceSignatures, pending.signature);
  }

  try {
    const downloadId = await startDuplicateDownload(pending);
    return { continued: true, downloadId };
  } catch (error) {
    if (pending.signature) {
      consumeCount(allowOnceSignatures, pending.signature);
    }
    throw error;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void hydrateCompletedHistory();
});

chrome.runtime.onStartup.addListener(() => {
  void hydrateCompletedHistory();
});

chrome.downloads.onCreated.addListener((item) => {
  void queryActiveTab()
    .then((activeTab) => {
      if (activeTab && typeof activeTab.id === "number") {
        downloadTabIdByDownloadId.set(item.id, activeTab.id);
      }
    })
    .catch(() => {
      // Ignore mapping failures.
    });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "NODUPDOWNLOAD_DUPLICATE_DECISION") {
    return undefined;
  }

  void handleDuplicateDecision(message)
    .then((result) => {
      sendResponse({ ok: true, ...result });
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    });

  return true;
});

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  const fileKey = normalizeFilename(item.filename);
  const urlKey = normalizeUrl(item.finalUrl || item.url);
  const signature = makeDownloadSignature(fileKey, urlKey);
  const language = resolveLanguage();
  const preferredTabId = downloadTabIdByDownloadId.get(item.id);

  updateActiveKey(activeFileKeyById, activeFileKeyCounts, item.id, fileKey);
  updateActiveKey(activeUrlKeyById, activeUrlKeyCounts, item.id, urlKey);

  if (signature && consumeCount(allowOnceSignatures, signature)) {
    suggest();
    return true;
  }

  const fileDuplicate =
    (fileKey && getCompletedCount(completedByFileKey, fileKey) > 0) ||
    (fileKey && (activeFileKeyCounts.get(fileKey) || 0) > 1);

  const urlDuplicate =
    (urlKey && getCompletedCount(completedByUrlKey, urlKey) > 0) ||
    (urlKey && (activeUrlKeyCounts.get(urlKey) || 0) > 1);

  if ((fileDuplicate || urlDuplicate) && !alertedDownloadIds.has(item.id)) {
    alertedDownloadIds.add(item.id);

    setTimeout(() => {
      void blockDuplicateDownload(
        item,
        fileDuplicate,
        urlDuplicate,
        language,
        signature,
        fileKey,
        urlKey,
        preferredTabId
      );
    }, 0);
  }

  suggest();
  return true;
});

chrome.downloads.onChanged.addListener((delta) => {
  const downloadId = delta.id;

  if (delta.filename?.current) {
    const nextFileKey = normalizeFilename(delta.filename.current);
    updateActiveKey(activeFileKeyById, activeFileKeyCounts, downloadId, nextFileKey);
  }

  if (delta.finalUrl?.current || delta.url?.current) {
    const nextUrlKey = normalizeUrl(delta.finalUrl?.current || delta.url?.current);
    updateActiveKey(activeUrlKeyById, activeUrlKeyCounts, downloadId, nextUrlKey);
  }

  if (!delta.state?.current) return;

  if (delta.state.current === "complete") {
    void markComplete(downloadId);
    clearActiveTracking(downloadId);
    return;
  }

  if (delta.state.current === "interrupted") {
    clearActiveTracking(downloadId);
  }
});

void hydrateCompletedHistory();
