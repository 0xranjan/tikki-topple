/* ============================================================
   TIKI TOPPLE – Complete Game Logic (PRODUCTION VERSION)
   NPC Board2Code Hackathon 2026 – ALL ERRORS FIXED
   ============================================================

   HOW MOVE WORKS:
   - G.stack = ordered list of ALL token ids (canonical order)
   - Each token has a position (0 = not on board, 1..boardLen = track position)
   - On Move: top 1-3 tokens advance +1 position each
   - On Reorder: stack order changes, track positions stay same
   ============================================================ */

"use strict";

const TIKI_FACES    = ["🗿","🪆","🎭","🦁","🐯","🐸","👺","👹","🤖"];
const TIKI_NAMES    = ["Wikiw","Kafi","Aku","Hanu","Zuri","Toro","Raka","Mako","Sulo"];
const PLAYER_COLORS = ["#ff4757","#1e90ff","#2ecc71","#f39c12"];
const RANK_POINTS   = [50,35,25,18,14,10,7,4,2];

let G = {};

const $  = id => {
  const el = document.getElementById(id);
  if (!el) console.warn(`Element not found: ${id}`);
  return el;
};

const qs = (s, ctx=document) => ctx.querySelector(s);

function showScreen(id) {
  const el = $(id);
  if (!el) return;
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  el.classList.add("active");
}

/* ════════════════════════════════════════════════════════════
   SETUP
═══════════════════════════════════════════════════════════ */
let setup = { numPlayers:2, boardLen:10, maxTurns:25 };

function initSetup() {
  const pbtns = document.querySelectorAll(".pcount-btn");
  const bbtns = document.querySelectorAll(".board-btn");
  const tbtns = document.querySelectorAll(".turn-btn");
  const startBtn = $("btn-start");

  pbtns.forEach(btn =>
    btn.addEventListener("click", () => {
      pbtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      setup.numPlayers = +btn.dataset.count;
      renderNameInputs();
    }));

  bbtns.forEach(btn =>
    btn.addEventListener("click", () => {
      bbtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      setup.boardLen = +btn.dataset.len;
    }));

  tbtns.forEach(btn =>
    btn.addEventListener("click", () => {
      tbtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      setup.maxTurns = +btn.dataset.turns;
    }));

  if (startBtn) startBtn.addEventListener("click", startGame);
  renderNameInputs();
}

function renderNameInputs() {
  const wrap = $("player-names-wrap");
  if (!wrap) return;

  let html = '<div class="player-names">';
  for (let i = 0; i < setup.numPlayers; i++) {
    html += `
      <div class="player-name-row">
        <div class="player-name-dot" style="background:${PLAYER_COLORS[i]}"></div>
        <input class="player-name-input" type="text" id="pname-${i}"
          placeholder="Player ${i+1}" maxlength="16"/>
      </div>`;
  }
  wrap.innerHTML = html + "</div>";
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
  // Distribute tokens round-robin then shuffle
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
      position: 0        // 0 = not on board yet, 1..boardLen = track position
    });
  }

  // G.stack = ordered list of ALL token ids, index 0 = top of stack
  const stack = tokens.map(t => t.id);
  shuffleArray(stack);

  G = {
    players  : names.map((nm, i) => ({ id:i, name:nm, color:PLAYER_COLORS[i], score:0 })),
    tokens,
    stack,               // ALL 9 tokens stay here forever; order changes via Reorder
    boardLen : setup.boardLen,
    maxTurns : setup.maxTurns,
    turn     : 1,
    curPlayer: 0,
    selected : [],       // token ids currently selected
    rDraft   : [],       // tokens being reordered
    rOpen    : false,    // reorder panel open?
    log      : [],       // game log
    gameOver : false     // game ended?
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
  const turnCur = $("turn-current");
  const turnMax = $("turn-max");
  const pName = $("cur-player-name");
  const pDot = $("cur-player-dot");

  if (turnCur) turnCur.textContent = G.turn;
  if (turnMax) turnMax.textContent = G.maxTurns;
  
  const p = G.players[G.curPlayer];
  if (pName) pName.textContent = p.name;
  if (pDot) pDot.style.background = p.color;
}

