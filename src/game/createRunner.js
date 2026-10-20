import { Runner } from './vendor/dino_game/offline';
import { runtime } from './vendor/dino_game/runtime';
import { playDeskSound } from '../components/DeskScene';
import { spriteMask, tintSprite } from './spriteTint';

// Chromium owns the simulation. The portfolio owns its input, presentation and lifecycle.
Runner.prototype.loadSounds = function () {};
Runner.prototype.createTouchController = function () {};
Runner.prototype.startListening = function () {};
Runner.prototype.stopListening = function () {};
Runner.prototype.isArcadeMode = function () { return false; };
Runner.prototype.isCanvasInView = function () { return true; };
Runner.prototype.setArcadeMode = function () {};
Runner.prototype.setArcadeModeContainerScale = function () {};
Runner.prototype.handleCanvasKeyPress = function () {};
Runner.prototype.toggleSpeed = function () {};
Runner.prototype.showSpeedToggle = function () {};
Runner.prototype.startGame = function () {
  this.runningTime = 0;
  this.playingIntro = false;
  this.tRex.playingIntro = false;
  this.playCount++;
};
Runner.prototype.playIntro = function () {
  if (!this.activated && !this.crashed) {
    this.activated = true;
    this.setPlayStatus(true);
    this.startGame();
  } else if (this.crashed) this.restart();
};
Runner.prototype.invert = function (reset) {
  // Preserve the paper and page theme. Night sky elements still follow the simulation.
  this.inverted = !reset && this.invertTrigger;
  if (reset) this.invertTimer = 0;
};
Runner.prototype.playSound = function () {};

