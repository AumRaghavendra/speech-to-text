// Transcription Display Component

const TranscriptionDisplay = ({ results, sentimentAnalysisEnabled }) => {
  const containerRef = React.useRef(null);
  
  // Auto-scroll to the bottom when new results come in
  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [results]);
  
  // Get display time in readable format
  const getDisplayTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };
  
  // Get background color for model
  const getModelBackgroundColor = (model) => {
    const colors = {
      'google': 'bg-blue-50 dark:bg-blue-900/30',
      'vosk': 'bg-red-50 dark:bg-red-900/30',
      'whisper': 'bg-green-50 dark:bg-green-900/30'
    };
    
    return colors[model] || 'bg-gray-50 dark:bg-gray-800/50';
  };
  
  // Get text color for model
  const getModelTextColor = (model) => {
    const colors = {
      'google': 'text-blue-800 dark:text-blue-300',
      'vosk': 'text-red-800 dark:text-red-300',
      'whisper': 'text-green-800 dark:text-green-300'
    };
    
    return colors[model] || 'text-gray-800 dark:text-gray-300';
  };
  
  // Get model icon background color
  const getModelIconBg = (model) => {
    const colors = {
      'google': 'bg-white dark:bg-blue-800/30',
      'vosk': 'bg-white dark:bg-red-800/30',
      'whisper': 'bg-white dark:bg-green-800/30'
    };
    
    return colors[model] || 'bg-white dark:bg-gray-700';
  };
  
  // Get model icon
  const getModelIcon = (model) => {
    const icons = {
      'google': 'fab fa-google',
      'vosk': 'fas fa-microphone-alt',
      'whisper': 'fas fa-comment-dots'
    };
    
    return icons[model] || 'fas fa-microphone';
  };
  
  // Get confidence indicator
  const getConfidenceIndicator = (confidence) => {
    if (confidence >= 0.8) {
      return 'bg-green-500 dark:bg-green-400';
    } else if (confidence >= 0.5) {
      return 'bg-yellow-500 dark:bg-yellow-400';
    } else {
      return 'bg-red-500 dark:bg-red-400';
    }
  };
  
  return (
    <div 
      ref={containerRef}
      className="transcription-container bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-64 overflow-y-auto transition-colors duration-300"
    >
      {results.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 h-full flex items-center justify-center">
          <p>Start recording to see transcription results</p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((result, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg ${getModelBackgroundColor(result.model)} slide-up backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full ${getModelTextColor(result.model)} ${getModelIconBg(result.model)} mr-2`}>
                    <i className={getModelIcon(result.model)}></i>
                  </span>
                  <span className={`font-medium ${getModelTextColor(result.model)}`}>
                    {result.model.charAt(0).toUpperCase() + result.model.slice(1)}
                  </span>
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{getDisplayTime()}</span>
                </div>
                <div className="flex items-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                    {result.processing_time ? `${result.processing_time.toFixed(0)}ms` : ''}
                  </div>
                  <div className="flex items-center" title={`Confidence: ${(result.confidence * 100).toFixed(1)}%`}>
                    <div className={`h-2 w-2 rounded-full ${getConfidenceIndicator(result.confidence)} mr-1`}></div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {(result.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-gray-800 dark:text-gray-200">
                {result.text}
                {sentimentAnalysisEnabled && result.sentiment && (
                  <span className="sentiment-emoji ml-2 text-xl" title={result.sentiment.label}>
                    {result.sentiment.emoji}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
