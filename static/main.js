const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const sourceSceneCanvas = document.createElement("canvas");
const sourceSceneCtx = sourceSceneCanvas.getContext("2d");
const nameInput = document.getElementById("nameInput");
const addNameBtn = document.getElementById("addNameBtn");
const removeQueueBtn = document.getElementById("removeQueueBtn");
const deleteNameBtn = document.getElementById("deleteNameBtn");
const toggleScannerBtn = document.getElementById("toggleScannerBtn");
const reloadBtn = document.getElementById("reloadBtn");
const cleanQueueBtn = document.getElementById("cleanQueueBtn");
const cleanDbBtn = document.getElementById("cleanDbBtn");
const cancelScannerBtn = document.getElementById("cancelScannerBtn");
const readerVideo = document.getElementById("readerVideo");
const panel = document.getElementById("panel");
const toast = document.getElementById("toast");
const scannerWrap = document.getElementById("scannerWrap");
const passwordModal = document.getElementById("passwordModal");
const passwordForm = document.getElementById("passwordForm");
const passwordTitle = document.getElementById("passwordTitle");
const passwordMessage = document.getElementById("passwordMessage");
const passwordInput = document.getElementById("passwordInput");
const passwordCancelBtn = document.getElementById("passwordCancelBtn");

const bg = new Image();
bg.src = `/static/background.png?v=${Date.now()}`;

const WORLD_W = 2528;
const WORLD_H = 1684;
const SCENE_VIEWPORT = window.SCENE_VIEWPORT || {};
const DEFAULT_CHAR_W = 80;
const DEFAULT_CHAR_H = 120;
const NAMEPLATE_FONT_FAMILY = "'Press Start 2P', monospace";
const NAMEPLATE_FONT_SIZE = 24;
const NAMEPLATE_H_PADDING = 20;
const NAMEPLATE_V_PADDING = 16;
const NAMEPLATE_GAP = 4;
const DEFAULT_MOTION_FRAME_TICKS = 18;
const SCANNER_BOX_SIZE = 320;
const SCANNER_DOWNSCALED_SIZE = 500;
const FIXED_WMOTION = "W04";
const CHARACTER_UPSCALE_FACTOR = 2;
const DEFAULT_RENDER_QUERY = {
  emotion: "E00"
};
const DEFAULT_IDLE_FRAMES = [{ action: "A00" }];
const DEFAULT_WALK_FRAMES = [{ action: "A02" }, { action: "A03" }];

// Keep this array length in sync with QUEUE_LIMIT in app.py.
const CHARACTER_PLATFORMS = window.CHARACTER_PLATFORMS || [];

const AVAILABLE_FRAME_KEYS = [
  ...new Set(
    CHARACTER_PLATFORMS.flatMap((platform) => {
      const render = {
        ...DEFAULT_RENDER_QUERY,
        ...(platform.render || {}),
        emotion: getPlatformEmotion(platform)
      };
      return getPlatformFrames(platform, "idle").map((frame) => serializeFrameParams(render, frame));
    })
  )
];

let chars = [];
let imageCache = new Map();
let imageMetricsCache = new WeakMap();
let scanner = null;
let scannerOpen = false;
let lastRenderTime = null;
let sceneWidth = 1;
let sceneHeight = 1;
let canvasDpr = 1;
let currentRankKind = null;
let pendingPasswordResolve = null;

function resizeSourceScene() {
  if (sourceSceneCanvas.width !== WORLD_W || sourceSceneCanvas.height !== WORLD_H) {
    sourceSceneCanvas.width = WORLD_W;
    sourceSceneCanvas.height = WORLD_H;
  }
}

function resizeCanvas() {
  const nextWidth = Math.max(window.innerWidth, 1);
  const nextHeight = Math.max(window.innerHeight, 1);
  const nextDpr = Math.max(window.devicePixelRatio || 1, 1);
  const nextPixelWidth = Math.round(nextWidth * nextDpr);
  const nextPixelHeight = Math.round(nextHeight * nextDpr);

  if (
    sceneWidth === nextWidth &&
    sceneHeight === nextHeight &&
    canvasDpr === nextDpr &&
    canvas.width === nextPixelWidth &&
    canvas.height === nextPixelHeight
  ) {
    return;
  }

  sceneWidth = nextWidth;
  sceneHeight = nextHeight;
  canvasDpr = nextDpr;
  canvas.width = nextPixelWidth;
  canvas.height = nextPixelHeight;
  canvas.style.width = `${nextWidth}px`;
  canvas.style.height = `${nextHeight}px`;
  ctx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2200);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max) {
  if (max <= min) {
    return min;
  }
  return min + Math.random() * (max - min);
}

function appendFrameNumber(code, frameNumber) {
  if (frameNumber === null || frameNumber === undefined) {
    return code;
  }
  return `${code}.${frameNumber}`;
}

function makePingPongNumbers(maxFrame) {
  const max = Math.max(0, Number(maxFrame) || 0);
  const frames = [];
  for (let frame = 0; frame <= max; frame += 1) {
    frames.push(frame);
  }
  for (let frame = max - 1; frame > 0; frame -= 1) {
    frames.push(frame);
  }
  return frames.length ? frames : [0];
}

