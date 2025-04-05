// Audio Recorder Component

const AudioRecorder = React.forwardRef((props, ref) => {
  const { onAudioData, onAudioLevel, model } = props;
  
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
    const event = new CustomEvent('demo_transcription', {
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
    console.log("Demo transcription generated");
  };
  
  // Process audio chunks and send to server
  const processAudioChunks = () => {
    if (audioChunksRef.current.length === 0) return;
    
    try {
      // Create blob from chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log('Created audio blob, size:', audioBlob.size);
      
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result;
        console.log('Converted to base64, length:', base64Audio.length);
        
        // Send to server
        if (onAudioData) {
          onAudioData({
            audio: base64Audio,
            force_demo_mode: false, // Important: This should be false to use real audio
            model: model || 'google'
          });
        }
      };
      
      reader.readAsDataURL(audioBlob);
      
      // Clear chunks for next processing
      audioChunksRef.current = [];
      
    } catch (error) {
      console.error('Error processing audio chunks:', error);
      audioChunksRef.current = [];
    }
  };
  
  // Start recording function
  const startRecording = async () => {
    console.log('Starting recording...');
    isRecordingRef.current = true;
    
    // Start visualizer animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
    
    // Try to set up real microphone recording
    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      console.log('Microphone access granted');
      streamRef.current = stream;
      
      // Create audio context and analyzer for visualizer
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      // Connect microphone to analyzer
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      // Set up media recorder
      audioChunksRef.current = [];
      const options = { mimeType: 'audio/webm' };
      
      try {
        mediaRecorderRef.current = new MediaRecorder(stream, options);
      } catch (e) {
        console.warn('Error creating MediaRecorder with specified options, trying default options');
        mediaRecorderRef.current = new MediaRecorder(stream);
      }
      
      // Set up data handling
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('Audio chunk captured, size:', event.data.size);
        }
      };
      
      // Start the recorder
      mediaRecorderRef.current.start(1000); // Capture in 1-second chunks
      
      // Set up interval to process chunks
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
      }
      
      processingIntervalRef.current = setInterval(() => {
        if (isRecordingRef.current && audioChunksRef.current.length > 0) {
          processAudioChunks();
        }
      }, 3000);
      
      console.log('Real microphone recording started');
      
    } catch (err) {
      console.error('Error setting up microphone:', err);
      
      // Fall back to demo mode
      if (demoModeIntervalRef.current) {
        clearInterval(demoModeIntervalRef.current);
      }
      
      demoModeIntervalRef.current = setInterval(generateDemoTranscription, 4000);
      
      // Generate first demo transcription immediately
      setTimeout(generateDemoTranscription, 500);
      
      console.log('Fallback to demo mode');
    }
  };
  
  // Stop recording function
  const stopRecording = () => {
    console.log('Stopping recording...');
    isRecordingRef.current = false;
    
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Stop intervals
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
    
    if (demoModeIntervalRef.current) {
      clearInterval(demoModeIntervalRef.current);
      demoModeIntervalRef.current = null;
    }
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    
    // Process any remaining chunks
    if (audioChunksRef.current.length > 0) {
      processAudioChunks();
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(err => console.error('Error closing audio context:', err));
      audioContextRef.current = null;
    }
    
    // Stop all tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Reset audio level
    if (onAudioLevel) {
      onAudioLevel(0);
    }
    
    console.log('Recording stopped');
  };
  
  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);
  
  // Register event listener for demo transcriptions
  React.useEffect(() => {
    // Add a custom event listener to handle transcriptions
    const handleDemoTranscription = (event) => {
      if (event.detail && onAudioData) {
        // Convert event to a format the server expects
        onAudioData({
          demo_transcription: event.detail,
          force_demo_mode: true,
          model: model || 'google'
        });
      }
    };
    
    document.addEventListener('demo_transcription', handleDemoTranscription);
    
    return () => {
      document.removeEventListener('demo_transcription', handleDemoTranscription);
    };
  }, [onAudioData, model]);
  
  // Expose API via ref
  React.useImperativeHandle(ref, () => ({
    startRecording,
    stopRecording
  }));
  
  return null;
});
