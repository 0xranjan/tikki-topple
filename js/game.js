/* ============================================================
   TIKI TOPPLE – Complete Game Logic  (FIXED v2)
   NPC Board2Code Hackathon 2026
   ============================================================

   HOW MOVE WORKS (corrected):
   - The "active stack" concept: all tokens live in one ordered list
     called G.stack.  Tokens that have been placed on the board are
     ALSO tracked by G.board[pos], but the canonical order comes from
     G.stack.
   - On Move: the player selects the TOP 1-3 tokens of G.stack.
     Each selected token advances its position by +1.
     If a token was at position 0 (not yet on board) it goes to 1.
     If it was at position N it goes to N+1 (capped at boardLen).
   - On Reorder: swap the order of top 2-3 tokens inside G.stack
     (their board positions do NOT change, only stack order changes).
   - This means: tokens stay in the stack forever (the stack represents
     the ordering of ALL tokens), but each has a position on the track.
     The stack order decides WHICH tokens are accessible (top 3 only).
   ============================================================ */

"use strict";

const TIKI_FACES    = ["🗿","🪆","🎭","🦁","🐯","🐸","👺","👹","🤖"];
const TIKI_NAMES    = ["Wikiw","Kafi","Aku","Hanu","Zuri","Toro","Raka","Mako","Sulo"];
const PLAYER_COLORS = ["#ff4757","#1e90ff","#2ecc71","#f39c12"];
const RANK_POINTS   = [50,35,25,18,14,10,7,4,2];

let G = {};

const $  = id => document.getElementById(id);
const qs = (s, ctx=document) => ctx.querySelector(s);

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id).classList.add("active");
}

/* ════════════════════════════════════════════════════════════
   SETUP
═══════════════════════════════════════════════════════════ */
let setup = { numPlayers:2, boardLen:10, maxTurns:25 };