function getPlatformAction(platform) {
  return platform.action || platform.idleFrames?.[0]?.action || DEFAULT_IDLE_FRAMES[0].action;
}

function getPlatformEmotion(platform) {
  return platform.emotion || platform.render?.emotion || DEFAULT_RENDER_QUERY.emotion;
}

function serializeFrameParams(render, frame) {
  const emotion = frame.emotion || render.emotion || DEFAULT_RENDER_QUERY.emotion;
  const params = {
    ...render,
    emotion: appendFrameNumber(emotion, frame.emotionFrame),
    action: appendFrameNumber(frame.action, frame.actionFrame),
    wmotion: FIXED_WMOTION
  };
  return JSON.stringify(params);
}

function deserializeFrameParams(key) {
  return JSON.parse(key);
}

function makeImageUrl(look, params) {
  const query = new URLSearchParams();
  query.set("action", params.action);
  query.set("emotion", params.emotion);
  query.set("wmotion", FIXED_WMOTION);
  const real = `https://open.api.nexon.com/static/maplestory/character/look/${look}?${query.toString()}`;
  return `/api/proxy?url=${encodeURIComponent(real)}`;
}

function getQueueLimit() {
  return CHARACTER_PLATFORMS.length;
}

function getQrScannerOptions() {
  return {
    preferredCamera: "environment",
    maxScansPerSecond: 18,
    returnDetailedScanResult: true,
    highlightScanRegion: true,
    highlightCodeOutline: true,
    calculateScanRegion: (video) => {
      const size = Math.min(video.videoWidth, video.videoHeight, SCANNER_BOX_SIZE);
      const x = Math.round((video.videoWidth - size) / 2);
      const y = Math.round((video.videoHeight - size) / 2);
      return {
        x,
        y,
        width: size,
        height: size,
        downScaledWidth: SCANNER_DOWNSCALED_SIZE,
        downScaledHeight: SCANNER_DOWNSCALED_SIZE
      };
    }
  };
}

function preloadCharacterFrames(ch) {
  ch.frames = {};
  ch.frameIndex = 0;
  ch.frameTick = 0;

  for (const key of AVAILABLE_FRAME_KEYS) {
    if (!imageCache.has(`${ch.look}_${key}`)) {
      const img = new Image();
      const params = deserializeFrameParams(key);
      img.src = makeImageUrl(ch.look, params);
      imageCache.set(`${ch.look}_${key}`, img);
    }
    ch.frames[key] = imageCache.get(`${ch.look}_${key}`);
  }
}

function getTrimmedSprite(img) {
  if (!img || !img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
    return null;
  }

  if (imageMetricsCache.has(img)) {
    return imageMetricsCache.get(img);
  }

  const metricsCanvas = document.createElement("canvas");
  metricsCanvas.width = img.naturalWidth;
  metricsCanvas.height = img.naturalHeight;
  const metricsCtx = metricsCanvas.getContext("2d", { willReadFrequently: true });
  metricsCtx.drawImage(img, 0, 0);

  const imageData = metricsCtx.getImageData(0, 0, metricsCanvas.width, metricsCanvas.height);
  const { data, width, height } = imageData;
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 16) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }

  if (right < left || bottom < top) {
    left = 0;
    right = width - 1;
    top = 0;
    bottom = height - 1;
  }

  const trimmed = {
    sx: left,
    sy: top,
    sw: right - left + 1,
    sh: bottom - top + 1
  };
  imageMetricsCache.set(img, trimmed);
  return trimmed;
}

function getSourceSceneViewport() {
  if (sceneWidth <= 0 || sceneHeight <= 0) {
    return null;
  }

  const viewportAspect = sceneWidth / sceneHeight;
  const worldAspect = WORLD_W / WORLD_H;
  let cropWidth = WORLD_W;
  let cropHeight = WORLD_H;

  if (viewportAspect > worldAspect) {
    cropWidth = WORLD_W;
    cropHeight = WORLD_W / viewportAspect;
  } else {
    cropHeight = WORLD_H;
    cropWidth = WORLD_H * viewportAspect;
  }

  const cameraOffsetX = Number(SCENE_VIEWPORT.cameraOffsetX) || 0;
  const cameraOffsetY = Number(SCENE_VIEWPORT.cameraOffsetY) || 0;
  const cameraX = WORLD_W / 2 + cameraOffsetX;
  const cameraY = WORLD_H / 2 + cameraOffsetY;
  const cropX = clamp(cameraX - cropWidth / 2, 0, WORLD_W - cropWidth);
  const cropY = clamp(cameraY - cropHeight / 2, 0, WORLD_H - cropHeight);

  return {
    sx: cropX,
    sy: cropY,
    sw: cropWidth,
    sh: cropHeight,
    scale: sceneWidth / cropWidth
  };
}

function useScreenCoordinateSystem() {
  ctx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
}

function worldToScreen(viewport, x, y) {
  return {
    x: (x - viewport.sx) * viewport.scale,
    y: (y - viewport.sy) * viewport.scale
  };
}

function snapToDevicePixel(value) {
  return Math.round(value * canvasDpr) / canvasDpr;
}

