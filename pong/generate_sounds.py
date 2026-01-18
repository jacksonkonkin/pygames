import numpy as np
import wave
import struct

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
    with wave.open(filename, 'w') as wav_file:
        # Set parameters: 1 channel (mono), 2 bytes per sample, sample rate
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        # Write the audio data
        wav_file.writeframes(wave_data.tobytes())

def generate_paddle_hit():
    """Generate paddle hit sound - short, high-pitched beep."""
    wave_data, sample_rate = generate_beep(frequency=800, duration=0.1, volume=0.4)
    save_wav('sounds/paddle_hit.wav', wave_data, sample_rate)
    print("Generated paddle_hit.wav")

def generate_wall_bounce():
    """Generate wall bounce sound - medium pitch, quick."""
    wave_data, sample_rate = generate_beep(frequency=400, duration=0.08, volume=0.3)
    save_wav('sounds/wall_bounce.wav', wave_data, sample_rate)
    print("Generated wall_bounce.wav")

def generate_score():
    """Generate score sound - two-tone, celebratory."""
    # First tone
    wave1, sample_rate = generate_beep(frequency=600, duration=0.15, volume=0.4)
    # Second tone (higher)
    wave2, _ = generate_beep(frequency=800, duration=0.15, volume=0.4)

    # Concatenate the two tones
    wave_data = np.concatenate([wave1, wave2])

    save_wav('sounds/score.wav', wave_data, sample_rate)
    print("Generated score.wav")

if __name__ == "__main__":
    print("Generating sound effects...")
    generate_paddle_hit()
    generate_wall_bounce()
    generate_score()
    print("\nAll sound effects generated successfully!")
    print("Files saved in 'sounds/' directory")
