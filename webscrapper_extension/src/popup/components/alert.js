export class Alert {
  #container;

  constructor() {
    this.callback = null;
    this.secondcallback = null;
    this.#container = document.createElement("div");
    this.#container.id = "alert-wrapper";
    this.#renderBase();
    document.body.prepend(this.#container);
    this.#bindCloseEvent();
  }

  #renderBase() {
    this.#container.innerHTML = `
      <div class="alert__container" id="alert-overlay" style="display: none; position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.5); z-index: 9999;">
        <div class="alert">
          <div class="alert__header">
            <h3 class="alert__title" id="alert-title-text"></h3>
            <i class="fa-solid fa-xmark" id="btn__close-modal" style="cursor:pointer"></i>
          </div>
          <div class="alert__body">
            <p class="alert__details" id="alert-message-text"></p>
          </div>
          <div class="alert__footer">
            <div class="alert__option_btns" id="alert-buttons-container"></div>
          </div>
        </div>
      </div>
    `;
  }

  #bindCloseEvent() {
    this.#container
      .querySelector("#btn__close-modal")
      .addEventListener("click", () => this.close());
  }

  #renderButtons() {
    const container = this.#container.querySelector(
      "#alert-buttons-container",
    );
    container.innerHTML = "";

    const btnCancel = document.createElement("div");
    btnCancel.className = "btn btn--danger";
    btnCancel.textContent = "Cancelar";
    btnCancel.onclick = () => this.close();
    container.appendChild(btnCancel);

    if (this.callback) {
      const btnAccept = document.createElement("div");
      btnAccept.className = "btn btn--default";
      btnAccept.textContent = "Aceptar";
      btnAccept.onclick = () => {
        this.callback();
        this.close();
      };
      container.appendChild(btnAccept);
    }

    if (this.secondcallback) {
      const btnSync = document.createElement("div");
      btnSync.className = "btn btn--warning";
      btnSync.textContent = "Sincronizar";
      btnSync.onclick = () => {
        this.secondcallback();
        this.close();
      };
      container.appendChild(btnSync);
    }
  }

  show(title, message, callback = null, secondcallback = null) {
    this.#container.querySelector("#alert-title-text").textContent = title;
    this.#container.querySelector("#alert-message-text").textContent = message;
    this.callback = callback;
    this.secondcallback = secondcallback;
    this.#renderButtons();
    this.#container.querySelector("#alert-overlay").style.display = "flex";
  }

  close() {
    this.#container.querySelector("#alert-overlay").style.display = "none";
  }
}