function getPlatformPath(platform) {
  if (Array.isArray(platform.path) && platform.path.length > 0) {
    return platform.path
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      .map((point) => ({ x: point.x, y: point.y }))
      .sort((a, b) => a.x - b.x);
  }

  const anchor = getPlatformAnchorPoint(platform);
  const y = anchor.y;
  const minX = platform.walkRange?.minX ?? anchor.x;
  const maxX = platform.walkRange?.maxX ?? anchor.x;
  return [
    { x: minX, y },
    { x: maxX, y }
  ].sort((a, b) => a.x - b.x);
}

function getPlatformAnchorPoint(platform) {
  return platform.imageBottomLeft || platform.imageBottomCenter || { x: 0, y: 0 };
}

function getPlatformXRange(platform) {
  const path = getPlatformPath(platform);
  const xs = path.map((point) => point.x);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs)
  };
}

function getPlatformY(platform, x) {
  const path = getPlatformPath(platform);
  if (path.length === 0) {
    return getPlatformAnchorPoint(platform).y;
  }
  if (path.length === 1) {
    return path[0].y;
  }

  const clampedX = clamp(x, path[0].x, path[path.length - 1].x);
  for (let i = 0; i < path.length - 1; i += 1) {
    const start = path[i];
    const end = path[i + 1];
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);

    if (clampedX < minX || clampedX > maxX) {
      continue;
    }
    if (start.x === end.x) {
      return end.y;
    }

    const t = (clampedX - start.x) / (end.x - start.x);
    return start.y + (end.y - start.y) * t;
  }

  return path[path.length - 1].y;
}

function getPlatformFrames(platform, stateName) {
  if (platform.move) {
    const actionFrameMax = Math.max(0, Number(platform.actionFrameMax) || 0);
    const emotionFrameMax = Math.max(0, Number(platform.emotionFrameMax) || 0);
    const frames = makePingPongNumbers(Math.max(actionFrameMax, emotionFrameMax));
    const action = getPlatformAction(platform);
    const emotion = getPlatformEmotion(platform);

    return frames.map((frame) => ({
      action,
      actionFrame: actionFrameMax > 0 ? Math.min(frame, actionFrameMax) : null,
      emotion,
      emotionFrame: emotionFrameMax > 0 ? Math.min(frame, emotionFrameMax) : null
    }));
  }

  if (platform.action || platform.emotion) {
    return [{
      action: getPlatformAction(platform),
      emotion: getPlatformEmotion(platform)
    }];
  }

  if (stateName === "walk") {
    return platform.walkFrames?.length ? platform.walkFrames : DEFAULT_WALK_FRAMES;
  }
  return platform.idleFrames?.length ? platform.idleFrames : DEFAULT_IDLE_FRAMES;
}

function getCurrentFrameInfo(ch) {
  if (!ch.frames || !ch.platformConfig) {
    return null;
  }
  const frames = getPlatformFrames(ch.platformConfig, ch.moveState);
  const frameIndex = (ch.frameIndex || 0) % frames.length;
  const frame = frames[frameIndex];
  const key = serializeFrameParams(
    {
      ...DEFAULT_RENDER_QUERY,
      ...(ch.platformConfig.render || {}),
      emotion: getPlatformEmotion(ch.platformConfig)
    },
    frame
  );
  return {
    img: ch.frames[key] || null,
    frame,
    frameIndex
  };
}

function getPlatformFrameTicks(platform) {
  const ticks = Number(platform.frameTicks ?? platform.motionFrameTicks);
  if (!Number.isFinite(ticks) || ticks <= 0) {
    return DEFAULT_MOTION_FRAME_TICKS;
  }
  return Math.max(1, Math.round(ticks));
}

function getFrameOffsetByKey(offsets, key) {
  const offset = offsets?.[key];
  if (!offset) {
    return { x: 0, y: 0 };
  }
  return {
    x: Number(offset.x) || 0,
    y: Number(offset.y) || 0
  };
}

function getFrameRenderOffset(platform, frameInfo) {
  const base = {
    x: Number(platform.renderOffset?.x) || 0,
    y: Number(platform.renderOffset?.y) || 0
  };
  const offsets = platform.frameOffsets;
  if (!offsets || !frameInfo?.frame) {
    return base;
  }

  const frame = frameInfo.frame;
  const frameIndex = frameInfo.frameIndex;
  let offset = { x: 0, y: 0 };

  if (Array.isArray(offsets)) {
    offset = offsets[frameIndex] || offset;
  } else {
    const actionKey = frame.actionFrame === null || frame.actionFrame === undefined
      ? null
      : `action:${frame.actionFrame}`;
    const emotionKey = frame.emotionFrame === null || frame.emotionFrame === undefined
      ? null
      : `emotion:${frame.emotionFrame}`;
    offset =
      offsets[`index:${frameIndex}`] ||
      offsets[frameIndex] ||
      (actionKey ? offsets[actionKey] : null) ||
      (emotionKey ? offsets[emotionKey] : null) ||
      offsets.default ||
      offset;
  }

  return {
    x: base.x + (Number(offset.x) || 0),
    y: base.y + (Number(offset.y) || 0)
  };
}

