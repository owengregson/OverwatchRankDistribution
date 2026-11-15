/** Short-lived messages shown in the corner of the screen. */
const LIFETIME_MS = 4200;

class Toasts {
  items = $state([]);
  #nextId = 1;

  #add(kind, message) {
    const id = this.#nextId++;
    this.items.push({ id, kind, message });
    setTimeout(() => this.dismiss(id), LIFETIME_MS);
  }

  success(message) {
    this.#add('success', message);
  }

  error(message) {
    this.#add('error', message);
  }

  dismiss(id) {
    this.items = this.items.filter((item) => item.id !== id);
  }
}

export const toasts = new Toasts();
