const params = new URLSearchParams(window.location.search);
const rawLanguage = (params.get("lang") || navigator.language || "en").toLowerCase();
const language = rawLanguage.startsWith("ko") ? "ko" : "en";
const token = params.get("token") || "";

const UI = {
  ko: {
    title: "중복 다운로드 감지",
    defaultMessage: "중복 다운로드를 차단했습니다.\n계속 진행할지 선택하세요.",
    continueLabel: "계속",
    cancelLabel: "취소",
    continueFailed: "다운로드를 다시 시작하지 못했습니다.",
  },
  en: {
    title: "Possible duplicate download detected",
    defaultMessage: "The duplicate download was blocked.\nChoose whether to continue.",
    continueLabel: "Continue",
    cancelLabel: "Cancel",
    continueFailed: "Failed to restart the download.",
  },
};

const text = UI[language] || UI.en;
const message = params.get("message") || text.defaultMessage;

document.documentElement.lang = language;

const titleElement = document.getElementById("title");
const messageElement = document.getElementById("message");
const continueButton = document.getElementById("continueButton");
const cancelButton = document.getElementById("cancelButton");

if (titleElement) {
  titleElement.textContent = text.title;
}

if (messageElement) {
  messageElement.textContent = message;
}

if (continueButton) {
  continueButton.textContent = text.continueLabel;
}

if (cancelButton) {
  cancelButton.textContent = text.cancelLabel;
}

function closeWindow() {
  window.close();
}

function setSubmitting(value) {
  if (continueButton) continueButton.disabled = value;
  if (cancelButton) cancelButton.disabled = value;
}

function buildFailureMessage(errorText) {
  if (!errorText) return text.continueFailed;
  return `${text.continueFailed}\n${errorText}`;
}

async function choose(decision) {
  if (!token) {
    closeWindow();
    return;
  }

  setSubmitting(true);

  try {
    const response = await chrome.runtime.sendMessage({
      type: "NODUPDOWNLOAD_DUPLICATE_DECISION",
      token,
      decision,
    });

    if (decision === "continue" && !response?.ok) {
      setSubmitting(false);
      window.alert(buildFailureMessage(response?.error || ""));
      return;
    }

    closeWindow();
  } catch (error) {
    if (decision === "continue") {
      const detail = error instanceof Error ? error.message : String(error || "");
      setSubmitting(false);
      window.alert(buildFailureMessage(detail));
      return;
    }

    closeWindow();
  }
}

continueButton?.addEventListener("click", () => {
  void choose("continue");
});

cancelButton?.addEventListener("click", () => {
  void choose("cancel");
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    void choose("cancel");
  }
});