function getCharacterSize(img) {
  const width = img?.naturalWidth || DEFAULT_CHAR_W;
  const height = img?.naturalHeight || DEFAULT_CHAR_H;
  return {
    width: width * CHARACTER_UPSCALE_FACTOR,
    height: height * CHARACTER_UPSCALE_FACTOR
  };
}

function getRandomPointInWalkRange(platform) {
  const { minX, maxX } = getPlatformXRange(platform);
  return randomBetween(minX, maxX);
}

function resetCharacterState(ch, platform) {
  const walk = platform.walk || {};
  const { minX, maxX } = getPlatformXRange(platform);
  ch.platformConfig = platform;
  ch.hidden = false;
  const anchor = getPlatformAnchorPoint(platform);
  ch.spriteBottomLeftX = walk.enabled
    ? getRandomPointInWalkRange(platform)
    : clamp(anchor.x, minX, maxX);
  ch.spriteBottomLeftY = getPlatformY(platform, ch.spriteBottomLeftX);
  ch.walkTargetX = ch.spriteBottomLeftX;
  ch.direction = platform.direction ?? (Math.random() < 0.5 ? -1 : 1);
  ch.nameplateCenterX = null;
  ch.nameplateBottomY = null;
  ch.moveState = "idle";
  ch.speed = 0;
  ch.stateUntil = performance.now() + randomBetween(walk.idleMinMs || 1200, walk.idleMaxMs || 2400);
  ch.frameIndex = 0;
  ch.frameTick = 0;
}

function assignPosition(ch, index) {
  const platform = CHARACTER_PLATFORMS[index];
  if (!platform) {
    ch.hidden = true;
    return;
  }
  resetCharacterState(ch, platform);
}

async function loadChars() {
  const res = await fetch(`/api/list?limit=${getQueueLimit()}`);
  const nextRows = await res.json();
  const existingByName = new Map(chars.map((ch) => [ch.name, ch]));

  chars = nextRows.map((row, index) => {
    const slotIndex = Number.isInteger(row.slot_index) ? row.slot_index : index;
    const existing = existingByName.get(row.name);
    if (existing && existing.slotIndex === slotIndex) {
      Object.assign(existing, row);
      existing.hidden = false;
      return existing;
    }

    const ch = { ...row, slotIndex };
    assignPosition(ch, slotIndex);
    preloadCharacterFrames(ch);
    return ch;
  });
}

function updateFrameAnimation(ch) {
  const frames = getPlatformFrames(ch.platformConfig, ch.moveState);
  if (frames.length <= 1) {
    ch.frameIndex = 0;
    ch.frameTick = 0;
    return;
  }

  ch.frameTick = (ch.frameTick || 0) + 1;
  if (ch.frameTick >= getPlatformFrameTicks(ch.platformConfig)) {
    ch.frameTick = 0;
    ch.frameIndex = ((ch.frameIndex || 0) + 1) % frames.length;
  }
}

function setIdleState(ch, now) {
  const walk = ch.platformConfig.walk || {};
  ch.moveState = "idle";
  ch.speed = 0;
  ch.spriteBottomLeftY = getPlatformY(ch.platformConfig, ch.spriteBottomLeftX);
  ch.walkTargetX = ch.spriteBottomLeftX;
  ch.stateUntil = now + randomBetween(walk.idleMinMs || 1200, walk.idleMaxMs || 2400);
  ch.frameIndex = 0;
  ch.frameTick = 0;
}

function setWalkState(ch, now) {
  const walk = ch.platformConfig.walk || {};
  if (!walk.enabled) {
    setIdleState(ch, now);
    return;
  }
  ch.moveState = "walk";
  ch.speed = randomBetween(walk.speedMin || 24, walk.speedMax || 44);
  const { minX, maxX } = getPlatformXRange(ch.platformConfig);
  ch.walkTargetX = getRandomPointInWalkRange(ch.platformConfig);
  if (Math.abs(ch.walkTargetX - ch.spriteBottomLeftX) < 4) {
    ch.walkTargetX = ch.spriteBottomLeftX < (minX + maxX) / 2
      ? maxX
      : minX;
  }
  ch.direction = ch.walkTargetX >= ch.spriteBottomLeftX ? 1 : -1;
  ch.stateUntil = Number.POSITIVE_INFINITY;
  ch.frameIndex = 0;
  ch.frameTick = 0;
}

function updateMovement(ch, deltaMs, now) {
  const walk = ch.platformConfig.walk || {};
  if (!walk.enabled) {
    return;
  }

  if (ch.moveState === "idle") {
    if (now >= ch.stateUntil) {
      setWalkState(ch, now);
    }
    return;
  }

  const { minX, maxX } = getPlatformXRange(ch.platformConfig);
  const targetX = clamp(ch.walkTargetX ?? ch.spriteBottomLeftX, minX, maxX);
  const distanceToTarget = targetX - ch.spriteBottomLeftX;
  ch.direction = distanceToTarget >= 0 ? 1 : -1;

  const stepX = ch.direction * ch.speed * (deltaMs / 1000);
  if (Math.abs(stepX) >= Math.abs(distanceToTarget)) {
    ch.spriteBottomLeftX = targetX;
    ch.spriteBottomLeftY = getPlatformY(ch.platformConfig, ch.spriteBottomLeftX);
    setIdleState(ch, now);
    return;
  }

  ch.spriteBottomLeftX = clamp(ch.spriteBottomLeftX + stepX, minX, maxX);
  ch.spriteBottomLeftY = getPlatformY(ch.platformConfig, ch.spriteBottomLeftX);
}

