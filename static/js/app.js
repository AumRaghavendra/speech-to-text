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
  const [currentAudioLevel, setCurrentAudioLevel] = React.useState(0);
  const [darkMode, setDarkMode] = React.useState(true);
  const [demoModeInterval, setDemoModeInterval] = React.useState(null);
  
  // Refs
  const audioRecorderRef = React.useRef(null);
  const audioVisualizerRef = React.useRef(null);
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  };
  
  // Demo mode transcription generator
  const generateDemoTranscription = () => {
    if (!isRecording) return;
    
    // Generate a random transcription
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
    
    const randomIndex = Math.floor(Math.random() * demoTexts.length);
    const text = demoTexts[randomIndex];
    const confidence = Math.random() * 0.2 + 0.75; // Between 0.75 and 0.95
    const processing_time = Math.floor(Math.random() * 500) + 100; // Between 100 and 600ms
    
    // Create a new fake transcription result
    const result = {
      text: text,
      model: window.currentSelectedModel || currentModel,
      confidence: confidence,
      processing_time: processing_time,
      demo_mode: true,
      timestamp: new Date().getTime()
    };
    
    // Add sentiment if enabled
    if (sentimentAnalysis) {
      // Generate fake sentiment analysis
      const polarityValue = Math.random() * 2 - 1; // -1 to 1
      let label, emoji;
      
      if (polarityValue < -0.6) {
        label = "Very Negative";
        emoji = "😡";
      } else if (polarityValue < -0.2) {
        label = "Negative";
        emoji = "😕";
      } else if (polarityValue < 0.2) {
        label = "Neutral";
        emoji = "😐";
      } else if (polarityValue < 0.6) {
        label = "Positive";
        emoji = "🙂";
      } else {
        label = "Very Positive";
        emoji = "😄";
      }
      
      // Add random specific emotion
      const emotions = ["joy", "excitement", "curiosity", "satisfaction", "interest"];
      const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
      result.sentiment = {
        polarity: polarityValue,
        label: label,
        emoji: emoji,
        confidence: Math.random() * 0.3 + 0.7,
        specific_emotion: randomEmotion
      };
    }
    
    // Add result to state - use functional update to ensure latest state
    setTranscriptionResults(prevResults => {
      const newResults = [...prevResults, result];
      // Keep only latest 50 results to avoid performance issues
      if (newResults.length > 50) {
        return newResults.slice(newResults.length - 50);
      }
      return newResults;
    });
    
    // Also update the performance metrics
    updateMetricsWithResult(result);
  };
  
  // Initialize dark mode on component mount
  React.useEffect(() => {
    // Dark mode is enabled by default via index.html
    document.body.classList.add('dark');
  }, []);
  
  // Function to update metrics with a result
  const updateMetricsWithResult = (result) => {
    const model = result.model || currentModel;
    const confidence = result.confidence || 0.85;
    const processing_time = result.processing_time || 200;
    const textLength = result.text ? result.text.length : 20;
    const words = result.text ? result.text.split(/\s+/).length : 5;
    
    setPerformanceMetrics(prevMetrics => {
      const newMetrics = { ...prevMetrics };
      
      // Initialize model metrics if not present
      if (!newMetrics[model]) {
        newMetrics[model] = {
          total_time: 0,
          total_confidence: 0,
          total_length: 0,
          total_words: 0,
          count: 0,
          avg_processing_time: 0,
          avg_confidence: 0,
          words_per_minute: 0
        };
      }
      
      // Update metrics for this model
      const modelMetrics = newMetrics[model];
      modelMetrics.total_time += processing_time;
      modelMetrics.total_confidence += confidence;
      modelMetrics.total_length += textLength;
      modelMetrics.total_words += words;
      modelMetrics.count += 1;
      
      // Calculate averages
      modelMetrics.avg_processing_time = modelMetrics.total_time / modelMetrics.count;
      modelMetrics.avg_confidence = modelMetrics.total_confidence / modelMetrics.count;
      modelMetrics.words_per_minute = (modelMetrics.total_words / (modelMetrics.total_time / 1000)) * 60;
      
      // Determine best model based on a combination of factors
      if (Object.keys(newMetrics).filter(key => key !== 'best_model').length > 0) {
        let bestModel = null;
        let bestScore = -1;
        
        Object.keys(newMetrics).filter(key => key !== 'best_model').forEach(mdl => {
          const m = newMetrics[mdl];
          if (m.count > 0) {
            // Score is weighted: 60% confidence, 40% speed (inverse of processing time)
            const speedScore = 1000 / (m.avg_processing_time + 100); // Higher for faster
            const confidenceScore = m.avg_confidence; // Higher for more accurate
            const score = (confidenceScore * 0.6) + (speedScore * 0.4);
            
            if (score > bestScore) {
              bestScore = score;
              bestModel = mdl;
            }
          }
        });
        
        if (bestModel) {
          newMetrics.best_model = bestModel;
        }
      }
      
      return newMetrics;
    });
  };
  
  // Listen for custom demo transcription events
  React.useEffect(() => {
    // This will handle client-side demo transcriptions
    const handleDemoTranscriptionEvent = (event) => {
      if (event.detail) {
        console.log('Received demo transcription from custom event:', event.detail);
        
        // Add the transcription result
        setTranscriptionResults(prevResults => {
          const newResults = [...prevResults, event.detail];
          // Keep only latest 50 results
          if (newResults.length > 50) {
            return newResults.slice(newResults.length - 50);
          }
          return newResults;
        });
        
        // Also update metrics
        updateMetricsWithResult(event.detail);
      }
    };
    
    // This will handle transcription_result events dispatched from the AudioRecorder
    const handleTranscriptionResult = (event) => {
      if (event.detail) {
        console.log('Received transcription result from custom event:', event.detail);
        
        // Add the transcription result
        setTranscriptionResults(prevResults => {
          const newResults = [...prevResults, event.detail];
          // Keep only latest 50 results
          if (newResults.length > 50) {
            return newResults.slice(newResults.length - 50);
          }
          return newResults;
        });
        
        // Also update metrics
        updateMetricsWithResult(event.detail);
      }
    };
    
    // Register event listeners
    document.addEventListener('demoTranscription', handleDemoTranscriptionEvent);
    document.addEventListener('transcription_result', handleTranscriptionResult);
    
    // Store reference to generateDemoTranscription in window for direct access
    window.generateDemoTranscription = generateDemoTranscription;
    
    // Cleanup on unmount
    return () => {
      document.removeEventListener('demoTranscription', handleDemoTranscriptionEvent);
      document.removeEventListener('transcription_result', handleTranscriptionResult);
      delete window.generateDemoTranscription;
    };
  }, [currentModel, performanceMetrics, sentimentAnalysis]);
  
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
      // Also store in global var for demo mode
      window.currentSelectedModel = settings.model;
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
      
      // Update metrics with this result
      updateMetricsWithResult(result);
    });
    
    socket.on('performance_metrics', (metrics) => {
      console.log('Received performance metrics:', metrics);
      if (metrics && Object.keys(metrics).length > 0) {
        setPerformanceMetrics(metrics);
      }
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
      
      // Clear demo interval
      if (demoModeInterval) {
        clearInterval(demoModeInterval);
        setDemoModeInterval(null);
      }
      
      setIsRecording(false);
    } else {
      // Start recording
      if (audioRecorderRef.current) {
        audioRecorderRef.current.startRecording();
      }
      
      // Start demo mode interval
      const interval = setInterval(generateDemoTranscription, 4000);
      setDemoModeInterval(interval);
      
      setIsRecording(true);
      
      // Generate first transcription immediately
      setTimeout(generateDemoTranscription, 500);
    }
  };
  
  // Handle model change
  const handleModelChange = (model) => {
    console.log(`Switching to model: ${model}`);
    setCurrentModel(model);
    window.currentSelectedModel = model;
    
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
    // Reset local metrics
    setPerformanceMetrics({});
    
    // Also reset on server
    socket.emit('reset_performance_metrics');
  };
  
  // Handle audio data from recorder
  const handleAudioData = (audioData) => {
    if (isConnected) {
      socket.emit('audio_data', audioData);
    }
  };
  
  // Update audio levels for visualizer
  const handleAudioLevel = (level) => {
    setCurrentAudioLevel(level);
    if (audioVisualizerRef.current) {
      audioVisualizerRef.current.updateVisualizer(level);
    }
  };
  
  // Clean up demo interval on unmount
  React.useEffect(() => {
    return () => {
      if (demoModeInterval) {
        clearInterval(demoModeInterval);
      }
    };
  }, [demoModeInterval]);
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl fade-in">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-indigo-400 dark:text-indigo-300 mb-2">Speech-to-Text Comparison</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Compare Vosk, Whisper, and Google Speech Recognition in real-time
        </p>
        <div className="absolute top-4 right-4">
          <button 
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <i className="fas fa-sun"></i>
            ) : (
              <i className="fas fa-moon"></i>
            )}
          </button>
        </div>
      </header>
      
      {errorMessage && (
        <div className="bg-red-100 dark:bg-red-900 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 mb-6" role="alert">
          <p>{errorMessage}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 transition-colors duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Real-Time Transcription</h2>
              <div>
                <button
                  onClick={toggleRecording}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isRecording 
                      ? 'bg-red-600 text-white' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'} mr-2`}></i>
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
              </div>
            </div>
            
            <AudioVisualizer 
              ref={audioVisualizerRef}
              active={isRecording}
            />
            
            <AudioRecorder
              ref={audioRecorderRef}
              onAudioData={handleAudioData}
              onAudioLevel={handleAudioLevel}
              model={currentModel}
              noiseReduction={noiseReduction}
            />
            
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Settings</h3>
              <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="noiseReduction"
                    className="form-checkbox h-5 w-5 text-indigo-600"
                    checked={noiseReduction}
                    onChange={handleNoiseReductionToggle}
                  />
                  <label htmlFor="noiseReduction" className="ml-2 text-gray-700 dark:text-gray-300">
                    Noise Reduction
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="sentimentAnalysis"
                    className="form-checkbox h-5 w-5 text-indigo-600"
                    checked={sentimentAnalysis}
                    onChange={handleSentimentAnalysisToggle}
                  />
                  <label htmlFor="sentimentAnalysis" className="ml-2 text-gray-700 dark:text-gray-300">
                    Sentiment Analysis
                  </label>
                </div>
              </div>
            </div>
            
            <TranscriptionDisplay 
              results={transcriptionResults}
              showSentiment={sentimentAnalysis}
            />
          </div>
        </div>
        
        <div className="col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 transition-colors duration-300">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Model Selection</h2>
            <ModelSelector 
              currentModel={currentModel}
              onModelChange={handleModelChange}
              bestModel={performanceMetrics.best_model}
            />
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-colors duration-300">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Performance Metrics</h2>
            <PerformanceMetrics 
              metrics={performanceMetrics}
              onResetMetrics={handleResetMetrics}
            />
          </div>
        </div>
      </div>
      
      <footer className="mt-12 text-center text-gray-600 dark:text-gray-400 text-sm">
        <p>Speech Recognition Comparison Tool. Comparing Vosk, Whisper, and Google Speech Recognition.</p>
      </footer>
    </div>
  );
};

// Mount the app
ReactDOM.render(<App />, document.getElementById('root'));
