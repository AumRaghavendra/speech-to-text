// Performance Metrics Component

const PerformanceMetrics = ({ metrics, onRefresh }) => {
  // Default empty metrics structure if none provided
  const metricsData = metrics || {
    models: {
      google: { avg_confidence: 0, avg_processing_time: 0, count: 0 },
      vosk: { avg_confidence: 0, avg_processing_time: 0, count: 0 },
      whisper: { avg_confidence: 0, avg_processing_time: 0, count: 0 }
    },
    best_model: ""
  };
  
  const refreshMetrics = () => {
    if (onRefresh) {
      onRefresh();
    }
  };
  
  return (
    <div>
      <div className="mb-3 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr className="text-gray-500 dark:text-gray-400 text-xs">
              <th className="px-2 py-1 text-left">Model</th>
              <th className="px-2 py-1 text-right">Conf.</th>
              <th className="px-2 py-1 text-right">Time</th>
              <th className="px-2 py-1 text-right">Uses</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {Object.keys(metricsData.models).map(model => {
              const modelData = metricsData.models[model];
              const isBest = metricsData.best_model === model;
              
              // Determine color classes based on model
              let colorClass = '';
              if (model === 'google') colorClass = 'text-blue-600 dark:text-blue-400';
              else if (model === 'vosk') colorClass = 'text-red-600 dark:text-red-400';
              else if (model === 'whisper') colorClass = 'text-green-600 dark:text-green-400';
              
              return (
                <tr key={model} className={`text-xs ${isBest ? 'font-medium' : ''}`}>
                  <td className={`px-2 py-1 ${colorClass}`}>
                    {model.charAt(0).toUpperCase() + model.slice(1)}
                    {isBest && <span className="ml-1">★</span>}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {modelData.avg_confidence ? (modelData.avg_confidence * 100).toFixed(0) + '%' : '-'}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {modelData.avg_processing_time ? modelData.avg_processing_time.toFixed(0) + 'ms' : '-'}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {modelData.count || 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <button
        onClick={refreshMetrics}
        className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
      >
        Refresh Metrics
      </button>
    </div>
  );
};