/* ── Stack panel ── */
function renderStack() {
  const wrap = $("stack-display");
  if (!wrap) return;
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
      : (tok.position >= G.boardLen ? "🏁 Finish" : `Pos ${tok.position}`);

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
    // Deselect this token and all tokens at higher stack indices
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
  if (!info) return;
  
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
    if (sorted[i] !== sorted[i-1] + 1) return false;
  }
  return true;
}

/* ── Board ── */
function renderBoard() {
  const track = $("track-display");
  if (!track) return;
  track.innerHTML = "";

  // Create numbered positions from top to bottom
  for (let pos = G.boardLen; pos >= 1; pos--) {
    const row = document.createElement("div");
    row.className = "track-row";
    row.style.height = "50px";
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.borderBottom = "1px solid rgba(255,255,255,0.1)";
    row.style.paddingLeft = "10px";

    // Position number
    const numDiv = document.createElement("div");
    numDiv.style.minWidth = "30px";
    numDiv.style.fontSize = "14px";
    numDiv.style.color = "rgba(255,255,255,0.3)";
    numDiv.style.fontWeight = "bold";
    numDiv.textContent = pos;
    row.appendChild(numDiv);

    // Tokens at this position
    const tokDiv = document.createElement("div");
    tokDiv.style.flex = "1";
    tokDiv.style.display = "flex";
    tokDiv.style.gap = "8px";
    tokDiv.style.paddingLeft = "15px";
    tokDiv.style.flexWrap = "wrap";

    const atPos = G.tokens.filter(t => t.position === pos);
    atPos.forEach(tok => {
      const tokEl = document.createElement("div");
      tokEl.className = "board-token";
      tokEl.style.width = "40px";
      tokEl.style.height = "40px";
      tokEl.style.display = "flex";
      tokEl.style.alignItems = "center";
      tokEl.style.justifyContent = "center";
      tokEl.style.borderRadius = "8px";
      tokEl.style.backgroundColor = G.players[tok.owner].color;
      tokEl.style.fontSize = "24px";
      tokEl.style.cursor = "default";
      tokEl.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
      tokEl.title = `${tok.name} (${G.players[tok.owner].name})`;
      tokEl.textContent = tok.face;
      tokDiv.appendChild(tokEl);
    });

    row.appendChild(tokDiv);
    track.appendChild(row);
  }

  // Finish line
  const finishRow = document.createElement("div");
  finishRow.className = "track-row finish-row";
  finishRow.style.height = "60px";
  finishRow.style.display = "flex";
  finishRow.style.alignItems = "center";
  finishRow.style.borderTop = "3px solid #ffd700";
  finishRow.style.borderBottom = "3px solid #ffd700";
  finishRow.style.paddingLeft = "10px";
  finishRow.style.backgroundColor = "rgba(255,215,0,0.05)";
  
  const finishLabel = document.createElement("div");
  finishLabel.style.minWidth = "30px";
  finishLabel.style.fontSize = "20px";
  finishLabel.textContent = "🏁";
  finishRow.appendChild(finishLabel);

  const finishToks = document.createElement("div");
  finishToks.style.flex = "1";
  finishToks.style.display = "flex";
  finishToks.style.gap = "8px";
  finishToks.style.paddingLeft = "15px";
  finishToks.style.flexWrap = "wrap";

  const atFinish = G.tokens.filter(t => t.position >= G.boardLen);
  atFinish.forEach(tok => {
    const tokEl = document.createElement("div");
    tokEl.style.width = "40px";
    tokEl.style.height = "40px";
    tokEl.style.display = "flex";
    tokEl.style.alignItems = "center";
    tokEl.style.justifyContent = "center";
    tokEl.style.borderRadius = "8px";
    tokEl.style.backgroundColor = G.players[tok.owner].color;
    tokEl.style.fontSize = "24px";
    tokEl.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
    tokEl.title = `${tok.name} (${G.players[tok.owner].name})`;
    tokEl.textContent = tok.face;
    finishToks.appendChild(tokEl);
  });

  finishRow.appendChild(finishToks);
  track.appendChild(finishRow);
}