function initSetup() {
  document.querySelectorAll(".pcount-btn").forEach(btn =>
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pcount-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      setup.numPlayers = +btn.dataset.count;
      renderNameInputs();
    }));

  document.querySelectorAll(".board-btn").forEach(btn =>
    btn.addEventListener("click", () => {
      document.querySelectorAll(".board-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      setup.boardLen = +btn.dataset.len;
    }));

  document.querySelectorAll(".turn-btn").forEach(btn =>
    btn.addEventListener("click", () => {
      document.querySelectorAll(".turn-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      setup.maxTurns = +btn.dataset.turns;
    }));

  $("btn-start").addEventListener("click", startGame);
  renderNameInputs();
}

function renderNameInputs() {
  let html = '<div class="player-names">';
  for (let i = 0; i < setup.numPlayers; i++) {
    html += `
      <div class="player-name-row">
        <div class="player-name-dot" style="background:${PLAYER_COLORS[i]}"></div>
        <input class="player-name-input" type="text" id="pname-${i}"
          placeholder="Player ${i+1}" maxlength="16"/>
      </div>`;
  }
  $("player-names-wrap").innerHTML = html + "</div>";
}

/* ════════════════════════════════════════════════════════════
   START GAME
═══════════════════════════════════════════════════════════ */
function startGame() {
  const n = setup.numPlayers;
  const names = [];
  for (let i = 0; i < n; i++) {
    const el = $("pname-" + i);
    names.push((el && el.value.trim()) || "Player " + (i + 1));
  }

  const TOTAL = 9;
  // Distribute tokens round-robin then shuffle so ownership is random
  const own = [];
  for (let t = 0; t < TOTAL; t++) own.push(t % n);
  shuffleArray(own);

  // Build tokens — all start at position 0 (not yet on track)
  const tokens = [];
  for (let t = 0; t < TOTAL; t++) {
    tokens.push({
      id: t,
      name: TIKI_NAMES[t],
      face: TIKI_FACES[t],
      owner: own[t],
      position: 0        // 0 = in stack, 1..boardLen = on track
    });
  }

  // G.stack = ordered list of ALL token ids, index 0 = top of stack
  const stack = tokens.map(t => t.id);
  shuffleArray(stack);

  G = {
    players  : names.map((nm, i) => ({ id:i, name:nm, color:PLAYER_COLORS[i], score:0 })),
    tokens,
    stack,               // ALL 9 tokens stay here; order changes via Reorder action
    boardLen : setup.boardLen,
    maxTurns : setup.maxTurns,
    turn     : 1,
    curPlayer: 0,
    selected : [],       // token ids currently selected (must be top of stack)
    rDraft   : [],
    rOpen    : false,
    log      : []
  };

  showScreen("screen-game");
  renderAll();
}

/* ════════════════════════════════════════════════════════════
   RENDER
═══════════════════════════════════════════════════════════ */
function renderAll() {
  renderHeader();
  renderStack();
  renderBoard();
  refreshBtns();
  renderScores();
  renderLog();
}

/* ── Header ── */
function renderHeader() {
  $("turn-current").textContent = G.turn;
  $("turn-max").textContent     = G.maxTurns;
  const p = G.players[G.curPlayer];
  $("cur-player-name").textContent  = p.name;
  $("cur-player-dot").style.background = p.color;
}

/* ── Stack panel ── */
function renderStack() {
  const wrap = $("stack-display");
  wrap.innerHTML = "";

  G.stack.forEach((tid, idx) => {
    const tok   = G.tokens[tid];
    const owner = G.players[tok.owner];
    const canSel = isSelectable(idx);
    const isSel  = G.selected.includes(tid);

    const chip = document.createElement("div");
    chip.className = `token-chip tiki-${tid}`;
    if (isSel)   chip.classList.add("selected");
    if (!canSel) chip.classList.add("disabled-token");

    // Show current track position on the chip
    const posLabel = tok.position === 0
      ? "Stack"
      : (tok.position === G.boardLen ? "🏁 Finish" : `Pos ${tok.position}`);

    chip.innerHTML = `
      <span class="token-face">${tok.face}</span>
      <div class="token-label">
        <div style="font-size:13px">${tok.name}</div>
        <div style="font-size:10px;color:${owner.color};font-weight:700">${owner.name}</div>
      </div>
      <div style="text-align:right">
        <div class="token-pos-badge">#${idx+1}</div>
        <div style="font-size:9px;color:rgba(255,255,255,0.4);font-weight:700">${posLabel}</div>
      </div>`;

    if (canSel) chip.addEventListener("click", () => toggleSel(tid, idx));
    wrap.appendChild(chip);
  });

  updateSelInfo();
}

/* A token is selectable only if it's in the top-3 of the stack
   AND all tokens above it (lower stack index) are already selected */
function isSelectable(idx) {
  if (idx >= 3) return false;
  for (let i = 0; i < idx; i++) {
    if (!G.selected.includes(G.stack[i])) return false;
  }
  return true;
}

function toggleSel(tid, idx) {
  if (G.selected.includes(tid)) {
    // Deselect this token and all tokens at higher stack indices that are selected
    const toRemove = new Set(G.stack.slice(idx).filter(id => G.selected.includes(id)));
    G.selected = G.selected.filter(id => !toRemove.has(id));
  } else {
    if (G.selected.length < 3) G.selected.push(tid);
  }
  renderStack();
  refreshBtns();
}

function updateSelInfo() {
  const info = $("selection-info");
  const n = G.selected.length;
  info.textContent = n === 0
    ? "Click top tokens to select (max 3)"
    : `Selected (${n}): ${G.selected.map(id => G.tokens[id].name).join(", ")}`;
}

/* Are all selected tokens contiguous starting from index 0 of stack? */
function selContiguousTop() {
  if (!G.selected.length) return false;
  const idxs = G.selected.map(id => G.stack.indexOf(id));
  if (idxs.some(i => i === -1)) return false;
  const sorted = [...idxs].sort((a,b) => a-b);
  if (sorted[0] !== 0) return false;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i-1]+1) return false;
  }
  return true;
}

/* ── Board / Track panel ── */
function renderBoard() {
  const track = $("board-track");
  track.innerHTML = "";

  // Build a lookup: position → array of token ids AT that position
  const posMap = {};
  for (let p = 1; p <= G.boardLen; p++) posMap[p] = [];
  G.tokens.forEach(t => {
    if (t.position >= 1 && t.position <= G.boardLen) posMap[t.position].push(t.id);
  });

  // Finish label row (above boardLen)
  const fin = document.createElement("div");
  fin.className = "track-cell finish-cell";
  fin.innerHTML = `<span class="cell-label">🏁</span><div class="cell-tokens"></div>`;
  track.appendChild(fin);

  // Positions from high → low (top of screen = closer to finish)
  for (let pos = G.boardLen; pos >= 1; pos--) {
    const cell = document.createElement("div");
    cell.className = "track-cell" + (pos === 1 ? " start-cell" : "");

    const toksHtml = posMap[pos].map(id => {
      const t = G.tokens[id];
      const stackRank = G.stack.indexOf(id);  // position in stack (lower = nearer top)
      const isTop3 = stackRank < 3;
      const isSel  = G.selected.includes(id);
      const highlight = isSel ? "outline:2px solid #ffd130;" : (isTop3 ? "outline:1px dashed rgba(255,209,48,0.4);" : "");
      return `<span class="track-token tiki-track-${id}"
                style="${highlight}"
                title="${t.name} | ${G.players[t.owner].name} | Stack #${stackRank+1}">
                ${t.face} ${t.name}
              </span>`;
    }).join("");

    cell.innerHTML = `<span class="cell-label">${pos}</span><div class="cell-tokens">${toksHtml || ""}</div>`;
    track.appendChild(cell);
  }

  // Stack row (position 0 tokens)
  const stackToks = G.tokens.filter(t => t.position === 0);
  const sc = document.createElement("div");
  sc.className = "track-cell start-cell";
  const stHtml = stackToks.map(t =>
    `<span class="track-token tiki-track-${t.id}">${t.face}</span>`
  ).join("");
  sc.innerHTML = `<span class="cell-label">STACK</span><div class="cell-tokens">${stHtml}</div>`;
  track.appendChild(sc);
}

