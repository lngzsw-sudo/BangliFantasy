// Thin WebSocket wrapper: JSON messages keyed by `t`, simple pub/sub.
export class Net {
  constructor() {
    this.handlers = new Map();
    this.ws = null;
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(fn);
  }

  emit(type, msg) {
    for (const fn of this.handlers.get(type) ?? []) fn(msg);
  }

  connect() {
    if (this.ws) {
      // Silence and drop a previous socket (e.g. retry after a login error).
      this.ws.onopen = this.ws.onclose = this.ws.onmessage = null;
      this.ws.close();
    }
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.ws.onopen = () => this.emit('open');
    this.ws.onclose = () => this.emit('close');
    this.ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      this.emit(msg.t, msg);
    };
  }

  send(t, data = {}) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ t, ...data }));
  }
}