function refreshBtns() {
  const btnMove = $("btn-move");
  const btnReorder = $("btn-reorder");

  if (btnMove) btnMove.disabled = !selContiguousTop();
  if (btnReorder) btnReorder.disabled = !selContiguousTop() || G.selected.length < 2;
}

/* ── Scores ── */
function calcScores() {
  const pts = {};
  G.tokens.forEach(t => pts[t.id] = 0);

  const sorted = [...G.tokens].sort((a,b) => b.position - a.position);
  
  let i = 0;
  let r = 0;
  while (i < sorted.length) {
    let j = i + 1;
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
  const scoreboard = $("score-board");
  if (!scoreboard) return;

  calcScores();
  const sorted = [...G.players].sort((a,b) => b.score - a.score);
  
  scoreboard.innerHTML = sorted.map(p => {
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
  const logDiv = $("log-entries");
  if (!logDiv) return;

  logDiv.innerHTML = G.log.slice(0, 8).map((e, i) =>
    `<div class="log-entry ${i===0?"log-new":""}">${e}</div>`
  ).join("");
}

/* ════════════════════════════════════════════════════════════
   ACTION: MOVE FORWARD
   ─────────────────────────────────────────────────────────
   Selected tokens (top 1-3 of stack) each advance +1 position.
   *** FIXED: renderBoard() called after move ***
═══════════════════════════════════════════════════════════ */
const btnMove = $("btn-move");
if (btnMove) {
  btnMove.addEventListener("click", () => {
    if (!selContiguousTop()) return;

    // Sort selected by stack order (top first)
    const toMove = [...G.selected].sort((a,b) => G.stack.indexOf(a) - G.stack.indexOf(b));

    const moved = [];
    toMove.forEach(id => {
      const tok = G.tokens[id];
      if (tok.position < G.boardLen) {
        tok.position += 1;   // ← Advance +1 from current position
        moved.push(`${tok.name}→${tok.position}`);
      } else {
        moved.push(`${tok.name}(finish)`);
      }
    });

    addLog(`${G.players[G.curPlayer].name} moved [${moved.join(", ")}]`);
    G.selected = [];
    
    // *** FIX: Call renderBoard immediately to show movement ***
    renderAll();
    
    // Check if game ends AFTER rendering
    if (checkEnd()) {
      setTimeout(doShowResults, 500);  // Small delay so user sees final board
    } else {
      doEndTurn();
    }
  });
}

/* ════════════════════════════════════════════════════════════
   ACTION: REORDER
   ─────────────────────────────────────────────────────────
   Selected top 2-3 tokens are rearranged within G.stack.
═══════════════════════════════════════════════════════════ */
const btnReorder = $("btn-reorder");
if (btnReorder) {
  btnReorder.addEventListener("click", () => {
    if (!selContiguousTop() || G.selected.length < 2) return;
    
    const sel = [...G.selected].sort((a,b) => G.stack.indexOf(a) - G.stack.indexOf(b));
    G.rDraft = [...sel];
    G.rOpen  = true;
    
    const panel = $("reorder-panel");
    if (panel) panel.classList.remove("hidden");
    
    const bm = $("btn-move");
    const br = $("btn-reorder");
    if (bm) bm.disabled = true;
    if (br) br.disabled = true;
    
    renderRList();
  });
}

function renderRList() {
  const list = $("reorder-list");
  if (!list) return;
  
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

const btnConfirmReorder = $("btn-confirm-reorder");
if (btnConfirmReorder) {
  btnConfirmReorder.addEventListener("click", () => {
    // Find positions of draft tokens in current stack
    const positions = G.rDraft.map(id => G.stack.indexOf(id)).sort((a,b) => a-b);
    
    // Remove them from stack
    G.rDraft.forEach(id => {
      const idx = G.stack.indexOf(id);
      if (idx !== -1) G.stack.splice(idx, 1);
    });
    
    // Re-insert in new order at the original top positions
    G.stack.splice(positions[0], 0, ...G.rDraft);

    addLog(`${G.players[G.curPlayer].name} reordered: [${G.rDraft.map(id => G.tokens[id].name).join(" → ")}]`);
    G.rDraft = []; 
    G.rOpen = false; 
    G.selected = [];
    
    const panel = $("reorder-panel");
    if (panel) panel.classList.add("hidden");
    
    renderAll();
    
    // Check if game ends
    if (checkEnd()) {
      setTimeout(doShowResults, 500);
    } else {
      doEndTurn();
    }
  });
}

const btnCancelReorder = $("btn-cancel-reorder");
if (btnCancelReorder) {
  btnCancelReorder.addEventListener("click", () => {
    G.rDraft = []; 
    G.rOpen = false; 
    G.selected = [];
    
    const panel = $("reorder-panel");
    if (panel) panel.classList.add("hidden");
    
    const bm = $("btn-move");
    const br = $("btn-reorder");
    if (bm) bm.disabled = false;
    if (br) br.disabled = false;
    
    renderAll();
  });
}

/* ════════════════════════════════════════════════════════════
   TURN END
═══════════════════════════════════════════════════════════ */
function doEndTurn() {
  if (checkEnd()) {
    doShowResults();
    return;
  }

  G.turn++;
  G.curPlayer = (G.curPlayer + 1) % G.players.length;
  G.selected  = [];

  const next = G.players[G.curPlayer];
  const modalTitle = $("modal-turn-title");
  const modalMsg = $("modal-turn-msg");
  const modal = $("modal-turn");

  if (modalTitle) modalTitle.textContent = `${next.name}'s Turn`;
  if (modalMsg) modalMsg.textContent = `Pass the device to ${next.name}. Press Ready when set!`;
  if (modal) modal.classList.remove("hidden");
  
  renderAll();
}

function checkEnd() {
  // End if turn limit reached
  if (G.turn >= G.maxTurns) return true;
  // End if all tokens have reached the finish line
  return G.tokens.every(t => t.position >= G.boardLen);
}

/* ════════════════════════════════════════════════════════════
   RESULTS – WINNER ANNOUNCEMENT
   *** FIXED: Properly triggered and displayed ***
═══════════════════════════════════════════════════════════ */
function doShowResults() {
  if (G.gameOver) return;  // Prevent multiple calls
  G.gameOver = true;

  calcScores();
  const sorted = [...G.players].sort((a,b) => b.score - a.score);
  const medals = ["🥇","🥈","🥉","4️⃣"];
  
  const resultsList = $("results-list");
  if (resultsList) {
    resultsList.innerHTML = sorted.map((p, i) => `
      <div class="result-row rank-${i+1}">
        <div class="result-rank">${medals[i] || (i+1)}</div>
        <div class="result-dot" style="background:${p.color}"></div>
        <div class="result-name">${p.name}</div>
        <div class="result-score">${p.score} pts</div>
      </div>`).join("");
  }
  
  showScreen("screen-results");
  console.log("Game Over! Results shown.");
}

/* ════════════════════════════════════════════════════════════
   MODAL EVENTS
═══════════════════════════════════════════════════════════ */
const btnRulesModal = $("btn-rules-modal");
if (btnRulesModal) {
  btnRulesModal.addEventListener("click", () => {
    const modal = $("modal-rules");
    if (modal) modal.classList.remove("hidden");
  });
}

const modalClose = $("modal-close");
if (modalClose) {
  modalClose.addEventListener("click", () => {
    const modal = $("modal-rules");
    if (modal) modal.classList.add("hidden");
  });
}

const modalRulesOverlay = qs("#modal-rules .modal-overlay");
if (modalRulesOverlay) {
  modalRulesOverlay.addEventListener("click", () => {
    const modal = $("modal-rules");
    if (modal) modal.classList.add("hidden");
  });
}

const modalTurnOk = $("modal-turn-ok");
if (modalTurnOk) {
  modalTurnOk.addEventListener("click", () => {
    const modal = $("modal-turn");
    if (modal) modal.classList.add("hidden");
    renderAll();
  });
}

const btnPlayAgain = $("btn-play-again");
if (btnPlayAgain) {
  btnPlayAgain.addEventListener("click", () => {
    G.gameOver = false;  // Reset for next game
    showScreen("screen-setup");
  });
}

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
  console.log("Game initialized");
  initSetup();
  showScreen("screen-setup");
});
