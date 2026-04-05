const OVERLAY_ID = "nodupdownload-overlay";
let currentOverlay = null;

function removeOverlay() {
  if (!currentOverlay) return;

  currentOverlay.root.remove();
  window.removeEventListener("keydown", currentOverlay.onKeyDown, true);
  currentOverlay = null;
}

function setSubmitting(isSubmitting) {
  if (!currentOverlay) return;
  currentOverlay.continueButton.disabled = isSubmitting;
  currentOverlay.cancelButton.disabled = isSubmitting;
}

function showError(message) {
  if (!currentOverlay) return;

  currentOverlay.errorBox.textContent = message;
  currentOverlay.errorBox.style.display = "block";
}

function createOverlay(payload) {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) {
    existing.remove();
  }

  const root = document.createElement("div");
  root.id = OVERLAY_ID;
  root.style.position = "fixed";
  root.style.inset = "0";
  root.style.zIndex = "2147483647";
  root.style.display = "flex";
  root.style.alignItems = "center";
  root.style.justifyContent = "center";
  root.style.background = "rgba(0, 0, 0, 0.35)";
  root.style.padding = "16px";
  root.style.boxSizing = "border-box";

  const card = document.createElement("div");
  card.style.width = "min(480px, 100%)";
  card.style.background = "#fff";
  card.style.borderRadius = "12px";
  card.style.boxShadow = "0 14px 40px rgba(0, 0, 0, 0.26)";
  card.style.padding = "18px";
  card.style.color = "#1f2937";
  card.style.fontFamily =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const title = document.createElement("h2");
  title.textContent = payload.title || "Duplicate download detected";
  title.style.margin = "0 0 10px";
  title.style.fontSize = "18px";

  const message = document.createElement("p");
  message.textContent = payload.message || "";
  message.style.margin = "0";
  message.style.whiteSpace = "pre-wrap";
  message.style.lineHeight = "1.45";

  const errorBox = document.createElement("p");
  errorBox.style.display = "none";
  errorBox.style.margin = "12px 0 0";
  errorBox.style.color = "#b91c1c";
  errorBox.style.whiteSpace = "pre-wrap";
  errorBox.style.lineHeight = "1.4";

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.justifyContent = "flex-end";
  actions.style.gap = "8px";
  actions.style.marginTop = "16px";

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = payload.cancelLabel || "Cancel";
  cancelButton.style.border = "1px solid #d1d5db";
  cancelButton.style.background = "#fff";
  cancelButton.style.color = "#111827";
  cancelButton.style.borderRadius = "8px";
  cancelButton.style.padding = "8px 14px";
  cancelButton.style.cursor = "pointer";

  const continueButton = document.createElement("button");
  continueButton.type = "button";
  continueButton.textContent = payload.continueLabel || "Continue";
  continueButton.style.border = "1px solid #1d4ed8";
  continueButton.style.background = "#1d4ed8";
  continueButton.style.color = "#fff";
  continueButton.style.borderRadius = "8px";
  continueButton.style.padding = "8px 14px";
  continueButton.style.cursor = "pointer";

  actions.appendChild(cancelButton);
  actions.appendChild(continueButton);

  card.appendChild(title);
  card.appendChild(message);
  card.appendChild(errorBox);
  card.appendChild(actions);
  root.appendChild(card);

  document.documentElement.appendChild(root);

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      void choose("cancel");
    }
  };

  currentOverlay = {
    root,
    continueButton,
    cancelButton,
    errorBox,
    token: payload.token || "",
    continueFailed: payload.continueFailed || "Failed to restart the download.",
    onKeyDown,
  };

  window.addEventListener("keydown", onKeyDown, true);

  async function choose(decision) {
    if (!currentOverlay?.token) {
      removeOverlay();
      return;
    }

    setSubmitting(true);

    try {
      const response = await chrome.runtime.sendMessage({
        type: "NODUPDOWNLOAD_DUPLICATE_DECISION",
        token: currentOverlay.token,
        decision,
      });

      if (decision === "continue" && !response?.ok) {
        setSubmitting(false);
        const detail = response?.error ? `\n${response.error}` : "";
        showError(`${currentOverlay.continueFailed}${detail}`);
        return;
      }

      removeOverlay();
    } catch (error) {
      if (decision === "continue") {
        setSubmitting(false);
        const detail = error instanceof Error ? error.message : String(error || "");
        const detailText = detail ? `\n${detail}` : "";
        showError(`${currentOverlay.continueFailed}${detailText}`);
        return;
      }

      removeOverlay();
    }
  }

  continueButton.addEventListener("click", () => {
    void choose("continue");
  });

  cancelButton.addEventListener("click", () => {
    void choose("cancel");
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "NODUPDOWNLOAD_SHOW_DECISION_OVERLAY") {
    return undefined;
  }

  removeOverlay();
  createOverlay(message);
  sendResponse({ shown: true });
  return false;
});
