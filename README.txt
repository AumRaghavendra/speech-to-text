# Speech-to-Text Comparison Platform Documentation

This application compares multiple AI-powered speech recognition models (Google, Vosk, Whisper) with features like noise reduction, sentiment analysis, and performance metrics.

## Key Features

- **Multiple Speech Recognition Models**: Compare Google Speech, Vosk, and OpenAI Whisper
- **Real-time Audio Processing**: Instant transcription with visual feedback
- **Noise Reduction**: Improved accuracy in noisy environments
- **Sentiment Analysis**: Automatic emotion detection with emoji visualization
- **Performance Metrics**: Compare accuracy and speed across models
- **Dark Mode UI**: Beautiful and accessible interface
- **Demo Mode**: Always works even if microphone access fails

## Detailed Installation Guide

### Prerequisites

1. **Python 3.8+** installed on your system
2. Internet connection for downloading dependencies
3. Microphone (optional - demo mode works without it)

### Step 1: Install Dependencies

```bash
pip install flask flask-socketio eventlet gunicorn nltk numpy openai 
pip install psycopg2-binary speechrecognition textblob trafilatura vosk whisper
```

### Step 2: Download Vosk Model for Offline Recognition

1. Download the small English model from https://alphacephei.com/vosk/models
2. Extract the ZIP file to the project directory
3. Make sure the folder is named exactly `vosk-model-small-en-us-0.15`

### Step 3: Set Up Environment Variables (Optional)

For OpenAI Whisper support (optional):

**Windows:**
```
set OPENAI_API_KEY=your_api_key_here
```

**macOS/Linux:**
```
export OPENAI_API_KEY=your_api_key_here
```

> Note: The application will still work without this key, but the Whisper model will be disabled.

### Step 4: Run the Application

```bash
python main.py
```

### Step 5: Access the Application

Open your web browser and go to:
http://localhost:5000

## Troubleshooting

### Microphone Issues
- The application includes fallback demo mode that works without a microphone
- Make sure your browser has microphone permissions
- Try a different browser if needed (Chrome recommended)

### Model Selection
- Google requires internet connection but works well in most cases
- Vosk works 100% offline but requires downloading the model
- Whisper requires an OpenAI API key but has excellent accuracy

### Browser Compatibility
- Tested on Chrome, Firefox, and Edge
- For Safari, enable experimental web features
- Mobile browsers have limited support for microphone access

## Technical Details

- Backend: Python with Flask and Flask-SocketIO
- Frontend: HTML/CSS/JS with React
- Audio Processing: Web Audio API
- Communication: Socket.IO for real-time data

## License and Credits

This project utilizes:
- Vosk for offline speech recognition
- Google Speech Recognition API
- OpenAI Whisper API
- NLTK and TextBlob for sentiment analysis
