export function showNotification(options) {
  const notification = document.createElement("div");
  const checkIcon = chrome.runtime.getURL("icons/checkicon.png");
  const warningIcon = chrome.runtime.getURL("icons/alert.png");
  const deleteIcon = chrome.runtime.getURL("icons/close.png");
  const loadingIcon = chrome.runtime.getURL("icons/loading_spinner.gif");

  const iconsMap = {
    loading: loadingIcon,
    warning: warningIcon,
    done: checkIcon,
  };

  notification.setAttribute("data-notification-id", options.notification_id);
  notification.setAttribute("id", "tempnotificationpopup");

  notification.innerHTML = `
    <img class="extension__img" src="${iconsMap[options.type] || loadingIcon}"/>
    <div class="content">
      ${
        options.status === "success"
          ? `
        <p class="message">${options.message}</p>
        <span class="submessage">${options.submessage}</span>
        ${
          options.interruptible
            ? `<button type="button" class="interruptSync">Interrumpir carga</button>`
            : ""
        }
      `
          : `
        <p class="message">Ha ocurrido un error</p>
        <span class="submessage">Contacte con soporte</span>
      `
      }
    </div>
    <span class="closeNotification">
      <img src="${deleteIcon}"/>
    </span>
  `;

  notification.classList.add("notification");
  notification
    .querySelector(".closeNotification")
    .addEventListener("click", () => notification.remove());

  const interruptBtn = notification.querySelector(".interruptSync");
  if (interruptBtn) {
    interruptBtn.addEventListener("click", () => {
      interruptBtn.disabled = true;
      interruptBtn.textContent = "Deteniendo...";
      chrome.runtime.sendMessage({ action: "interrupt-sync" });
    });
  }

  document.body.appendChild(notification);
}

export function removeNotification(notificationId) {
  const el = document.querySelector(
    `[data-notification-id="${notificationId}"]`,
  );
  if (el) el.remove();
}

export function genNotificationId() {
  const arr = new Uint8Array(4);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
