// Dapur Kilat — input. One clear job: turn keyboard, mouse and touch into
// one input shape the world steps with, and let a scripted pilot drive the
// same shape (so screenshots play by the real rules).

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseDown = false;
    this.mouse = { x: 0, y: 0 };
    this.target = null; // { x, y } canvas coords, click-to-move
    this.targetStation = null; // station id armed by clicking it
    this.interactPressed = false;
    this.clearPressed = false;
    this.pausePressed = false;
    this.mutePressed = false;
    this.startPressed = false;
    this.restartPressed = false;
    this.interactHeld = false;
    this._pressQueue = [];
    this.attach();
  }

  attach() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'KeyE' || e.code === 'Space') {
        this.interactPressed = true;
        this._pressQueue.push('interact');
        e.preventDefault();
      }
      if (e.code === 'KeyQ') this.clearPressed = true;
      if (e.code === 'KeyP' || e.code === 'Escape') this.pausePressed = true;
      if (e.code === 'KeyM') this.mutePressed = true;
      if (e.code === 'Enter') this.startPressed = true;
      if (e.code === 'KeyR') this.restartPressed = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    const toGame = (clientX, clientY) => {
      const r = this.canvas.getBoundingClientRect();
      return {
        x: ((clientX - r.left) / r.width) * 1280,
        y: ((clientY - r.top) / r.height) * 720,
      };
    };
    this.canvas.addEventListener('pointerdown', (e) => {
      this.mouseDown = true;
      const p = toGame(e.clientX, e.clientY);
      this.mouse = p;
      this.target = p;
      this.targetStation = null;
      this.interactPressed = true;
      this._pressQueue.push('interact');
    });
    this.canvas.addEventListener('pointermove', (e) => {
      const p = toGame(e.clientX, e.clientY);
      this.mouse = p;
      if (this.mouseDown) this.target = p;
    });
    window.addEventListener('pointerup', () => {
      this.mouseDown = false;
    });
  }

  // Fresh per-step input. Keyboard vector wins; otherwise walk to the click
  // target. Holding E / Space / mouse counts as holding interact.
  read() {
    let mx = 0;
    let my = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) my -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) my += 1;
    const held = this.keys.has('KeyE') || this.keys.has('Space') || this.mouseDown;
    const out = {
      mx,
      my,
      interactHeld: held,
      interactPressed: this.interactPressed,
      clearPressed: this.clearPressed,
      pausePressed: this.pausePressed,
      mutePressed: this.mutePressed,
      startPressed: this.startPressed,
      restartPressed: this.restartPressed,
      target: this.target,
      targetStation: this.targetStation,
    };
    this.interactPressed = false;
    this.clearPressed = false;
    this.pausePressed = false;
    this.mutePressed = false;
    this.startPressed = false;
    this.restartPressed = false;
    return out;
  }

  // The pilot (or a click) arms a station: walk to it, interact on arrival.
  armStation(stationId, point) {
    this.targetStation = stationId;
    this.target = point;
  }

  clearTarget() {
    this.target = null;
    this.targetStation = null;
  }

  // A click on a station arms it; a click on empty floor just walks there.
  // `stationAt` maps a point to a station id or null.
  clickAt(point, stationAt) {
    const id = stationAt(point);
    this.target = point;
    this.targetStation = id;
  }
}
