/** Node에는 localStorage가 없으므로 테스트에서 쓰는 메모리 Storage. 브라우저와 같은 인터페이스다. */
export class MemoryStorage implements Storage {
  #items = new Map<string, string>()

  get length() {
    return this.#items.size
  }

  clear() {
    this.#items.clear()
  }

  getItem(key: string) {
    return this.#items.get(key) ?? null
  }

  key(index: number) {
    return [...this.#items.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.#items.delete(key)
  }

  setItem(key: string, value: string) {
    this.#items.set(key, String(value))
  }
}
