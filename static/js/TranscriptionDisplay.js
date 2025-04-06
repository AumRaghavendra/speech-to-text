// Transcription Display Component

const TranscriptionDisplay = ({ results = [], onClear }) => {
  const containerRef = React.useRef(null);
  
  // Auto scroll to latest result
  React.useEffect(() => {
    if (containerRef.current && results.length > 0) {
      containerRef.current.scrollTop = 0;
    }
  }, [results.length]);
  
  // Render empty state if no results
  if (results.length === 0) {
    return null;
  }
  
  return (
    <div ref={containerRef} className="space-y-4 max-h-[600px] overflow-y-auto">
      {results.map(result => (
        <div 
          key={result.id} 
          className={`p-3 rounded-lg shadow-sm border-l-4 ${
            result.model === 'google' ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600' : 
            result.model === 'vosk' ? 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-600' : 
            'border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-600'
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                result.model === 'google' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
                result.model === 'vosk' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 
                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              }`}>
                {result.model.charAt(0).toUpperCase() + result.model.slice(1)}
              </span>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{result.timestamp}</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Confidence: {(result.confidence * 100).toFixed(0)}%</span>
              <span>Time: {result.processingTime}ms</span>
            </div>
          </div>
          
          <p className="text-gray-700 dark:text-gray-200 mb-1">{result.text}</p>
          
          {/* Sentiment visualization if available */}
          {result.sentiment && (
            <div className="mt-1 flex items-center">
              <span className="text-lg mr-2" title={`Sentiment: ${result.sentiment.label}`}>
                {result.sentiment.emoji}
              </span>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {result.sentiment.label} ({result.sentiment.polarity.toFixed(2)})
                {result.sentiment.emotion && <span className="ml-1">{result.sentiment.emotion}</span>}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
