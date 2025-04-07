# Speech Recognition Platform Installation Guide

This document provides detailed instructions for installing and running the Speech Recognition Platform on your local computer.

## Prerequisites

1. **Python 3.8 or higher**
   - Download from [python.org](https://www.python.org/downloads/)
   - Ensure Python is added to your PATH during installation

2. **Git (optional)**
   - For cloning the repository
   - Download from [git-scm.com](https://git-scm.com/downloads)

3. **Terminal/Command Prompt**
   - On Windows: PowerShell or Command Prompt
   - On macOS/Linux: Terminal

## Installation Steps

### 1. Get the Project Files

**Option A: Download ZIP**
- Download the ZIP file from this repository
- Extract it to your preferred location

**Option B: Clone with Git**
```bash
git clone [repository URL]
cd speech-recognition-platform
```

### 2. Set Up Python Environment (recommended)

Creating a virtual environment is recommended to avoid package conflicts:

**On Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**On macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install flask flask-socketio eventlet gunicorn nltk numpy openai psycopg2-binary speechrecognition textblob trafilatura vosk whisper email-validator
```

### 4. Download NLTK Data

Run Python and execute the following commands:

```python
import nltk
nltk.download('punkt')
nltk.download('stopwords')
```

### 5. Download Vosk Model

The Vosk model is required for offline speech recognition:

1. Download the small English model from [alphacephei.com/vosk/models](https://alphacephei.com/vosk/models)
   - Look for `vosk-model-small-en-us-0.15.zip` (or similar version)
2. Extract it to the project directory 
3. Ensure the folder is named exactly `vosk-model-small-en-us-0.15`

### 6. Set Up Environment Variables

#### For OpenAI Whisper API (Optional)

You'll need an OpenAI API key to use the Whisper model:

**On Windows:**
```cmd
set OPENAI_API_KEY=your_api_key_here
set SESSION_SECRET=a_secure_random_string
```

**On macOS/Linux:**
```bash
export OPENAI_API_KEY=your_api_key_here
export SESSION_SECRET=a_secure_random_string
```

> **Note:** If you don't have an OpenAI API key, the application will still work with Google and Vosk models.

### 7. Running the Application

From the project directory, run:

```bash
python main.py
```

The application will be available at [http://localhost:5000](http://localhost:5000)

## Troubleshooting Common Issues

### Microphone Access Problems

If the application can't access your microphone:

1. Ensure your browser has permission to use the microphone
2. Try a different browser (Chrome is recommended)
3. Toggle the "Demo Mode" switch in the application to use generated transcriptions

### Model Not Working

If a specific model isn't working:

1. **Google Speech Recognition**:
   - Requires internet connection
   - May have usage limits

2. **Vosk**:
   - Check that the model folder is correctly named and placed in the project directory
   - The folder name should be exactly `vosk-model-small-en-us-0.15`

3. **Whisper**:
   - Requires a valid OpenAI API key
   - Check your environment variable is correctly set

### Application Crashes

If the application crashes:

1. Check the terminal/console for error messages
2. Ensure all dependencies are installed
3. Verify Python version is 3.8 or higher
4. Try reinstalling dependencies

## Using the Application Offline

For fully offline usage:

1. Ensure the Vosk model is properly installed
2. Select "Vosk (Offline Model)" in the application interface
3. Google and Whisper models will not work without internet connection

## Additional Tips

- For Python beginners, consider using [Anaconda](https://www.anaconda.com/products/individual) which includes many of the required packages
- If you face issues on Windows, try running the commands in an Administrator terminal
- The application may take a moment to load as it initializes the speech recognition models

## Contact and Support

For help with installation or usage issues, please refer to the project documentation or submit an issue on the project repository.