# Pong Game Enhancement Plan

## 1. Variable Ball Speed Based on Paddle Hit ✓ COMPLETED

### Option A: Speed Increase on Hit ✓
- ✓ Added `ball_speed_multiplier` variable (starts at 1.0)
- ✓ Increase multiplier by 0.05 each paddle hit (capped at 2.0x)
- ✓ Apply multiplier to both `ball_speed_x` and `ball_speed_y`
- ✓ Reset multiplier when ball resets after scoring

### Option B: Angle Based on Paddle Hit Location ✓
- ✓ Calculate where ball hits paddle (relative to center)
- ✓ Adjust `ball_speed_y` based on hit location:
  - Top of paddle: ball goes upward (negative angle adjustment)
  - Center: minimal change
  - Bottom of paddle: ball goes downward (positive angle adjustment)
- ✓ Makes gameplay more skill-based - players can "aim" their shots!

---

## 2. Sound Effects ✓ COMPLETED

### Implementation Steps:
1. ✓ Install/use `pygame.mixer` (already included in pygame)
2. ✓ Created sound files using `generate_sounds.py`:
   - `paddle_hit.wav` - 800Hz beep
   - `wall_bounce.wav` - 400Hz beep
   - `score.wav` - Two-tone (600Hz + 800Hz)
3. ✓ Load sounds in `__init__()` using `pygame.mixer.Sound()`
4. ✓ Play sounds at appropriate moments:
   - Paddle collision → paddle_hit sound
   - Wall bounce → wall_bounce sound
   - Score → score sound

### Where Added:
- ✓ Load sounds: in `__init__()` (lines 44-47)
- ✓ Play sounds: in `update()` where collisions happen (lines 91, 96, 107, 114, 125, 132, 137, 144, 149)

---

## 3. Visual Feedback

### Screen Shake Effect:
- When ball hits paddle, offset screen draw position slightly
- Create a `shake_amount` variable
- Decrease shake over a few frames
- Apply offset when drawing all objects
- (Optional - can implement later for extra polish)

### Paddle Color Flash: ✓ COMPLETED
- ✓ Added `left_paddle_flash` and `right_paddle_flash` timers (lines 46-47)
- ✓ Set timer to 10 frames on hit (lines 128, 147, 160, 168, 180, 188)
- ✓ Draw paddle in YELLOW when timer > 0 (lines 241-246)
- ✓ Decrement timer each frame (lines 226-229)
- Creates satisfying visual feedback when ball hits paddle!

### Ball Trail:
- Store last 5-10 ball positions in a list
- Draw semi-transparent circles at each position
- Gradually decrease size/opacity for older positions
- (Optional - can implement later for extra polish)

---

## 4. Difficulty Progression

### Ball Speed Increase Over Time:
- Add a timer that tracks game time
- Every 10 seconds, increase ball speed slightly
- Cap maximum speed to keep game playable
- NOTE: Already implemented via ball_speed_multiplier system!

### Win Condition: ✓ COMPLETED
- ✓ Set a `WINNING_SCORE` constant (7) in constants.py
- ✓ Check if either score reaches winning score
- ✓ Display victory message with semi-transparent overlay
- ✓ Add "Press SPACE to restart" functionality

### Implementation: ✓
- ✓ Added win check in `update()` after score increment (lines 193-195, 207-209)
- ✓ Created `game_over` state variable and `winner` variable
- ✓ Skip game update when game_over is True (lines 81-82)
- ✓ Show winner text and restart instructions in `render()` (lines 233-248)
- ✓ Created `reset_game()` method to restart the game (lines 252-271)

---

## 5. Power-ups

### Basic Power-up System:
- Create a `Powerup` class with x, y, type, active status
- Types: "big_paddle", "small_paddle", "speed_up", "slow_down"
- Spawn randomly every 15-30 seconds
- Check collision with ball
- Apply effect to appropriate paddle

### Effects:
- **Big Paddle**: Increase paddle height to 120 for 10 seconds
- **Small Paddle**: Decrease opponent paddle to 50 for 10 seconds
- **Speed Up**: Increase ball speed temporarily
- **Multi-ball**: Add a second ball (advanced)

