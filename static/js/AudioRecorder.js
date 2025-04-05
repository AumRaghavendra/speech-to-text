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
  
  // Constants for audio processing
  const SAMPLE_RATE = 16000;
  const BUFFER_SIZE = 4096;
  
  // Function to update audio levels and visualizer
  const updateAudioLevels = () => {
    if (!analyserRef.current || !isRecording) return;
    
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
    audioLevelRef.current = normalizedLevel;
    
    // Call the callback to update the visualizer
    if (onAudioLevel) {
      onAudioLevel(normalizedLevel);
    }
    
    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
  };
  
  // Function to start recording
  const startRecording = async () => {
    try {
      console.log('Starting recording...');
      
      // Check for MediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser does not support audio recording. Please try a different browser like Chrome or Firefox.');
      }
      
      // Get available audio devices (for debugging)
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        console.log('Available audio input devices:', audioInputs);
        
        if (audioInputs.length === 0) {
          throw new Error('No microphone detected. Please connect a microphone and try again.');
        }
      } catch (deviceError) {
        console.warn('Could not enumerate devices:', deviceError);
      }
      
      // Get user media with more verbose output
      console.log('Requesting microphone access...');
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
        throw new Error('No audio tracks found in the media stream.');
      }
      
      console.log('Audio track settings:', audioTracks[0].getSettings());
      
      // Create audio context
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
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      // Setup script processor node for processing audio
      const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
      processorRef.current = processor;
      
      // Connect processor
      analyser.connect(processor);
      processor.connect(audioContext.destination);
      
      // Create audio level monitor for debugging
      let silenceCounter = 0;
      const silenceThreshold = 0.01;
      
      // Wait a moment for socket connection to stabilize before sending audio
      setTimeout(() => {
        socketReadyRef.current = true;
        console.log('Socket connection ready for audio transmission');
        
        // Process any queued audio chunks
        if (audioChunkQueueRef.current.length > 0) {
          console.log(`Processing ${audioChunkQueueRef.current.length} queued audio chunks`);
          audioChunkQueueRef.current.forEach(chunk => {
            if (onAudioData) onAudioData(chunk);
          });
          audioChunkQueueRef.current = [];
        }
      }, 1000);
      
      // Process audio data
      processor.onaudioprocess = (e) => {
        if (!isRecording) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Check audio levels for silence detection
        const audioLevel = calculateAudioLevel(inputData);
        
        if (audioLevel < silenceThreshold) {
          silenceCounter++;
          
          // After 10 consecutive silent chunks, log a warning
          if (silenceCounter === 10) {
            console.warn('Possible microphone issue: 10 consecutive silent audio chunks detected. Audio level:', audioLevel);
          }
        } else {
          // Reset counter when sound is detected
          if (silenceCounter >= 10) {
            console.log('Audio detected. Current level:', audioLevel);
          }
          silenceCounter = 0;
        }
        
        // Convert to proper format for transmission
        const buffer = convertFloat32ToInt16(inputData);
        const chunk = encodeChunk(buffer);
        
        // Send chunk to parent component or queue it if socket not ready
        if (onAudioData && socketReadyRef.current) {
          onAudioData(chunk);
          
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
      
      // Create media recorder for backup and testing
      const mediaRecorderOptions = { mimeType: 'audio/webm' };
      mediaRecorderRef.current = new MediaRecorder(stream, mediaRecorderOptions);
      
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
              if (onAudioData) {
                console.log('Sending MediaRecorder backup audio chunk');
                onAudioData(mediaRecorderAudio);
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
          } else {
            console.log('Test recording successful. Total chunks:', testChunks.length);
            
            // Restart media recorder for full recording
            try {
              mediaRecorderRef.current = new MediaRecorder(stream, mediaRecorderOptions);
              mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0 && onAudioData && socketReadyRef.current) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const base64data = reader.result;
                    onAudioData(base64data);
                  };
                  reader.readAsDataURL(event.data);
                }
              };
              mediaRecorderRef.current.start(1000); // Record in 1-second chunks
            } catch (err) {
              console.error('Error restarting MediaRecorder:', err);
            }
          }
        }
      }, 3000);
      
      // Start the audio level update loop for the visualizer
      animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
      
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Error starting recording:', error);
      alert(`Microphone access error: ${error.message}\n\nPlease check your browser permissions and ensure your microphone is properly connected.`);
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
