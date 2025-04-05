// Audio Recorder Component

const AudioRecorder = React.forwardRef((props, ref) => {
  const { onAudioData, onAudioLevel, model } = props;
  
  // References for audio components
  const mediaRecorderRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const audioContextRef = React.useRef(null);
  const analyserRef = React.useRef(null);
  const dataProcessorRef = React.useRef(null);
  const audioChunkQueueRef = React.useRef([]);
  const audioLevelRef = React.useRef(0);
  const animationFrameRef = React.useRef(null);
  const demoModeTimerRef = React.useRef(null);
  const audioProcessingIntervalRef = React.useRef(null);
  const recordingEnabledRef = React.useRef(false);
  
  // Flag to track if we have a real microphone working
  const microphoneWorkingRef = React.useRef(false);
  
  // Constants for audio processing
  const SAMPLE_RATE = 16000;
  const BUFFER_SIZE = 4096;
  
  // Function to analyze audio levels from real microphone
  const updateRealAudioLevels = () => {
    if (!analyserRef.current || !streamRef.current) {
      // Fall back to mock audio levels if we don't have real audio analysis
      updateMockAudioLevels();
      return;
    }
    
    try {
      // Get audio level from analyzer
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average level (0-255)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      
      // Convert to 0-1 range and apply some amplification
      const normalizedLevel = Math.min(1, (average / 255) * 2.5);
      
      // Update current level
      audioLevelRef.current = normalizedLevel;
      
      // Call the callback to update the visualizer
      if (onAudioLevel) {
        onAudioLevel(normalizedLevel);
      }
      
      // Continue animation loop if still recording
      if (recordingEnabledRef.current) {
        animationFrameRef.current = requestAnimationFrame(updateRealAudioLevels);
      }
    } catch (error) {
      console.error('Error analyzing audio:', error);
      // Fall back to mock audio levels
      updateMockAudioLevels();
    }
  };
  
  // Fallback function for mock audio levels when mic isn't working
  const updateMockAudioLevels = () => {
    // Generate random audio levels for visualizer
    const mockLevel = Math.random() * 0.5 + 0.3; // Generate values between 0.3 and 0.8
    audioLevelRef.current = mockLevel;
    
    // Call the callback to update the visualizer
    if (onAudioLevel) {
      onAudioLevel(mockLevel);
    }
    
    // Continue animation loop if still recording
    if (recordingEnabledRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateMockAudioLevels);
    }
  };
  
  // Function to start recording
  const startRecording = async () => {
    try {
      console.log('Starting recording...');
      recordingEnabledRef.current = true;
      microphoneWorkingRef.current = false;
      
      // Begin mock audio visualization right away for immediate UI feedback
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(updateMockAudioLevels);
      
      try {
        // Check for MediaDevices support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Browser does not support audio recording');
        }
        
        // Request microphone access
        console.log('Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        console.log('Microphone access granted!');
        streamRef.current = stream;
        
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
        
        // Create an analyzer node for visualizing audio levels
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        
        // Create source from microphone stream
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        // Switch to real audio visualization
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(updateRealAudioLevels);
        
        // Initialize the MediaRecorder
        const mimeType = 'audio/webm;codecs=opus';
        const options = {
          mimeType: mimeType,
          audioBitsPerSecond: 16000
        };
        
        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
        
        // Set up the data handling for captured audio
        mediaRecorder.ondataavailable = async (event) => {
          if (event.data.size > 0) {
            console.log('MediaRecorder captured data chunk, size:', event.data.size);
            
            // We have real microphone data 
            microphoneWorkingRef.current = true;
            
            // Process and send the audio data
            try {
              const reader = new FileReader();
              reader.onloadend = () => {
                if (onAudioData && recordingEnabledRef.current) {
                  // Send actual audio data for processing - IMPORTANT: force_demo_mode is FALSE
                  onAudioData({ 
                    audio: reader.result,
                    force_demo_mode: false,
                    model: model || 'google'
                  });
                }
              };
              reader.readAsDataURL(event.data);
            } catch (err) {
              console.error('Error processing audio data:', err);
            }
          }
        };
        
        // Start the media recorder
        mediaRecorder.start();
        
        // Set up interval to collect data periodically
        if (audioProcessingIntervalRef.current) {
          clearInterval(audioProcessingIntervalRef.current);
        }
        
        audioProcessingIntervalRef.current = setInterval(() => {
          if (mediaRecorderRef.current && 
              mediaRecorderRef.current.state === 'recording' && 
              recordingEnabledRef.current) {
            mediaRecorderRef.current.requestData();
          }
        }, 2000); // Capture every 2 seconds
        
        console.log('Recording started successfully with real microphone');
        
      } catch (err) {
        console.warn('Error with microphone setup:', err);
        // If we couldn't access the microphone, set up demo mode
        // This will generate random transcriptions automatically
        demoModeTimerRef.current = setInterval(() => {
          if (recordingEnabledRef.current) {
            // Generate random demo transcription
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
            const confidence = Math.random() * 0.15 + 0.80; // 0.80-0.95
            
            // Create the event
            const demoEvent = new CustomEvent('demoTranscription', {
              detail: {
                text: randomText,
                confidence: confidence,
                model: model || 'google',
                processing_time: Math.floor(Math.random() * 300) + 100,
                timestamp: Date.now(),
                demo_mode: true,
                sentiment: {
                  polarity: Math.random() * 2 - 1, // -1 to 1
                  label: Math.random() > 0.5 ? "Positive" : "Neutral",
                  emoji: Math.random() > 0.5 ? "🙂" : "😐",
                  confidence: Math.random() * 0.2 + 0.7,
                  specific_emotion: ["joy", "curiosity", "interest"][Math.floor(Math.random() * 3)]
                }
              }
            });
            
            // Dispatch the event
            document.dispatchEvent(demoEvent);
            console.log('Demo transcription generated');
          }
        }, 3500);
      }
      
    } catch (error) {
      console.error('Critical error starting recording:', error);
    }
  };
  
  // Function to stop recording
  const stopRecording = () => {
    console.log('Stopping recording...');
    recordingEnabledRef.current = false;
    
    // Clear intervals
    if (demoModeTimerRef.current) {
      clearInterval(demoModeTimerRef.current);
      demoModeTimerRef.current = null;
    }
    
    if (audioProcessingIntervalRef.current) {
      clearInterval(audioProcessingIntervalRef.current);
      audioProcessingIntervalRef.current = null;
    }
    
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Clean up audio processing components
    if (dataProcessorRef.current && audioContextRef.current) {
      dataProcessorRef.current.disconnect();
      dataProcessorRef.current = null;
    }
    
    if (analyserRef.current && audioContextRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
    
    // Stop media recorder
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }
    
    // Stop and release microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Reset audio level
    audioLevelRef.current = 0;
    if (onAudioLevel) {
      onAudioLevel(0);
    }
    
    // Reset microphone status
    microphoneWorkingRef.current = false;
    
    console.log('Recording stopped successfully');
  };
  
  // Helper function to get current audio level
  const getAudioLevel = () => {
    return audioLevelRef.current;
  };
  
  // Expose functions via ref
  React.useImperativeHandle(ref, () => ({
    startRecording,
    stopRecording,
    getAudioLevel
  }));
  
  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (demoModeTimerRef.current) {
        clearInterval(demoModeTimerRef.current);
      }
      if (audioProcessingIntervalRef.current) {
        clearInterval(audioProcessingIntervalRef.current);
      }
      stopRecording();
    };
  }, []);
  
  // React to model changes
  React.useEffect(() => {
    console.log('Model changed to:', model);
  }, [model]);
  
  return null;
});