/* ── Action buttons ── */
function refreshBtns() {
  const n  = G.selected.length;
  const ok = selContiguousTop();
  $("btn-move").disabled    = !(n >= 1 && n <= 3 && ok);
  $("btn-reorder").disabled = !(n >= 2 && n <= 3 && ok);
}

/* ── Scores ── */
function calcScores() {
  // Rank tokens by position descending; higher position = more points
  const sorted = [...G.tokens].sort((a,b) => b.position - a.position);
  const pts = {};
  let r = 0, i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length && sorted[j].position === sorted[i].position) j++;
    // Average rank points for ties
    let sum = 0;
    for (let k = r; k < r+(j-i); k++) sum += (RANK_POINTS[k] || 1);
    const avg = Math.round(sum / (j - i));
    for (let k = i; k < j; k++) pts[sorted[k].id] = avg;
    r += (j - i);
    i = j;
  }
  G.players.forEach(p => {
    p.score = G.tokens
      .filter(t => t.owner === p.id)
      .reduce((s, t) => s + (pts[t.id] || 0), 0);
  });
}

function renderScores() {
  calcScores();
  const sorted = [...G.players].sort((a,b) => b.score - a.score);
  $("score-board").innerHTML = sorted.map(p => {
    const faces = G.tokens.filter(t => t.owner === p.id).map(t => t.face).join("");
    return `
      <div class="score-row">
        <div class="score-dot" style="background:${p.color}"></div>
        <div style="flex:1">
          <div class="score-name">${p.name}</div>
          <div class="score-tokens">${faces}</div>
        </div>
        <div class="score-val">${p.score}</div>
      </div>`;
  }).join("");
}

/* ── Log ── */
function addLog(msg) {
  G.log.unshift(`T${G.turn}: ${msg}`);
  if (G.log.length > 30) G.log.pop();
}

function renderLog() {
  $("log-entries").innerHTML = G.log.slice(0, 8).map((e, i) =>
    `<div class="log-entry ${i===0?"log-new":""}">${e}</div>`
  ).join("");
}

/* ════════════════════════════════════════════════════════════
   ACTION: MOVE FORWARD
   ─────────────────────────────────────────────────────────
   Selected tokens (top 1-3 of stack) each advance +1 position.
   Stack ORDER does not change — only position values change.
   Tokens at boardLen (finish) cannot advance further.
═══════════════════════════════════════════════════════════ */
$("btn-move").addEventListener("click", () => {
  if (!selContiguousTop()) return;

  // Sort selected by stack order (top first)
  const toMove = [...G.selected].sort((a,b) => G.stack.indexOf(a) - G.stack.indexOf(b));

  const moved = [];
  toMove.forEach(id => {
    const tok = G.tokens[id];
    if (tok.position < G.boardLen) {
      tok.position += 1;
      moved.push(`${tok.name}→${tok.position}`);
    } else {
      moved.push(`${tok.name}(at finish)`);
    }
  });

  // ✅ Remove toppled tokens (reached boardLen) from the stack immediately
  G.stack = G.stack.filter(id => G.tokens[id].position < G.boardLen);

  addLog(`${G.players[G.curPlayer].name} moved [${moved.join(", ")}]`);
  G.selected = [];
  doEndTurn();
});

/* ════════════════════════════════════════════════════════════
   ACTION: REORDER
   ─────────────────────────────────────────────────────────
   Selected top 2-3 tokens are rearranged within G.stack.
   Their positions on the track do NOT change.
   Only the stack order changes (which affects future accessibility).
═══════════════════════════════════════════════════════════ */
$("btn-reorder").addEventListener("click", () => {
  if (!selContiguousTop()) return;
  const sel = [...G.selected].sort((a,b) => G.stack.indexOf(a) - G.stack.indexOf(b));
  G.rDraft = [...sel];
  G.rOpen  = true;
  $("reorder-panel").classList.remove("hidden");
  $("btn-move").disabled    = true;
  $("btn-reorder").disabled = true;
  renderRList();
});

