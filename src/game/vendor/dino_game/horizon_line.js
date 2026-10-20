// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { runtime } from './runtime.js';
import { FPS, IS_HIDPI } from './constants.js';

export class HorizonLine {
  constructor(canvas, lineConfig, viewport) {
    this.canvasCtx = canvas.getContext('2d');
    this.dimensions = { ...lineConfig };
    this.viewport = viewport;
    const scale = IS_HIDPI ? 2 : 1;
    // Both supplied sprite sheets keep a 2px left inset; only the strip's
    // size and vertical position double in the high DPI sheet.
    this.spritePos = { x: lineConfig.SOURCE_X, y: lineConfig.SOURCE_Y * scale };
    this.sourceDimensions = { WIDTH: lineConfig.WIDTH * scale, HEIGHT: lineConfig.HEIGHT * scale };
    this.offset = 0;
    this.tile = 0;
    this.draw();
  }

  draw() {
    const { WIDTH, HEIGHT, YPOS } = this.dimensions;
    // Tile the entire logical viewport, including the strip scrolling in.
    // The portfolio's track can be wider than Chromium's 600px default.
    for (let x = -Math.floor(this.offset), i = 0; x < this.viewport.WIDTH; x += WIDTH, i++) {
      const variant = (this.tile + i) % 2;
      this.canvasCtx.drawImage(
        runtime.Runner.imageSprite,
        this.spritePos.x + variant * this.sourceDimensions.WIDTH,
        this.spritePos.y,
        this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
        x, YPOS, WIDTH, HEIGHT,
      );
    }
  }

  update(deltaTime, speed) {
    this.offset += speed * (FPS / 1000) * deltaTime;
    const passed = Math.floor(this.offset / this.dimensions.WIDTH);
    this.tile += passed;
    this.offset %= this.dimensions.WIDTH;
    this.draw();
  }

  reset() { this.offset = 0; this.tile = 0; }
}
