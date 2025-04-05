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
      
      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(updateRealAudioLevels);
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
    
    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(updateMockAudioLevels);
  };
  
  // Fallback to ensure we get transcriptions even if microphone fails
  const sendDemoAudioData = () => {
    if (!microphoneWorkingRef.current) {
      console.log("Microphone not working, sending demo audio data as fallback");
      
      // Create a minimal audio chunk with demo_mode flag
      const demoAudio = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
      if (onAudioData) {
        onAudioData({ 
          audio: demoAudio,
          force_demo_mode: true,
          model: model
        });
      }
    }
  };
  
  // Function to start recording
  const startRecording = async () => {
    try {
      console.log('Starting recording...');
      microphoneWorkingRef.current = false;
      
      // Start fallback demo mode timer just in case
      if (demoModeTimerRef.current) {
        clearInterval(demoModeTimerRef.current);
      }
      demoModeTimerRef.current = setInterval(sendDemoAudioData, 5000);
      
      try {
        // Check for MediaDevices support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Browser does not support audio recording');
        }
        
        // Get available audio devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        console.log('Available audio input devices:', audioInputs);
        
        if (audioInputs.length === 0) {
          throw new Error('No microphone detected');
        }
        
        // Request microphone access
        console.log('Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: SAMPLE_RATE
          }
        });
        
        console.log('Microphone access granted!');
        streamRef.current = stream;
        
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: SAMPLE_RATE
        });
        audioContextRef.current = audioContext;
        
        // Create an analyzer node for visualizing audio levels
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        
        // Create source from microphone stream
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        // Initialize the MediaRecorder with appropriate options
        const options = {
          mimeType: 'audio/webm;codecs=opus',
          audioBitsPerSecond: 128000
        };
        
        mediaRecorderRef.current = new MediaRecorder(stream, options);
        
        // Set up the data handling for captured audio
        mediaRecorderRef.current.ondataavailable = async (event) => {
          if (event.data.size > 0) {
            console.log('MediaRecorder captured data chunk, size:', event.data.size);
            
            // We have real microphone data 
            microphoneWorkingRef.current = true;
            
            // Process and send the audio data
            try {
              const reader = new FileReader();
              reader.onloadend = () => {
                if (onAudioData) {
                  // Send actual audio data for processing
                  onAudioData({ 
                    audio: reader.result,
                    force_demo_mode: false,
                    model: model
                  });
                }
              };
              reader.readAsDataURL(event.data);
            } catch (err) {
              console.error('Error processing audio data:', err);
              microphoneWorkingRef.current = false;
            }
          }
        };
        
        // Start the media recorder
        mediaRecorderRef.current.start();
        
        // Set up interval to collect data periodically
        if (audioProcessingIntervalRef.current) {
          clearInterval(audioProcessingIntervalRef.current);
        }
        
        audioProcessingIntervalRef.current = setInterval(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.requestData();
          }
        }, 3000); // Capture every 3 seconds
        
        // Start the audio level analyzer
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(updateRealAudioLevels);
        
        console.log('Recording started successfully with real microphone');
        
      } catch (err) {
        console.warn('Error with microphone setup:', err);
        microphoneWorkingRef.current = false;
        
        // Start the mock audio level updates for the visualizer
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(updateMockAudioLevels);
        
        console.log('Fallback to demo mode activated');
      }
    } catch (error) {
      console.error('Critical error starting recording:', error);
      // Ensure visualizer works even if everything else fails
      animationFrameRef.current = requestAnimationFrame(updateMockAudioLevels);
    }
  };
  
  // Function to stop recording
  const stopRecording = () => {
    console.log('Stopping recording...');
    
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
    // Any model-specific adjustments can go here
  }, [model]);
  
  return null;
});
