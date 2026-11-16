const storage = {
  async getItem(key: string) {
    return window.localStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    window.localStorage.setItem(key, value);
  },
  async removeItem(key: string) {
    window.localStorage.removeItem(key);
  }
};
export default storage;
