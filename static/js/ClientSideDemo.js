// Client Side Demo Module

// This module provides client-side demo mode functionality
// to ensure transcriptions work even if server-side processing fails

const ClientSideDemo = (() => {
  // Sample transcription texts
  const demoTexts = [
    "This is a demonstration of the speech recognition system.",
    "I'm really excited about using this application for my project.",
    "The weather today is absolutely beautiful outside.",
    "Can you tell me how well the different speech recognition models compare?",
    "I'm not sure if my microphone is working correctly but this is a test.",
    "Speech recognition technology has improved tremendously in recent years.",
    "I'm feeling happy today and looking forward to learning more about this system.",
    "This dark mode interface looks amazing with the audio visualizer.",
    "Could you analyze the sentiment of this message please?",
    "Using artificial intelligence for speech recognition is fascinating.",
    "The quick brown fox jumps over the lazy dog.",
    "How much wood would a woodchuck chuck if a woodchuck could chuck wood?",
    "To be or not to be, that is the question.",
    "Artificial intelligence is revolutionizing many industries.",
    "Voice assistants like Siri and Alexa use speech recognition algorithms."
  ];
  
  // Generate a client-side demo transcription
  const generateTranscription = (model, sentimentEnabled) => {
    // Generate a random text
    const text = demoTexts[Math.floor(Math.random() * demoTexts.length)];
    
    // Generate model-specific confidence and processing time
    let confidence, processingTime;
    switch (model) {
      case 'google':
        confidence = Math.random() * 0.15 + 0.80; // 0.80-0.95
        processingTime = Math.floor(Math.random() * 150) + 100; // 100-250ms
        break;
      case 'vosk':
        confidence = Math.random() * 0.20 + 0.70; // 0.70-0.90
        processingTime = Math.floor(Math.random() * 80) + 50; // 50-130ms
        break;
      case 'whisper':
        confidence = Math.random() * 0.10 + 0.85; // 0.85-0.95
        processingTime = Math.floor(Math.random() * 200) + 150; // 150-350ms
        break;
      default:
        confidence = Math.random() * 0.20 + 0.75; // 0.75-0.95
        processingTime = Math.floor(Math.random() * 150) + 80; // 80-230ms
    }
    
    // Prepare result object
    const result = {
      text: text,
      confidence: confidence,
      model: model,
      processing_time: processingTime,
      timestamp: Date.now(),
      demo_mode: true
    };
    
    // Add sentiment analysis if enabled
    if (sentimentEnabled) {
      // Generate random polarity between -1 and 1
      const polarity = Math.random() * 2 - 1;
      let label, emoji;
      
      // Determine sentiment category based on polarity
      if (polarity < -0.6) {
        label = "Very Negative";
        emoji = "😡";
      } else if (polarity < -0.2) {
        label = "Negative";
        emoji = "😕";
      } else if (polarity < 0.2) {
        label = "Neutral";
        emoji = "😐";
      } else if (polarity < 0.6) {
        label = "Positive";
        emoji = "🙂";
      } else {
        label = "Very Positive";
        emoji = "😄";
      }
      
      // List of possible emotions
      const emotions = ["joy", "excitement", "curiosity", "satisfaction", "interest", 
                       "concern", "confusion", "surprise"];
      const specificEmotion = emotions[Math.floor(Math.random() * emotions.length)];
      
      // Add sentiment data to result
      result.sentiment = {
        polarity: polarity,
        label: label,
        emoji: emoji,
        confidence: Math.random() * 0.25 + 0.7, // 0.7-0.95
        specific_emotion: specificEmotion
      };
    }
    
    return result;
  };
  
  // Return public API
  return {
    generateTranscription: generateTranscription
  };
})();