function updateCharacters(now, deltaMs) {
  for (const ch of chars) {
    if (ch.hidden || !ch.platformConfig) {
      continue;
    }
    updateMovement(ch, deltaMs, now);
    updateFrameAnimation(ch);
  }
}

function drawFallbackScene(targetCtx) {
  targetCtx.fillStyle = "#b5d9fb";
  targetCtx.fillRect(0, 0, WORLD_W, WORLD_H);
  targetCtx.fillStyle = "#6b8e23";
  targetCtx.fillRect(0, WORLD_H - 90, WORLD_W, 90);
}

function drawNameplate(targetCtx, name, centerX, characterBottomY, maxWidth, uiScale = 1) {
  targetCtx.save();
  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "middle";
  const fontSize = Math.max(12, Math.round(NAMEPLATE_FONT_SIZE * uiScale));
  const horizontalPadding = Math.max(8, Math.round(NAMEPLATE_H_PADDING * uiScale));
  const verticalPadding = Math.max(6, Math.round(NAMEPLATE_V_PADDING * uiScale));
  const gap = Math.max(2, Math.round(NAMEPLATE_GAP * uiScale));
  targetCtx.font = `${fontSize}px ${NAMEPLATE_FONT_FAMILY}`;

  const textWidth = targetCtx.measureText(name).width;
  const plateWidth = Math.ceil(textWidth + horizontalPadding * 2);
  const plateHeight = fontSize + verticalPadding * 2;
  const clampedCenterX = clamp(
    centerX,
    plateWidth / 2 + 4,
    maxWidth - plateWidth / 2 - 4
  );
  const plateX = Math.round(clampedCenterX - plateWidth / 2);
  const plateY = Math.round(characterBottomY + gap);
  const radius = Math.max(4, Math.round(6 * uiScale));

  targetCtx.fillStyle = "rgba(0, 0, 0, 0.68)";
  targetCtx.beginPath();
  targetCtx.moveTo(plateX + radius, plateY);
  targetCtx.lineTo(plateX + plateWidth - radius, plateY);
  targetCtx.quadraticCurveTo(plateX + plateWidth, plateY, plateX + plateWidth, plateY + radius);
  targetCtx.lineTo(plateX + plateWidth, plateY + plateHeight - radius);
  targetCtx.quadraticCurveTo(plateX + plateWidth, plateY + plateHeight, plateX + plateWidth - radius, plateY + plateHeight);
  targetCtx.lineTo(plateX + radius, plateY + plateHeight);
  targetCtx.quadraticCurveTo(plateX, plateY + plateHeight, plateX, plateY + plateHeight - radius);
  targetCtx.lineTo(plateX, plateY + radius);
  targetCtx.quadraticCurveTo(plateX, plateY, plateX + radius, plateY);
  targetCtx.closePath();
  targetCtx.fill();

  targetCtx.fillStyle = "#f8f8f8";
  targetCtx.imageSmoothingEnabled = false;
  targetCtx.fillText(name, Math.round(clampedCenterX), Math.round(plateY + plateHeight / 2));
  targetCtx.restore();
}

function drawCharacterInWorld(ch, targetCtx) {
  if (ch.hidden) {
    return;
  }

  const frameInfo = getCurrentFrameInfo(ch);
  const img = frameInfo?.img || null;
  const trim = getTrimmedSprite(img);
  const frameOffset = getFrameRenderOffset(ch.platformConfig, frameInfo);

  const naturalW = trim ? trim.sw : (img?.naturalWidth || DEFAULT_CHAR_W);
  const naturalH = trim ? trim.sh : (img?.naturalHeight || DEFAULT_CHAR_H);
  const drawWidth = Math.max(1, Math.round(naturalW * CHARACTER_UPSCALE_FACTOR));
  const drawHeight = Math.max(1, Math.round(naturalH * CHARACTER_UPSCALE_FACTOR));
  const drawX = Math.round(
    (ch.direction < 0
      ? ch.spriteBottomLeftX - drawWidth
      : ch.spriteBottomLeftX) + frameOffset.x
  );
  const drawY = Math.round(ch.spriteBottomLeftY - drawHeight + frameOffset.y);

  if (img && img.complete && img.naturalWidth > 0 && trim) {
    targetCtx.imageSmoothingEnabled = false;
    if (ch.direction > 0) {
      targetCtx.save();
      targetCtx.translate(drawX + drawWidth / 2, 0);
      targetCtx.scale(-1, 1);
      targetCtx.drawImage(
        img,
        trim.sx,
        trim.sy,
        trim.sw,
        trim.sh,
        -drawWidth / 2,
        drawY,
        drawWidth,
        drawHeight
      );
      targetCtx.restore();
    } else {
      targetCtx.drawImage(
        img,
        trim.sx,
        trim.sy,
        trim.sw,
        trim.sh,
        drawX,
        drawY,
        drawWidth,
        drawHeight
      );
    }
  } else {
    targetCtx.fillStyle = "#f5f5f5";
    targetCtx.fillRect(drawX, drawY, drawWidth, drawHeight);
    targetCtx.strokeStyle = "#666";
    targetCtx.lineWidth = 2;
    targetCtx.strokeRect(drawX, drawY, drawWidth, drawHeight);
  }

  if (ch.nameplateCenterX === null && img && img.complete && img.naturalWidth > 0 && trim) {
    ch.nameplateCenterX = drawX + drawWidth / 2;
    ch.nameplateBottomY = ch.spriteBottomLeftY;
  }

  drawNameplate(
    targetCtx,
    ch.name,
    ch.nameplateCenterX ?? (drawX + drawWidth / 2),
    ch.nameplateBottomY ?? ch.spriteBottomLeftY,
    WORLD_W
  );
}

