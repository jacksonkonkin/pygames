import pygame
from config.constants import *

class Game():
    """Main Game Coordinator - orchestrates everything"""
    
    def __init__(self):
        # initialize pygame
        pygame.init()

        # set up the game window
        self.screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))

        # set the window title
        pygame.display.set_caption("Pong Game")

        # clock to control the frame rate
        self.clock = pygame.time.Clock()

        # game loop control variable/ running flag
        self.running = True

        self.radius = 15
        self.ball_x = WINDOW_WIDTH // 2
        self.ball_y = WINDOW_HEIGHT // 2

        self.ball_speed_x = 4
        self.ball_speed_y = 4
        self.ball_speed_multiplier = 1.0  # Speed multiplier for progressive difficulty

        self.left_paddle_x = 50
        self.left_paddle_y = WINDOW_HEIGHT // 2 - 40

        self.right_paddle_x = WINDOW_WIDTH - 50
        self.right_paddle_y = WINDOW_HEIGHT // 2 - 40

        self.paddle_speed = 5

        self.left_score = 0
        self.right_score = 0

        self.game_state = "menu"  # States: "menu", "ai_difficulty", "countdown", "playing", "paused", "game_over"
        self.winner = None  # Will be "LEFT" or "RIGHT"

        # Countdown timer
        self.countdown = 3
        self.countdown_timer = 0  # Frame counter for countdown

        # Goal text animation
        self.goal_text_timer = 0
        self.goal_scorer = None  # Which side scored

        # Paddle flash timers for visual feedback
        self.left_paddle_flash = 0
        self.right_paddle_flash = 0

        # AI settings
        self.ai_enabled = False  # Toggle AI on/off
        self.ai_speed = 5  # AI paddle speed - set by difficulty selection
        self.ai_difficulty = "medium"  # Options: "easy", "medium", "hard"

        self.font = pygame.font.Font(None, 74)  # None uses default font, 74 is size
        self.small_font = pygame.font.Font(None, 36)  # For smaller text

        # Load sound effects
        pygame.mixer.init()
        self.paddle_hit_sound = pygame.mixer.Sound('sounds/paddle_hit.wav')
        self.wall_bounce_sound = pygame.mixer.Sound('sounds/wall_bounce.wav')
        self.score_sound = pygame.mixer.Sound('sounds/score.wav')

    def run(self):
        """Main game loop"""
        while self.running:
          events = pygame.event.get()

          self.handle_events(events)
          self.update(events)
          self.render()

          self.clock.tick(FPS)  # limit to FPS frames per second

        pygame.quit()

    def handle_events(self, events: list):
        """Handles pygame events"""
        for event in events:
            if event.type == pygame.QUIT:
                self.running = False

            # Handle keyboard events
            if event.type == pygame.KEYDOWN:
                # Menu state
                if self.game_state == "menu":
                    if event.key == pygame.K_1:
                        # Start 2-player mode
                        self.ai_enabled = False
                        self.start_countdown()
                    elif event.key == pygame.K_2:
                        # Go to AI difficulty selection
                        self.game_state = "ai_difficulty"

                # AI Difficulty selection state
                elif self.game_state == "ai_difficulty":
                    if event.key == pygame.K_1:
                        # Easy mode
                        self.ai_difficulty = "easy"
                        self.ai_speed = 4
                        self.ai_enabled = True
                        self.start_countdown()
                    elif event.key == pygame.K_2:
                        # Medium mode
                        self.ai_difficulty = "medium"
                        self.ai_speed = 5
                        self.ai_enabled = True
                        self.start_countdown()
                    elif event.key == pygame.K_3:
                        # Hard mode
                        self.ai_difficulty = "hard"
                        self.ai_speed = 6
                        self.ai_enabled = True
                        self.start_countdown()
                    elif event.key == pygame.K_ESCAPE:
                        # Back to main menu
                        self.game_state = "menu"

                # Playing state
                elif self.game_state == "playing":
                    # Toggle AI with 'A' key during gameplay
                    if event.key == pygame.K_a:
                        self.ai_enabled = not self.ai_enabled
                    # Pause with P
                    if event.key == pygame.K_p:
                        self.game_state = "paused"
                    # Return to menu with ESC
                    if event.key == pygame.K_ESCAPE:
                        self.game_state = "menu"
                        self.reset_game()

                # Paused state
                elif self.game_state == "paused":
                    # Unpause with P or SPACE
                    if event.key == pygame.K_p or event.key == pygame.K_SPACE:
                        self.game_state = "playing"
                    # Return to menu with ESC
                    if event.key == pygame.K_ESCAPE:
                        self.game_state = "menu"
                        self.reset_game()

                # Game over state
                elif self.game_state == "game_over":
                    if event.key == pygame.K_SPACE:
                        self.reset_game()
                        self.game_state = "menu"

    def update(self, events: list):
        """Update game state"""
        # Handle countdown
        if self.game_state == "countdown":
            self.countdown_timer += 1
            # Each second is 120 frames at 120 FPS
            if self.countdown_timer >= 120:  # 1 second passed
                self.countdown_timer = 0
                self.countdown -= 1
                if self.countdown == 0:
                    self.game_state = "playing"
            return

        # Handle goal text timer
        if self.goal_text_timer > 0:
            self.goal_text_timer -= 1
            if self.goal_text_timer == 0:
                self.goal_scorer = None

        # Only update game logic when playing
        if self.game_state != "playing":
            return

        keys = pygame.key.get_pressed()

        # Left paddle (always player controlled)
        if(keys[pygame.K_w] and self.left_paddle_y > 0):
            self.left_paddle_y = self.left_paddle_y - self.paddle_speed
        if(keys[pygame.K_s] and self.left_paddle_y < WINDOW_HEIGHT - 80):
            self.left_paddle_y = self.left_paddle_y + self.paddle_speed

        # Right paddle (AI or player controlled)
        if self.ai_enabled:
            # AI Logic: Track the ball
            paddle_center = self.right_paddle_y + 40  # Center of 80px paddle

            # Move paddle toward ball's y position
            if self.ball_y < paddle_center - 10:  # Ball is above center
                if self.right_paddle_y > 0:
                    self.right_paddle_y -= self.ai_speed
            elif self.ball_y > paddle_center + 10:  # Ball is below center
                if self.right_paddle_y < WINDOW_HEIGHT - 80:
                    self.right_paddle_y += self.ai_speed
        else:
            # Player controlled
            if(keys[pygame.K_UP]  and self.right_paddle_y > 0):
                self.right_paddle_y = self.right_paddle_y - self.paddle_speed
            if(keys[pygame.K_DOWN] and self.right_paddle_y < WINDOW_HEIGHT - 80):
                 self.right_paddle_y = self.right_paddle_y + self.paddle_speed
        
        # Apply speed multiplier to ball movement
        self.ball_x += self.ball_speed_x * self.ball_speed_multiplier
        self.ball_y += self.ball_speed_y * self.ball_speed_multiplier

        ball_in_paddle_height_left = (self.ball_y + self.radius > self.left_paddle_y and self.ball_y - self.radius < self.left_paddle_y + 80)

        ball_reached_paddle_left = (self.ball_x - self.radius <= self.left_paddle_x + 10 and self.ball_x - self.radius >= self.left_paddle_x and self.ball_speed_x < 0)

        ball_in_paddle_height_right = (self.ball_y + self.radius > self.right_paddle_y and self.ball_y - self.radius < self.right_paddle_y + 80)

        ball_reached_paddle_right = (self.ball_x + self.radius >= self.right_paddle_x and 
                             self.ball_x + self.radius <= self.right_paddle_x + 10 and 
                             self.ball_speed_x > 0)

        # bounce off paddle left
        if ball_reached_paddle_left and ball_in_paddle_height_left:
            self.ball_speed_x = -self.ball_speed_x

            # Adjust angle based on where ball hits paddle
            paddle_center = self.left_paddle_y + 40  # Center of 80px paddle
            hit_position = self.ball_y - paddle_center  # -40 to +40
            angle_adjustment = hit_position / 40 * 2  # Normalize to -2 to +2
            self.ball_speed_y += angle_adjustment

            # Increase speed multiplier (max 2.0x speed)
            if self.ball_speed_multiplier < 2.0:
                self.ball_speed_multiplier += 0.05

            # Trigger flash effect
            self.left_paddle_flash = 10

            self.paddle_hit_sound.play()

        # bounce off paddle right
        if ball_reached_paddle_right and ball_in_paddle_height_right:
            self.ball_speed_x = -self.ball_speed_x

            # Adjust angle based on where ball hits paddle
            paddle_center = self.right_paddle_y + 40  # Center of 80px paddle
            hit_position = self.ball_y - paddle_center  # -40 to +40
            angle_adjustment = hit_position / 40 * 2  # Normalize to -2 to +2
            self.ball_speed_y += angle_adjustment

            # Increase speed multiplier (max 2.0x speed)
            if self.ball_speed_multiplier < 2.0:
                self.ball_speed_multiplier += 0.05

            # Trigger flash effect
            self.right_paddle_flash = 10

            self.paddle_hit_sound.play()

        # Left paddle top/bottom edge collision
        if (self.ball_x >= self.left_paddle_x and
            self.ball_x <= self.left_paddle_x + 10):
            # Top edge
            if (self.ball_y + self.radius >= self.left_paddle_y and
                self.ball_y - self.radius <= self.left_paddle_y and
                self.ball_speed_y > 0):
                self.ball_speed_y = -self.ball_speed_y
                self.ball_speed_x = -self.ball_speed_x
                self.left_paddle_flash = 10
                self.paddle_hit_sound.play()
            # Bottom edge
            if (self.ball_y - self.radius <= self.left_paddle_y + 80 and
                self.ball_y + self.radius >= self.left_paddle_y + 80 and
                self.ball_speed_y < 0):
                self.ball_speed_y = -self.ball_speed_y
                self.ball_speed_x = -self.ball_speed_x
                self.left_paddle_flash = 10
                self.paddle_hit_sound.play()

        # Right paddle top/bottom edge collision
        if (self.ball_x >= self.right_paddle_x and
            self.ball_x <= self.right_paddle_x + 10):
            # Top edge
            if (self.ball_y + self.radius >= self.right_paddle_y and
                self.ball_y - self.radius <= self.right_paddle_y and
                self.ball_speed_y > 0):
                self.ball_speed_y = -self.ball_speed_y
                self.ball_speed_x = -self.ball_speed_x
                self.right_paddle_flash = 10
                self.paddle_hit_sound.play()
            # Bottom edge
            if (self.ball_y - self.radius <= self.right_paddle_y + 80 and
                self.ball_y + self.radius >= self.right_paddle_y + 80 and
                self.ball_speed_y < 0):
                self.ball_speed_y = -self.ball_speed_y
                self.ball_speed_x = -self.ball_speed_x
                self.right_paddle_flash = 10
                self.paddle_hit_sound.play()

        # Bounce off top and bottom
        if self.ball_y - self.radius <= 0 or self.ball_y + self.radius >= WINDOW_HEIGHT:
            self.ball_speed_y = -self.ball_speed_y
            self.wall_bounce_sound.play()

        # reset ball
        if (self.ball_x + self.radius > WINDOW_WIDTH):
            self.ball_x = WINDOW_WIDTH // 2
            self.ball_y = WINDOW_HEIGHT // 2
            self.ball_speed_x = 4
            self.ball_speed_y = 4
            self.ball_speed_multiplier = 1.0  # Reset speed multiplier
            self.left_score += 1
            self.score_sound.play()

            # Show goal text
            self.goal_text_timer = 120  # Show for 1 second
            self.goal_scorer = "LEFT"

            # Check for win condition
            if self.left_score >= WINNING_SCORE:
                self.game_state = "game_over"
                self.winner = "LEFT"

        if (self.ball_x - self.radius < 0):
            self.ball_x = WINDOW_WIDTH // 2
            self.ball_y = WINDOW_HEIGHT // 2
            self.ball_speed_x = -4
            self.ball_speed_y = 4
            self.ball_speed_multiplier = 1.0  # Reset speed multiplier
            self.right_score += 1
            self.score_sound.play()

            # Show goal text
            self.goal_text_timer = 120  # Show for 1 second
            self.goal_scorer = "RIGHT"

            # Check for win condition
            if self.right_score >= WINNING_SCORE:
                self.game_state = "game_over"
                self.winner = "RIGHT"

        # Decrement flash timers
        if self.left_paddle_flash > 0:
            self.left_paddle_flash -= 1
        if self.right_paddle_flash > 0:
            self.right_paddle_flash -= 1


    def render(self):
        """Render the game state to the screen"""
        self.screen.fill(BLACK)

        if self.game_state == "menu":
            self.render_menu()
        elif self.game_state == "ai_difficulty":
            self.render_ai_difficulty()
        elif self.game_state == "countdown":
            self.render_game()  # Show game in background
            self.render_countdown()
        elif self.game_state == "playing":
            self.render_game()
            # Show goal text if active
            if self.goal_text_timer > 0:
                self.render_goal_text()
        elif self.game_state == "paused":
            self.render_game()  # Show game in background
            self.render_paused()
        elif self.game_state == "game_over":
            self.render_game()  # Show final game state
            self.render_game_over()

        pygame.display.flip()

    def render_menu(self):
        """Render the main menu"""
        # Title
        title_text = self.font.render("PONG", True, WHITE)
        title_rect = title_text.get_rect(center=(WINDOW_WIDTH // 2, 150))
        self.screen.blit(title_text, title_rect)

        # Subtitle
        subtitle_text = self.small_font.render("Classic Arcade Game", True, WHITE)
        subtitle_rect = subtitle_text.get_rect(center=(WINDOW_WIDTH // 2, 220))
        self.screen.blit(subtitle_text, subtitle_rect)

        # Menu options
        option1_text = self.font.render("1 - Two Player", True, WHITE)
        option1_rect = option1_text.get_rect(center=(WINDOW_WIDTH // 2, 320))
        self.screen.blit(option1_text, option1_rect)

        option2_text = self.font.render("2 - vs AI", True, YELLOW)
        option2_rect = option2_text.get_rect(center=(WINDOW_WIDTH // 2, 400))
        self.screen.blit(option2_text, option2_rect)

        # Instructions
        instructions_text = self.small_font.render("W/S - Left Paddle  |  Arrow Keys - Right Paddle", True, WHITE)
        instructions_rect = instructions_text.get_rect(center=(WINDOW_WIDTH // 2, 500))
        self.screen.blit(instructions_text, instructions_rect)

    def render_ai_difficulty(self):
        """Render AI difficulty selection menu"""
        # Title
        title_text = self.font.render("Select AI Difficulty", True, WHITE)
        title_rect = title_text.get_rect(center=(WINDOW_WIDTH // 2, 150))
        self.screen.blit(title_text, title_rect)

        # Difficulty options
        easy_text = self.font.render("1 - Easy", True, WHITE)
        easy_rect = easy_text.get_rect(center=(WINDOW_WIDTH // 2, 280))
        self.screen.blit(easy_text, easy_rect)

        easy_desc = self.small_font.render("(AI Speed: 4 - Slower reactions)", True, WHITE)
        easy_desc_rect = easy_desc.get_rect(center=(WINDOW_WIDTH // 2, 330))
        self.screen.blit(easy_desc, easy_desc_rect)

        medium_text = self.font.render("2 - Medium", True, YELLOW)
        medium_rect = medium_text.get_rect(center=(WINDOW_WIDTH // 2, 390))
        self.screen.blit(medium_text, medium_rect)

        medium_desc = self.small_font.render("(AI Speed: 5 - Balanced)", True, YELLOW)
        medium_desc_rect = medium_desc.get_rect(center=(WINDOW_WIDTH // 2, 440))
        self.screen.blit(medium_desc, medium_desc_rect)

        hard_text = self.font.render("3 - Hard", True, WHITE)
        hard_rect = hard_text.get_rect(center=(WINDOW_WIDTH // 2, 500))
        self.screen.blit(hard_text, hard_rect)

        hard_desc = self.small_font.render("(AI Speed: 6 - Fast reactions)", True, WHITE)
        hard_desc_rect = hard_desc.get_rect(center=(WINDOW_WIDTH // 2, 550))
        self.screen.blit(hard_desc, hard_desc_rect)

        # Back instruction
        back_text = self.small_font.render("Press ESC to go back", True, WHITE)
        back_rect = back_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT - 30))
        self.screen.blit(back_text, back_rect)

    def render_game(self):
        """Render the active game"""
        # Draw ball
        pygame.draw.circle(self.screen, WHITE, (self.ball_x, self.ball_y), self.radius)

        # Draw center line
        pygame.draw.line(self.screen, WHITE, (WINDOW_WIDTH // 2, 0), (WINDOW_WIDTH // 2, WINDOW_HEIGHT), 5)

        # Draw left paddle with flash effect
        left_paddle_color = YELLOW if self.left_paddle_flash > 0 else WHITE
        pygame.draw.rect(self.screen, left_paddle_color, (self.left_paddle_x, self.left_paddle_y, 10, 80))

        # Draw right paddle with flash effect
        right_paddle_color = YELLOW if self.right_paddle_flash > 0 else WHITE
        pygame.draw.rect(self.screen, right_paddle_color, (self.right_paddle_x, self.right_paddle_y, 10, 80))

        # Render scores
        left_text = self.font.render(str(self.left_score), True, WHITE)
        self.screen.blit(left_text, (WINDOW_WIDTH // 4, 50))

        right_text = self.font.render(str(self.right_score), True, WHITE)
        self.screen.blit(right_text, (3 * WINDOW_WIDTH // 4, 50))

        # Show AI indicator
        if self.ai_enabled:
            ai_text = self.small_font.render(f"AI MODE - {self.ai_difficulty.upper()} (Press A to toggle | ESC for menu)", True, YELLOW)
            ai_rect = ai_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT - 30))
            self.screen.blit(ai_text, ai_rect)
        else:
            ai_text = self.small_font.render("2-PLAYER MODE (Press A for AI | ESC for menu)", True, WHITE)
            ai_rect = ai_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT - 30))
            self.screen.blit(ai_text, ai_rect)

    def render_countdown(self):
        """Render countdown overlay"""
        # Semi-transparent overlay
        overlay = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT))
        overlay.set_alpha(128)  # More transparent to see game behind
        overlay.fill(BLACK)
        self.screen.blit(overlay, (0, 0))

        # Display countdown number or GO!
        if self.countdown > 0:
            countdown_text = self.font.render(str(self.countdown), True, YELLOW)
        else:
            countdown_text = self.font.render("GO!", True, YELLOW)

        countdown_rect = countdown_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2))
        self.screen.blit(countdown_text, countdown_rect)

    def render_paused(self):
        """Render pause overlay"""
        # Semi-transparent overlay
        overlay = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT))
        overlay.set_alpha(128)
        overlay.fill(BLACK)
        self.screen.blit(overlay, (0, 0))

        # Paused message
        paused_text = self.font.render("PAUSED", True, YELLOW)
        paused_rect = paused_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 - 50))
        self.screen.blit(paused_text, paused_rect)

        # Resume instructions
        resume_text = self.small_font.render("Press P or SPACE to resume", True, WHITE)
        resume_rect = resume_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 + 30))
        self.screen.blit(resume_text, resume_rect)

        # Menu instruction
        menu_text = self.small_font.render("Press ESC for menu", True, WHITE)
        menu_rect = menu_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 + 80))
        self.screen.blit(menu_text, menu_rect)

    def render_goal_text(self):
        """Render goal text animation"""
        # GOAL! text
        goal_text = self.font.render("GOAL!", True, YELLOW)
        goal_rect = goal_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 - 50))
        self.screen.blit(goal_text, goal_rect)

        # Show which side scored
        scorer_text = self.small_font.render(f"{self.goal_scorer} SCORES!", True, WHITE)
        scorer_rect = scorer_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 + 20))
        self.screen.blit(scorer_text, scorer_rect)

    def render_game_over(self):
        """Render game over overlay"""
        # Semi-transparent overlay
        overlay = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT))
        overlay.set_alpha(200)
        overlay.fill(BLACK)
        self.screen.blit(overlay, (0, 0))

        # Victory message
        winner_text = self.font.render(f"{self.winner} PLAYER WINS!", True, WHITE)
        winner_rect = winner_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 - 50))
        self.screen.blit(winner_text, winner_rect)

        # Return to menu instruction
        restart_text = self.small_font.render("Press SPACE to return to menu", True, WHITE)
        restart_rect = restart_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 + 50))
        self.screen.blit(restart_text, restart_rect)

    def start_countdown(self):
        """Initialize countdown before game starts"""
        self.countdown = 3
        self.countdown_timer = 0
        self.game_state = "countdown"

    def reset_game(self):
        """Reset game state to start a new game"""
        # Reset ball position and speed
        self.ball_x = WINDOW_WIDTH // 2
        self.ball_y = WINDOW_HEIGHT // 2
        self.ball_speed_x = 4
        self.ball_speed_y = 4
        self.ball_speed_multiplier = 1.0

        # Reset paddle positions
        self.left_paddle_y = WINDOW_HEIGHT // 2 - 40
        self.right_paddle_y = WINDOW_HEIGHT // 2 - 40

        # Reset scores
        self.left_score = 0
        self.right_score = 0

        # Reset winner
        self.winner = None

        # Reset flash timers
        self.left_paddle_flash = 0
        self.right_paddle_flash = 0

        # Reset countdown and goal text timers
        self.countdown = 3
        self.countdown_timer = 0
        self.goal_text_timer = 0
        self.goal_scorer = None