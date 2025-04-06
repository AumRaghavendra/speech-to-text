import os
import logging
import json
import random
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
        logger.debug("Received audio data from client")
        
        # Handle demo transcriptions directly
        if data.get('demo_transcription'):
            logger.info("Received demo transcription directly")
            demo_data = data.get('demo_transcription')
            
            # Send it back to the client
            emit('transcription_result', demo_data)
            
            # Update metrics
            model = demo_data.get('model', active_model)
            confidence = demo_data.get('confidence', 0.9)
            processing_time = demo_data.get('processing_time', 200)
            text = demo_data.get('text', '')
            
            pm.update_metrics(model, processing_time, confidence, len(text) if text else 0)
            emit('performance_metrics', pm.get_metrics())
            
            return
        
        # Check if we're in forced demo mode
        force_demo_mode = data.get('force_demo_mode', False)
        
        # Get audio data and model preference
        audio_data = data.get('audio')
        model_pref = data.get('model')
        
        # Use client model if provided, otherwise use active model
        model_to_use = model_pref if model_pref else active_model
        
        # Validate audio data
        if not audio_data and not force_demo_mode:
            logger.warning("No audio data received and not in demo mode")
            emit('error', {'message': 'No audio data received'})
            return
        
        # Log info about the received data
        if audio_data:
            audio_prefix = audio_data.split(',')[0] if ',' in audio_data else 'unknown'
            audio_length = len(audio_data)
            logger.debug(f"Audio data received: format={audio_prefix}, length={audio_length}")
        
        # Start timing the processing
        start_time = pm.get_current_time()
        
        # Process the audio if not in demo mode
        if not force_demo_mode and audio_data:
            try:
                # Apply noise reduction if enabled
                if noise_reduction_enabled:
                    logger.debug("Applying noise reduction")
                    audio_data = nr.reduce_noise(audio_data)
                
                # Process with selected model
                logger.debug(f"Processing with {model_to_use} model")
                text, confidence = srs.recognize_speech(audio_data, model_to_use)
                
                # Check if we got a result
                if text:
                    logger.debug(f"Recognition successful: '{text}'")
                    use_demo_mode = False
                else:
                    logger.warning("No text recognized, falling back to demo mode")
                    use_demo_mode = True
            except Exception as e:
                logger.error(f"Error in speech recognition: {str(e)}")
                use_demo_mode = True
        else:
            logger.info("Using demo mode as requested")
            use_demo_mode = True
        
        # Instead of generating demo content, log an error when speech recognition fails 
        if use_demo_mode:
            # Show a clear error message about recognition failing
            text = "Sorry, I couldn't recognize your speech. Please try speaking clearly or adjusting your microphone."
            confidence = 0.5  # Lower confidence to indicate this is an error message
            logger.warning("Speech recognition failed, sending error message to client")
        
        # Calculate processing time
        processing_time = pm.calculate_processing_time(start_time)
        
        # Create response with transcription result
        response = {
            'text': text,
            'model': model_to_use,
            'confidence': confidence,
            'processing_time': processing_time,
            'demo_mode': use_demo_mode,
            'timestamp': pm.get_current_time()
        }
        
        # Add sentiment analysis if enabled
        if sentiment_analysis_enabled and text:
            logger.debug("Analyzing sentiment")
            sentiment = sa.analyze_sentiment(text)
            response['sentiment'] = sentiment
        
        # Update performance metrics
        pm.update_metrics(model_to_use, processing_time, confidence, len(text) if text else 0)
        
        # Send the results back to the client
        emit('transcription_result', response)
        logger.debug("Sent transcription result to client")
        
        # Send updated performance metrics
        emit('performance_metrics', pm.get_metrics())
        
    except Exception as e:
        logger.error(f"Error processing audio data: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
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
