import os
import logging
import json
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
import speech_recognition_service as srs
import sentiment_analysis as sa
import noise_reduction as nr
import performance_metrics as pm

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default_secret_key")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Global variables to store active model and processing settings
active_model = "google"  # Default model
noise_reduction_enabled = True
sentiment_analysis_enabled = True

@app.route('/')
def index():
    """Render the main application page"""
    return render_template('index.html')

@app.route('/api/models', methods=['GET'])
def get_models():
    """Get available speech recognition models"""
    models = srs.get_available_models()
    return jsonify(models)

@app.route('/api/settings', methods=['POST'])
def update_settings():
    """Update application settings"""
    global active_model, noise_reduction_enabled, sentiment_analysis_enabled
    
    data = request.json
    if 'model' in data:
        active_model = data['model']
    if 'noiseReduction' in data:
        noise_reduction_enabled = data['noiseReduction']
    if 'sentimentAnalysis' in data:
        sentiment_analysis_enabled = data['sentimentAnalysis']
    
    return jsonify({'status': 'success', 'settings': {
        'model': active_model,
        'noiseReduction': noise_reduction_enabled,
        'sentimentAnalysis': sentiment_analysis_enabled
    }})

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    logger.debug('Client connected')
    emit('settings', {
        'model': active_model,
        'noiseReduction': noise_reduction_enabled,
        'sentimentAnalysis': sentiment_analysis_enabled
    })

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    logger.debug('Client disconnected')

@socketio.on('audio_data')
def handle_audio_data(data):
    """Process incoming audio data from client"""
    try:
        audio_data = data['audio']
        
        # Apply noise reduction if enabled
        if noise_reduction_enabled:
            audio_data = nr.reduce_noise(audio_data)
        
        # Process with the selected speech recognition model
        start_time = pm.get_current_time()
        text, confidence = srs.recognize_speech(audio_data, active_model)
        processing_time = pm.calculate_processing_time(start_time)
        
        response = {
            'text': text,
            'model': active_model,
            'confidence': confidence,
            'processing_time': processing_time
        }
        
        # Add sentiment analysis if enabled and text is available
        if sentiment_analysis_enabled and text:
            sentiment = sa.analyze_sentiment(text)
            response['sentiment'] = sentiment
        
        # Update performance metrics
        pm.update_metrics(active_model, processing_time, confidence, len(text) if text else 0)
        
        # Send the results back to the client
        emit('transcription_result', response)
        
        # Send updated performance metrics
        emit('performance_metrics', pm.get_metrics())
        
    except Exception as e:
        logger.error(f"Error processing audio data: {str(e)}")
        emit('error', {'message': str(e)})

@socketio.on('get_performance_metrics')
def handle_get_performance_metrics():
    """Send performance metrics to client"""
    emit('performance_metrics', pm.get_metrics())

@socketio.on('reset_performance_metrics')
def handle_reset_performance_metrics():
    """Reset performance metrics"""
    pm.reset_metrics()
    emit('performance_metrics', pm.get_metrics())

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