function drawCharacterOnScreen(ch, viewport) {
  if (ch.hidden) {
    return;
  }

  const frameInfo = getCurrentFrameInfo(ch);
  const img = frameInfo?.img || null;
  const trim = getTrimmedSprite(img);
  const frameOffset = getFrameRenderOffset(ch.platformConfig, frameInfo);

  const naturalW = trim ? trim.sw : (img?.naturalWidth || DEFAULT_CHAR_W);
  const naturalH = trim ? trim.sh : (img?.naturalHeight || DEFAULT_CHAR_H);
  const spriteScale = Math.max(
    1,
    Math.round(CHARACTER_UPSCALE_FACTOR * viewport.scale * 2) / 2
  );
  const drawWidth = Math.max(1, snapToDevicePixel(naturalW * spriteScale));
  const drawHeight = Math.max(1, snapToDevicePixel(naturalH * spriteScale));
  const bottomLeft = worldToScreen(
    viewport,
    ch.spriteBottomLeftX + frameOffset.x,
    ch.spriteBottomLeftY + frameOffset.y
  );
  const drawX = snapToDevicePixel(
    ch.direction < 0 ? bottomLeft.x - drawWidth : bottomLeft.x
  );
  const drawY = snapToDevicePixel(bottomLeft.y - drawHeight);

  if (img && img.complete && img.naturalWidth > 0 && trim) {
    ctx.imageSmoothingEnabled = false;
    if (ch.direction > 0) {
      ctx.save();
      ctx.translate(drawX + drawWidth / 2, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(
        img,
        trim.sx,
        trim.sy,
        trim.sw,
        trim.sh,
        -drawWidth / 2,
        drawY,
        drawWidth,
        drawHeight
      );
      ctx.restore();
    } else {
      ctx.drawImage(
        img,
        trim.sx,
        trim.sy,
        trim.sw,
        trim.sh,
        drawX,
        drawY,
        drawWidth,
        drawHeight
      );
    }
  } else {
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 2;
    ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);
  }

  if (ch.nameplateCenterX === null && img && img.complete && img.naturalWidth > 0 && trim) {
    ch.nameplateCenterX = ch.direction < 0
      ? ch.spriteBottomLeftX - (naturalW * CHARACTER_UPSCALE_FACTOR) / 2
      : ch.spriteBottomLeftX + (naturalW * CHARACTER_UPSCALE_FACTOR) / 2;
    ch.nameplateBottomY = ch.spriteBottomLeftY;
  }

  const fallbackCenterX = ch.direction < 0
    ? ch.spriteBottomLeftX - (naturalW * CHARACTER_UPSCALE_FACTOR) / 2
    : ch.spriteBottomLeftX + (naturalW * CHARACTER_UPSCALE_FACTOR) / 2;
  const plateCenter = worldToScreen(
    viewport,
    ch.nameplateCenterX ?? fallbackCenterX,
    ch.nameplateBottomY ?? ch.spriteBottomLeftY
  );

  drawNameplate(
    ctx,
    ch.name,
    snapToDevicePixel(plateCenter.x),
    snapToDevicePixel(plateCenter.y),
    sceneWidth,
    viewport.scale
  );
}

function render(timestamp = performance.now()) {
  if (lastRenderTime === null) {
    lastRenderTime = timestamp;
  }
  const deltaMs = Math.min(timestamp - lastRenderTime, 50);
  lastRenderTime = timestamp;

  updateCharacters(timestamp, deltaMs);

  const viewport = getSourceSceneViewport();
  if (!viewport) {
    requestAnimationFrame(render);
    return;
  }

  useScreenCoordinateSystem();
  ctx.clearRect(0, 0, sceneWidth, sceneHeight);
  if (bg.complete && bg.naturalWidth > 0 && bg.naturalHeight > 0) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(
      bg,
      viewport.sx,
      viewport.sy,
      viewport.sw,
      viewport.sh,
      0,
      0,
      sceneWidth,
      sceneHeight
    );
  } else {
    resizeSourceScene();
    sourceSceneCtx.setTransform(1, 0, 0, 1, 0, 0);
    sourceSceneCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    drawFallbackScene(sourceSceneCtx);
    ctx.drawImage(
      sourceSceneCanvas,
      viewport.sx,
      viewport.sy,
      viewport.sw,
      viewport.sh,
      0,
      0,
      sceneWidth,
      sceneHeight
    );
  }

  for (const ch of chars) {
    drawCharacterOnScreen(ch, viewport);
  }
  requestAnimationFrame(render);
}

