// Sentiment Visualizer Component

const SentimentVisualizer = ({ results, enabled }) => {
  // Calculate sentiment distribution for visualization
  const calculateSentimentDistribution = () => {
    if (!enabled || !results || results.length === 0) {
      return null;
    }
    
    // Filter results with sentiment data
    const sentimentResults = results.filter(result => result.sentiment);
    
    if (sentimentResults.length === 0) {
      return null;
    }
    
    // Count occurrences of each sentiment label
    const labelCounts = {};
    sentimentResults.forEach(result => {
      const label = result.sentiment.label;
      labelCounts[label] = (labelCounts[label] || 0) + 1;
    });
    
    // Convert to array for visualization
    const distribution = Object.entries(labelCounts).map(([label, count]) => ({
      label,
      count,
      percentage: (count / sentimentResults.length) * 100,
      emoji: getEmojiForLabel(label)
    }));
    
    // Sort by count (descending)
    distribution.sort((a, b) => b.count - a.count);
    
    return {
      distribution,
      total: sentimentResults.length
    };
  };
  
  // Get emoji for sentiment label
  const getEmojiForLabel = (label) => {
    const emojiMap = {
      'positive': '😃',
      'negative': '😞',
      'neutral': '😐',
      'excited': '🤩',
      'happy': '😄',
      'love': '❤️',
      'surprised': '😲',
      'sad': '😢',
      'angry': '😠',
      'confused': '🤔',
      'scared': '😨'
    };
    
    return emojiMap[label] || '😐';
  };
  
  // Get sentiment indicator for latest result
  const getLatestSentiment = () => {
    if (!enabled || !results || results.length === 0) {
      return null;
    }
    
    // Find the latest result with sentiment data
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i].sentiment) {
        return {
          label: results[i].sentiment.label,
          score: results[i].sentiment.score,
          emoji: results[i].sentiment.emoji,
          text: results[i].text
        };
      }
    }
    
    return null;
  };
  
  // Get color for sentiment score
  const getSentimentColor = (score) => {
    if (score > 0.3) return 'bg-green-100 text-green-800';
    if (score < -0.3) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };
  
  // Get sentiment distribution
  const sentimentDistribution = calculateSentimentDistribution();
  const latestSentiment = getLatestSentiment();
  
  // If sentiment analysis is disabled, show a message
  if (!enabled) {
    return (
      <div className="text-center text-gray-500 p-4">
        <p>Sentiment analysis is disabled.</p>
        <p>Enable it in the settings to see sentiment visualization.</p>
      </div>
    );
  }
  
  // If no sentiment data yet, show waiting message
  if (!sentimentDistribution) {
    return (
      <div className="text-center text-gray-500 p-4">
        <p>Waiting for speech data...</p>
        <p>Start speaking to see sentiment analysis.</p>
      </div>
    );
  }
  
  return (
    <div className="sentiment-visualizer fade-in">
      {latestSentiment && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Latest Sentiment</h3>
          <div className={`p-3 rounded-lg ${getSentimentColor(latestSentiment.score)}`}>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold">{latestSentiment.label}</div>
              <div className="text-4xl sentiment-emoji">{latestSentiment.emoji}</div>
            </div>
            <div className="mt-2 text-sm opacity-75 truncate">
              "{latestSentiment.text}"
            </div>
          </div>
        </div>
      )}
      
      <h3 className="text-lg font-medium mb-2">Sentiment Distribution</h3>
      <div className="space-y-3">
        {sentimentDistribution.distribution.map(item => (
          <div key={item.label} className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <span className="text-2xl mr-2">{item.emoji}</span>
                <span className="font-medium">{item.label}</span>
              </div>
              <div className="text-gray-500 text-sm">
                {item.count} ({item.percentage.toFixed(1)}%)
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full" 
                style={{ width: `${item.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-center text-sm text-gray-500">
        Based on {sentimentDistribution.total} speech samples
      </div>
    </div>
  );
};
