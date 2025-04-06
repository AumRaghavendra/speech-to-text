// Audio Visualizer Component

const AudioVisualizer = React.forwardRef((props, ref) => {
  const { active } = props;
  const [visualizerValues, setVisualizerValues] = React.useState(Array(15).fill(0));
  
  // Function to update visualizer with audio level data
  const updateVisualizer = (level) => {
    // Convert the level (0-1) to heights for each bar
    const maxHeight = 40; // Maximum height of bars in pixels
    
    // Create a new array with randomized heights based on the level
    const newValues = Array(15).fill(0).map(() => {
      // Add some randomness but keep it proportional to level
      const randomFactor = 0.7 + Math.random() * 0.6; // Between 0.7 and 1.3
      return Math.min(maxHeight, Math.max(5, Math.floor(level * maxHeight * randomFactor)));
    });
    
    setVisualizerValues(newValues);
  };
  
  // Expose update function via ref
  React.useImperativeHandle(ref, () => ({
    updateVisualizer
  }));
  
  return (
    <div className={`audio-visualizer ${active ? 'active' : 'idle'} flex items-center justify-center h-16 mb-4`}>
      {visualizerValues.map((height, index) => (
        <span 
          key={index} 
          className="mx-0.5 rounded-full bg-gradient-to-b from-blue-400 to-indigo-600"
          style={{ 
            height: `${height}px`, 
            width: '4px',
            transform: active ? 'scaleY(1)' : 'scaleY(0.3)',
            transition: 'transform 0.2s ease'
          }}
        ></span>
      ))}
    </div>
  );
});

// Default props
AudioVisualizer.defaultProps = {
  active: false
};
