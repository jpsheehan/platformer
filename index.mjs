import { GameEngine, Keyboard, createSpriteFrames, drawImageCentered, loadImages } from "./GameEngine.mjs";
import { WIDTH, HEIGHT } from "./Constants.mjs";
import { component, ecsUpdate, entity, system } from "./Ecs.mjs";
import { assets } from "./Assets.mjs";

const position = component({ x: 0.0, y: 0.0 });
const velocity = component({ x: 0.0, y: 0.0 });
const acceleration = component({ x: 0.0, y: 0.0 });
const isJumping = component({ value: false });
const isOnWall = component({ value: false });
const size = component({ w: null, h: null });

const player = component({ running: null, idle: null, jump: null, fall: null });

const image = component({ source: null, scale: 1.0 });
const sprite = component({ sources: null, scale: 1.0, fps: 8.0 });

system(["dt"], [player, velocity, isJumping], ([dt], [_, velocity, isJumping]) => {
    const JUMPING_VELOCITY = 600;

    /*if (isJumping.value && isOnWall.value && Keyboard.keyDown.space) {
        velocity.y = -JUMPING_VELOCITY * dt;
    } else
    
    */if (!isJumping.value && Keyboard.keyDown.space) {
        velocity.y = -JUMPING_VELOCITY * dt;
        isJumping.value = true;
    }

    const WALKING_VELOCITY = 200;

    if (Keyboard.keyDown.d) {
        velocity.x = dt * WALKING_VELOCITY;
    } else if (Keyboard.keyDown.a) {
        velocity.x = dt * -WALKING_VELOCITY;
    } else {
        velocity.x += (0 - velocity.x) * 0.1
    }
})

system(["dt"], [position, velocity, acceleration, size], ([dt], [position, velocity, acceleration, size]) => {
    const GRAVITY = 20; // in pixels/second^2
    acceleration.y = dt * GRAVITY;

    velocity.x += acceleration.x;
    velocity.y += acceleration.y;

    position.x += velocity.x;
    position.y += velocity.y;

    const minX = position.x - size.w / 2;
    const maxX = position.x + size.w / 2;
    const minY = position.y - size.h / 2;
    const maxY = position.y + size.h / 2;

    if (minX < 0) {
        position.x = size.w / 2;
        velocity.x = 0;
        acceleration.x = 0;
    } else if (maxX > WIDTH) {
        position.x = WIDTH - size.w / 2;
        velocity.x = 0;
        acceleration.x = 0;
    }
    if (minY < 0) {
        position.y = size.h / 2;
    } else if (maxY > HEIGHT) {
        position.y = HEIGHT - size.h / 2;
        velocity.y = 0;
        acceleration.y = 0;
    }
});
system([], [isJumping, velocity], ([], [isJumping, velocity]) => {
    isJumping.value = velocity.y !== 0;
})

system(["ctx"], [position, image], ([ctx], [position, image]) => {
    drawImageCentered(ctx, image.source, position.x, position.y, 0.0);
});

system([], [velocity, player, sprite], ([], [velocity, player, sprite]) => {
    if (velocity.y < 0) {
        sprite.sources = [player.fall];
    } else if (velocity.y > 0.1) {
        sprite.sources = [player.jump];
    } else if (Math.abs(velocity.x) > 1) {
        sprite.sources = player.running;
    } else {
        sprite.sources = player.idle;
    }
})

system(["ctx", "t"], [position, velocity, sprite], ([ctx, t], [position, velocity, sprite]) => {
    const period = 1000.0 / sprite.fps;
    const index = Math.floor(t / period) % sprite.sources.length;
    const image = sprite.sources[index];
    const scaleX = velocity.x > 0 ? 1 : -1;
    drawImageCentered(ctx, image, position.x, position.y, 0.0, scaleX);
});

let lastT;

/**
 * 
 * @param {CanvasImageSource[]} playerImage 
 * @param {CanvasImageSource[]} playerIdle 
 * @param {CanvasImageSource[]} playerJump 
 * @param {CanvasImageSource[]} playerFall 
 * @returns {Entity}
 */
function createPlayer(playerRun, playerIdle, playerJump, playerFall) {
    return entity([
        [sprite, { sources: playerRun, fps: 16 }],
        [position, { x: WIDTH / 2.0, y: HEIGHT / 2.0 }],
        [size, { w: playerRun[0].width, h: playerRun[0].height }],
        velocity,
        acceleration,
        [player, { running: playerRun, idle: playerIdle, jump: playerJump, fall: playerFall }],
        isJumping,
        isOnWall
    ]);
}

(() => {
    GameEngine({
        canvasId: "canvas",
        width: WIDTH,
        height: HEIGHT,
        fps: 30
    }, async (root) => {
        const images = await loadImages(assets.images);
        const playerRun = await createSpriteFrames(images.player_run, 1, 12);
        const playerIdle = await createSpriteFrames(images.player_idle, 1, 11);
        console.log(createPlayer(playerRun, playerIdle, images.player_jump, images.player_fall));
        lastT = performance.now();
    }, (t) => {
    }, (ctx, t) => {
        const dt = (t - lastT) / 1000.0;
        lastT = t;

        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        ecsUpdate({ ctx, dt, t });
    });
})();