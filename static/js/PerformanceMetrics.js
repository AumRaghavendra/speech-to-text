// Performance Metrics Component

const PerformanceMetrics = ({ metrics, onResetMetrics }) => {
  const chartRefs = React.useRef({
    processingTime: null,
    confidence: null
  });
  const chartInstances = React.useRef({
    processingTime: null,
    confidence: null
  });
  
  // Initialize charts after component mounts
  React.useEffect(() => {
    initializeCharts();
    
    return () => {
      // Destroy chart instances on unmount
      if (chartInstances.current.processingTime) {
        chartInstances.current.processingTime.destroy();
      }
      if (chartInstances.current.confidence) {
        chartInstances.current.confidence.destroy();
      }
    };
  }, []);
  
  // Update charts when metrics change
  React.useEffect(() => {
    updateCharts();
  }, [metrics]);
  
  // Initialize chart instances
  const initializeCharts = () => {
    if (chartRefs.current.processingTime && chartRefs.current.confidence) {
      // Processing Time Chart
      chartInstances.current.processingTime = new Chart(chartRefs.current.processingTime, {
        type: 'bar',
        data: {
          labels: [],
          datasets: []
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Average Processing Time (ms)'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const value = context.raw || 0;
                  return `${context.dataset.label}: ${value.toFixed(1)} ms`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Time (ms)'
              }
            }
          }
        }
      });
      
      // Confidence Chart
      chartInstances.current.confidence = new Chart(chartRefs.current.confidence, {
        type: 'bar',
        data: {
          labels: [],
          datasets: []
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Confidence Score (0-1)'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const value = context.raw || 0;
                  return `${context.dataset.label}: ${value.toFixed(2)}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 1,
              title: {
                display: true,
                text: 'Confidence'
              }
            }
          }
        }
      });
    }
  };
  
  // Update charts with new metrics data
  const updateCharts = () => {
    if (!metrics || Object.keys(metrics).length === 0) return;
    
    const modelKeys = Object.keys(metrics).filter(key => key !== 'best_model');
    if (modelKeys.length === 0) return;
    
    // Update Processing Time Chart
    if (chartInstances.current.processingTime) {
      const processingTimeData = {
        labels: modelKeys.map(getModelDisplayName),
        datasets: [{
          label: 'Processing Time',
          data: modelKeys.map(key => {
            const modelData = metrics[key] || {};
            return modelData.avg_processing_time || 0;
          }),
          backgroundColor: modelKeys.map(key => getModelColor(key, metrics.best_model, 0.7)),
          borderColor: modelKeys.map(key => getModelColor(key, metrics.best_model, 1)),
          borderWidth: 1
        }]
      };
      
      chartInstances.current.processingTime.data = processingTimeData;
      chartInstances.current.processingTime.update();
    }
    
    // Update Confidence Chart
    if (chartInstances.current.confidence) {
      const confidenceData = {
        labels: modelKeys.map(getModelDisplayName),
        datasets: [{
          label: 'Confidence',
          data: modelKeys.map(key => {
            const modelData = metrics[key] || {};
            return modelData.avg_confidence || 0;
          }),
          backgroundColor: modelKeys.map(key => getModelColor(key, metrics.best_model, 0.7)),
          borderColor: modelKeys.map(key => getModelColor(key, metrics.best_model, 1)),
          borderWidth: 1
        }]
      };
      
      chartInstances.current.confidence.data = confidenceData;
      chartInstances.current.confidence.update();
    }
  };
  
  // Get display name for model
  const getModelDisplayName = (modelKey) => {
    const names = {
      'google': 'Google',
      'vosk': 'Vosk',
      'whisper': 'Whisper'
    };
    return names[modelKey] || modelKey;
  };
  
  // Get color for model (highlight best model)
  const getModelColor = (modelKey, bestModel, alpha) => {
    const colors = {
      'google': `rgba(66, 133, 244, ${alpha})`,
      'vosk': `rgba(219, 68, 55, ${alpha})`,
      'whisper': `rgba(15, 157, 88, ${alpha})`
    };
    
    // Highlight best model
    if (modelKey === bestModel) {
      return `rgba(251, 191, 36, ${alpha})`;
    }
    
    return colors[modelKey] || `rgba(128, 128, 128, ${alpha})`;
  };
  
  // Generate summary statistics
  const generateSummaryStats = () => {
    if (!metrics || Object.keys(metrics).length === 0) {
      return [];
    }
    
    const modelKeys = Object.keys(metrics).filter(key => key !== 'best_model');
    if (modelKeys.length === 0) return [];
    
    return modelKeys.map(key => {
      const modelData = metrics[key] || {};
      const isBestModel = key === metrics.best_model;
      
      // Handle missing or undefined values
      const processingTime = modelData.avg_processing_time || 0;
      const confidence = modelData.avg_confidence || 0;
      const wordsPerMinute = modelData.words_per_minute || 0;
      const count = modelData.count || 0;
      
      return {
        name: getModelDisplayName(key),
        processingTime: processingTime,
        confidence: confidence,
        wordsPerMinute: wordsPerMinute,
        count: count,
        isBestModel
      };
    });
  };
  
  const summaryStats = generateSummaryStats();
  
  return (
    <div className="performance-metrics fade-in">
      {summaryStats.length === 0 ? (
        <div className="text-center text-gray-500 py-4">
          <p>No performance data available yet. Start recording to collect metrics.</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {summaryStats.map(stat => (
                <div 
                  key={stat.name}
                  className={`bg-white p-4 rounded-lg border ${
                    stat.isBestModel 
                      ? 'border-yellow-400 shadow-lg best-model' 
                      : 'border-gray-200 shadow'
                  }`}
                >
                  <h3 className="text-lg font-semibold mb-2">{stat.name}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Processing Time:</p>
                      <p className="font-medium">{(stat.processingTime || 0).toFixed(1)} ms</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Confidence:</p>
                      <p className="font-medium">{(stat.confidence || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Words/Min:</p>
                      <p className="font-medium">{(stat.wordsPerMinute || 0).toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Samples:</p>
                      <p className="font-medium">{stat.count || 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Processing Time</h3>
              <div className="bg-gray-50 p-3 rounded-lg">
                <canvas 
                  ref={el => chartRefs.current.processingTime = el} 
                  className="metrics-chart"
                ></canvas>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">Confidence Score</h3>
              <div className="bg-gray-50 p-3 rounded-lg">
                <canvas 
                  ref={el => chartRefs.current.confidence = el}
                  className="metrics-chart"
                ></canvas>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <button
              onClick={onResetMetrics}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Reset Metrics
            </button>
          </div>
        </>
      )}
    </div>
  );
};
