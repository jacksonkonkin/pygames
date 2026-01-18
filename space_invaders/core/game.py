import pygame
import random
import os
from config.constants import *

class Game():
    """Main Game Coordinator - orchestrates everything"""
    
    def __init__(self):
        # Initialize pygame
        pygame.init()
        
        # Set up the game window
        self.screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        pygame.display.set_caption("Space Invaders")
        
        # Clock to control frame rate
        self.clock = pygame.time.Clock()
        
        # Game loop control
        self.running = True
        
        # Game state
        self.game_state = "menu"  # menu, playing, paused, game_over, wave_transition
        
        # Player
        self.player_x = PLAYER_START_X
        self.player_y = PLAYER_START_Y
        self.player_lives = PLAYER_LIVES
        self.player_bullets = []
        self.player_death_timer = 0
        
        # Enemies
        self.enemies = []
        self.enemy_direction = 1  # 1 for right, -1 for left
        self.enemy_speed = ENEMY_SPEED
        self.enemy_bullets = []
        self.enemy_shoot_timer = 0
        
        # Barriers
        self.barriers = []
        
        # Scoring
        self.score = 0
        self.high_score = self.load_high_score()
        self.wave = 1
        
        # Fonts
        self.font = pygame.font.Font(None, 74)
        self.small_font = pygame.font.Font(None, 36)
        self.medium_font = pygame.font.Font(None, 48)
        
        # Wave transition
        self.wave_transition_timer = 0
        
        # Initialize sounds (will be loaded if files exist)
        pygame.mixer.init()
        self.sounds = {}
        self.load_sounds()
        
        # Initialize first wave
        self.init_enemies()
        self.init_barriers()
    
    def load_sounds(self):
        """Load sound effects if they exist"""
        sound_files = {
            'shoot': 'sounds/shoot.wav',
            'enemy_shoot': 'sounds/enemy_shoot.wav',
            'explosion': 'sounds/explosion.wav',
            'player_death': 'sounds/player_death.wav',
            'wave_complete': 'sounds/wave_complete.wav',
            'game_over': 'sounds/game_over.wav'
        }
        
        # Try both relative paths (when run from space_invaders/ and from project root)
        possible_bases = ['', 'space_invaders']
        
        for sound_name, sound_path in sound_files.items():
            loaded = False
            for base in possible_bases:
                full_path = os.path.join(base, sound_path) if base else sound_path
                if os.path.exists(full_path):
                    try:
                        self.sounds[sound_name] = pygame.mixer.Sound(full_path)
                        loaded = True
                        break
                    except:
                        pass
    
    def play_sound(self, sound_name):
        """Play a sound effect if it exists"""
        if sound_name in self.sounds:
            self.sounds[sound_name].play()
    
    def load_high_score(self):
        """Load high score from file"""
        # Try both possible paths
        for path in ['high_score.txt', 'space_invaders/high_score.txt']:
            try:
                if os.path.exists(path):
                    with open(path, 'r') as f:
                        return int(f.read().strip())
            except:
                continue
        return 0
    
    def save_high_score(self):
        """Save high score to file"""
        # Try to save in current directory first, then space_invaders subdirectory
        for path in ['high_score.txt', 'space_invaders/high_score.txt']:
            try:
                # Create directory if needed
                dir_path = os.path.dirname(path)
                if dir_path and not os.path.exists(dir_path):
                    os.makedirs(dir_path, exist_ok=True)
                with open(path, 'w') as f:
                    f.write(str(self.high_score))
                return
            except:
                continue
    
    def init_enemies(self):
        """Initialize enemy formation"""
        self.enemies = []
        for row in range(ENEMY_ROWS):
            enemy_row = []
            for col in range(ENEMY_COLS):
                x = ENEMY_START_X + col * ENEMY_SPACING_X
                y = ENEMY_START_Y + row * ENEMY_SPACING_Y
                enemy_type = row // 2  # 0 = top, 1 = middle, 2 = bottom
                enemy_row.append({
                    'x': x,
                    'y': y,
                    'alive': True,
                    'type': enemy_type
                })
            self.enemies.append(enemy_row)
        
        # Reset enemy speed based on wave
        self.enemy_speed = ENEMY_SPEED + (self.wave - 1) * 0.5
    
    def init_barriers(self):
        """Initialize destructible barriers"""
        self.barriers = []
        barrier_spacing = WINDOW_WIDTH // (BARRIER_COUNT + 1)
        
        for i in range(BARRIER_COUNT):
            x = barrier_spacing * (i + 1) - BARRIER_WIDTH // 2
            barrier = []
            # Create barrier as grid of pixels (8x8 blocks)
            block_size = 4
            blocks_x = BARRIER_WIDTH // block_size
            blocks_y = BARRIER_HEIGHT // block_size
            
            for by in range(blocks_y):
                barrier_row = []
                for bx in range(blocks_x):
                    # Create shield shape (simple arc)
                    center_x = blocks_x // 2
                    center_y = blocks_y
                    dist_from_center = ((bx - center_x) ** 2 + (by - center_y) ** 2) ** 0.5
                    max_dist = blocks_y * 0.8
                    
                    if dist_from_center < max_dist and by > blocks_y // 3:
                        barrier_row.append(True)  # Barrier block exists
                    else:
                        barrier_row.append(False)
                barrier.append(barrier_row)
            
            self.barriers.append({
                'x': x,
                'y': BARRIER_Y,
                'blocks': barrier,
                'block_size': block_size
            })
    
    def get_alive_enemies(self):
        """Get list of all alive enemies with their positions"""
        alive = []
        for row in self.enemies:
            for enemy in row:
                if enemy['alive']:
                    alive.append(enemy)
        return alive
    
    def get_bottom_enemies(self):
        """Get the bottom-most alive enemy in each column"""
        bottom_enemies = []
        for col in range(ENEMY_COLS):
            for row in range(ENEMY_ROWS - 1, -1, -1):
                enemy = self.enemies[row][col]
                if enemy['alive']:
                    bottom_enemies.append(enemy)
                    break
        return bottom_enemies
    
    def run(self):
        """Main game loop"""
        while self.running:
            events = pygame.event.get()
            
            self.handle_events(events)
            self.update(events)
            self.render()
            
            self.clock.tick(FPS)
        
        pygame.quit()
    
    def handle_events(self, events):
        """Handle pygame events"""
        for event in events:
            if event.type == pygame.QUIT:
                self.running = False
            
            if event.type == pygame.KEYDOWN:
                # Menu state
                if self.game_state == "menu":
                    if event.key == pygame.K_SPACE:
                        self.start_new_game()
                
                # Playing state
                elif self.game_state == "playing":
                    if event.key == pygame.K_SPACE and len(self.player_bullets) == 0:
                        self.player_bullets.append({
                            'x': self.player_x,
                            'y': self.player_y - BULLET_HEIGHT
                        })
                        self.play_sound('shoot')
                    elif event.key == pygame.K_p:
                        self.game_state = "paused"
                    elif event.key == pygame.K_ESCAPE:
                        self.game_state = "menu"
                
                # Paused state
                elif self.game_state == "paused":
                    if event.key == pygame.K_p or event.key == pygame.K_SPACE:
                        self.game_state = "playing"
                    elif event.key == pygame.K_ESCAPE:
                        self.game_state = "menu"
                
                # Game over state
                elif self.game_state == "game_over":
                    if event.key == pygame.K_SPACE:
                        self.game_state = "menu"
                
                # Wave transition state
                elif self.game_state == "wave_transition":
                    if event.key == pygame.K_SPACE:
                        self.start_next_wave()
    
    def start_new_game(self):
        """Start a new game"""
        self.player_x = PLAYER_START_X
        self.player_y = PLAYER_START_Y
        self.player_lives = PLAYER_LIVES
        self.player_bullets = []
        self.enemy_bullets = []
        self.score = 0
        self.wave = 1
        self.player_death_timer = 0
        self.init_enemies()
        self.init_barriers()
        self.game_state = "playing"
    
    def start_next_wave(self):
        """Start the next wave"""
        self.wave += 1
        self.player_bullets = []
        self.enemy_bullets = []
        self.player_death_timer = 0
        self.enemy_shoot_timer = 0
        self.init_enemies()
        self.init_barriers()
        self.game_state = "playing"
    
    def update(self, events):
        """Update game state"""
        if self.game_state == "wave_transition":
            self.wave_transition_timer += 1
            if self.wave_transition_timer >= 180:  # 3 seconds
                self.start_next_wave()
            return
        
        if self.game_state != "playing":
            return
        
        # Handle player death animation
        if self.player_death_timer > 0:
            self.player_death_timer -= 1
            if self.player_death_timer == 0:
                if self.player_lives > 0:
                    # Respawn player
                    self.player_x = PLAYER_START_X
                    self.player_y = PLAYER_START_Y
                else:
                    # Game over
                    if self.score > self.high_score:
                        self.high_score = self.score
                        self.save_high_score()
                    self.game_state = "game_over"
                    self.play_sound('game_over')
            return
        
        keys = pygame.key.get_pressed()
        
        # Player movement
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            if self.player_x > PLAYER_WIDTH // 2:
                self.player_x -= PLAYER_SPEED
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            if self.player_x < WINDOW_WIDTH - PLAYER_WIDTH // 2:
                self.player_x += PLAYER_SPEED
        
        # Update player bullets
        for bullet in self.player_bullets[:]:
            bullet['y'] -= PLAYER_BULLET_SPEED
            if bullet['y'] < 0:
                self.player_bullets.remove(bullet)
        
        # Enemy movement
        move_down = False
        min_x = min([e['x'] for e in self.get_alive_enemies()]) if self.get_alive_enemies() else 0
        max_x = max([e['x'] for e in self.get_alive_enemies()]) if self.get_alive_enemies() else WINDOW_WIDTH
        
        if (self.enemy_direction == 1 and max_x + ENEMY_WIDTH // 2 >= WINDOW_WIDTH - 50) or \
           (self.enemy_direction == -1 and min_x - ENEMY_WIDTH // 2 <= 50):
            self.enemy_direction *= -1
            move_down = True
        
        for row in self.enemies:
            for enemy in row:
                if enemy['alive']:
                    enemy['x'] += self.enemy_speed * self.enemy_direction
                    if move_down:
                        enemy['y'] += ENEMY_DROP_DISTANCE
                    
                    # Check if enemy reached bottom
                    if enemy['y'] + ENEMY_HEIGHT >= PLAYER_START_Y - 10:
                        self.game_state = "game_over"
                        if self.score > self.high_score:
                            self.high_score = self.score
                            self.save_high_score()
                        self.play_sound('game_over')
        
        # Enemy shooting
        self.enemy_shoot_timer += 1
        if self.enemy_shoot_timer >= ENEMY_BULLET_COOLDOWN:
            if len(self.enemy_bullets) == 0:
                bottom_enemies = self.get_bottom_enemies()
                if bottom_enemies:
                    shooter = random.choice(bottom_enemies)
                    self.enemy_bullets.append({
                        'x': shooter['x'],
                        'y': shooter['y'] + ENEMY_HEIGHT
                    })
                    self.play_sound('enemy_shoot')
                    self.enemy_shoot_timer = 0
        
        # Update enemy bullets
        for bullet in self.enemy_bullets[:]:
            bullet['y'] += ENEMY_BULLET_SPEED
            if bullet['y'] > WINDOW_HEIGHT:
                self.enemy_bullets.remove(bullet)
        
        # Collision: Player bullets vs enemies
        for bullet in self.player_bullets[:]:
            bullet_rect = pygame.Rect(bullet['x'] - BULLET_WIDTH // 2, bullet['y'], BULLET_WIDTH, BULLET_HEIGHT)
            hit = False
            
            for row in self.enemies:
                for enemy in row:
                    if enemy['alive']:
                        enemy_rect = pygame.Rect(
                            enemy['x'] - ENEMY_WIDTH // 2,
                            enemy['y'] - ENEMY_HEIGHT // 2,
                            ENEMY_WIDTH,
                            ENEMY_HEIGHT
                        )
                        if bullet_rect.colliderect(enemy_rect):
                            # Award points based on enemy type
                            if enemy['type'] == 0:
                                self.score += ENEMY_POINTS_TOP
                            elif enemy['type'] == 1:
                                self.score += ENEMY_POINTS_MIDDLE
                            else:
                                self.score += ENEMY_POINTS_BOTTOM
                            
                            enemy['alive'] = False
                            self.player_bullets.remove(bullet)
                            self.play_sound('explosion')
                            hit = True
                            break
                if hit:
                    break
            
            if hit:
                continue
            
            # Collision: Player bullets vs barriers
            for barrier in self.barriers:
                block_size = barrier['block_size']
                bullet_block_x = int((bullet['x'] - barrier['x'] + BARRIER_WIDTH // 2) / block_size)
                bullet_block_y = int((bullet['y'] - barrier['y']) / block_size)
                
                if 0 <= bullet_block_x < len(barrier['blocks'][0]) and \
                   0 <= bullet_block_y < len(barrier['blocks']):
                    if barrier['blocks'][bullet_block_y][bullet_block_x]:
                        # Destroy blocks around impact
                        for dy in range(-1, 3):
                            for dx in range(-2, 3):
                                by = bullet_block_y + dy
                                bx = bullet_block_x + dx
                                if 0 <= by < len(barrier['blocks']) and \
                                   0 <= bx < len(barrier['blocks'][0]):
                                    barrier['blocks'][by][bx] = False
                        
                        self.player_bullets.remove(bullet)
                        break
        
        # Collision: Enemy bullets vs player
        if self.player_death_timer == 0:
            player_rect = pygame.Rect(
                self.player_x - PLAYER_WIDTH // 2,
                self.player_y - PLAYER_HEIGHT // 2,
                PLAYER_WIDTH,
                PLAYER_HEIGHT
            )
            
            for bullet in self.enemy_bullets[:]:
                bullet_rect = pygame.Rect(
                    bullet['x'] - BULLET_WIDTH // 2,
                    bullet['y'],
                    BULLET_WIDTH,
                    BULLET_HEIGHT
                )
                
                if bullet_rect.colliderect(player_rect):
                    self.player_lives -= 1
                    self.enemy_bullets.remove(bullet)
                    self.player_bullets.clear()
                    self.player_death_timer = 120  # 2 seconds death animation
                    self.play_sound('player_death')
                    break
        
        # Collision: Enemy bullets vs barriers
        for bullet in self.enemy_bullets[:]:
            for barrier in self.barriers:
                block_size = barrier['block_size']
                bullet_block_x = int((bullet['x'] - barrier['x'] + BARRIER_WIDTH // 2) / block_size)
                bullet_block_y = int((bullet['y'] - barrier['y']) / block_size)
                
                if 0 <= bullet_block_x < len(barrier['blocks'][0]) and \
                   0 <= bullet_block_y < len(barrier['blocks']):
                    if barrier['blocks'][bullet_block_y][bullet_block_x]:
                        # Destroy blocks around impact
                        for dy in range(-1, 3):
                            for dx in range(-2, 3):
                                by = bullet_block_y + dy
                                bx = bullet_block_x + dx
                                if 0 <= by < len(barrier['blocks']) and \
                                   0 <= bx < len(barrier['blocks'][0]):
                                    barrier['blocks'][by][bx] = False
                        
                        self.enemy_bullets.remove(bullet)
                        break
            else:
                continue
            break
        
        # Check if all enemies destroyed (wave complete)
        if not self.get_alive_enemies():
            self.game_state = "wave_transition"
            self.wave_transition_timer = 0
            self.play_sound('wave_complete')
    
    def render(self):
        """Render the game state to the screen"""
        self.screen.fill(BLACK)
        
        if self.game_state == "menu":
            self.render_menu()
        elif self.game_state == "playing" or self.game_state == "paused":
            self.render_game()
            if self.game_state == "paused":
                self.render_paused()
        elif self.game_state == "wave_transition":
            self.render_wave_transition()
        elif self.game_state == "game_over":
            self.render_game()
            self.render_game_over()
        
        pygame.display.flip()
    
    def render_menu(self):
        """Render the main menu"""
        # Title
        title_text = self.font.render("SPACE INVADERS", True, WHITE)
        title_rect = title_text.get_rect(center=(WINDOW_WIDTH // 2, 150))
        self.screen.blit(title_text, title_rect)
        
        # Instructions
        start_text = self.medium_font.render("Press SPACE to Start", True, GREEN)
        start_rect = start_text.get_rect(center=(WINDOW_WIDTH // 2, 300))
        self.screen.blit(start_text, start_rect)
        
        controls_text = self.small_font.render("Arrow Keys / A/D - Move  |  SPACE - Shoot  |  P - Pause", True, WHITE)
        controls_rect = controls_text.get_rect(center=(WINDOW_WIDTH // 2, 380))
        self.screen.blit(controls_text, controls_rect)
        
        # High score
        if self.high_score > 0:
            high_score_text = self.small_font.render(f"High Score: {self.high_score}", True, YELLOW)
            high_score_rect = high_score_text.get_rect(center=(WINDOW_WIDTH // 2, 450))
            self.screen.blit(high_score_text, high_score_rect)
    
    def draw_alien(self, x, y, enemy_type):
        """Draw an alien sprite at the given position"""
        # Color based on type
        if enemy_type == 0:  # Top row - squid-like alien
            color = RED
            # Draw body (rounded top, wider bottom)
            body_points = [
                (x, y - ENEMY_HEIGHT // 2 + 5),  # Top point
                (x - ENEMY_WIDTH // 2 + 8, y - ENEMY_HEIGHT // 2 + 15),  # Top left
                (x - ENEMY_WIDTH // 2, y),  # Bottom left
                (x - ENEMY_WIDTH // 3, y + ENEMY_HEIGHT // 2 - 5),  # Left tentacle
                (x + ENEMY_WIDTH // 3, y + ENEMY_HEIGHT // 2 - 5),  # Right tentacle
                (x + ENEMY_WIDTH // 2, y),  # Bottom right
                (x + ENEMY_WIDTH // 2 - 8, y - ENEMY_HEIGHT // 2 + 15),  # Top right
            ]
            pygame.draw.polygon(self.screen, color, body_points)
            # Eyes
            pygame.draw.circle(self.screen, WHITE, (x - 8, y - 5), 3)
            pygame.draw.circle(self.screen, WHITE, (x + 8, y - 5), 3)
            pygame.draw.circle(self.screen, BLACK, (x - 8, y - 5), 1)
            pygame.draw.circle(self.screen, BLACK, (x + 8, y - 5), 1)
            
        elif enemy_type == 1:  # Middle rows - crab-like alien
            color = YELLOW
            # Main body (wider)
            pygame.draw.ellipse(self.screen, color,
                              (x - ENEMY_WIDTH // 2, y - ENEMY_HEIGHT // 2 + 5,
                               ENEMY_WIDTH, ENEMY_HEIGHT - 10))
            # Top antenna/head
            pygame.draw.ellipse(self.screen, color,
                              (x - 6, y - ENEMY_HEIGHT // 2, 12, 12))
            # Legs/claws
            pygame.draw.line(self.screen, color, (x - ENEMY_WIDTH // 2, y + 8), (x - ENEMY_WIDTH // 2 - 5, y + 15), 3)
            pygame.draw.line(self.screen, color, (x + ENEMY_WIDTH // 2, y + 8), (x + ENEMY_WIDTH // 2 + 5, y + 15), 3)
            # Eyes
            pygame.draw.circle(self.screen, WHITE, (x - 10, y - 2), 4)
            pygame.draw.circle(self.screen, WHITE, (x + 10, y - 2), 4)
            pygame.draw.circle(self.screen, BLACK, (x - 10, y - 2), 2)
            pygame.draw.circle(self.screen, BLACK, (x + 10, y - 2), 2)
            
        else:  # Bottom rows - octopus-like alien
            color = CYAN
            # Body (tall, rounded)
            body_rect = pygame.Rect(x - ENEMY_WIDTH // 2 + 3, y - ENEMY_HEIGHT // 2 + 3,
                                   ENEMY_WIDTH - 6, ENEMY_HEIGHT - 6)
            pygame.draw.ellipse(self.screen, color, body_rect)
            # Head dome
            pygame.draw.ellipse(self.screen, color,
                              (x - 8, y - ENEMY_HEIGHT // 2 - 3, 16, 10))
            # Tentacles/legs at bottom
            for i in range(3):
                offset = (i - 1) * 6
                pygame.draw.line(self.screen, color, 
                               (x + offset - 3, y + ENEMY_HEIGHT // 2 - 3),
                               (x + offset - 5, y + ENEMY_HEIGHT // 2 + 5), 2)
                pygame.draw.line(self.screen, color,
                               (x + offset + 3, y + ENEMY_HEIGHT // 2 - 3),
                               (x + offset + 5, y + ENEMY_HEIGHT // 2 + 5), 2)
            # Eyes (larger, more menacing)
            pygame.draw.circle(self.screen, WHITE, (x - 9, y - 5), 5)
            pygame.draw.circle(self.screen, WHITE, (x + 9, y - 5), 5)
            pygame.draw.circle(self.screen, BLACK, (x - 9, y - 5), 3)
            pygame.draw.circle(self.screen, BLACK, (x + 9, y - 5), 3)
            # Mouth
            pygame.draw.line(self.screen, BLACK, (x - 4, y + 5), (x + 4, y + 5), 2)
    
    def render_game(self):
        """Render the active game"""
        # Draw barriers
        for barrier in self.barriers:
            block_size = barrier['block_size']
            for y, row in enumerate(barrier['blocks']):
                for x, block in enumerate(row):
                    if block:
                        block_x = barrier['x'] - BARRIER_WIDTH // 2 + x * block_size
                        block_y = barrier['y'] + y * block_size
                        pygame.draw.rect(self.screen, GREEN, 
                                       (block_x, block_y, block_size, block_size))
        
        # Draw enemies
        for row in self.enemies:
            for enemy in row:
                if enemy['alive']:
                    self.draw_alien(enemy['x'], enemy['y'], enemy['type'])
        
        # Draw player (if not dead)
        if self.player_death_timer == 0:
            # Simple ship shape (triangle)
            ship_points = [
                (self.player_x, self.player_y - PLAYER_HEIGHT // 2),
                (self.player_x - PLAYER_WIDTH // 2, self.player_y + PLAYER_HEIGHT // 2),
                (self.player_x + PLAYER_WIDTH // 2, self.player_y + PLAYER_HEIGHT // 2)
            ]
            pygame.draw.polygon(self.screen, WHITE, ship_points)
        
        # Draw player bullets
        for bullet in self.player_bullets:
            pygame.draw.rect(self.screen, YELLOW,
                           (bullet['x'] - BULLET_WIDTH // 2, bullet['y'],
                            BULLET_WIDTH, BULLET_HEIGHT))
        
        # Draw enemy bullets
        for bullet in self.enemy_bullets:
            pygame.draw.rect(self.screen, RED,
                           (bullet['x'] - BULLET_WIDTH // 2, bullet['y'],
                            BULLET_WIDTH, BULLET_HEIGHT))
        
        # Draw score
        score_text = self.small_font.render(f"Score: {self.score}", True, WHITE)
        self.screen.blit(score_text, (10, 10))
        
        # Draw wave
        wave_text = self.small_font.render(f"Wave: {self.wave}", True, WHITE)
        self.screen.blit(wave_text, (10, 40))
        
        # Draw lives
        lives_text = self.small_font.render(f"Lives: {self.player_lives}", True, WHITE)
        self.screen.blit(lives_text, (10, 70))
        
        # Draw high score
        high_score_text = self.small_font.render(f"High Score: {self.high_score}", True, YELLOW)
        high_score_rect = high_score_text.get_rect(topright=(WINDOW_WIDTH - 10, 10))
        self.screen.blit(high_score_text, high_score_rect)
    
    def render_paused(self):
        """Render pause overlay"""
        overlay = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT))
        overlay.set_alpha(128)
        overlay.fill(BLACK)
        self.screen.blit(overlay, (0, 0))
        
        paused_text = self.font.render("PAUSED", True, YELLOW)
        paused_rect = paused_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 - 50))
        self.screen.blit(paused_text, paused_rect)
        
        resume_text = self.small_font.render("Press P or SPACE to resume", True, WHITE)
        resume_rect = resume_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 + 30))
        self.screen.blit(resume_text, resume_rect)
        
        menu_text = self.small_font.render("Press ESC for menu", True, WHITE)
        menu_rect = menu_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 + 80))
        self.screen.blit(menu_text, menu_rect)
    
    def render_wave_transition(self):
        """Render wave transition screen"""
        wave_text = self.font.render(f"WAVE {self.wave}", True, GREEN)
        wave_rect = wave_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 - 50))
        self.screen.blit(wave_text, wave_rect)
        
        continue_text = self.small_font.render("Press SPACE to continue", True, WHITE)
        continue_rect = continue_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 + 50))
        self.screen.blit(continue_text, continue_rect)
    
    def render_game_over(self):
        """Render game over overlay"""
        overlay = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT))
        overlay.set_alpha(200)
        overlay.fill(BLACK)
        self.screen.blit(overlay, (0, 0))
        
        game_over_text = self.font.render("GAME OVER", True, RED)
        game_over_rect = game_over_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 - 100))
        self.screen.blit(game_over_text, game_over_rect)
        
        score_text = self.medium_font.render(f"Final Score: {self.score}", True, WHITE)
        score_rect = score_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 - 30))
        self.screen.blit(score_text, score_rect)
        
        if self.score == self.high_score and self.score > 0:
            new_record_text = self.medium_font.render("NEW HIGH SCORE!", True, YELLOW)
            new_record_rect = new_record_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 + 30))
            self.screen.blit(new_record_text, new_record_rect)
        
        restart_text = self.small_font.render("Press SPACE to return to menu", True, WHITE)
        restart_rect = restart_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 + 100))
        self.screen.blit(restart_text, restart_rect)
