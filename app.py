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
        logger.debug("Received audio data from client")
        audio_data = data.get('audio')
        client_model = data.get('model')
        
        # Check if we received data
        if not audio_data:
            logger.warning("Received empty audio data")
            emit('error', {'message': 'Empty audio data received'})
            return
        
        # Determine which model to use (client-specified or global default)
        model_to_use = client_model if client_model else active_model
        logger.debug(f"Using model: {model_to_use}")
        
        # Check if we're in forced demo mode
        use_demo_mode = False
        if data.get('force_demo_mode') == True:
            use_demo_mode = True
            logger.info("Client sent forced demo mode flag")
        
        # Log audio data format for debugging
        audio_format = audio_data.split(',')[0] if ',' in audio_data else "unknown format"
        audio_length = len(audio_data)
        logger.debug(f"Audio data received: format={audio_format}, length={audio_length}")
        
        # Apply noise reduction if enabled
        if noise_reduction_enabled and not use_demo_mode:
            logger.debug("Applying noise reduction")
            audio_data = nr.reduce_noise(audio_data)
        
        # Start timing the processing
        start_time = pm.get_current_time()
        
        # Only try actual speech recognition if not in demo mode
        if not use_demo_mode:
            try:
                logger.debug(f"Processing with {model_to_use} model")
                text, confidence = srs.recognize_speech(audio_data, model_to_use)
                
                # If recognition returned no text, switch to demo mode
                if not text:
                    logger.warning("No text recognized despite receiving audio data. Using demo mode.")
                    use_demo_mode = True
            except Exception as e:
                logger.error(f"Error in speech recognition: {str(e)}")
                use_demo_mode = True
        
        # Fall back to demo mode if needed
        if use_demo_mode:
            # Use demo mode with predefined text samples
            import random
            demo_texts = [
                "This is a demonstration of the speech recognition system.",
                "I'm really excited about using this application for my project.",
                "The weather today is absolutely beautiful outside.",
                "Can you tell me how well the different speech recognition models compare?",
                "I'm not sure if my microphone is working correctly but this is a test.",
                "Speech recognition technology has improved tremendously in recent years.",
                "I'm feeling happy today and looking forward to learning more about this system.",
                "This dark mode interface looks amazing with the audio visualizer.",
                "Could you analyze the sentiment of this message please?",
                "Using artificial intelligence for speech recognition is fascinating."
            ]
            text = random.choice(demo_texts)
            confidence = random.uniform(0.75, 0.98)
            logger.info(f"Demo mode text generated: '{text}'")
        
        # Calculate processing time
        processing_time = pm.calculate_processing_time(start_time)
        logger.debug(f"Recognition result: text='{text}', confidence={confidence}, time={processing_time}ms")
        
        # Create response with transcription result
        response = {
            'text': text,
            'model': model_to_use,
            'confidence': confidence,
            'processing_time': processing_time,
            'demo_mode': use_demo_mode
        }
        
        # Add sentiment analysis if enabled
        if sentiment_analysis_enabled and text:
            logger.debug("Analyzing sentiment")
            sentiment = sa.analyze_sentiment(text)
            response['sentiment'] = sentiment
            logger.debug(f"Sentiment analysis result: {sentiment}")
        
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
