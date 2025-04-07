// Audio Recorder Component

const AudioRecorder = React.forwardRef((props, ref) => {
  const { onAudioData, onAudioLevel, model, demoMode } = props;
  
  // State and refs
  const mediaRecorderRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const audioContextRef = React.useRef(null);
  const analyserRef = React.useRef(null);
  const animationFrameRef = React.useRef(null);
  const audioChunksRef = React.useRef([]);
  const processingIntervalRef = React.useRef(null);
  const demoModeIntervalRef = React.useRef(null);
  const isRecordingRef = React.useRef(false);
  
  // Use a single function to update audio levels for visualizer
  const updateAudioLevels = () => {
    if (!isRecordingRef.current) {
      if (onAudioLevel) onAudioLevel(0);
      return;
    }
    
    let level = 0;
    
    // Try to get real audio levels if analyzer is available
    if (analyserRef.current) {
      try {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        level = Math.min(1, (sum / bufferLength / 255) * 2);
      } catch (e) {
        // Fall back to random levels on error
        level = Math.random() * 0.5 + 0.2;
      }
    } else {
      // No analyzer, use random values
      level = Math.random() * 0.5 + 0.2;
    }
    
    if (onAudioLevel) onAudioLevel(level);
    
    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
  };
  
  // Generate a demo transcription
  // Generate a demo transcription
  const generateDemoTranscription = () => {
    if (!isRecordingRef.current) return;
    
    // Try to use DemoModeManager if available
    if (typeof DemoModeManager !== 'undefined' && DemoModeManager.generateDemoTranscription) {
      DemoModeManager.generateDemoTranscription();
      return;
    }
    
    // Fallback to ClientSideDemo if available
    if (typeof ClientSideDemo !== 'undefined' && ClientSideDemo.generateTranscription) {
      const result = ClientSideDemo.generateTranscription(model || 'google', true);
      const event = new CustomEvent('demoTranscription', { detail: result });
      document.dispatchEvent(event);
      console.log("Demo transcription generated via ClientSideDemo");
      return;
    }
    
    // Last resort fallback - direct generation
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
      "Using artificial intelligence for speech recognition is fascinating."
    ];
    
    const randomText = demoTexts[Math.floor(Math.random() * demoTexts.length)];
    
    // Dispatch an event with the demo transcription
    const event = new CustomEvent('demoTranscription', {
      detail: {
        text: randomText,
        confidence: Math.random() * 0.2 + 0.75,
        model: model || 'google',
        processing_time: Math.floor(Math.random() * 300) + 100,
        timestamp: Date.now(),
        demo_mode: true,
        sentiment: {
          polarity: Math.random() * 2 - 1,
          label: Math.random() > 0.5 ? "Positive" : "Neutral",
          emoji: Math.random() > 0.5 ? "🙂" : "😐",
          confidence: Math.random() * 0.2 + 0.7,
          specific_emotion: ["joy", "curiosity", "interest"][Math.floor(Math.random() * 3)]
        }
      }
    });
    
    document.dispatchEvent(event);
    console.log("Demo transcription generated via fallback");
  };