function renderRList() {
  const list = $("reorder-list");
  list.innerHTML = "";
  G.rDraft.forEach((tid, i) => {
    const tok   = G.tokens[tid];
    const owner = G.players[tok.owner];
    const item  = document.createElement("div");
    item.className      = `reorder-item tiki-${tid}`;
    item.draggable      = true;
    item.dataset.index  = i;
    item.innerHTML = `
      <span class="drag-handle">⠿</span>
      <span class="token-face">${tok.face}</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:800">${tok.name}</div>
        <div style="font-size:10px;color:${owner.color};font-weight:700">${owner.name}</div>
      </div>
      <span style="font-size:10px;opacity:0.5">#${i+1} from top</span>`;

    item.addEventListener("dragstart", e => {
      dragSrc = +e.currentTarget.dataset.index;
      e.currentTarget.style.opacity = "0.45";
    });
    item.addEventListener("dragover",  e => {
      e.preventDefault();
      e.currentTarget.classList.add("drag-over");
    });
    item.addEventListener("dragleave", e => e.currentTarget.classList.remove("drag-over"));
    item.addEventListener("drop", e => {
      e.preventDefault();
      const tgt = +e.currentTarget.dataset.index;
      if (dragSrc !== null && dragSrc !== tgt) {
        [G.rDraft[dragSrc], G.rDraft[tgt]] = [G.rDraft[tgt], G.rDraft[dragSrc]];
        renderRList();
      }
      e.currentTarget.classList.remove("drag-over");
    });
    item.addEventListener("dragend", e => {
      e.currentTarget.style.opacity = "1";
      dragSrc = null;
    });

    list.appendChild(item);
  });
}

let dragSrc = null;

$("btn-confirm-reorder").addEventListener("click", () => {
  // Find the positions of the draft tokens in the current stack
  const positions = G.rDraft.map(id => G.stack.indexOf(id)).sort((a,b) => a-b);
  // Remove them from stack
  G.rDraft.forEach(id => {
    const idx = G.stack.indexOf(id);
    if (idx !== -1) G.stack.splice(idx, 1);
  });
  // Re-insert in new order at the original top positions
  G.stack.splice(positions[0], 0, ...G.rDraft);

  addLog(`${G.players[G.curPlayer].name} reordered: [${G.rDraft.map(id => G.tokens[id].name).join(" → ")}]`);
  G.rDraft = []; G.rOpen = false; G.selected = [];
  $("reorder-panel").classList.add("hidden");
  doEndTurn();
});

$("btn-cancel-reorder").addEventListener("click", () => {
  G.rDraft = []; G.rOpen = false; G.selected = [];
  $("reorder-panel").classList.add("hidden");
  renderAll();
});

/* ════════════════════════════════════════════════════════════
   TURN END
═══════════════════════════════════════════════════════════ */
function doEndTurn() {
  if (checkEnd()) { doShowResults(); return; }

  G.turn++;
  G.curPlayer = (G.curPlayer + 1) % G.players.length;
  G.selected  = [];

  const next = G.players[G.curPlayer];
  $("modal-turn-title").textContent = `${next.name}'s Turn`;
  $("modal-turn-msg").textContent   = `Pass the device to ${next.name}. Press Ready when set!`;
  $("modal-turn").classList.remove("hidden");
  renderAll();
}

function checkEnd() {
  // End if turn limit reached
  if (G.turn >= G.maxTurns) return true;
  // End if all tokens have reached the finish line
  return G.tokens.every(t => t.position >= G.boardLen);
}

/* ════════════════════════════════════════════════════════════
   RESULTS
═══════════════════════════════════════════════════════════ */
function doShowResults() {
  calcScores();
  const sorted = [...G.players].sort((a,b) => b.score - a.score);
  const medals = ["🥇","🥈","🥉","4️⃣"];
  $("results-list").innerHTML = sorted.map((p, i) => `
    <div class="result-row rank-${i+1}">
      <div class="result-rank">${medals[i] || (i+1)}</div>
      <div class="result-dot" style="background:${p.color}"></div>
      <div class="result-name">${p.name}</div>
      <div class="result-score">${p.score} pts</div>
    </div>`).join("");
  showScreen("screen-results");
}

/* ════════════════════════════════════════════════════════════
   MODAL EVENTS
═══════════════════════════════════════════════════════════ */
$("btn-rules-modal").addEventListener("click", () => $("modal-rules").classList.remove("hidden"));
$("modal-close").addEventListener("click",     () => $("modal-rules").classList.add("hidden"));
qs("#modal-rules .modal-overlay").addEventListener("click", () => $("modal-rules").classList.add("hidden"));
$("modal-turn-ok").addEventListener("click", () => {
  $("modal-turn").classList.add("hidden");
  renderAll();
});
$("btn-play-again").addEventListener("click", () => showScreen("screen-setup"));

/* ════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════ */
function shuffleArray(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

/* ════════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  initSetup();
  showScreen("screen-setup");
});
