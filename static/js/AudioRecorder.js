// Audio Recorder Component

const AudioRecorder = React.forwardRef((props, ref) => {
  const { onAudioData, isRecording, onAudioLevel } = props;
  
  // References for audio components
  const mediaRecorderRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const audioContextRef = React.useRef(null);
  const analyserRef = React.useRef(null);
  const processorRef = React.useRef(null);
  const socketReadyRef = React.useRef(false);
  const audioChunkQueueRef = React.useRef([]);
  const audioLevelRef = React.useRef(0);
  const animationFrameRef = React.useRef(null);
  const useDemoModeRef = React.useRef(false);
  
  // Constants for audio processing
  const SAMPLE_RATE = 16000;
  const BUFFER_SIZE = 4096;
  
  // Function to update audio levels and visualizer
  const updateAudioLevels = () => {
    if (!analyserRef.current && isRecording) {
      // If no real analyser but recording is on, generate mock levels for visualization
      const mockLevel = Math.random() * 0.5 + 0.3; // Generate values between 0.3 and 0.8
      audioLevelRef.current = mockLevel;
      
      // Call the callback to update the visualizer
      if (onAudioLevel) {
        onAudioLevel(mockLevel);
      }
    }
    else if (analyserRef.current && isRecording) {
      // Get data from analyzer
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average levels
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const normalizedLevel = average / 256; // Normalize to 0-1 range
      
      // Add a small random variation to make visualization more interesting
      const randomVariation = (Math.random() * 0.2) - 0.1; // -0.1 to 0.1
      const adjustedLevel = Math.max(0, Math.min(1, normalizedLevel + randomVariation));
      
      audioLevelRef.current = adjustedLevel;
      
      // Call the callback to update the visualizer
      if (onAudioLevel) {
        onAudioLevel(adjustedLevel);
      }
    } else if (!isRecording) {
      // If not recording, reset audio level
      audioLevelRef.current = 0;
      if (onAudioLevel) {
        onAudioLevel(0);
      }
    }
    
    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
  };
  
  // Function to send simulated audio data in demo mode
  const sendDemoAudioData = () => {
    if (isRecording && onAudioData) {
      // Create a minimal audio chunk with demo_mode flag
      const demoAudio = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
      onAudioData({ 
        audio: demoAudio,
        force_demo_mode: true 
      });
      
      // Schedule the next demo audio transmission
      setTimeout(sendDemoAudioData, 3000); // Send every 3 seconds
    }
  };
  
  // Function to start recording
  const startRecording = async () => {
    try {
      console.log('Starting recording...');
      
      // Start the audio level update loop for the visualizer immediately
      // This ensures the visualizer works even if microphone access fails
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
      
      // Check for MediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('Browser does not support MediaDevices API. Using demo mode.');
        useDemoModeRef.current = true;
        setTimeout(sendDemoAudioData, 1000); // Start demo mode with delay
        return; // Skip the rest of the setup
      }
      
      // Get available audio devices (for debugging)
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        console.log('Available audio input devices:', audioInputs);
        
        if (audioInputs.length === 0) {
          console.warn('No microphone detected. Using demo mode.');
          useDemoModeRef.current = true;
          setTimeout(sendDemoAudioData, 1000);
          return;
        }
      } catch (deviceError) {
        console.warn('Could not enumerate devices:', deviceError);
        useDemoModeRef.current = true;
        setTimeout(sendDemoAudioData, 1000);
        return;
      }
      
      // Get user media with more verbose output
      console.log('Requesting microphone access...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: SAMPLE_RATE,
            channelCount: 1
          }
        });
        
        console.log('Microphone access granted:', stream);
        streamRef.current = stream;
        
        // Check if stream is active and has audio tracks
        const audioTracks = stream.getAudioTracks();
        console.log('Audio tracks:', audioTracks);
        
        if (audioTracks.length === 0) {
          console.warn('No audio tracks found in the media stream. Using demo mode.');
          useDemoModeRef.current = true;
          setTimeout(sendDemoAudioData, 1000);
          return;
        }
        
        console.log('Audio track settings:', audioTracks[0].getSettings());
      } catch (micError) {
        console.error('Error accessing microphone:', micError);
        alert(`Microphone access error: ${micError.message}\n\nUsing demo mode instead.`);
        useDemoModeRef.current = true;
        setTimeout(sendDemoAudioData, 1000);
        return;
      }
      
      // Create audio context
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: SAMPLE_RATE
        });
        console.log('Audio context created:', audioContext);
        audioContextRef.current = audioContext;
        
        // Create analyser node
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyserRef.current = analyser;
        
        // Create source node
        const source = audioContext.createMediaStreamSource(streamRef.current);
        source.connect(analyser);
        
        // Setup script processor node for processing audio
        const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
        processorRef.current = processor;
        
        // Connect processor
        analyser.connect(processor);
        processor.connect(audioContext.destination);
      } catch (audioContextError) {
        console.error('Error setting up audio context:', audioContextError);
        useDemoModeRef.current = true;
        setTimeout(sendDemoAudioData, 1000);
        return;
      }
      
      // Create audio level monitor for debugging
      let silenceCounter = 0;
      const silenceThreshold = 0.01;
      
      // Wait a moment for socket connection to stabilize before sending audio
      setTimeout(() => {
        socketReadyRef.current = true;
        console.log('Socket connection ready for audio transmission');
        
        // If no real audio is being processed, use demo mode
        if (useDemoModeRef.current) {
          sendDemoAudioData();
          return;
        }
        
        // Process any queued audio chunks
        if (audioChunkQueueRef.current.length > 0) {
          console.log(`Processing ${audioChunkQueueRef.current.length} queued audio chunks`);
          audioChunkQueueRef.current.forEach(chunk => {
            if (onAudioData) onAudioData({ audio: chunk });
          });
          audioChunkQueueRef.current = [];
        }
      }, 1000);
      
      // Process audio data
      if (processorRef.current) {
        processorRef.current.onaudioprocess = (e) => {
          if (!isRecording) return;
          
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Check audio levels for silence detection
          const audioLevel = calculateAudioLevel(inputData);
          
          if (audioLevel < silenceThreshold) {
            silenceCounter++;
            
            // After 10 consecutive silent chunks, log a warning
            if (silenceCounter === 10) {
              console.warn('Possible microphone issue: 10 consecutive silent audio chunks detected. Audio level:', audioLevel);
              
              // If consistently silent, switch to demo mode
              if (!useDemoModeRef.current) {
                console.warn('Switching to demo mode due to silent microphone');
                useDemoModeRef.current = true;
                sendDemoAudioData();
              }
            }
          } else {
            // Reset counter when sound is detected
            if (silenceCounter >= 10) {
              console.log('Audio detected. Current level:', audioLevel);
            }
            silenceCounter = 0;
          }
          
          // Skip actual audio processing if in demo mode
          if (useDemoModeRef.current) return;
          
          // Convert to proper format for transmission
          const buffer = convertFloat32ToInt16(inputData);
          const chunk = encodeChunk(buffer);
          
          // Send chunk to parent component or queue it if socket not ready
          if (onAudioData && socketReadyRef.current) {
            onAudioData({ audio: chunk });
            
            // Log every 20th chunk to avoid flooding the console
            if (Math.random() < 0.05) {
              console.log('Audio chunk sent to server. Audio level:', audioLevel);
            }
          } else if (onAudioData) {
            // Queue the chunk to send when socket is ready
            audioChunkQueueRef.current.push(chunk);
            if (audioChunkQueueRef.current.length === 1) {
              console.log('Queuing audio chunks until socket is ready');
            }
          }
        };
      }
      
      // Create media recorder for backup and testing
      try {
        const mediaRecorderOptions = { mimeType: 'audio/webm' };
        mediaRecorderRef.current = new MediaRecorder(streamRef.current, mediaRecorderOptions);
        
        // Add a data handler for the media recorder to check if it's receiving audio
        let testChunks = [];
        mediaRecorderRef.current.ondataavailable = async (event) => {
          if (event.data.size > 0) {
            testChunks.push(event.data);
            console.log('MediaRecorder captured data chunk, size:', event.data.size);
            
            // Try to convert the blob to a WAV format and send as well (as a backup method)
            if (socketReadyRef.current && testChunks.length === 1) {
              try {
                const audioBlob = event.data;
                const arrayBuffer = await audioBlob.arrayBuffer();
                const buffer = new Uint8Array(arrayBuffer);
                
                // Create a base64 representation
                let binary = '';
                for (let i = 0; i < buffer.byteLength; i++) {
                  binary += String.fromCharCode(buffer[i]);
                }
                const base64Data = btoa(binary);
                const mediaRecorderAudio = `data:${audioBlob.type};base64,${base64Data}`;
                
                // Send as backup
                if (onAudioData && !useDemoModeRef.current) {
                  console.log('Sending MediaRecorder backup audio chunk');
                  onAudioData({ audio: mediaRecorderAudio });
                }
              } catch (err) {
                console.error('Error converting MediaRecorder data:', err);
              }
            }
          }
        };
        
        // Start recording a 3-second test clip with MediaRecorder
        mediaRecorderRef.current.start();
        setTimeout(() => {
          // Stop test recording after 3 seconds
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            console.log('Test recording completed');
            
            // Check results
            if (testChunks.length === 0) {
              console.warn('Test recording produced no data. Potential microphone issue.');
              useDemoModeRef.current = true;
              sendDemoAudioData();
            } else {
              console.log('Test recording successful. Total chunks:', testChunks.length);
              
              // Restart media recorder for full recording
              try {
                mediaRecorderRef.current = new MediaRecorder(streamRef.current, mediaRecorderOptions);
                mediaRecorderRef.current.ondataavailable = (event) => {
                  if (event.data.size > 0 && onAudioData && socketReadyRef.current && !useDemoModeRef.current) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const base64data = reader.result;
                      onAudioData({ audio: base64data });
                    };
                    reader.readAsDataURL(event.data);
                  }
                };
                mediaRecorderRef.current.start(1000); // Record in 1-second chunks
              } catch (err) {
                console.error('Error restarting MediaRecorder:', err);
                useDemoModeRef.current = true;
                sendDemoAudioData();
              }
            }
          }
        }, 3000);
      } catch (mediaRecorderError) {
        console.error('Error setting up MediaRecorder:', mediaRecorderError);
        useDemoModeRef.current = true;
        sendDemoAudioData();
      }
      
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Error starting recording:', error);
      alert(`Microphone access error: ${error.message}\n\nUsing demo mode instead.`);
      useDemoModeRef.current = true;
      sendDemoAudioData();
    }
  };
  
  // Helper function to calculate audio level (RMS)
  const calculateAudioLevel = (buffer) => {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / buffer.length);
    return rms;
  };
  
  // Function to stop recording
  const stopRecording = () => {
    console.log('Stopping recording...');
    
    // Reset demo mode flag
    useDemoModeRef.current = false;
    
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Clean up processor
    if (processorRef.current && audioContextRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    // Clean up analyser
    if (analyserRef.current && audioContextRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    
    // Clean up audio context
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
    
    // Clean up media recorder
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }
    
    // Clean up stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Reset socket readiness flag
    socketReadyRef.current = false;
    
    // Reset audio level
    audioLevelRef.current = 0;
    if (onAudioLevel) {
      onAudioLevel(0);
    }
    
    console.log('Recording stopped successfully');
  };
  
  // Helper function to get current audio level
  const getAudioLevel = () => {
    return audioLevelRef.current;
  };
  
  // Helper function to convert Float32Array to Int16Array
  const convertFloat32ToInt16 = (buffer) => {
    const l = buffer.length;
    const buf = new Int16Array(l);
    
    for (let i = 0; i < l; i++) {
      buf[i] = Math.min(1, Math.max(-1, buffer[i])) * 0x7FFF;
    }
    
    return buf;
  };
  
  // Helper function to encode chunk as base64
  const encodeChunk = (buffer) => {
    // Convert to WAV format
    const wavBuffer = createWavBuffer(buffer);
    
    // Convert to base64
    const base64 = arrayBufferToBase64(wavBuffer);
    
    return `data:audio/wav;base64,${base64}`;
  };
  
  // Helper function to create WAV buffer
  const createWavBuffer = (pcmBuffer) => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = SAMPLE_RATE * blockAlign;
    const dataSize = pcmBuffer.length * bytesPerSample;
    const bufferSize = 44 + dataSize;
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);
    
    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // RIFF chunk length
    view.setUint32(4, 36 + dataSize, true);
    // RIFF type
    writeString(view, 8, 'WAVE');
    // Format chunk identifier
    writeString(view, 12, 'fmt ');
    // Format chunk length
    view.setUint32(16, 16, true);
    // Sample format (raw)
    view.setUint16(20, 1, true);
    // Channel count
    view.setUint16(22, numChannels, true);
    // Sample rate
    view.setUint32(24, SAMPLE_RATE, true);
    // Byte rate (sample rate * block align)
    view.setUint32(28, byteRate, true);
    // Block align (channel count * bytes per sample)
    view.setUint16(32, blockAlign, true);
    // Bits per sample
    view.setUint16(34, bitsPerSample, true);
    // Data chunk identifier
    writeString(view, 36, 'data');
    // Data chunk length
    view.setUint32(40, dataSize, true);
    
    // Write PCM samples
    const offset = 44;
    for (let i = 0; i < pcmBuffer.length; i++) {
      view.setInt16(offset + (i * 2), pcmBuffer[i], true);
    }
    
    return buffer;
  };
  
  // Helper function to write a string to a DataView
  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  // Helper function to convert ArrayBuffer to base64
  const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
    return btoa(binary);
  };
  
  // Expose functions via ref
  React.useImperativeHandle(ref, () => ({
    startRecording,
    stopRecording,
    getAudioLevel
  }));
  
  // Start animation loop for visualizer when recording status changes
  React.useEffect(() => {
    // If recording is starting, make sure visualizer is running
    if (isRecording && !animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
    }
    // If recording stops, reset level but keep animation for smooth transition
    else if (!isRecording) {
      audioLevelRef.current = 0;
      if (onAudioLevel) {
        onAudioLevel(0);
      }
    }
  }, [isRecording]);
  
  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      stopRecording();
    };
  }, []);
  
  return null;
});
