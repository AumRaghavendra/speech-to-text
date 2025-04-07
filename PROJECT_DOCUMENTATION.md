# Speech-to-Text Comparison Platform Documentation

## Project Overview

This application is a comprehensive speech recognition platform that compares multiple AI-powered transcription models with advanced audio processing capabilities. It allows users to record speech and compare the performance of three different speech recognition technologies in real-time:

1. **Google Speech Recognition** - Cloud-based service with high accuracy
2. **Vosk** - Offline, open-source model for local processing
3. **OpenAI Whisper** - Advanced AI model with state-of-the-art performance

## Key Features

- **Multiple Speech Recognition Backends**: Compare Google Speech, Vosk, and Whisper models simultaneously
- **Real-time Audio Processing**: Immediate transcription and feedback with visualizations
- **Noise Reduction**: Built-in noise reduction algorithms for cleaner audio input
- **Sentiment Analysis**: Automatic sentiment detection with emoji visualization 
- **Performance Metrics**: Detailed statistics on accuracy, speed, and confidence scores
- **Responsive UI**: Beautiful dark-mode interface with audio visualization
- **Demo Mode**: Test functionality without microphone access

## Technical Implementation

### Backend (Python/Flask)

- **Flask Web Server**: Handles HTTP requests and serves the application
- **Flask-SocketIO**: Enables real-time communication between client and server
- **Speech Recognition**: Integration with multiple speech recognition APIs
- **Audio Processing**: Noise reduction and audio manipulation capabilities
- **Sentiment Analysis**: TextBlob and NLTK integration for emotional context

### Frontend (React/JavaScript)

- **React Components**: Modular UI structure with component-based design
- **Socket.IO Client**: Real-time data transmission for immediate feedback
- **Audio API**: Direct browser microphone access for recording
- **Visualization**: Real-time audio visualizer and sentiment display
- **Tailwind CSS**: Responsive and beautiful UI styling

## Core Files and Their Functions

- **app.py**: Main Flask application with routes and socket handlers
- **main.py**: Entry point for running the application
- **speech_recognition_service.py**: Integration with speech recognition models
- **sentiment_analysis.py**: Text sentiment evaluation services
- **noise_reduction.py**: Audio noise reduction algorithms
- **performance_metrics.py**: Tracking and comparing model performance
- **static/js/**: Frontend React components
- **templates/index.html**: Main application page template

## Running the Project Locally

### Prerequisites

1. Python 3.8+ installed
2. Node.js (optional, for development only)
3. Pip for Python package management
4. Internet connection (for Google and Whisper APIs)
5. OpenAI API key (for Whisper model)

### Installation Steps

1. **Clone or download the project files**

2. **Install Python dependencies:**
   ```bash
   pip install flask flask-socketio eventlet gunicorn nltk numpy openai psycopg2-binary speechrecognition textblob trafilatura vosk whisper email-validator
   ```

3. **Download NLTK data (first time only):**
   ```python
   import nltk
   nltk.download('punkt')
   nltk.download('stopwords')
   ```

4. **Download Vosk Model:**
   Download the small English model from https://alphacephei.com/vosk/models
   Extract it to the project directory, ensuring it's named `vosk-model-small-en-us-0.15`

5. **Set up environment variables:**
   - For OpenAI Whisper API: `OPENAI_API_KEY=your_api_key_here`
   - For session security: `SESSION_SECRET=a_secure_random_string`

6. **Run the application:**
   ```bash
   python main.py
   ```

7. **Access the application:**
   Open a web browser and navigate to: `http://localhost:5000`

## Usage Guide

1. **Select Speech Recognition Model:**
   Choose between Google, Vosk, and Whisper models using the model selector

2. **Configure Settings:**
   - Toggle Noise Reduction on/off
   - Toggle Sentiment Analysis on/off
   - Toggle Demo Mode on/off

3. **Start Recording:**
   Click the "Start Recording" button to begin capturing audio

4. **View Results:**
   - Real-time transcription appears in the main panel
   - Sentiment analysis with emoji appears next to transcriptions
   - Performance metrics update in the right sidebar

5. **Compare Models:**
   Switch between models to compare their performance metrics

## Performance Metrics Explained

- **Confidence Score**: How certain the model is about the transcription (0-1)
- **Processing Time**: How long it takes to process audio (milliseconds)
- **Words Per Minute**: Estimated speed of speech recognition
- **Best Model**: Determined by a weighted combination of accuracy and speed

## Troubleshooting

- **Microphone Access Issues**: Ensure your browser has permission to access your microphone
- **Whisper API Errors**: Verify your OpenAI API key is correct and has sufficient credits
- **No Audio Processing**: Check if you have the correct audio format (WebM/WAV)
- **Demo Mode Only**: If real recording doesn't work, check browser compatibility or fall back to demo mode

## Research Paper References

This platform is designed to collect data for research on speech recognition technology. Key metrics tracked:

- Accuracy across different speaking styles and accents
- Performance with background noise
- Recognition of technical terminology
- Latency and processing time
- Confidence scoring reliability

## Extending the Project

- Add more speech recognition models
- Implement language support beyond English
- Add speaker diarization (identifying different speakers)
- Customize with domain-specific vocabulary
- Integrate with cloud storage for saved transcriptions

## License and Credits

This project uses several open-source technologies:
- Vosk Speech Recognition Engine
- NLTK for Natural Language Processing
- TextBlob for Sentiment Analysis
- Flask and SocketIO for Web Communication
- React and Tailwind CSS for Frontend

## Contact

For support or questions about this project, please refer to the included documentation or consult the Python and JavaScript package documentation for the individual components.