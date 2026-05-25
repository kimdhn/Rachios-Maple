// Character placement settings.
// All coordinates are absolute positions in the original background image.
// Scene viewport settings.
// cameraOffsetX/cameraOffsetY move the cropped viewport in world pixels.
// Positive cameraOffsetY shows a lower part of the background.
window.SCENE_VIEWPORT = {
  cameraOffsetX: 0,
  cameraOffsetY: 40
};

// imageBottomCenter is the pixel where the rendered character image's
// horizontal center and bottom edge should be placed.
// path is the world-coordinate foot line for this platform.
// direction: 1 = right, -1 = left.
// frameTicks controls how many render ticks each animation frame lasts.
// frameOffsets nudges only the rendered sprite for a specific animation frame.
// Supported frameOffsets keys: "index:0", "action:2", "emotion:1", or "default".
window.CHARACTER_PLATFORMS = [
  // 1번 -> 좌상단 건물 위
  {
    imageBottomCenter: { x: 512, y: 506 },
    path: [{ x: 512, y: 516 }, { x: 512, y: 516 }],
    walkRange: { minX: 512, maxX: 512 },
    direction: 1,
    action: "A11",
    emotion: "E12",
    move: true,
    actionFrameMax: 0,
    emotionFrameMax: 1,
    frameTicks: 18,
    frameOffsets: {
      "emotion:1": {x : 2}
    }
  },
  // 2번 -> 우상단 건물 위
  {
    imageBottomCenter: { x: 1588, y: 551 },
    path: [{ x: 1588, y: 551 }, { x: 1588, y: 551 }],
    walkRange: { minX: 1588, maxX: 1588 },
    direction: -1,
    action: "A11",
    emotion: "E09",
    move: true,
    actionFrameMax: 2,
    frameTicks: 30
  },
  // 3번 -> 사자상
  {
    imageBottomCenter: { x: 1250, y: 1090 },
    path: [{ x: 1250, y: 1090 }, { x: 1250, y: 1090 }],
    walkRange: { minX: 1250, maxX: 1250 },
    direction: -1,
    action: "A07",
    emotion: "E17",
    move: true,
    actionFrameMax: 2,
    emotionFrameMax: 1,
    frameTicks: 18
  },
  // 4번 -> 좌측 계단
  {
    imageBottomCenter: { x: 255, y: 1408 },
    path: [{ x: 255, y: 1408 }, { x: 255, y: 1408 }],
    walkRange: { minX: 255, maxX: 255 },
    direction: -1,
    action: "A07",
    emotion: "E08",
    move: true,
    emotionFrameMax: 1,
    frameTicks: 18,
    frameOffsets: {
      "emotion:1": { x: -1 }
    }
  },
  // 5번 -> 좌측 풀숲, 주황버섯 아래
  {
    imageBottomCenter: { x: 723, y: 1384 },
    path: [{ x: 723, y: 1384 }, { x: 723, y: 1384 }],
    walkRange: { minX: 723, maxX: 723 },
    direction: -1,
    action: "A07",
    emotion: "E13",
    move: true,
    emotionFrameMax: 1,
    frameTicks: 18
  },
  // 6번 -> 사자상 왼쪽
  {
    imageBottomCenter: { x: 905, y: 1385 },
    path: [{ x: 905, y: 1385 }, { x: 905, y: 1385 }],
    walkRange: { minX: 905, maxX: 905 },
    direction: 1,
    action: "A00",
    emotion: "E22",
    move: true,
    actionFrameMax: 2,
    frameTicks: 30,
    frameOffsets: {
      "action:1": { x : 1, y: -2 },
      "action:2": { x : 1, y: -2 }
    }
  },
  // 7번 -> 사자상 아래
  {
    imageBottomCenter: { x: 1201, y: 1435 },
    path: [{ x: 1201, y: 1435 }, { x: 1201, y: 1435 }],
    walkRange: { minX: 1201, maxX: 1201 },
    direction: -1,
    action: "A04",
    emotion: "E09",
    frameTicks: 18
  },
  // 8번 -> 사자상 오른쪽
  {
    imageBottomCenter: { x: 1553, y: 1356 },
    path: [{ x: 1553, y: 1356 }, { x: 1553, y: 1356 }],
    walkRange: { minX: 1553, maxX: 1553 },
    direction: 1,
    action: "A07",
    emotion: "E15",
    move: true,
    emotionFrameMax: 1,
    frameTicks: 18,
    frameOffsets: {
      "emotion:1": { x: 5 }
    }
  },
  // 9번 -> 오른쪽 나무 옆
  {
    imageBottomCenter: { x: 2277, y: 1258 },
    path: [{ x: 2277, y: 1258 }, { x: 2277, y: 1258 }],
    walkRange: { minX: 2277, maxX: 2277 },
    direction: -1,
    action: "A05",
    emotion: "E04",
    move: true,
    actionFrameMax: 1,
    frameTicks: 18
  }
];
