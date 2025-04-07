# Speech-to-Text Comparison Platform Documentation

This application compares multiple AI-powered speech recognition models (Google, Vosk, Whisper) with features like noise reduction, sentiment analysis, and performance metrics.

To run locally:

1. Install dependencies: flask, flask-socketio, eventlet, gunicorn, nltk, openai, vosk, whisper, etc.
2. Download Vosk model from https://alphacephei.com/vosk/models
3. Set OPENAI_API_KEY environment variable
4. Run: python main.py
5. Access at http://localhost:5000

Features include real-time transcription, sentiment analysis, demo mode, and performance comparison.
