"use strict";

import { Size } from "./Size.mjs";

/**
 * Creates and starts a new GameGame.
 * @param {{ canvasId: string, width: number, height: number, fps?: number }} options 
 * @param {(root: Element) => Promise<void>} init 
 * @param {(timeMs: number) => void} update 
 * @param {(ctx: CanvasRenderingContext2D, timeMs: number) => void} render 
 */
export async function GameEngine(options, init, update, render) {
    const { canvasId, width, height, fps } = options;

    /**
     * @type {HTMLCanvasElement | null}
     */
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        throw 'canvas is null';
    }
    canvas.setAttribute("width", width.toString());
    canvas.setAttribute("height", height.toString());

    CanvasSize = new Size(width, height);

    const ctx = canvas.getContext("2d");
    if (ctx === null) {
        throw 'canvas context is null';
    }

    initKeyboard();
    initMouse();

    const adaptiveFps = Math.round(await getFPS());
    const chosenFps = Math.max(fps ?? 0, adaptiveFps);
    console.log(`Running at ${chosenFps} FPS`)

    await init(canvas);

    let lastTime = performance.now();

    window.setInterval(() => internalUpdate(), 1000.0 / chosenFps);
    window.requestAnimationFrame((t) => internalRender(t));

    /**
     * 
     * @param {number} t 
     */
    function internalRender(t) {
        render(ctx, t);
        window.requestAnimationFrame((t) => internalRender(t));
    }

    function internalUpdate() {
        const time = performance.now();
        const dt = time - lastTime;
        lastTime = time;

        update(time, dt);
    }

    function initMouse() {
        document.addEventListener("mousedown", (evt) => {
            if (evt.button === 0) {
                Mouse.keyDown.left = true;
            }
        });
        document.addEventListener("mouseup", (evt) => {
            if (evt.button === 0) {
                Mouse.keyDown.left = false;
            }
        });
        document.addEventListener("mousemove", (evt) => {
            Mouse.x = Math.floor((evt.clientX - canvas.offsetLeft) / (canvas.clientWidth / Number.parseInt(canvas.getAttribute("width"))));
            Mouse.y = Math.floor((evt.clientY - canvas.offsetTop) / (canvas.clientHeight / Number.parseInt(canvas.getAttribute("height"))));
        });
    }

    function initKeyboard() {
        const keyMap = {
            "KeyW": "w",
            "KeyA": "a",
            "KeyS": "s",
            "KeyD": "d",
            // "KeyQ": "q",
            // "KeyE": "e",
            "Digit1": "1",
            "Digit2": "2",
            "Digit3": "3",
            "Digit4": "4",
            "Digit5": "5",
            "Space": "space"
        };
        document.addEventListener("keydown", (evt) => {
            if (keyMap[evt.code]) {
                evt.preventDefault();
                const key = keyMap[evt.code];
                Keyboard.keyDown[key] = true;
            }
        });

        document.addEventListener("keyup", (evt) => {
            if (keyMap[evt.code]) {
                evt.preventDefault();
                const key = keyMap[evt.code];
                Keyboard.keyDown[key] = false;
            }
        });
    }

    /**
     * @see https://stackoverflow.com/a/44013686
     * @returns {Promise<number>}
     */
    function getFPS() {
        return new Promise(resolve =>
            requestAnimationFrame(t1 =>
                requestAnimationFrame(t2 => resolve(1000 / (t2 - t1)))
            )
        )
    }
}

export const Mouse = {
    keyDown: {
        left: false
    },
    x: 0,
    y: 0,
    reset: () => Mouse.keyDown.left = false
}

export const Keyboard = {
    keyDown: {
        w: false,
        a: false,
        s: false,
        d: false,
        // q: false,
        // e: false,
        [1]: false,
        [2]: false,
        [3]: false,
        [4]: false,
        [5]: false,
        space: false
    },
    reset: () => {
        Object.keys(Keyboard.keyDown).forEach(key => {
            Keyboard.keyDown[key] = false;
        })
    }
};

/**
 * @type {Size}
 */
export let CanvasSize = null;

/**
 * 
 * @param {number} x 
 * @param {number} min 
 * @param {number} max 
 * @returns 
 */
export function clamp(x, min, max) {
    if (x < min) return min;
    if (x > max) return max;
    return x;
}

/**
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {CanvasImageSource} image 
 * @param {number} x 
 * @param {number} y 
 * @param {number} angle 
 * @param {number} scaleX
 * @param {number} scaleY
 */
export function drawImageCentered(ctx, image, x, y, angle, scaleX=1, scaleY=1) {
    ctx.setTransform(scaleX, 0, 0, scaleY, x, y);
    ctx.rotate(angle);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.resetTransform();
}

/**
* 
* @param {CanvasImageSource} image 
* @param {number} rows 
* @param {number} cols 
* @returns {Promise<ImageBitmap[]>}
*/
export async function createSpriteFrames(image, rows, cols) {
    const sw = image.width / cols;
    const sh = image.height / rows;

    const frames = [];
    for (let row = 0; row < rows; ++row) {
        for (let col = 0; col < cols; ++col) {
            const sx = col * sw;
            const sy = row * sh;
            frames.push(createImageBitmap(image, sx, sy, sw, sh));
        }
    }

    return await Promise.all(frames);
}

/**
 * 
 * @param {number} numberOfFrames 
 * @param {number} timeMillis 
 * @param {number} framesPerSecond 
 */
export function getFrameIndex(numberOfFrames, timeMillis, framesPerSecond) {
    return Math.floor(timeMillis / 1000.0 * framesPerSecond) % numberOfFrames;
}

/**
 * 
 * @param {{ [key:string]: string}} images 
 * @returns {Promise<{ [key:string]: HTMLImageElement }>}
 */
export function loadImages(images) {
    return loadResources(images, (path) => { const image = new Image(); image.src = path; return image; }, "load", "error");
}

/**
 * 
 * @param {{[key: string]: string}} sounds 
 * @returns {Promise<{[key:string]: HTMLAudioElement}>}
 */
export function loadSounds(sounds) {
    return loadResources(sounds, (path) => new Audio(path), "canplaythrough", "error");
}

/**
 * 
 * @param {{[key: string]: string}} resources 
 * @param {(path: string) => T} creator 
 * @param {string} readyEvent 
 * @param {string} errorEvent 
 * @returns {Promise<{[key:string]: T}>}
 */
async function loadResources(resources, creator, readyEvent, errorEvent) {
    const promises = [];
    for (let key in resources) {
        const path = resources[key];

        const resource = creator(path);
        promises.push(new Promise((resolve, reject) => {
            resource.addEventListener(readyEvent, () => resolve([key, resource]));
            resource.addEventListener(errorEvent, (e) => reject(e));
        }));
    }

    const resourceMap = {};
    for (let [key, resource] of await Promise.all(promises)) {
        resourceMap[key] = resource;
    }
    return resourceMap;
}

/**
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {string} text 
 * @param {number} x 
 * @param {number} y 
 */
export function drawTextCentered(ctx, text, x, y, style, font) {

    if (style) {
        ctx.fillStyle = style;
    }
    if (font) {
        ctx.font = font;
    }

    const dimensions = ctx.measureText(text);
    const textX = x - (dimensions.width / 2);
    const textY =  y - (dimensions.actualBoundingBoxAscent / 2);
    ctx.fillText(text, textX, textY);

    if (style) {
        ctx.strokeStyle = style;
    }
    ctx.strokeRect(textX, textY, dimensions.widthw, dimensions.actualBoundingBoxAscent);
}