### Implementation:
- Add powerup spawn timer in `update()`
- Add powerup collision detection
- Add effect timers to track duration
- Draw powerups in `render()`

---

## 6. AI Opponent ✓ COMPLETED

### Simple AI Logic: ✓
- ✓ Track ball position
- ✓ Move paddle toward ball's y-position with deadzone (±10 pixels)
- ✓ Adjustable AI difficulty with 3 levels

### Implementation: ✓
- ✓ Added `ai_enabled` boolean to toggle AI on/off (line 50)
- ✓ Added `ai_speed` variable (line 51) - dynamically set by difficulty
- ✓ Added `ai_difficulty` variable (line 52) to track current difficulty
- ✓ Created AI difficulty selection menu (lines 95-116, 342-377)
- ✓ Three difficulty levels:
  - **Easy** (Speed: 4) - Slower reactions, easier to beat
  - **Medium** (Speed: 5) - Balanced challenge
  - **Hard** (Speed: 6) - Fast reactions, tough opponent
- ✓ Difficulty selection screen when choosing AI mode
- ✓ ESC to go back from difficulty menu to main menu
- ✓ In-game indicator shows current difficulty (line 404)
- ✓ Toggle AI with 'A' key during gameplay
- ✓ Player can switch between 2-player and vs AI anytime!

### AI Behavior:
- Tracks ball's Y position
- Moves toward ball with ±10 pixel deadzone (prevents jitter)
- Speed varies by difficulty - creates different challenge levels

---

## 7. Polish Details

### Countdown Before Launch: ✓ COMPLETED
- ✓ Added `countdown` variable (starts at 3) and `countdown_timer` for frame counting
- ✓ Added "countdown" game state to handle countdown phase
- ✓ Display countdown (3...2...1...GO!) in center of screen with overlay
- ✓ Decrement every second (120 frames at 120 FPS)
- ✓ Launch ball when countdown reaches 0 and switch to "playing" state
- ✓ Trigger countdown on game start via `start_countdown()` method
- ✓ Created `render_countdown()` to show countdown overlay

### Pause Functionality: ✓ COMPLETED
- ✓ Added "paused" game state
- ✓ Toggle with 'P' key during gameplay
- ✓ Can also unpause with SPACE or return to menu with ESC
- ✓ Skip `update()` when paused (guard clause in update method)
- ✓ Display "PAUSED" text overlay with resume instructions
- ✓ Created `render_paused()` to show pause screen

### Goal Text Animation: ✓ COMPLETED
- ✓ Added `goal_text_timer` and `goal_scorer` variables
- ✓ When someone scores, display "GOAL!" text in yellow
- ✓ Show "{SIDE} SCORES!" message below the goal text
- ✓ Show for 1 second (120 frames) before fading
- ✓ Timer decrements each frame in `update()`
- ✓ Created `render_goal_text()` to display the goal animation
- ✓ Integrated into `render()` when playing and timer is active

### Main Menu: ✓ COMPLETED
- ✓ Created `game_state` variable: "menu", "playing", "game_over" (line 42)
- ✓ Menu screen with:
  - Title: "PONG"
  - Subtitle: "Classic Arcade Game"
  - "1 - Two Player"
  - "2 - vs AI"
  - Control instructions
- ✓ Handle input to switch states (lines 84-92)
- ✓ Separate render functions for each state (lines 290-365)
- ✓ ESC key returns to menu during gameplay (lines 100-102)
- ✓ Professional look with proper spacing and colors

### Restart Without Closing:
- Add restart key (R)
- Reset all game variables to initial state
- Return to menu or countdown

---

## Recommended Implementation Order:

1. **Sound Effects** (Quick win, huge impact)
2. **Variable Ball Speed** (Makes gameplay more dynamic)
3. **Win Condition & Restart** (Gives game structure)
4. **Countdown Timer** (Polish)
5. **Paddle Color Flash** (Visual feedback)
6. **AI Opponent** (Adds single-player mode)
7. **Pause Functionality** (Quality of life)
8. **Power-ups** (Advanced feature)
9. **More Visual Effects** (Extra polish)

---

## Notes:
- Test each feature thoroughly before moving to the next
- Keep code organized (consider creating separate classes for Ball, Paddle, Powerup)
- Comment your code as you learn
- Have fun and experiment!
