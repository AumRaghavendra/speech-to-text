import os
import logging
import base64
import numpy as np
import io
import speech_recognition as sr
from vosk import Model, KaldiRecognizer
import json
from tempfile import NamedTemporaryFile
import wave
from openai import OpenAI

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

# Initialize OpenAI client for Whisper API
try:
    # Check if OpenAI API key is available
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    if not openai_api_key:
        logger.warning("OpenAI API key not found in environment variables. Whisper model will be disabled.")
        client = None
        whisper_model = None
    else:
        # Initialize the OpenAI client
        client = OpenAI(api_key=openai_api_key)
        # We'll use the API directly rather than loading the model locally
        whisper_model = True
        logger.info("OpenAI Whisper API configuration loaded successfully")
except Exception as e:
    logger.error(f"Error configuring OpenAI Whisper API: {str(e)}")
    client = None
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
    try:
        # Extract the actual base64 data after the prefix
        if ',' in base64_audio:
            header, encoded = base64_audio.split(",", 1)
            logger.debug(f"Audio header format: {header}")
        else:
            encoded = base64_audio
        
        # Decode the base64 data to binary
        audio_bytes = base64.b64decode(encoded)
        logger.debug(f"Decoded audio bytes length: {len(audio_bytes)}")
        
        return audio_bytes
    except Exception as e:
        logger.error(f"Error converting base64 to audio: {str(e)}")
        return None

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
        logger.warning("Google Speech Recognition could not understand audio")
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
    """Recognize speech using OpenAI Whisper API"""
    if whisper_model is None:
        return "Whisper API not configured", 0.0
    
    try:
        # Save the audio bytes to a temporary WAV file
        with NamedTemporaryFile(suffix=".wav", delete=True) as temp_audio:
            with wave.open(temp_audio.name, 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)  # 16-bit audio
                wf.setframerate(16000)
                wf.writeframes(audio_bytes)
            
            # Use the OpenAI API to transcribe the audio
            with open(temp_audio.name, "rb") as audio_file:
                # the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
                # do not change this unless explicitly requested by the user
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file
                )
            
            text = transcript.text
            # OpenAI Whisper API doesn't provide confidence scores directly
            confidence = 0.9  # Placeholder value for API-based transcription
            
            return text, confidence
    except Exception as e:
        logger.error(f"Error in Whisper Speech Recognition API: {str(e)}")
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
        
        if not audio_bytes:
            logger.error("Failed to convert base64 to audio data")
            return "", 0.0
        
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
