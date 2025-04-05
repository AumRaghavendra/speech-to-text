import logging
import time
from collections import defaultdict

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Dictionary to store performance metrics for each model
metrics = {
    'google': {
        'processing_times': [],
        'confidences': [],
        'text_lengths': [],
        'count': 0
    },
    'vosk': {
        'processing_times': [],
        'confidences': [],
        'text_lengths': [],
        'count': 0
    },
    'whisper': {
        'processing_times': [],
        'confidences': [],
        'text_lengths': [],
        'count': 0
    }
}

# Maximum number of data points to keep for each metric
MAX_METRIC_DATA_POINTS = 100

def get_current_time():
    """Get current time in milliseconds"""
    return time.time() * 1000

def calculate_processing_time(start_time):
    """Calculate processing time in milliseconds"""
    return get_current_time() - start_time

def update_metrics(model, processing_time, confidence, text_length):
    """
    Update performance metrics for a model
    
    Args:
        model: Name of the speech recognition model
        processing_time: Processing time in milliseconds
        confidence: Confidence score
        text_length: Length of the transcribed text
    """
    if model not in metrics:
        logger.warning(f"Unknown model: {model}")
        return
    
    # Add new data points
    metrics[model]['processing_times'].append(processing_time)
    metrics[model]['confidences'].append(confidence)
    metrics[model]['text_lengths'].append(text_length)
    metrics[model]['count'] += 1
    
    # Limit the number of stored data points
    metrics[model]['processing_times'] = metrics[model]['processing_times'][-MAX_METRIC_DATA_POINTS:]
    metrics[model]['confidences'] = metrics[model]['confidences'][-MAX_METRIC_DATA_POINTS:]
    metrics[model]['text_lengths'] = metrics[model]['text_lengths'][-MAX_METRIC_DATA_POINTS:]

def calculate_average(values):
    """Calculate average of a list of values"""
    return sum(values) / len(values) if values else 0

def calculate_metrics_for_model(model_data):
    """Calculate summary metrics for a model"""
    avg_processing_time = calculate_average(model_data['processing_times'])
    avg_confidence = calculate_average(model_data['confidences'])
    avg_text_length = calculate_average(model_data['text_lengths'])
    
    # Calculate words per minute
    words_per_second = 0
    if avg_processing_time > 0:
        words_per_second = (avg_text_length / 5) / (avg_processing_time / 1000)  # Assuming 5 chars per word
    words_per_minute = words_per_second * 60
    
    return {
        'avg_processing_time': avg_processing_time,
        'avg_confidence': avg_confidence,
        'words_per_minute': words_per_minute,
        'count': model_data['count'],
        'processing_times': model_data['processing_times'],
        'confidences': model_data['confidences']
    }

def get_metrics():
    """
    Get performance metrics for all models
    
    Returns:
        Dictionary with performance metrics
    """
    result = {}
    
    for model, data in metrics.items():
        if data['count'] > 0:
            result[model] = calculate_metrics_for_model(data)
    
    # Determine the best model based on combined metrics
    best_model = determine_best_model()
    if best_model:
        result['best_model'] = best_model
    
    return result

def determine_best_model():
    """
    Determine the best performing model based on combined metrics
    
    Returns:
        Name of the best performing model
    """
    best_model = None
    best_score = -1
    
    for model, data in metrics.items():
        if data['count'] < 5:  # Need at least 5 data points for reliable comparison
            continue
        
        # Calculate score based on multiple factors
        avg_processing_time = calculate_average(data['processing_times'])
        avg_confidence = calculate_average(data['confidences'])
        
        # Lower processing time is better, higher confidence is better
        # Normalize processing time to 0-1 range (lower is better)
        processing_time_score = 1.0 - min(1.0, avg_processing_time / 5000)  # 5000ms max
        
        # Combine factors with weights
        score = (processing_time_score * 0.6) + (avg_confidence * 0.4)
        
        if score > best_score:
            best_score = score
            best_model = model
    
    return best_model

def reset_metrics():
    """Reset all performance metrics"""
    for model in metrics:
        metrics[model] = {
            'processing_times': [],
            'confidences': [],
            'text_lengths': [],
            'count': 0
        }
    logger.info("Performance metrics reset")
