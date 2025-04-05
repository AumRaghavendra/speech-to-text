// Audio Recorder Component

const AudioRecorder = React.forwardRef((props, ref) => {
  const { onAudioData, isRecording } = props;
  
  // References for audio components
  const mediaRecorderRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const audioContextRef = React.useRef(null);
  const analyserRef = React.useRef(null);
  const processorRef = React.useRef(null);
  
  // Constants for audio processing
  const SAMPLE_RATE = 16000;
  const BUFFER_SIZE = 4096;
  
  // Function to start recording
  const startRecording = async () => {
    try {
      console.log('Starting recording...');
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;
      
      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: SAMPLE_RATE
      });
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
      
      // Process audio data
      processor.onaudioprocess = (e) => {
        if (!isRecording) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert to proper format for transmission
        const buffer = convertFloat32ToInt16(inputData);
        const chunk = encodeChunk(buffer);
        
        // Send chunk to parent component
        if (onAudioData) {
          onAudioData(chunk);
        }
      };
      
      // Create media recorder as backup
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Error starting recording:', error);
      alert(`Microphone access error: ${error.message}`);
    }
  };
  
  // Function to stop recording
  const stopRecording = () => {
    console.log('Stopping recording...');
    
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
    
    console.log('Recording stopped successfully');
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
    stopRecording
  }));
  
  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);
  
  return null;
});