async function addQrPayload(payload) {
  const res = await fetch("/api/add_qr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload, queue_limit: getQueueLimit() })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "QR 추가 실패");
  }
  nameInput.value = "";
  await loadChars();
}

async function addCharacterByName(name) {
  const res = await fetch("/api/add_name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, queue_limit: getQueueLimit() })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "닉네임 조회 실패");
  }
  nameInput.value = "";
  await loadChars();
}

function closePasswordModal(value = null) {
  passwordModal.classList.add("hidden");
  passwordForm.reset();
  if (pendingPasswordResolve) {
    pendingPasswordResolve(value);
    pendingPasswordResolve = null;
  }
}

function requestModalInput({ title = "관리 비밀번호", message = "", type = "text" } = {}) {
  if (pendingPasswordResolve) {
    closePasswordModal(null);
  }
  passwordTitle.textContent = title;
  passwordMessage.textContent = message;
  passwordInput.type = type;
  passwordInput.placeholder = title;
  passwordModal.classList.remove("hidden");
  passwordInput.focus();
  return new Promise((resolve) => {
    pendingPasswordResolve = resolve;
  });
}

function requestAdminPassword(message) {
  return requestModalInput({
    title: "관리 비밀번호",
    message,
    type: "password"
  });
}

function requestConfirmationText(message) {
  return requestModalInput({
    title: "초기화 확인",
    message,
    type: "text"
  });
}

