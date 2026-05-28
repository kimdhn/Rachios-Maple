// Fame character placement settings.
// Coordinates are absolute positions in static/fame.png.
window.FAME_SCENE_VIEWPORT = {
  cameraOffsetX: 0,
  cameraOffsetY: 0
};

window.FAME_WORLD_SIZE = {
  width: 2752,
  height: 1536
};

window.FAME_PLATFORMS = [
  {
    imageBottomLeft: { x: 1450, y: 1005 },
    path: [{ x: 1450, y: 1005 }, { x: 1450, y: 1005 }],
    walkRange: { minX: 1450, maxX: 1450 },
    direction: -1,
    action: "A00",
    emotion: "E17",
    move: true,
    actionFrameMax: 0,
    emotionFrameMax: 1,
    frameTicks: 24
  },
  {
    imageBottomLeft: { x: 981, y: 1193 },
    path: [{ x: 981, y: 1193 }, { x: 981, y: 1193 }],
    walkRange: { minX: 981, maxX: 981 },
    direction: 1,
    action: "A00",
    emotion: "E12",
    move: true,
    actionFrameMax: 0,
    emotionFrameMax: 1,
    frameTicks: 24
  },
  {
    imageBottomLeft: { x: 1772, y: 1193 },
    path: [{ x: 1772, y: 1193 }, { x: 1772, y: 1193 }],
    walkRange: { minX: 1772, maxX: 1772 },
    direction: -1,
    action: "A00",
    emotion: "E09",
    move: true,
    actionFrameMax: 0,
    emotionFrameMax: 1,
    frameTicks: 24
  },
  { imageBottomLeft: { x: 124, y: 1380 }, path: [{ x: 124, y: 1380 }, { x: 124, y: 1380 }], walkRange: { minX: 124, maxX: 124 }, direction: 1, action: "A00", emotion: "E00", frameTicks: 18 },
  { imageBottomLeft: { x: 428, y: 1380 }, path: [{ x: 428, y: 1380 }, { x: 428, y: 1380 }], walkRange: { minX: 428, maxX: 428 }, direction: 1, action: "A00", emotion: "E00", frameTicks: 18 },
  { imageBottomLeft: { x: 732, y: 1380 }, path: [{ x: 732, y: 1380 }, { x: 732, y: 1380 }], walkRange: { minX: 732, maxX: 732 }, direction: 1, action: "A00", emotion: "E00", frameTicks: 18 },
  { imageBottomLeft: { x: 2021, y: 1380 }, path: [{ x: 2021, y: 1380 }, { x: 2021, y: 1380 }], walkRange: { minX: 2021, maxX: 2021 }, direction: -1, action: "A00", emotion: "E00", frameTicks: 18 },
  { imageBottomLeft: { x: 2325, y: 1380 }, path: [{ x: 2325, y: 1380 }, { x: 2325, y: 1380 }], walkRange: { minX: 2325, maxX: 2325 }, direction: -1, action: "A00", emotion: "E00", frameTicks: 18 },
  { imageBottomLeft: { x: 2629, y: 1380 }, path: [{ x: 2629, y: 1380 }, { x: 2629, y: 1380 }], walkRange: { minX: 2629, maxX: 2629 }, direction: -1, action: "A00", emotion: "E00", frameTicks: 18 }
];

window.FAME_ROAMING_PLATFORM = window.FAME_PLATFORMS[window.FAME_PLATFORMS.length - 1];
