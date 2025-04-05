import logging
import base64
import numpy as np
import io
import wave
import struct

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def base64_to_audio_array(base64_audio):
    """Convert base64 audio data to numpy array for processing"""
    try:
        # Decode base64 string
        audio_bytes = base64.b64decode(base64_audio.split(',')[1] if ',' in base64_audio else base64_audio)
        
        # Create a wave file from bytes
        with io.BytesIO(audio_bytes) as wav_io:
            with wave.open(wav_io, 'rb') as wav_file:
                # Get audio file parameters
                channels = wav_file.getnchannels()
                sample_width = wav_file.getsampwidth()
                frame_rate = wav_file.getframerate()
                n_frames = wav_file.getnframes()
                
                # Read all frames
                frames = wav_file.readframes(n_frames)
                
                # Convert to numpy array
                if sample_width == 2:
                    format_str = f"{n_frames * channels}h"
                    audio_array = np.array(struct.unpack(format_str, frames), dtype=np.float32)
                    audio_array /= 32768.0  # Normalize to [-1, 1]
                else:
                    logger.warning(f"Unsupported sample width: {sample_width}")
                    return None, None, None
                
                return audio_array, channels, frame_rate
    except Exception as e:
        logger.error(f"Error converting base64 to audio array: {str(e)}")
        return None, None, None

def audio_array_to_base64(audio_array, channels, frame_rate):
    """Convert numpy array back to base64 audio data"""
    try:
        # Scale back to 16-bit integers
        audio_array = np.clip(audio_array, -1.0, 1.0)
        audio_array = (audio_array * 32767).astype(np.int16)
        
        # Pack as binary data
        format_str = f"{len(audio_array)}h"
        frames = struct.pack(format_str, *audio_array)
        
        # Create wave file in memory
        with io.BytesIO() as wav_io:
            with wave.open(wav_io, 'wb') as wav_file:
                wav_file.setnchannels(channels)
                wav_file.setsampwidth(2)
                wav_file.setframerate(frame_rate)
                wav_file.writeframes(frames)
            
            # Get the wave file data and convert to base64
            wav_data = wav_io.getvalue()
            base64_data = base64.b64encode(wav_data).decode('utf-8')
            return f"data:audio/wav;base64,{base64_data}"
    except Exception as e:
        logger.error(f"Error converting audio array to base64: {str(e)}")
        return None

def apply_spectral_subtraction(audio_array, frame_rate):
    """
    Apply spectral subtraction for noise reduction
    
    This is a simplified implementation of spectral subtraction
    for demonstration purposes. A more sophisticated implementation
    would use a proper audio processing library.
    """
    try:
        if audio_array is None:
            return None
        
        # Convert to mono if stereo
        if len(audio_array.shape) > 1:
            audio_array = np.mean(audio_array, axis=1)
        
        # Parameters
        frame_size = int(0.025 * frame_rate)  # 25ms
        frame_shift = int(0.010 * frame_rate)  # 10ms
        
        # Estimate noise from the first 100ms assuming it's background noise
        noise_est_length = min(int(0.100 * frame_rate), len(audio_array) // 4)
        noise_est = audio_array[:noise_est_length]
        
        # Get noise spectrum
        noise_spec = np.abs(np.fft.rfft(noise_est))
        
        # Process the signal in frames
        result = np.zeros_like(audio_array)
        
        # Apply spectral subtraction for each frame
        for start in range(0, len(audio_array) - frame_size, frame_shift):
            # Extract frame
            frame = audio_array[start:start + frame_size]
            
            # Apply window
            windowed_frame = frame * np.hanning(len(frame))
            
            # Get spectrum
            spec = np.fft.rfft(windowed_frame)
            spec_mag = np.abs(spec)
            spec_phase = np.angle(spec)
            
            # Subtract noise spectrum
            gain = np.maximum(spec_mag - noise_spec[:len(spec_mag)] * 1.0, 0) / (spec_mag + 1e-10)
            enhanced_spec = spec * gain
            
            # Inverse FFT
            enhanced_frame = np.fft.irfft(enhanced_spec)
            
            # Add to result with overlap-add
            result[start:start + frame_size] += enhanced_frame * np.hanning(len(enhanced_frame))
        
        # Normalize
        result = result / np.max(np.abs(result))
        
        return result
    except Exception as e:
        logger.error(f"Error applying spectral subtraction: {str(e)}")
        return audio_array  # Return original if error occurs

def reduce_noise(base64_audio):
    """
    Apply noise reduction to the audio data
    
    Args:
        base64_audio: Base64 encoded audio data
        
    Returns:
        Base64 encoded audio data with noise reduction applied
    """
    try:
        # Convert base64 to audio array
        audio_array, channels, frame_rate = base64_to_audio_array(base64_audio)
        
        if audio_array is None:
            logger.warning("Could not convert base64 to audio array, returning original")
            return base64_audio
        
        # Apply noise reduction
        denoised_array = apply_spectral_subtraction(audio_array, frame_rate)
        
        if denoised_array is None:
            logger.warning("Noise reduction failed, returning original")
            return base64_audio
        
        # Convert back to base64
        result = audio_array_to_base64(denoised_array, channels, frame_rate)
        
        return result if result is not None else base64_audio
    except Exception as e:
        logger.error(f"Error in noise reduction: {str(e)}")
        return base64_audio  # Return original if error occurs
