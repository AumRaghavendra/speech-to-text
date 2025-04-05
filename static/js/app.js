// Main React App Component

// Global socket.io connection
const socket = io();

// Main App component
const App = () => {
  const [isRecording, setIsRecording] = React.useState(false);
  const [transcriptionResults, setTranscriptionResults] = React.useState([]);
  const [currentModel, setCurrentModel] = React.useState('google');
  const [noiseReduction, setNoiseReduction] = React.useState(true);
  const [sentimentAnalysis, setSentimentAnalysis] = React.useState(true);
  const [performanceMetrics, setPerformanceMetrics] = React.useState({});
  const [isConnected, setIsConnected] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  
  // Ref for audio recorder
  const audioRecorderRef = React.useRef(null);
  
  // Initialize socket connection
  React.useEffect(() => {
    // Socket event handlers
    socket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setErrorMessage('');
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
      setErrorMessage('Connection lost. Trying to reconnect...');
    });
    
    socket.on('settings', (settings) => {
      console.log('Received settings:', settings);
      setCurrentModel(settings.model);
      setNoiseReduction(settings.noiseReduction);
      setSentimentAnalysis(settings.sentimentAnalysis);
    });
    
    socket.on('transcription_result', (result) => {
      console.log('Received transcription result:', result);
      
      // Add new result to transcription results
      setTranscriptionResults(prevResults => {
        const newResults = [...prevResults, result];
        // Keep only latest 50 results to avoid performance issues
        if (newResults.length > 50) {
          return newResults.slice(newResults.length - 50);
        }
        return newResults;
      });
    });
    
    socket.on('performance_metrics', (metrics) => {
      console.log('Received performance metrics:', metrics);
      setPerformanceMetrics(metrics);
    });
    
    socket.on('error', (error) => {
      console.error('Error from server:', error);
      setErrorMessage(`Error: ${error.message}`);
    });
    
    // Request initial performance metrics
    socket.emit('get_performance_metrics');
    
    // Clean up on unmount
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('settings');
      socket.off('transcription_result');
      socket.off('performance_metrics');
      socket.off('error');
    };
  }, []);
  
  // Handle start/stop recording
  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stopRecording();
      }
    } else {
      // Start recording
      if (audioRecorderRef.current) {
        audioRecorderRef.current.startRecording();
      }
    }
    setIsRecording(!isRecording);
  };
  
  // Handle model change
  const handleModelChange = (model) => {
    console.log(`Switching to model: ${model}`);
    setCurrentModel(model);
    
    // Update server settings
    updateSettings({ model });
  };
  
  // Handle toggle noise reduction
  const handleNoiseReductionToggle = () => {
    const newValue = !noiseReduction;
    setNoiseReduction(newValue);
    updateSettings({ noiseReduction: newValue });
  };
  
  // Handle toggle sentiment analysis
  const handleSentimentAnalysisToggle = () => {
    const newValue = !sentimentAnalysis;
    setSentimentAnalysis(newValue);
    updateSettings({ sentimentAnalysis: newValue });
  };
  
  // Update settings on the server
  const updateSettings = (settings) => {
    fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    })
      .then(response => response.json())
      .then(data => {
        console.log('Settings updated:', data);
      })
      .catch(error => {
        console.error('Error updating settings:', error);
        setErrorMessage(`Error updating settings: ${error.message}`);
      });
  };
  
  // Handle reset performance metrics
  const handleResetMetrics = () => {
    socket.emit('reset_performance_metrics');
  };
  
  // Handle audio data from recorder
  const handleAudioData = (audioData) => {
    if (isConnected) {
      socket.emit('audio_data', { audio: audioData });
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl fade-in">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-indigo-700 mb-2">Speech-to-Text Comparison</h1>
        <p className="text-lg text-gray-600">
          Compare Vosk, Whisper, and Google Speech Recognition in real-time
        </p>
      </header>
      
      {errorMessage && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{errorMessage}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">Real-Time Transcription</h2>
              <div>
                <button
                  onClick={toggleRecording}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isRecording 
                      ? 'bg-red-600 text-white recording-pulse' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isRecording ? (
                    <><i className="fas fa-stop-circle mr-2"></i>Stop</>
                  ) : (
                    <><i className="fas fa-microphone mr-2"></i>Start Recording</>
                  )}
                </button>
              </div>
            </div>
            
            {isRecording && (
              <div className="audio-wave mb-4">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
            
            <TranscriptionDisplay 
              results={transcriptionResults} 
              sentimentAnalysisEnabled={sentimentAnalysis}
            />
            
            <AudioRecorder 
              ref={audioRecorderRef}
              onAudioData={handleAudioData}
              isRecording={isRecording}
            />
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Performance Metrics</h2>
            <PerformanceMetrics 
              metrics={performanceMetrics} 
              onResetMetrics={handleResetMetrics}
            />
          </div>
        </div>
        
        <div className="col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Settings</h2>
            
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Speech Recognition Model</h3>
              <ModelSelector 
                currentModel={currentModel} 
                onModelChange={handleModelChange}
                bestModel={performanceMetrics.best_model}
              />
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Processing Options</h3>
              
              <div className="flex items-center mb-3">
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox"
                    className="sr-only peer"
                    checked={noiseReduction}
                    onChange={handleNoiseReductionToggle}
                  />
                  <div className={`relative w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-300 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600`}></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">Background Noise Reduction</span>
                </label>
              </div>
              
              <div className="flex items-center">
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox"
                    className="sr-only peer"
                    checked={sentimentAnalysis}
                    onChange={handleSentimentAnalysisToggle}
                  />
                  <div className={`relative w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-300 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600`}></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">Sentiment Analysis</span>
                </label>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">About</h3>
              <div className="text-sm text-gray-600">
                <p className="mb-2">This application compares three different speech recognition models:</p>
                <ul className="list-disc list-inside mb-2">
                  <li>Google Speech Recognition - Cloud-based service</li>
                  <li>Vosk - Offline, on-device model</li>
                  <li>Whisper - OpenAI's speech recognition model</li>
                </ul>
                <p>Features include background noise reduction, sentiment analysis, and real-time performance metrics.</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Sentiment Analysis</h2>
            <SentimentVisualizer 
              results={transcriptionResults} 
              enabled={sentimentAnalysis}
            />
          </div>
        </div>
      </div>
      
      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>Speech-to-Text Comparison System &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

// Render the app
ReactDOM.render(<App />, document.getElementById('root'));
