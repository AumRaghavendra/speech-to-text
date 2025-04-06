// Sentiment Visualizer Component

const SentimentVisualizer = ({ sentiment }) => {
  if (!sentiment) {
    return null;
  }
  
  const { label, polarity, emoji, emotion } = sentiment;
  
  // Calculate color based on polarity
  const getColorClass = () => {
    if (polarity > 0.5) return 'text-green-500';
    if (polarity > 0.2) return 'text-green-400';
    if (polarity > 0) return 'text-blue-400';
    if (polarity > -0.2) return 'text-amber-400';
    if (polarity > -0.5) return 'text-orange-500';
    return 'text-red-500';
  };
  
  // Calculate width of sentiment bar
  const getBarWidth = () => {
    // Normalize to 0-100%
    const normalized = ((polarity + 1) / 2) * 100;
    return `${normalized}%`;
  };
  
  return (
    <div className="mt-2">
      <div className="flex items-center mb-1">
        <span className="text-xl mr-2" title={`Sentiment: ${label}`}>
          {emoji}
        </span>
        <div>
          <div className="text-sm font-medium">
            {label} 
            {emotion && <span className="text-gray-500 dark:text-gray-400 ml-1">({emotion})</span>}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Polarity: {polarity.toFixed(2)}
          </div>
        </div>
      </div>
      
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${getColorClass()}`} 
          style={{ width: getBarWidth() }}
        ></div>
      </div>
    </div>
  );
};