export function createRunner(element, { onScore, onState, best = 0 }) {
  Runner.audioCues = false;
  const runner = new Runner(element);
  let disposed = false;
  let suspended = true;
  let width = element.clientWidth;
  let lastFrame = 0;
  const crouchKeys = new Set();
  let state = 'ready';
  function report(next) { if (state !== next) { state = next; onState(next); } }
  runner.containerEl.removeAttribute('tabindex');
  runner.containerEl.removeAttribute('aria-label');
  runner.containerEl.removeAttribute('title');
  runner.containerEl.setAttribute('role', 'presentation');
  runner.highestScore = Math.ceil(best / .025);
  runner.distanceMeter.setHighScore(runner.highestScore);
  const stopFrames = () => {
    runner.stop();
    runner.updatePending = false;
    lastFrame = 0;
    runner.gameOverPanel?.reset();
    cancelAnimationFrame(runner.distanceMeter?.flashingRafId);
  };
  // Freeze the idle blink until the banner transition finishes.
  stopFrames();
  runner.paused = false;
  // Recolor the original atlas once per theme, rather than filtering every
  // frame or positioning a second DOM character over the simulation.
  const originalSprite = Runner.imageSprite;
  const mask = spriteMask(originalSprite);
  const atlas = document.createElement('canvas');
  atlas.width = originalSprite.naturalWidth;
  atlas.height = originalSprite.naturalHeight;
  const atlasContext = atlas.getContext('2d');
  function tintSprites() {
    tintSprite(atlasContext, mask, getComputedStyle(element).getPropertyValue('--game-ink').trim() || '#794b35');
  }
  tintSprites();
  Runner.imageSprite = atlas;
  Runner.origImageSprite = atlas;
  runner.distanceMeter.image = atlas;
  runner.canvasCtx.imageSmoothingEnabled = false;
  const drawPlayer = runner.tRex.draw.bind(runner.tRex);
  runner.tRex.draw = () => {};
  // Keep the canonical 60Hz animation/speed progression on high refresh
  // displays. One bound callback, and no layout or React work per frame.
  const frameDuration = 1000 / 60;
  function frame(now) {
    if (disposed || suspended || !runner.updatePending) return;
    if (now - lastFrame >= frameDuration - .5) {
      lastFrame += frameDuration * Math.max(1, Math.floor((now - lastFrame) / frameDuration));
      runner.update();
    } else runner.raqId = requestAnimationFrame(frame);
  }
  runner.scheduleNextUpdate = () => {
    if (runner.updatePending || disposed || suspended) return;
    if (!lastFrame) lastFrame = performance.now();
    runner.updatePending = true;
    runner.raqId = requestAnimationFrame(frame);
  };
  // The banner supplies the intro, so start at Chromium's normal settled position.
  runner.tRex.xPos = runner.tRex.config.START_X_POS;
  runner.tRex.xInitialPos = runner.tRex.xPos;
  runner.clearCanvas();
  runner.horizon.update(0, 0, false);
  runner.distanceMeter.update(0, 0);
  runner.tRex.draw(0, 0);
  // This marker is measured only at the banner handoff, never in the loop.
  const marker = document.createElement('span');
  marker.className = 'runner-player-marker';
  marker.setAttribute('aria-hidden', 'true');
  runner.containerEl.appendChild(marker);
  function playerRect() {
    const rex = runner.tRex;
    Object.assign(marker.style, { left: `${rex.xPos}px`, top: `${rex.yPos}px`, width: `${rex.ducking ? rex.config.WIDTH_DUCK : rex.config.WIDTH}px`, height: `${rex.config.HEIGHT}px` });
    const rect = marker.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, logicalWidth: rex.ducking ? rex.config.WIDTH_DUCK : rex.config.WIDTH };
  }
  const originalGameOver = runner.gameOver.bind(runner);
  runner.gameOver = () => {
    crouchKeys.clear();
    originalGameOver();
    const score = Math.min(99999, runner.distanceMeter.getActualDistance(Math.ceil(runner.distanceRan)));
    playDeskSound('drop');
    onScore(score);
    report('over');
  };
  const originalRestart = runner.restart.bind(runner);
  runner.restart = () => {
    runner.activated = true;
    originalRestart();
    report('running');
  };
  function key(event, down) {
    if (disposed || suspended || document.hidden || ![32, 38, 40, 17, 13].includes(event.keyCode)) return;
    event.preventDefault();
    event.stopPropagation();
    // A completed run is kept for sharing. Only the explicit Restart button
    // can start another run, including on keyup or touch release after a crash.
    if (runner.crashed) return;
    if (down && event.repeat) return;
    let keyCode = event.keyCode;
    if ([17, 40].includes(keyCode)) {
      if (down) {
        const held = crouchKeys.size;
        crouchKeys.add(event.code || keyCode);
        if (held) return;
      } else {
        crouchKeys.delete(event.code || keyCode);
        if (crouchKeys.size) return;
      }
      keyCode = 40;
    }
    if (down && runner.paused && !runner.crashed && [32, 38].includes(event.keyCode)) runner.play();
    runner[down ? 'onKeyDown' : 'onKeyUp']({ keyCode, target: event.target, type: down ? 'keydown' : 'keyup', preventDefault() {} });
    if (runner.playing && !runner.crashed) report('running');
  }
  const keydown = event => key(event, true);
  const keyup = event => key(event, false);
  function control(keyCode, down) {
    key({ keyCode, target: element, type: down ? 'keydown' : 'keyup', preventDefault() {}, stopPropagation() {} }, down);
  }
  function pointerDown(event) {
    if (event.button !== 0 || suspended || runner.crashed) return;
    event.preventDefault();
    element.focus({ preventScroll: true });
    element.setPointerCapture(event.pointerId);
    control(32, true);
  }
  const pointerUp = () => control(32, false);
  const pointerCancel = () => { crouchKeys.clear(); runner.tRex.endJump(); runner.tRex.speedDrop = false; runner.tRex.setDuck(false); };
  function pause() {
    crouchKeys.clear();
    if (runner.playing && !runner.crashed) {
      stopFrames();
      // Releasing a held control must not leave the dinosaur ducking after a transition.
      runner.tRex.setDuck(false);
      runner.tRex.speedDrop = false;
      runner.adjustDimensions();
      runner.canvasCtx.imageSmoothingEnabled = false;
      report('paused');
    }
  }
  const visibility = () => { if (document.hidden) pause(); };
  function resize() {
    if (disposed || suspended) return;
    const next = element.clientWidth;
    if (Math.abs(next - width) < 2 || next < 1) return;
    pause(); width = next;
    runner.adjustDimensions();
    runner.canvasCtx.imageSmoothingEnabled = false;
  }
  const themeObserver = new MutationObserver(() => {
    if (disposed) return;
    pause(); tintSprites(); runner.adjustDimensions();
    runner.canvasCtx.imageSmoothingEnabled = false;
    runner.tRex.draw(runner.activated ? runner.tRex.currentAnimFrames[runner.tRex.currentFrame] || 0 : 0, 0);
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const viewportObserver = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) pause();
  });
  viewportObserver.observe(element);
  const observer = new ResizeObserver(resize);
  observer.observe(element);
  element.addEventListener('keydown', keydown);
  element.addEventListener('keyup', keyup);
  element.addEventListener('pointerdown', pointerDown);
  element.addEventListener('pointerup', pointerUp);
  element.addEventListener('pointercancel', pointerCancel);
  element.addEventListener('blur', pause);
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', visibility);

  return {
    activate() { suspended = false; runner.tRex.draw = drawPlayer; resize(); drawPlayer(0, 0); element.focus({ preventScroll: true }); },
    suspend() { suspended = true; pause(); },
    settle() { suspended = false; resize(); element.focus({ preventScroll: true }); },
    tip: playerRect,
    jump(down) { control(32, down); },
    duck(down) { control(40, down); },
    pause,
    resume() { if (!suspended && runner.paused && !runner.crashed) { runner.play(); report('running'); } element.focus({ preventScroll: true }); },
    restart() { if (suspended) return; crouchKeys.clear(); stopFrames(); runner.restart(); element.focus({ preventScroll: true }); },
    destroy() {
      if (disposed) return;
      disposed = true;
      stopFrames();
      clearInterval(runner.resizeTimerId_);
      clearInterval(runner.generatedSoundFx?.bgSoundIntervalId);
      observer.disconnect();
      viewportObserver.disconnect();
      themeObserver.disconnect();
      element.removeEventListener('keydown', keydown);
      element.removeEventListener('keyup', keyup);
      element.removeEventListener('pointerdown', pointerDown);
      element.removeEventListener('pointerup', pointerUp);
      element.removeEventListener('pointercancel', pointerCancel);
      element.removeEventListener('blur', pause);
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', visibility);
      runner.containerEl.remove();
      runner.a11yStatusEl?.remove();
      runner.audioContext?.close();
      runner.generatedSoundFx?.context?.close();
      if (runtime.Runner === Runner) runtime.Runner = null;
      Runner.a11yStatusEl = null;
      Runner.imageSprite = null;
      Runner.origImageSprite = null;
    },
  };
}
