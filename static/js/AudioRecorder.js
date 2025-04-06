// Audio Recorder Component

const AudioRecorder = ({ onRecordingStateChange, socket }) => {
  // State
  const [isRecording, setIsRecording] = React.useState(false);
  const [audioLevel, setAudioLevel] = React.useState(0);
  const [recordingError, setRecordingError] = React.useState(null);
  const [microphoneAccess, setMicrophoneAccess] = React.useState('pending'); // 'pending', 'granted', 'denied'
  
  // Refs to track recording state and resources
  const mediaRecorderRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const audioContextRef = React.useRef(null);
  const analyserRef = React.useRef(null);
  const audioChunksRef = React.useRef([]);
  const animationFrameRef = React.useRef(null);
  const processingRef = React.useRef(false);
  
  // Analyze audio levels for visualizer
  const updateAudioLevels = React.useCallback(() => {
    if (!analyserRef.current || !isRecording) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }
    
    try {
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      
      const avg = sum / bufferLength;
      const normalizedLevel = Math.min(1, avg / 128); // Normalize to 0-1
      setAudioLevel(normalizedLevel);
      
      // Update visualizer
      const visualizer = document.getElementById('audio-visualizer');
      if (visualizer) {
        const bars = visualizer.querySelectorAll('span');
        bars.forEach(bar => {
          const height = 10 + (normalizedLevel * 30);
          bar.style.height = `${height}px`;
        });
      }
    } catch (e) {
      console.error('Error analyzing audio:', e);
    }
    
    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
  }, [isRecording]);
  
  // Start recording
  const startRecording = React.useCallback(async () => {
    try {
      if (isRecording) {
        return; // Already recording
      }
      
      setRecordingError(null);
      
      // Request microphone access
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Create audio context and analyzer for visualizations
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      // Try different audio formats based on browser support
      const mimeTypes = [
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
        'audio/wav'
      ];
      
      let options = {};
      let mimeType = '';
      
      // Find supported mime type
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          options = { mimeType };
          break;
        }
      }
      
      console.log(`Creating MediaRecorder with mime type: ${mimeType || 'default'}`);
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      // Clear previous chunks
      audioChunksRef.current = [];
      
      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Set up processing of audio data
      mediaRecorder.onstop = async () => {
        if (processingRef.current) return; // Prevent double processing
        processingRef.current = true;
        
        try {
          console.log(`Processing ${audioChunksRef.current.length} audio chunks`);
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
          
          // Convert to base64
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result.split(',')[1]; // Remove data URL prefix
            
            // Emit audio data to server
            console.log('Sending audio data to server...');
            socket.emit('audio_data', { 
              audio_data: base64Audio 
            });
            
            // Clear for next recording
            audioChunksRef.current = [];
            processingRef.current = false;
          };
          
          reader.readAsDataURL(audioBlob);
        } catch (error) {
          console.error('Error processing audio:', error);
          setRecordingError('Failed to process audio data');
          processingRef.current = false;
        }
      };
      
      // Start recording
      console.log('Starting MediaRecorder...');
      mediaRecorder.start();
      setIsRecording(true);
      setMicrophoneAccess('granted');
      
      if (onRecordingStateChange) {
        onRecordingStateChange(true);
      }
      
      // Start visualizer animation
      requestAnimationFrame(updateAudioLevels);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setRecordingError('Microphone access denied. Please allow microphone access and try again.');
        setMicrophoneAccess('denied');
      } else {
        setRecordingError(`Failed to start recording: ${error.message}`);
      }
      
      // Cleanup on error
      stopMediaTracks();
    }
  }, [isRecording, socket, updateAudioLevels, onRecordingStateChange]);
  
  // Stop recording
  const stopRecording = React.useCallback(() => {
    if (!isRecording) return;
    
    try {
      console.log('Stopping recording...');
      
      // Stop media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Stop and clean up media tracks
      stopMediaTracks();
      
      setIsRecording(false);
      if (onRecordingStateChange) {
        onRecordingStateChange(false);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setRecordingError(`Failed to stop recording: ${error.message}`);
    }
  }, [isRecording, onRecordingStateChange]);
  
  // Clean up media tracks
  const stopMediaTracks = React.useCallback(() => {
    try {
      // Stop all tracks in the stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      analyserRef.current = null;
    } catch (error) {
      console.error('Error cleaning up media resources:', error);
    }
  }, []);
  
  // Toggle recording state
  const toggleRecording = React.useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);
  
  // Clean up resources on unmount
  React.useEffect(() => {
    return () => {
      stopMediaTracks();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [stopMediaTracks]);
  
  return (
    <div>
      <button
        onClick={toggleRecording}
        className={`w-full py-3 px-4 rounded-lg ${
          isRecording
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        } font-medium flex items-center justify-center transition-colors duration-200`}
        disabled={microphoneAccess === 'denied'}
      >
        <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'} mr-2`}></i>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      
      {recordingError && (
        <div className="mt-2 text-red-500 text-sm">
          <p>{recordingError}</p>
        </div>
      )}
      
      {microphoneAccess === 'denied' && (
        <div className="mt-2 text-amber-500 text-sm">
          <p>Please allow microphone access in your browser settings and reload the page.</p>
        </div>
      )}
    </div>
  );
};
