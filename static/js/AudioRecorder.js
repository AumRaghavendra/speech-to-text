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
  
  // Start recording function
  const startRecording = async () => {
    try {
      console.log("Starting recording...");
      
      // Reset audio chunks
      audioChunksRef.current = [];
      
      // If demo mode is active, we'll simulate recording
      if (demoMode) {
        console.log("Demo mode is active, starting simulated recording");
        isRecordingRef.current = true;
        
        // Start animation frame for audio levels
        animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
        
        // Set up a demo interval
        if (demoModeIntervalRef.current) clearInterval(demoModeIntervalRef.current);
        demoModeIntervalRef.current = setInterval(generateDemoTranscription, 4000);
        
        // Generate first transcription after a short delay
        setTimeout(generateDemoTranscription, 1000);
        
        return;
      }
      
      // Set up real audio capture if we're not in demo mode
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Set up audio context and analyzer for visualizer
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      // Create analyzer for audio levels
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      analyserRef.current = analyzer;
      
      // Connect stream to analyzer
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyzer);
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Start media recorder
      mediaRecorder.start(1000);
      
      // Set recording state
      isRecordingRef.current = true;
      
      // Set up audio processing interval
      if (processingIntervalRef.current) clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = setInterval(() => {
        if (audioChunksRef.current.length > 0) {
          processAudioChunks();
        }
      }, 3000);
      
      // Start animation frame for audio levels
      animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
      
      console.log("Recording started successfully");
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not access microphone. Switching to demo mode.");
      
      // Fall back to demo mode
      isRecordingRef.current = true;
      animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
      
      // Set up demo interval as a fallback
      if (demoModeIntervalRef.current) clearInterval(demoModeIntervalRef.current);
      demoModeIntervalRef.current = setInterval(generateDemoTranscription, 4000);
      
      // Generate first transcription after a short delay
      setTimeout(generateDemoTranscription, 1000);
    }
  };
  
  // Process audio chunks
  const processAudioChunks = async () => {
    if (audioChunksRef.current.length === 0) return;
    
    try {
      // Create a blob from audio chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Reset chunks after processing
      audioChunksRef.current = [];
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = () => {
        const base64Audio = reader.result;
        
        if (onAudioData) {
          onAudioData({
            audio: base64Audio, 
            model: model,
            force_demo_mode: demoMode
          });
        }
      };
    } catch (error) {
      console.error("Error processing audio chunks:", error);
    }
  };
  
  // Stop recording function
  const stopRecording = () => {
    console.log("Stopping recording...");
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Stop audio stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
    
    // Clear analyzer
    analyserRef.current = null;
    
    // Clear intervals and animation frames
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
    
    if (demoModeIntervalRef.current) {
      clearInterval(demoModeIntervalRef.current);
      demoModeIntervalRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Set recording state
    isRecordingRef.current = false;
    
    // Process any remaining audio chunks
    if (audioChunksRef.current.length > 0) {
      processAudioChunks();
    }
    
    // Update audio levels one last time to reset visualizer
    if (onAudioLevel) onAudioLevel(0);
    
    console.log("Recording stopped successfully");
  };
  
  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);
  
  // Expose functions through ref
  React.useImperativeHandle(ref, () => ({
    startRecording,
    stopRecording,
    isRecording: () => isRecordingRef.current
  }));
  
  // Component doesn't render anything visible
  return null;
});
