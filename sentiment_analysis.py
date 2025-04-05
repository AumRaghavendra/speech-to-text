import logging
import re
from textblob import TextBlob
import nltk
from nltk.tokenize import word_tokenize, sent_tokenize

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Ensure necessary NLTK data is downloaded
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

def initialize():
    """Initialize sentiment analysis components"""
    logger.info("Initializing sentiment analysis components")

def analyze_sentiment(text):
    """
    Analyze sentiment of the given text
    
    Args:
        text: Text to analyze
        
    Returns:
        Dictionary with sentiment information
    """
    try:
        if not text:
            return {'score': 0, 'magnitude': 0, 'label': 'neutral', 'emoji': '😐'}
        
        # Basic sentiment analysis using TextBlob
        analysis = TextBlob(text)
        
        # Get polarity score (-1 to 1)
        polarity = analysis.sentiment.polarity
        # Get subjectivity score (0 to 1)
        subjectivity = analysis.sentiment.subjectivity
        
        # Determine sentiment label
        if polarity > 0.3:
            label = 'positive'
            emoji = '😃' if polarity > 0.6 else '🙂'
        elif polarity < -0.3:
            label = 'negative'
            emoji = '😡' if polarity < -0.6 else '😞'
        else:
            label = 'neutral'
            emoji = '😐'
        
        # Enhanced context analysis for specific emotions
        enhanced_sentiment = enhance_sentiment_analysis(text, polarity, label, emoji)
        
        return {
            'score': polarity,
            'magnitude': subjectivity,
            'label': enhanced_sentiment['label'],
            'emoji': enhanced_sentiment['emoji']
        }
    except Exception as e:
        logger.error(f"Error in sentiment analysis: {str(e)}")
        return {'score': 0, 'magnitude': 0, 'label': 'error', 'emoji': '❓'}

def enhance_sentiment_analysis(text, base_polarity, base_label, base_emoji):
    """
    Enhance sentiment analysis with more specific emotion detection
    
    Args:
        text: Original text
        base_polarity: Base polarity score
        base_label: Base sentiment label
        base_emoji: Base emoji
        
    Returns:
        Enhanced sentiment information
    """
    text_lower = text.lower()
    
    # Dictionary of emotions and their corresponding patterns and emojis
    emotions = {
        'excited': {'patterns': ['excited', 'amazing', 'wow', 'awesome', 'fantastic'], 'emoji': '🤩'},
        'happy': {'patterns': ['happy', 'glad', 'joy', 'pleased', 'delighted'], 'emoji': '😄'},
        'love': {'patterns': ['love', 'adore', 'heart'], 'emoji': '❤️'},
        'surprised': {'patterns': ['surprised', 'shock', 'unexpected'], 'emoji': '😲'},
        'sad': {'patterns': ['sad', 'unhappy', 'disappointed', 'upset'], 'emoji': '😢'},
        'angry': {'patterns': ['angry', 'mad', 'furious', 'outraged'], 'emoji': '😠'},
        'confused': {'patterns': ['confused', 'puzzled', 'uncertain'], 'emoji': '🤔'},
        'scared': {'patterns': ['scared', 'afraid', 'terrified', 'fear'], 'emoji': '😨'}
    }
    
    # Check for specific emotion patterns
    for emotion, data in emotions.items():
        for pattern in data['patterns']:
            if pattern in text_lower or f" {pattern} " in text_lower:
                return {'label': emotion, 'emoji': data['emoji']}
    
    # If no specific emotion is detected, return the base sentiment
    return {'label': base_label, 'emoji': base_emoji}

def add_punctuation(text):
    """
    Add punctuation to the transcribed text
    
    Args:
        text: Raw transcribed text
        
    Returns:
        Text with added punctuation
    """
    try:
        # This is a simplified implementation
        # A more sophisticated approach would use a proper NLP model
        
        # Capitalize first letter of sentences
        sentences = sent_tokenize(text)
        capitalized_sentences = [s.capitalize() for s in sentences]
        
        # Join sentences with appropriate punctuation
        processed_text = '. '.join(capitalized_sentences)
        
        # Add period at the end if missing
        if processed_text and not processed_text.endswith(('.', '!', '?')):
            processed_text += '.'
        
        return processed_text
    except Exception as e:
        logger.error(f"Error adding punctuation: {str(e)}")
        return text

# Initialize on module load
initialize()
