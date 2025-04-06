// Main React App Component

// Ensure React and ReactDOM are defined
const React = window.React;
const ReactDOM = window.ReactDOM;

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

  // Initialize socket connection
  React.useEffect(() => {
    // Socket.io event handlers
    socket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setErrorMessage('');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
      setErrorMessage('Server connection lost. Please reload the page.');
    });

    socket.on('transcription_result', (data) => {
      console.log('Received transcription result:', data);
      const newResult = {
        id: Date.now(),
        text: data.text,
        model: data.model,
        timestamp: new Date().toLocaleTimeString(),
        confidence: data.confidence,
        processingTime: data.processing_time,
        sentiment: data.sentiment,
      };
      
      setTranscriptionResults(prev => [newResult, ...prev]);
      
      // Update the visualizer to idle state when result is received
      if (!isRecording) {
        const visualizer = document.getElementById('audio-visualizer');
        if (visualizer) visualizer.className = 'audio-visualizer idle';
      }
    });

    socket.on('error', (data) => {
      console.error('Server error:', data);
      setErrorMessage(data.message || 'An error occurred');
    });
    
    socket.on('performance_metrics', (data) => {
      console.log('Received performance metrics:', data);
      setPerformanceMetrics(data);
      
      // Update the metrics table
      const metricsContainer = document.getElementById('metrics-container');
      if (metricsContainer && metricsContainer.querySelector('tbody')) {
        const tbody = metricsContainer.querySelector('tbody');
        tbody.innerHTML = '';
        
        Object.keys(data.models).forEach(model => {
          const modelData = data.models[model];
          const row = document.createElement('tr');
          
          // Model name with styled badge
          let colorClass = '';
          if (model === 'google') colorClass = 'text-blue-800 bg-blue-50';
          else if (model === 'vosk') colorClass = 'text-red-800 bg-red-50';
          else if (model === 'whisper') colorClass = 'text-green-800 bg-green-50';
          
          row.innerHTML = `
            <td class="px-4 py-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}">
                ${model.charAt(0).toUpperCase() + model.slice(1)}
              </span>
            </td>
            <td class="px-4 py-2 text-center">${modelData.avg_confidence ? (modelData.avg_confidence * 100).toFixed(1) + '%' : 'N/A'}</td>
            <td class="px-4 py-2 text-center">${modelData.avg_processing_time ? modelData.avg_processing_time.toFixed(0) + 'ms' : 'N/A'}</td>
            <td class="px-4 py-2 text-center">${modelData.count || 0}</td>
          `;
          
          tbody.appendChild(row);
        });
        
        // Add the best model row
        if (data.best_model) {
          const bestRow = document.createElement('tr');
          bestRow.className = 'font-medium';
          bestRow.innerHTML = `
            <td class="px-4 py-2" colspan="3">Best Overall Performance:</td>
            <td class="px-4 py-2 text-center">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                ${data.best_model.charAt(0).toUpperCase() + data.best_model.slice(1)}
              </span>
            </td>
          `;
          tbody.appendChild(bestRow);
        }
      }
    });
    
    // Initial fetch of metrics
    fetchPerformanceMetrics();

    // Cleanup on unmount
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('transcription_result');
      socket.off('error');
      socket.off('performance_metrics');
    };
  }, []);

  // Handle recording state changes
  React.useEffect(() => {
    const visualizer = document.getElementById('audio-visualizer');
    if (visualizer) {
      visualizer.className = isRecording ? 'audio-visualizer' : 'audio-visualizer idle';
    }
    
    // Update settings on server when model or options change
    if (isConnected) {
      socket.emit('update_settings', {
        model: currentModel,
        noise_reduction: noiseReduction,
        sentiment_analysis: sentimentAnalysis
      });
    }
  }, [isRecording, currentModel, noiseReduction, sentimentAnalysis, isConnected]);

  const handleRecordingStateChange = (newState) => {
    setIsRecording(newState);
  };

  const handleModelChange = (model) => {
    setCurrentModel(model);
  };

  const handleClearResults = () => {
    setTranscriptionResults([]);
    const noResultsMessage = document.getElementById('no-results-message');
    if (noResultsMessage) {
      noResultsMessage.style.display = 'block';
    }
  };

  const handleOptionChange = (option, value) => {
    if (option === 'noiseReduction') {
      setNoiseReduction(value);
    } else if (option === 'sentimentAnalysis') {
      setSentimentAnalysis(value);
    }
  };
  
  const fetchPerformanceMetrics = () => {
    socket.emit('get_performance_metrics');
  };
  
  const handleResetMetrics = () => {
    socket.emit('reset_performance_metrics');
    fetchPerformanceMetrics();
  };

  // Effect to hide/show the no results message
  React.useEffect(() => {
    const noResultsMessage = document.getElementById('no-results-message');
    if (noResultsMessage) {
      noResultsMessage.style.display = transcriptionResults.length === 0 ? 'block' : 'none';
    }
  }, [transcriptionResults]);

  // Register click event for clear button
  React.useEffect(() => {
    const clearButton = document.getElementById('clear-results-button');
    if (clearButton) {
      clearButton.addEventListener('click', handleClearResults);
    }
    
    return () => {
      if (clearButton) {
        clearButton.removeEventListener('click', handleClearResults);
      }
    };
  }, []);

  return (
    <React.Fragment>
      {/* Options checkboxes */}
      <div id="options">
        <div className="flex items-center mb-3">
          <input
            type="checkbox"
            id="noise-reduction"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            checked={noiseReduction}
            onChange={(e) => handleOptionChange('noiseReduction', e.target.checked)}
          />
          <label htmlFor="noise-reduction" className="ml-2 block text-sm text-gray-500 dark:text-gray-400">
            Noise Reduction
          </label>
        </div>
        
        <div className="flex items-center mb-3">
          <input
            type="checkbox"
            id="sentiment-analysis"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            checked={sentimentAnalysis}
            onChange={(e) => handleOptionChange('sentimentAnalysis', e.target.checked)}
          />
          <label htmlFor="sentiment-analysis" className="ml-2 block text-sm text-gray-500 dark:text-gray-400">
            Sentiment Analysis
          </label>
        </div>
        
        <div className="mt-4">
          <button 
            onClick={handleResetMetrics}
            className="px-3 py-1 text-xs text-white bg-gray-500 hover:bg-gray-600 rounded"
          >
            Reset Metrics
          </button>
        </div>
      </div>
      
      {/* Recording component */}
      <AudioRecorder 
        onRecordingStateChange={handleRecordingStateChange} 
        socket={socket}
      />
      
      {/* Model selector component */}
      <ModelSelector
        currentModel={currentModel}
        onModelChange={handleModelChange}
      />
      
      {/* Performance metrics component */}
      <PerformanceMetrics 
        metrics={performanceMetrics}
        onRefresh={fetchPerformanceMetrics}
      />
      
      {/* Transcription results component */}
      <TranscriptionDisplay
        results={transcriptionResults}
        onClear={handleClearResults}
      />
      
      {/* Error alert */}
      {errorMessage && (
        <div className="mt-4 p-3 bg-red-100 text-red-900 rounded-md">
          <p className="font-medium">Error: {errorMessage}</p>
        </div>
      )}
    </React.Fragment>
  );
};

// Mount React components
document.addEventListener('DOMContentLoaded', () => {
  // Mount the main App component
  ReactDOM.render(
    <App />,
    document.getElementById('options-container')
  );
  
  // Mount the RecordButton component
  ReactDOM.render(
    <AudioRecorder socket={socket} />,
    document.getElementById('record-button-container')
  );
  
  // Mount the ModelSelector component
  ReactDOM.render(
    <ModelSelector />,
    document.getElementById('model-selector-container')
  );
  
  // Mount the PerformanceMetrics component
  ReactDOM.render(
    <PerformanceMetrics />,
    document.getElementById('performance-metrics-container')
  );
  
  // Mount the TranscriptionDisplay component
  ReactDOM.render(
    <TranscriptionDisplay results={[]} />,
    document.getElementById('transcription-container')
  );
});