async function deleteCharacterByName(name, password) {
  const res = await fetch(`/api/character/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "캐릭터 삭제 실패");
  }
  nameInput.value = "";
  await loadChars();
  if (currentRankKind) {
    await showRank(currentRankKind);
  }
}

async function removeCharacterFromQueue(name) {
  const res = await fetch(`/api/queue/${encodeURIComponent(name)}`, {
    method: "DELETE"
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "대기열 제거 실패");
  }
  nameInput.value = "";
  await loadChars();
}

async function runAdminCleanup(kind, password) {
  const endpointMap = {
    queue: "/api/admin/clean_queue",
    db: "/api/admin/clean_db"
  };
  const res = await fetch(endpointMap[kind], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "정리 작업 실패");
  }
  await loadChars();
  if (currentRankKind) {
    await showRank(currentRankKind);
  }
  return data;
}

async function requestAdminCleanup(kind) {
  const labelMap = {
    queue: "대기열을 비웁니다",
    db: "DB의 모든 캐릭터 정보를 삭제합니다"
  };
  const password = await requestAdminPassword(labelMap[kind]);
  if (password === null) {
    return;
  }
  if (!password.trim()) {
    showToast("관리 비밀번호를 입력해주세요");
    return;
  }
  try {
    await runAdminCleanup(kind, password);
    showToast(kind === "queue" ? "대기열을 비웠습니다" : "DB를 비웠습니다");
  } catch (e) {
    showToast(e.message);
  }
}

async function loadAppConfig() {
  try {
    const res = await fetch("/api/config");
    const config = await res.json();
    cleanDbBtn.hidden = !config.admin_mode;
  } catch (e) {
    cleanDbBtn.hidden = true;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatKoreanNumber(value) {
  const number = Math.trunc(Number(value) || 0);
  if (number === 0) {
    return "0";
  }

  const units = [
    { value: 100000000, label: "억" },
    { value: 10000, label: "만" }
  ];
  let rest = number;
  const parts = [];

  for (const unit of units) {
    const unitValue = Math.floor(rest / unit.value);
    if (unitValue > 0) {
      parts.push(`${unitValue}${unit.label}`);
      rest %= unit.value;
    }
  }

  if (rest > 0) {
    parts.push(String(rest));
  }

  return parts.join(" ");
}

function formatCreateDate(value) {
  if (!value) {
    return "생성일 없음";
  }
  const text = String(value);
  const match = text.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  if (!match) {
    return text;
  }
  return `${match[1]}.${match[2]}.${match[3]}`;
}

function getRankMetric(kind, row) {
  if (kind === "level") {
    return `Lv.${row.level}`;
  }
  if (kind === "power") {
    return formatKoreanNumber(row.power);
  }
  if (kind === "popularity") {
    return row.popularity;
  }
  if (kind === "created") {
    return formatCreateDate(row.create_date);
  }
  return "";
}

function getRankTieValue(kind, row) {
  if (kind === "created") {
    return formatCreateDate(row.create_date);
  }
  return getRankMetric(kind, row);
}

function getDisplayRanks(kind, rows) {
  let previousValue = null;
  let previousRank = 0;
  return rows.map((row, index) => {
    const value = getRankTieValue(kind, row);
    const rank = value === previousValue ? previousRank : index + 1;
    previousValue = value;
    previousRank = rank;
    return { ...row, displayRank: rank };
  });
}

async function showRank(kind) {
  const res = await fetch(`/api/rank/${kind}`);
  const rows = await res.json();
  const rankedRows = getDisplayRanks(kind, rows);

  const titleMap = {
    level: "레벨 순위",
    power: "전투력 순위",
    popularity: "인기 순위",
    created: "생성일 순위"
  };

  currentRankKind = kind;
  panel.innerHTML = `
    <div class="panel-header">
      <strong>${titleMap[kind] || kind}</strong>
      <button id="closePanelBtn">닫기</button>
    </div>
    <div class="panel-body">
      ${rankedRows.map((r) => `
        <div class="rank-row rank-${r.displayRank <= 3 ? r.displayRank : "default"}">
          <span class="rank-num">${r.displayRank}</span>
          <a class="rank-name" href="https://chuchu.gg/char/${encodeURIComponent(r.name)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.name)}</a>
          <span class="rank-meta">${escapeHtml(getRankMetric(kind, r))}</span>
        </div>
      `).join("")}
    </div>
  `;
  panel.classList.remove("hidden");
  document.getElementById("closePanelBtn").onclick = () => {
    currentRankKind = null;
    panel.classList.add("hidden");
  };
}

window.showRank = showRank;

addNameBtn.onclick = async () => {
  const name = nameInput.value.trim();
  if (!name) {
    showToast("캐릭터 닉네임을 입력해주세요");
    return;
  }
  try {
    await addCharacterByName(name);
  } catch (e) {
    showToast(e.message);
  }
};

removeQueueBtn.onclick = async () => {
  const name = nameInput.value.trim();
  if (!name) {
    showToast("제거할 캐릭터 닉네임을 입력해주세요");
    return;
  }
  try {
    await removeCharacterFromQueue(name);
    showToast("대기열에서 제거했습니다");
  } catch (e) {
    showToast(e.message);
  }
};

deleteNameBtn.onclick = async () => {
  const name = nameInput.value.trim();
  if (!name) {
    showToast("삭제할 캐릭터 닉네임을 입력해주세요");
    return;
  }
  try {
    const password = await requestAdminPassword(`${name} 캐릭터를 삭제합니다`);
    if (password === null) {
      return;
    }
    if (!password.trim()) {
      showToast("관리 비밀번호를 입력해주세요");
      return;
    }
    await deleteCharacterByName(name, password);
    showToast("캐릭터 삭제 완료");
  } catch (e) {
    showToast(e.message);
  }
};

passwordForm.onsubmit = (event) => {
  event.preventDefault();
  closePasswordModal(passwordInput.value);
};

passwordCancelBtn.onclick = () => closePasswordModal(null);

passwordModal.addEventListener("click", (event) => {
  if (event.target === passwordModal) {
    closePasswordModal(null);
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !passwordModal.classList.contains("hidden")) {
    closePasswordModal(null);
  }
});

nameInput.addEventListener("keydown", async (event) => {
  if (event.key !== "Enter") {
    return;
  }
  event.preventDefault();
  addNameBtn.click();
});

reloadBtn.onclick = async () => {
  await loadChars();
  showToast("새로고침 완료");
};

cleanQueueBtn.onclick = () => {
  requestAdminCleanup("queue");
};

cleanDbBtn.onclick = async () => {
  const password = await requestAdminPassword("DB의 모든 캐릭터 정보를 삭제합니다");
  if (password === null) {
    return;
  }
  if (!password.trim()) {
    showToast("관리 비밀번호를 입력해주세요");
    return;
  }
  const confirmation = await requestConfirmationText(
    '정말 초기화하겠습니까? 이 선택은 되돌릴 수 없습니다. 정말 초기화하려면, "한메동/라치오스/초기화한다"를 입력하세요.'
  );
  if (confirmation === null) {
    return;
  }
  if (confirmation !== "한메동/라치오스/초기화한다") {
    showToast("초기화 문구가 일치하지 않습니다");
    return;
  }
  try {
    await runAdminCleanup("db", password);
    showToast("DB를 비웠습니다");
  } catch (e) {
    showToast(e.message);
  }
};

async function startScanner() {
  if (!window.QrScanner) {
    showToast("스캐너 라이브러리가 아직 안 불러와졌습니다");
    return;
  }
  if (scannerOpen) {
    return;
  }
  if (!scanner) {
    scanner = new QrScanner(
      readerVideo,
      async (result) => {
        try {
          await addQrPayload(result.data || result);
          await stopScanner();
        } catch (e) {
          showToast(e.message);
        }
      },
      getQrScannerOptions()
    );
  }
  scannerWrap.classList.remove("hidden");
  toggleScannerBtn.disabled = true;
  toggleScannerBtn.textContent = "카메라 사용 중";
  await scanner.start();
  scannerOpen = true;
}

async function stopScanner() {
  if (scanner && scannerOpen) {
    await scanner.stop();
  }
  scannerOpen = false;
  scannerWrap.classList.add("hidden");
  toggleScannerBtn.disabled = false;
  toggleScannerBtn.textContent = "카메라 스캔";
}

toggleScannerBtn.onclick = async () => {
  try {
    await startScanner();
  } catch (e) {
    showToast("카메라 시작 실패");
    await stopScanner();
  }
};

cancelScannerBtn.onclick = async () => {
  try {
    await stopScanner();
  } catch (e) {
    showToast("카메라 종료 실패");
  }
};

bg.onload = () => {
  chars.forEach((ch, index) => {
    if (!ch.platformConfig) {
      assignPosition(ch, index);
    }
  });
};

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
loadAppConfig();
loadChars().then(() => render());
