# 🌺 Tiki Topple – Digital Implementation
**NPC Board2Code Hackathon 2026 | Lovely Professional University**

> The Tactical Game of Totem Domination — fully playable in any browser, zero dependencies.

---

### 🚀 Live Demo / How to Run

 Option 1 – Open Directly
Just open `index.html` in any modern browser. No server needed.

### Option 2 – Local Server (recommended)
```bash
# Python 3
python -m http.server 8080
# then open http://localhost:8080
```

### Option 3 – Deploy to GitHub Pages
1. Push this folder to a GitHub repo
2. Go to **Settings → Pages → Source: main / root**
3. Your game will be live at `https://<username>.github.io/<repo>/`

---

## 📁 File Structure

```
tiki-topple/
├── index.html        ← Main HTML (all screens)
├── css/
│   └── style.css     ← Tropical maximalist UI
├── js/
│   └── game.js       ← Complete game logic
└── README.md
```

---

## 🎮 Game Rules Implemented

### ✅ Locked Rules (all mandatory requirements met)

| Rule | Status |
|---|---|
| Turn-based gameplay | ✅ |
| All tokens start in a single stack | ✅ |
| Only top 1–3 tokens interactable | ✅ |
| One action per turn | ✅ |
| Tokens move forward only | ✅ |
| Move Action (top 1–3 forward 1 step) | ✅ |
| Reorder Action (top 2–3, rearrange) | ✅ |
| Clear end condition | ✅ |
| Scoring system (rank-based) | ✅ |
| Playable end-to-end | ✅ |
| 2–4 players (at least 2) | ✅ |
| Working demo | ✅ |

### 🎨 Flexible Rules (our choices)

- **Board size**: Configurable — Short (10), Medium (15), Long (20)
- **Max turns**: Configurable — 20, 25, or 30 turns
- **9 tokens** distributed evenly among players
- **Scoring**: Rank-based (50 pts for 1st, 35 for 2nd, ...) — sum per player
- **UI**: Tropical Polynesian maximalist aesthetic with drag-and-drop reordering

---

## 🕹️ How to Play

1. **Setup Screen** – Choose number of players (2–4), enter names, pick board size and turn limit
2. **Stack** – All 9 tiki tokens start in a shuffled stack. Each player secretly owns some tokens.
3. **On Your Turn (pick ONE action):**
   - **Move Forward** – Click 1–3 tokens from the top of the stack → press Move Forward. They advance to position 1 on the track.
   - **Reorder** – Click 2–3 top tokens → press Reorder → drag them into a new order → confirm.
4. **Pass device** to the next player when prompted.
5. **Game ends** when the turn limit is reached or all tokens reach the final position.
6. **Scoring**: Tokens are ranked by final position. Each player's score = sum of their tokens' rank points.

---

## 🧱 Architecture

- **Vanilla HTML/CSS/JS** — zero external dependencies (only Google Fonts for typography)
- `G` = single global game state object
- All rendering is pure DOM manipulation (no framework needed)
- Drag-and-drop reorder uses native HTML5 Drag API
- Fully responsive (works on mobile too)

---

## 📝 Assumptions & Simplifications

1. "Move forward 1 step" means tokens move from the **stack (position 0) to position 1** on the board. The board tracks exact positions.
2. Tokens on the board are visible but not directly moveable via stack actions (per the rules: "only top tokens of stack can be interacted with").
3. Token ownership is assigned randomly at game start — players discover their tokens during play.
4. The "pass device" modal ensures privacy between turns on shared screens.
5. Scores update live each turn to show current standings.

---

## 👥 Team
Built during NPC Board2Code Hackathon 2026 — 24 hours, Lovely Professional University.
