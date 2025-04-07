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
            force_demo_mode: demoMode, // Use the demoMode prop to determine if we should use demo mode
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
    
    // Always set up demo mode as a fallback
    const setupDemoMode = () => {
      console.log('Setting up demo mode');
      
      // Clear any existing interval
      if (demoModeIntervalRef.current) {
        clearInterval(demoModeIntervalRef.current);
      }
      
      // Set up new interval for demo transcriptions
      demoModeIntervalRef.current = setInterval(generateDemoTranscription, 4000);
      
      // Generate first demo transcription immediately for better user experience
      setTimeout(generateDemoTranscription, 500);
      
      // Dispatch an event to notify that we're in demo mode
      const demoModeEvent = new CustomEvent('demo-mode-activated', { detail: { forced: true } });
      document.dispatchEvent(demoModeEvent);
      
      // Set a global flag that other components can check
      window.forcedDemoMode = true;
      window.isBackupDemoMode = true;
    };
    
    // If demo mode is explicitly enabled, just use that
    if (demoMode) {
      console.log('Demo mode explicitly enabled, skipping microphone setup');
      setupDemoMode();
      return;
    }
    
    // Try to set up real microphone recording
    try {
      console.log('Requesting microphone access...');
      
      // Create a timeout to handle slow permission requests or silent failures
      const permissionTimeout = setTimeout(() => {
        console.warn('Microphone permission request timed out');
        setupDemoMode();
      }, 5000);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Clear the timeout since we got a response
      clearTimeout(permissionTimeout);
      
      // Check if we actually have audio tracks
      if (!stream || !stream.getAudioTracks || stream.getAudioTracks().length === 0) {
        console.error('No audio tracks in media stream');
        setupDemoMode();
        return;
      }
      
      console.log('Microphone access granted');
      streamRef.current = stream;
      
      // Create audio context and analyzer for visualizer
      let audioContext;
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
      } catch (e) {
        console.error('Error creating AudioContext:', e);
        setupDemoMode();
        return;
      }
      
      // Create analyzer for visualizer
      try {
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        
        // Connect microphone to analyzer
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
      } catch (e) {
        console.error('Error setting up audio analyzer:', e);
        // We can continue without the analyzer, but visualization won't be as good
      }
      
      // Set up media recorder
      audioChunksRef.current = [];
      let options = {};
      
      // Try different mime types for better browser compatibility
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        options = { mimeType: 'audio/ogg' };
      }
      
      try {
        mediaRecorderRef.current = new MediaRecorder(stream, options);
      } catch (e) {
        console.warn('Error creating MediaRecorder with specified options, trying default options');
        try {
          mediaRecorderRef.current = new MediaRecorder(stream);
        } catch (err) {
          console.error('Failed to create MediaRecorder:', err);
          setupDemoMode();
          return;
        }
      }
      
      // Set up data handling
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('Audio chunk captured, size:', event.data.size);
        } else {
          console.warn('Empty audio data received');
        }
      };
      
      // Add error handling for media recorder
      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setupDemoMode();
      };
      
      // Start the recorder
      try {
        mediaRecorderRef.current.start(1000); // Capture in 1-second chunks
      } catch (e) {
        console.error('Error starting MediaRecorder:', e);
        setupDemoMode();
        return;
      }
      
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
      
      // Set global flag to indicate we're not in demo mode
      window.forcedDemoMode = false;
      window.isBackupDemoMode = false;
      
    } catch (err) {
      console.error('Error setting up microphone:', err);
      setupDemoMode();
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
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('Error stopping media recorder:', e);
      }
      mediaRecorderRef.current = null;
    }
    
    // Process any remaining chunks
    if (audioChunksRef.current.length > 0) {
      processAudioChunks();
    }
    
    // Close audio context
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close().catch(err => console.error('Error closing audio context:', err));
      } catch (e) {
        console.error('Error closing audio context:', e);
      }
      audioContextRef.current = null;
    }
    
    // Stop all tracks in the stream
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.error('Error stopping stream tracks:', e);
      }
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
    
    document.addEventListener('demoTranscription', handleDemoTranscription);
    
    return () => {
      document.removeEventListener('demoTranscription', handleDemoTranscription);
    };
  }, [onAudioData, model]);
  
  // Expose API via ref
  React.useImperativeHandle(ref, () => ({
    startRecording,
    stopRecording
  }));
  
  return null;
});
