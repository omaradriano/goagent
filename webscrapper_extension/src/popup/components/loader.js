export class Loader {
  #container;

  constructor() {
    this.#container = document.createElement("div");
    this.#container.id = "loader-wrapper";
    this.#renderBase();
    document.body.prepend(this.#container);
  }

  #renderBase() {
    this.#container.innerHTML = `
      <div class="loader__overlay" id="loader-overlay" style="display: none;">
        <div class="loader__spinner"></div>
      </div>
    `;
  }

  show() {
    this.#container.querySelector("#loader-overlay").style.display = "flex";
  }

  close() {
    this.#container.querySelector("#loader-overlay").style.display = "none";
  }
}
