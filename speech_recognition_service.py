import os
import logging
import base64
import numpy as np
import io
import speech_recognition as sr
from vosk import Model, KaldiRecognizer
import whisper
import json
from tempfile import NamedTemporaryFile
import wave

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize models
# You'll need to download Vosk model from https://alphacephei.com/vosk/models
VOSK_MODEL_PATH = os.path.join(os.path.dirname(__file__), "vosk-model-small-en-us-0.15")
try:
    vosk_model = Model(VOSK_MODEL_PATH)
    logger.info("Vosk model loaded successfully")
except Exception as e:
    logger.error(f"Error loading Vosk model: {str(e)}")
    vosk_model = None

# Initialize whisper model (small model for faster processing)
try:
    whisper_model = whisper.load_model("base")
    logger.info("Whisper model loaded successfully")
except Exception as e:
    logger.error(f"Error loading Whisper model: {str(e)}")
    whisper_model = None

# Initialize speech recognizer for Google
recognizer = sr.Recognizer()

def get_available_models():
    """Get list of available speech recognition models"""
    models = []
    
    models.append({
        "id": "google", 
        "name": "Google Speech Recognition", 
        "available": True
    })
    
    models.append({
        "id": "vosk", 
        "name": "Vosk", 
        "available": vosk_model is not None
    })
    
    models.append({
        "id": "whisper", 
        "name": "OpenAI Whisper", 
        "available": whisper_model is not None
    })
    
    return models

def base64_to_audio(base64_audio):
    """Convert base64 audio data to audio format for processing"""
    audio_bytes = base64.b64decode(base64_audio.split(',')[1] if ',' in base64_audio else base64_audio)
    return audio_bytes

def recognize_with_google(audio_bytes):
    """Recognize speech using Google Speech Recognition"""
    try:
        # Save the audio bytes to a temporary WAV file
        with NamedTemporaryFile(suffix=".wav", delete=True) as temp_audio:
            with wave.open(temp_audio.name, 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)  # 16-bit audio
                wf.setframerate(16000)
                wf.writeframes(audio_bytes)
            
            # Use the temporary file for recognition
            with sr.AudioFile(temp_audio.name) as source:
                audio_data = recognizer.record(source)
                text = recognizer.recognize_google(audio_data)
                # Google doesn't provide confidence scores directly
                confidence = 0.9  # Placeholder value
                return text, confidence
    except sr.UnknownValueError:
        return "", 0.0
    except sr.RequestError as e:
        logger.error(f"Google Speech Recognition service error: {str(e)}")
        return "", 0.0
    except Exception as e:
        logger.error(f"Error in Google Speech Recognition: {str(e)}")
        return "", 0.0

def recognize_with_vosk(audio_bytes):
    """Recognize speech using Vosk"""
    if vosk_model is None:
        return "Vosk model not loaded", 0.0
    
    try:
        # Create Kaldi recognizer with the model
        rec = KaldiRecognizer(vosk_model, 16000)
        
        # Process audio
        rec.AcceptWaveform(audio_bytes)
        result = json.loads(rec.Result())
        
        # Extract text and confidence
        text = result.get("text", "")
        confidence = result.get("confidence", 0.0)
        
        return text, confidence
    except Exception as e:
        logger.error(f"Error in Vosk Speech Recognition: {str(e)}")
        return "", 0.0

def recognize_with_whisper(audio_bytes):
    """Recognize speech using OpenAI Whisper"""
    if whisper_model is None:
        return "Whisper model not loaded", 0.0
    
    try:
        # Save the audio bytes to a temporary WAV file
        with NamedTemporaryFile(suffix=".wav", delete=True) as temp_audio:
            with wave.open(temp_audio.name, 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)  # 16-bit audio
                wf.setframerate(16000)
                wf.writeframes(audio_bytes)
            
            # Use the temporary file for recognition
            result = whisper_model.transcribe(temp_audio.name)
            text = result["text"]
            # Whisper doesn't provide confidence scores directly
            confidence = 0.85  # Placeholder value based on segment-level confidence
            
            return text, confidence
    except Exception as e:
        logger.error(f"Error in Whisper Speech Recognition: {str(e)}")
        return "", 0.0

def recognize_speech(audio_base64, model="google"):
    """
    Recognize speech from base64-encoded audio using the specified model
    
    Args:
        audio_base64: Base64 encoded audio data
        model: Speech recognition model to use (google, vosk, or whisper)
        
    Returns:
        Tuple of (transcribed_text, confidence_score)
    """
    logger.debug(f"Recognizing speech with model: {model}")
    
    try:
        # Convert base64 to audio bytes
        audio_bytes = base64_to_audio(audio_base64)
        
        # Process with the selected model
        if model == "google":
            return recognize_with_google(audio_bytes)
        elif model == "vosk":
            return recognize_with_vosk(audio_bytes)
        elif model == "whisper":
            return recognize_with_whisper(audio_bytes)
        else:
            logger.error(f"Unknown model type: {model}")
            return "", 0.0
    except Exception as e:
        logger.error(f"Error in speech recognition: {str(e)}")
        return "", 0.0
