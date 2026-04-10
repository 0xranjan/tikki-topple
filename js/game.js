/* ============================================================
   TIKI TOPPLE – Complete Game Logic
   NPC Board2Code Hackathon 2026
   ============================================================ */

"use strict";

const TIKI_FACES   = ["🗿","🪆","🎭","🦁","🐯","🐸","👺","👹","🤖"];
const TIKI_NAMES   = ["Wikiw","Kafi","Aku","Hanu","Zuri","Toro","Raka","Mako","Sulo"];
const PLAYER_COLORS= ["#ff4757","#1e90ff","#2ecc71","#f39c12"];
const RANK_POINTS  = [50,35,25,18,14,10,7,4,2];

let G = {};

const $  = id  => document.getElementById(id);
const qs = (s,ctx=document) => ctx.querySelector(s);

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id).classList.add("active");
}

/* ─── SETUP ────────────────────────────────────────────────── */
let setup = { numPlayers:2, boardLen:10, maxTurns:25 };

function initSetup() {
  document.querySelectorAll(".pcount-btn").forEach(btn =>
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pcount-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      setup.numPlayers = +btn.dataset.count;
      renderNameInputs();
    }));

  document.querySelectorAll(".board-btn").forEach(btn =>
    btn.addEventListener("click", () => {
      document.querySelectorAll(".board-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      setup.boardLen = +btn.dataset.len;
    }));

  document.querySelectorAll(".turn-btn").forEach(btn =>
    btn.addEventListener("click", () => {
      document.querySelectorAll(".turn-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      setup.maxTurns = +btn.dataset.turns;
    }));

  $("btn-start").addEventListener("click", startGame);
  renderNameInputs();
}

function renderNameInputs() {
  let html = '<div class="player-names">';
  for (let i=0;i<setup.numPlayers;i++) {
    html += `<div class="player-name-row">
      <div class="player-name-dot" style="background:${PLAYER_COLORS[i]}"></div>
      <input class="player-name-input" type="text" id="pname-${i}"
        placeholder="Player ${i+1}" maxlength="16"/>
    </div>`;
  }
  $("player-names-wrap").innerHTML = html + "</div>";
}

/* ─── START GAME ───────────────────────────────────────────── */
function startGame() {
  const n = setup.numPlayers;
  const names = [];
  for (let i=0;i<n;i++) {
    const el = $("pname-"+i);
    names.push((el && el.value.trim()) || "Player "+(i+1));
  }

  const TOTAL = 9;
  const own = [];
  for (let t=0;t<TOTAL;t++) own.push(t%n);
  shuffleArray(own);

  const tokens = [];
  for (let t=0;t<TOTAL;t++)
    tokens.push({ id:t, name:TIKI_NAMES[t], face:TIKI_FACES[t], owner:own[t], position:0 });

  const stack = tokens.map(t=>t.id);
  shuffleArray(stack);

  const board = {};
  for (let i=1;i<=setup.boardLen;i++) board[i] = [];

  G = {
    players : names.map((nm,i) => ({ id:i, name:nm, color:PLAYER_COLORS[i], score:0 })),
    tokens, stack, board,
    boardLen  : setup.boardLen,
    maxTurns  : setup.maxTurns,
    turn      : 1,
    curPlayer : 0,
    selected  : [],          // token ids currently selected (from stack top)
    rDraft    : [],          // reorder draft
    rOpen     : false,
    log       : []
  };

  showScreen("screen-game");
  renderAll();
}

/* ─── RENDER ALL ───────────────────────────────────────────── */
function renderAll() {
  renderHeader();
  renderStack();
  renderBoard();
  refreshBtns();
  renderScores();
  renderLog();
}

/* HEADER */
function renderHeader() {
  $("turn-current").textContent = G.turn;
  $("turn-max").textContent = G.maxTurns;
  const p = G.players[G.curPlayer];
  $("cur-player-name").textContent = p.name;
  $("cur-player-dot").style.background = p.color;
}

/* STACK */
function renderStack() {
  const wrap = $("stack-display");
  wrap.innerHTML = "";

  if (!G.stack.length) {
    wrap.innerHTML = `<div style="color:rgba(255,255,255,0.3);font-size:13px;text-align:center;padding:20px 0;">Stack is empty — all tokens on board!</div>`;
    updateSelInfo();
    return;
  }

  G.stack.forEach((tid, idx) => {
    const tok   = G.tokens[tid];
    const owner = G.players[tok.owner];
    const selectable = stackSelectable(idx);
    const selected   = G.selected.includes(tid);

    const chip = document.createElement("div");
    chip.className = `token-chip tiki-${tid}`;
    if (selected)    chip.classList.add("selected");
    if (!selectable) chip.classList.add("disabled-token");

    chip.innerHTML = `
      <span class="token-face">${tok.face}</span>
      <div class="token-label">
        <div style="font-size:13px">${tok.name}</div>
        <div style="font-size:10px;color:${owner.color};font-weight:700">${owner.name}</div>
      </div>
      <div class="token-pos-badge">#${idx+1}</div>`;

    if (selectable) chip.addEventListener("click", () => toggleSel(tid, idx));
    wrap.appendChild(chip);
  });

  updateSelInfo();
}

// Stack index selectable only if it's in top-3 and all above are selected
function stackSelectable(idx) {
  if (idx >= 3) return false;
  for (let i=0;i<idx;i++) if (!G.selected.includes(G.stack[i])) return false;
  return true;
}

function toggleSel(tid, idx) {
  if (G.selected.includes(tid)) {
    // deselect this + everything below it that was selected
    const below = new Set(G.stack.slice(idx).filter(id => G.selected.includes(id)));
    G.selected = G.selected.filter(id => !below.has(id));
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
    : `Selected (${n}): ${G.selected.map(id=>G.tokens[id].name).join(", ")}`;
}

// Are selected tokens contiguous from the very top of stack?
function selContiguousTop() {
  if (!G.selected.length) return false;
  const idxs = G.selected.map(id => G.stack.indexOf(id));
  if (idxs.some(i => i === -1)) return false;
  const sorted = [...idxs].sort((a,b)=>a-b);
  if (sorted[0] !== 0) return false;
  for (let i=1;i<sorted.length;i++) if (sorted[i] !== sorted[i-1]+1) return false;
  return true;
}

/* BOARD */
function renderBoard() {
  const track = $("board-track");
  track.innerHTML = "";

  // Finish row
  const fin = document.createElement("div");
  fin.className = "track-cell finish-cell";
  fin.innerHTML = `<span class="cell-label">🏁</span><div class="cell-tokens"></div>`;
  track.appendChild(fin);

  for (let pos=G.boardLen; pos>=1; pos--) {
    const cell = document.createElement("div");
    cell.className = "track-cell" + (pos===1 ? " start-cell" : "");
    const toks = (G.board[pos]||[]).map(id => {
      const t = G.tokens[id];
      return `<span class="track-token tiki-track-${id}" title="${t.name} → ${G.players[t.owner].name}">${t.face} ${t.name}</span>`;
    }).join("");
    cell.innerHTML = `<span class="cell-label">${pos}</span><div class="cell-tokens">${toks}</div>`;
    track.appendChild(cell);
  }

  // Stack (pos 0)
  const sc = document.createElement("div");
  sc.className = "track-cell start-cell";
  const st = G.stack.map(id => `<span class="track-token tiki-track-${id}">${G.tokens[id].face}</span>`).join("");
  sc.innerHTML = `<span class="cell-label">STACK</span><div class="cell-tokens">${st}</div>`;
  track.appendChild(sc);
}

/* BUTTONS */
function refreshBtns() {
  const n = G.selected.length;
  const ok = selContiguousTop();
  $("btn-move").disabled    = !(n>=1 && n<=3 && ok);
  $("btn-reorder").disabled = !(n>=2 && n<=3 && ok);
}

/* SCORES */
function calcScores() {
  const sorted = [...G.tokens].sort((a,b) => b.position - a.position);
  const pts = {};
  let r=0, i=0;
  while (i < sorted.length) {
    let j = i;
    while (j<sorted.length && sorted[j].position===sorted[i].position) j++;
    let sum=0;
    for (let k=r;k<r+(j-i);k++) sum += (RANK_POINTS[k]||1);
    const avg = Math.round(sum/(j-i));
    for (let k=i;k<j;k++) pts[sorted[k].id] = avg;
    r+=(j-i); i=j;
  }
  G.players.forEach(p => {
    p.score = G.tokens.filter(t=>t.owner===p.id).reduce((s,t)=>s+(pts[t.id]||0),0);
  });
}

function renderScores() {
  calcScores();
  const sorted = [...G.players].sort((a,b)=>b.score-a.score);
  $("score-board").innerHTML = sorted.map(p => {
    const faces = G.tokens.filter(t=>t.owner===p.id).map(t=>t.face).join("");
    return `<div class="score-row">
      <div class="score-dot" style="background:${p.color}"></div>
      <div style="flex:1">
        <div class="score-name">${p.name}</div>
        <div class="score-tokens">${faces}</div>
      </div>
      <div class="score-val">${p.score}</div>
    </div>`;
  }).join("");
}

/* LOG */
function addLog(msg) {
  G.log.unshift(`T${G.turn}: ${msg}`);
  if (G.log.length>30) G.log.pop();
}

function renderLog() {
  $("log-entries").innerHTML = G.log.slice(0,8).map((e,i) =>
    `<div class="log-entry ${i===0?"log-new":""}">${e}</div>`
  ).join("");
}

/* ─── ACTIONS ──────────────────────────────────────────────── */

/* MOVE */
$("btn-move").addEventListener("click", () => {
  if (!selContiguousTop()) return;
  const toMove = [...G.selected].sort((a,b) => G.stack.indexOf(a)-G.stack.indexOf(b));

  // Remove from stack
  toMove.forEach(id => {
    const idx = G.stack.indexOf(id);
    if (idx !== -1) G.stack.splice(idx, 1);
  });

  // Place at position 1 on board
  toMove.forEach(id => {
    G.tokens[id].position = 1;
    G.board[1].push(id);
  });

  const names = toMove.map(id=>G.tokens[id].name).join(", ");
  addLog(`${G.players[G.curPlayer].name} moved [${names}] → Pos 1`);
  G.selected = [];
  doEndTurn();
});

/* REORDER */
$("btn-reorder").addEventListener("click", () => {
  if (!selContiguousTop()) return;
  const sel = [...G.selected].sort((a,b)=>G.stack.indexOf(a)-G.stack.indexOf(b));
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
  G.rDraft.forEach((tid,i) => {
    const tok   = G.tokens[tid];
    const owner = G.players[tok.owner];
    const item  = document.createElement("div");
    item.className = `reorder-item tiki-${tid}`;
    item.draggable = true;
    item.dataset.index = i;
    item.innerHTML = `
      <span class="drag-handle">⠿</span>
      <span class="token-face">${tok.face}</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:800">${tok.name}</div>
        <div style="font-size:10px;color:${owner.color};font-weight:700">${owner.name}</div>
      </div>
      <span style="font-size:10px;opacity:0.5">#${i+1}</span>`;

    item.addEventListener("dragstart", e => { dragSrc = +e.currentTarget.dataset.index; e.currentTarget.style.opacity="0.45"; });
    item.addEventListener("dragover",  e => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); });
    item.addEventListener("dragleave", e => e.currentTarget.classList.remove("drag-over"));
    item.addEventListener("drop",      e => {
      e.preventDefault();
      const tgt = +e.currentTarget.dataset.index;
      if (dragSrc !== null && dragSrc !== tgt) {
        [G.rDraft[dragSrc], G.rDraft[tgt]] = [G.rDraft[tgt], G.rDraft[dragSrc]];
        renderRList();
      }
      e.currentTarget.classList.remove("drag-over");
    });
    item.addEventListener("dragend",   e => { e.currentTarget.style.opacity="1"; dragSrc=null; });
    list.appendChild(item);
  });
}

let dragSrc = null;

$("btn-confirm-reorder").addEventListener("click", () => {
  G.rDraft.forEach(id => { const i=G.stack.indexOf(id); if(i!==-1) G.stack.splice(i,1); });
  G.stack.unshift(...G.rDraft);
  addLog(`${G.players[G.curPlayer].name} reordered: [${G.rDraft.map(id=>G.tokens[id].name).join(" → ")}]`);
  G.rDraft=[]; G.rOpen=false; G.selected=[];
  $("reorder-panel").classList.add("hidden");
  doEndTurn();
});

$("btn-cancel-reorder").addEventListener("click", () => {
  G.rDraft=[]; G.rOpen=false; G.selected=[];
  $("reorder-panel").classList.add("hidden");
  renderAll();
});

/* ─── TURN END ─────────────────────────────────────────────── */
function doEndTurn() {
  if (checkEnd()) { doShowResults(); return; }
  G.turn++;
  G.curPlayer = (G.curPlayer + 1) % G.players.length;
  G.selected = [];
  const next = G.players[G.curPlayer];
  $("modal-turn-title").textContent = `${next.name}'s Turn`;
  $("modal-turn-msg").textContent   = `Pass device to ${next.name} and press Ready.`;
  $("modal-turn").classList.remove("hidden");
  renderAll();
}

function checkEnd() {
  if (G.turn >= G.maxTurns) return true;
  if (G.stack.length > 0) return false;
  return G.tokens.every(t => t.position === G.boardLen);
}

/* ─── RESULTS ──────────────────────────────────────────────── */
function doShowResults() {
  calcScores();
  const sorted = [...G.players].sort((a,b)=>b.score-a.score);
  const medals = ["🥇","🥈","🥉","4️⃣"];
  $("results-list").innerHTML = sorted.map((p,i) => `
    <div class="result-row rank-${i+1}">
      <div class="result-rank">${medals[i]||i+1}</div>
      <div class="result-dot" style="background:${p.color}"></div>
      <div class="result-name">${p.name}</div>
      <div class="result-score">${p.score} pts</div>
    </div>`).join("");
  showScreen("screen-results");
}

/* ─── MODAL EVENTS ─────────────────────────────────────────── */
$("btn-rules-modal").addEventListener("click", () => $("modal-rules").classList.remove("hidden"));
$("modal-close").addEventListener("click",     () => $("modal-rules").classList.add("hidden"));
qs("#modal-rules .modal-overlay").addEventListener("click", () => $("modal-rules").classList.add("hidden"));
$("modal-turn-ok").addEventListener("click", () => {
  $("modal-turn").classList.add("hidden");
  renderAll();
});
$("btn-play-again").addEventListener("click", () => showScreen("screen-setup"));

/* ─── UTIL ─────────────────────────────────────────────────── */
function shuffleArray(a) {
  for (let i=a.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}

/* ─── BOOT ─────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  initSetup();
  showScreen("screen-setup");
});
