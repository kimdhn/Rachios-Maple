const $ = (id) => document.getElementById(id);
const nameInput = $("octoNameInput");
const startBtn = $("octoStartBtn");
const feedBtn = $("feedBtn");
const stopBtn = $("stopBtn");
const toast = $("toast");
const guestCheck = $("guestCheck");

const RESULT_LABELS = { max: "9레벨 달성", run: "도망", stopped: "멈춤", exhausted: "먹이 소진" };
const FLASH_TEXT = { success: "성공!", fail: "실패", run: "도망!" };

// Look API emotion codes (see queryparam.md).
const FACES = { idle: "E00", success: "E02", fail: "E20", run: "E03", stopped: "E01", max: "E13" };

let game = null;
let look = null;
let busy = false;

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2200);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function post(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || "요청에 실패했습니다");
  }
  return data;
}

function octopusImage(g) {
  if (g.status === "run") return "octopus_run.png";
  if (g.level >= 9) return "octopus_4.png";
  if (g.level >= 7) return "octopus_3.png";
  if (g.level >= 4) return "octopus_2.png";
  return "octopus_1.png";
}

const pct = (p) => `${+(p * 100).toFixed(1)}%`;

function render() {
  const g = game || { level: 1, trials: 0, max_trials: 100, status: "idle", probs: [1, 0, 0] };
  const playing = g.status === "playing";
  $("trialsText").textContent = g.trials;
  $("maxTrialsText").textContent = g.max_trials;
  $("octoImg").src = `/static/${octopusImage(g)}`;
  if (look) $("charImg").src = faceUrl(currentFace(g));
  $("levelNow").textContent = `Lv. ${g.level}`;
  document.querySelectorAll("#probTableBody tr").forEach((row) => {
    row.classList.toggle("current", Boolean(game) && Number(row.dataset.level) === g.level);
  });

  const hasNext = Boolean(g.probs) && g.status !== "run";
  $("levelArrow").hidden = !hasNext;
  $("levelNext").hidden = !hasNext;
  $("probRows").hidden = !hasNext;
  if (hasNext) {
    const [success, fail, run] = g.probs;
    $("levelNext").textContent = `Lv. ${g.level + 1}`;
    $("probSuccess").textContent = `▲ ${pct(success)}`;
    $("probFail").textContent = `▼ ${pct(fail)}`;
    $("probRun").textContent = pct(run);
  }

  const message = $("octoMessage");
  message.classList.toggle("ended", Boolean(game) && !playing);
  if (!game) {
    message.textContent = "오른쪽에서 닉네임을 입력하고 시작하세요";
  } else if (playing) {
    message.textContent = `현재 레벨 : ${g.level}`;
  } else {
    const title = g.status === "run" ? "게임오버" : RESULT_LABELS[g.status];
    message.textContent = `${title} · Lv.${g.level} / ${g.trials}회 기록`;
  }

  // Once a game ends the feed button becomes "새로 키우기".
  feedBtn.disabled = !game;
  feedBtn.textContent = game && !playing ? "새로 키우기" : "먹이주기";
  stopBtn.disabled = !playing;
}

function flash(result) {
  const el = $("octoFlash");
  el.textContent = FLASH_TEXT[result] || "";
  el.className = `octo-flash ${result}`;
  void el.offsetWidth; // restart the animation
  el.classList.add("show");
}

function faceUrl(emotion) {
  const real = `https://open.api.nexon.com/static/maplestory/character/look/${look}?action=A00&emotion=${emotion}&wmotion=W04`;
  return `/api/proxy?url=${encodeURIComponent(real)}`;
}

function currentFace(g) {
  if (g.status === "run" || g.status === "stopped" || g.status === "max") return FACES[g.status];
  return FACES[g.last] || FACES.idle;
}

const GUEST_TAG = `<span class="guest-tag">GUEST</span>`;

function showCharacter(g, nextLook) {
  look = nextLook;
  if (look) {
    // Warm the proxy cache so the face swaps instantly on each feed.
    Object.values(FACES).forEach((emotion) => { new Image().src = faceUrl(emotion); });
  }
  $("charImg").hidden = !look;
  $("guestAvatar").hidden = Boolean(look);
  $("charName").innerHTML = `${g.guest ? GUEST_TAG : ""}${escapeHtml(g.name)}`;
  $("charName").hidden = false;
}

async function loadRank() {
  const rows = await (await fetch("/api/octopus/rank")).json();
  const panel = $("octoRank");
  if (!rows.length) {
    panel.innerHTML = `<div class="empty-rank">아직 기록이 없습니다</div>`;
    return;
  }
  panel.innerHTML = rows.map((r, i) => `
    <div class="rank-row rank-${i < 3 ? i + 1 : "default"}">
      <span class="rank-num">${i + 1}</span>
      ${r.guest
        ? `<span class="rank-name">${escapeHtml(r.name)}${GUEST_TAG}</span>`
        : `<a class="rank-name" href="https://chuchu.gg/char/${encodeURIComponent(r.name)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.name)}</a>`}
      <span class="rank-meta">Lv.${r.level} · ${r.trials}회${r.result === "run" ? " · 도망" : ""}</span>
    </div>
  `).join("");
}

async function loadProbs() {
  const probs = await (await fetch("/api/octopus/probs")).json();
  $("probTableBody").innerHTML = Object.entries(probs).map(([level, p]) => `
    <tr data-level="${level}">
      <td>${level}레벨</td>${p.map((v) => `<td>${pct(v)}</td>`).join("")}
    </tr>
  `).join("");
  render();
}

async function start(name, guest) {
  if (!name) {
    showToast("닉네임을 입력해주세요");
    return;
  }
  startBtn.disabled = true;
  try {
    const data = await post("/api/octopus/start", { name, guest });
    game = data.game;
    showCharacter(game, data.look);
    render();
  } catch (e) {
    showToast(e.message);
  } finally {
    startBtn.disabled = false;
  }
}

async function act(action) {
  if (busy || !game) return;
  busy = true;
  try {
    const data = await post(`/api/octopus/${action}`, { name: game.name, guest: game.guest });
    game = data.game;
    if (action === "feed") flash(game.last);
    render();
    if (game.status !== "playing") await loadRank();
  } catch (e) {
    showToast(e.message);
  } finally {
    busy = false;
  }
}

startBtn.onclick = () => start(nameInput.value.trim(), guestCheck.checked);
guestCheck.onchange = () => {
  nameInput.placeholder = guestCheck.checked ? "게스트 닉네임 (자유)" : "캐릭터 닉네임";
  nameInput.maxLength = guestCheck.checked ? 12 : 524288;
};
nameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") startBtn.click();
});
feedBtn.onclick = () => (game && game.status !== "playing" ? start(game.name, game.guest) : act("feed"));
stopBtn.onclick = () => {
  if (confirm(`지금 멈추면 Lv.${game.level} (${game.trials}회)로 기록됩니다. 멈출까요?`)) {
    act("stop");
  }
};

$("probToggleBtn").onclick = () => {
  const open = $("probPanel").hidden;
  $("probPanel").hidden = !open;
  $("probToggleBtn").setAttribute("aria-expanded", String(open));
};

render();
loadRank();
loadProbs();
