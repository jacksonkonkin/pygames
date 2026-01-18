import numpy as np
import wave
import struct
import os

def generate_beep(frequency, duration, sample_rate=44100, volume=0.3):
    """
    Generate a simple beep sound.

    Args:
        frequency: Pitch of the sound in Hz (higher = higher pitch)
        duration: Length of sound in seconds
        sample_rate: Quality of audio (44100 is CD quality)
        volume: Loudness from 0.0 to 1.0
    """
    # Calculate number of samples needed
    num_samples = int(sample_rate * duration)

    # Generate time array
    t = np.linspace(0, duration, num_samples)

    # Generate sine wave (this creates the tone)
    wave_data = np.sin(2 * np.pi * frequency * t)

    # Apply volume
    wave_data = wave_data * volume

    # Add fade out to prevent clicking sound at the end
    fade_samples = int(sample_rate * 0.01)  # 10ms fade
    fade = np.linspace(1, 0, fade_samples)
    wave_data[-fade_samples:] *= fade

    # Convert to 16-bit integer format (standard for WAV files)
    wave_data = np.int16(wave_data * 32767)

    return wave_data, sample_rate

def save_wav(filename, wave_data, sample_rate):
    """Save wave data to a WAV file."""
    # Create sounds directory if it doesn't exist
    dir_path = os.path.dirname(filename)
    if dir_path:
        os.makedirs(dir_path, exist_ok=True)
    
    with wave.open(filename, 'w') as wav_file:
        # Set parameters: 1 channel (mono), 2 bytes per sample, sample rate
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        # Write the audio data
        wav_file.writeframes(wave_data.tobytes())

def generate_shoot():
    """Generate player shoot sound - short, sharp beep."""
    wave_data, sample_rate = generate_beep(frequency=1000, duration=0.05, volume=0.3)
    save_wav('sounds/shoot.wav', wave_data, sample_rate)
    print("Generated shoot.wav")

def generate_enemy_shoot():
    """Generate enemy shoot sound - lower pitch, quick."""
    wave_data, sample_rate = generate_beep(frequency=400, duration=0.1, volume=0.3)
    save_wav('sounds/enemy_shoot.wav', wave_data, sample_rate)
    print("Generated enemy_shoot.wav")

def generate_explosion():
    """Generate explosion sound - noise-like with tone."""
    sample_rate = 44100
    duration = 0.2
    num_samples = int(sample_rate * duration)
    
    # Create a noise-like sound with decreasing frequency
    t = np.linspace(0, duration, num_samples)
    # Start high, drop down (explosion effect)
    frequencies = np.linspace(300, 100, num_samples)
    wave_data = np.sin(2 * np.pi * frequencies * t)
    
    # Add some randomness for noise effect
    noise = np.random.normal(0, 0.1, num_samples)
    wave_data = wave_data * 0.7 + noise * 0.3
    
    # Apply volume
    wave_data = wave_data * 0.4
    
    # Fade out
    fade_samples = int(sample_rate * 0.05)
    fade = np.linspace(1, 0, fade_samples)
    wave_data[-fade_samples:] *= fade
    
    wave_data = np.int16(wave_data * 32767)
    save_wav('sounds/explosion.wav', wave_data, sample_rate)
    print("Generated explosion.wav")

def generate_player_death():
    """Generate player death sound - descending tone."""
    sample_rate = 44100
    duration = 0.5
    num_samples = int(sample_rate * duration)
    
    t = np.linspace(0, duration, num_samples)
    # Descending frequency (death sound)
    frequencies = np.linspace(400, 150, num_samples)
    wave_data = np.sin(2 * np.pi * frequencies * t)
    
    # Apply volume with envelope
    envelope = np.linspace(1, 0, num_samples)
    wave_data = wave_data * envelope * 0.5
    
    wave_data = np.int16(wave_data * 32767)
    save_wav('sounds/player_death.wav', wave_data, sample_rate)
    print("Generated player_death.wav")

def generate_wave_complete():
    """Generate wave complete sound - ascending tones."""
    sample_rate = 44100
    # Three ascending tones
    wave1, _ = generate_beep(frequency=400, duration=0.1, volume=0.4)
    wave2, _ = generate_beep(frequency=600, duration=0.1, volume=0.4)
    wave3, _ = generate_beep(frequency=800, duration=0.15, volume=0.4)
    
    # Concatenate with small pauses
    silence = np.zeros(int(sample_rate * 0.05), dtype=np.int16)
    wave_data = np.concatenate([wave1, silence, wave2, silence, wave3])
    
    save_wav('sounds/wave_complete.wav', wave_data, sample_rate)
    print("Generated wave_complete.wav")

def generate_game_over():
    """Generate game over sound - low, ominous tone."""
    sample_rate = 44100
    duration = 0.8
    num_samples = int(sample_rate * duration)
    
    t = np.linspace(0, duration, num_samples)
    # Low descending tone
    frequencies = np.linspace(200, 100, num_samples)
    wave_data = np.sin(2 * np.pi * frequencies * t)
    
    # Apply volume with envelope
    envelope = np.linspace(0.8, 0, num_samples)
    wave_data = wave_data * envelope * 0.5
    
    wave_data = np.int16(wave_data * 32767)
    save_wav('sounds/game_over.wav', wave_data, sample_rate)
    print("Generated game_over.wav")

if __name__ == "__main__":
    print("Generating Space Invaders sound effects...")
    generate_shoot()
    generate_enemy_shoot()
    generate_explosion()
    generate_player_death()
    generate_wave_complete()
    generate_game_over()
    print("\nAll sound effects generated successfully!")
    print("Files saved in 'sounds/' directory")
