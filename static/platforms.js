// Character placement settings.
// All coordinates are absolute positions in the original background image.
// Scene viewport settings.
// cameraOffsetX/cameraOffsetY move the cropped viewport in world pixels.
// Positive cameraOffsetY shows a lower part of the background.
window.SCENE_VIEWPORT = {
  cameraOffsetX: 0,
  cameraOffsetY: 60
};

// imageBottomLeft is the direction-aware bottom edge coordinate:
// left-facing characters use it as bottom-right, right-facing characters
// use it as bottom-left.
// path is the world-coordinate bottom edge foot line for this platform.
// direction: 1 = right, -1 = left.
// frameTicks controls how many render ticks each animation frame lasts.
// frameOffsets nudges only the rendered sprite for a specific animation frame.
// Supported frameOffsets keys: "index:0", "action:2", "emotion:1", or "default".
window.CHARACTER_PLATFORMS = [
  // 1번 -> 좌상단 건물 위
  {
    imageBottomLeft: { x: 456, y: 520 },
    path: [{ x: 456, y: 520 }, { x: 456, y: 520 }],
    walkRange: { minX: 456, maxX: 456 },
    direction: 1,
    action: "A11",
    emotion: "E12",
    move: true,
    actionFrameMax: 0,
    emotionFrameMax: 1,
    frameTicks: 18,
    frameOffsets: {
      "emotion:1": {x : 0}
    }
  },
  // 2번 -> 우상단 건물 위
  {
    imageBottomLeft: { x: 1637, y: 551 },
    path: [{ x: 1637, y: 551 }, { x: 1637, y: 551 }],
    walkRange: { minX: 1539, maxX: 1539 },
    direction: -1,
    action: "A11",
    emotion: "E09",
    move: true,
    actionFrameMax: 2,
    frameTicks: 30
  },
  // 3번 -> 사자상
  {
    imageBottomLeft: { x: 1299, y: 1090 },
    path: [{ x: 1299, y: 1090 }, { x: 1299, y: 1090 }],
    walkRange: { minX: 1201, maxX: 1201 },
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
    imageBottomLeft: { x: 308, y: 1408 },
    path: [{ x: 308, y: 1408 }, { x: 308, y: 1408 }],
    walkRange: { minX: 202, maxX: 202 },
    direction: -1,
    action: "A07",
    emotion: "E08",
    move: true,
    emotionFrameMax: 1,
    frameTicks: 30,
  },
  // 5번 -> 좌측 풀숲, 주황버섯 아래
  {
    imageBottomLeft: { x: 772, y: 1384 },
    path: [{ x: 772, y: 1384 }, { x: 772, y: 1384 }],
    walkRange: { minX: 674, maxX: 674 },
    direction: -1,
    action: "A07",
    emotion: "E13",
    move: true,
    emotionFrameMax: 1,
    frameTicks: 18
  },
  // 6번 -> 사자상 왼쪽
  {
    imageBottomLeft: { x: 820, y: 1385 },
    path: [{ x: 820, y: 1385 }, { x: 820, y: 1385 }],
    walkRange: { minX: 905, maxX: 905 },
    direction: 1,
    action: "A00",
    emotion: "E22",
    move: true,
    actionFrameMax: 2,
    frameTicks: 50,
    frameOffsets: {
      "action:1": { x: 2, y: -2 },
      "action:2": { x: 2, y: -2 }
    }
  },
  // 7번 -> 사자상 아래
  {
    imageBottomLeft: { x: 1290, y: 1435 },
    path: [{ x: 1290, y: 1435 }, { x: 1290, y: 1435 }],
    walkRange: { minX: 1138, maxX: 1138 },
    direction: -1,
    action: "A04",
    emotion: "E09",
    frameTicks: 18
  },
  // 8번 -> 사자상 오른쪽
  {
    imageBottomLeft: { x: 1495, y: 1356 },
    path: [{ x: 1495, y: 1356 }, { x: 1495, y: 1356 }],
    walkRange: { minX: 1495, maxX: 1495 },
    direction: 1,
    action: "A07",
    emotion: "E15",
    move: true,
    emotionFrameMax: 1,
    frameTicks: 25
  },
  // 9번 -> 오른쪽 나무 옆
  {
    imageBottomLeft: { x: 2228, y: 1258 },
    path: [{ x: 2228, y: 1258 }, { x: 2228, y: 1258 }],
    walkRange: { minX: 2228, maxX: 2228 },
    direction: -1,
    action: "A05",
    emotion: "E04",
    move: true,
    actionFrameMax: 1,
    frameTicks: 18
  }
];
