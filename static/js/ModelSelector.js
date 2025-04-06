// Model Selector Component

const ModelSelector = ({ currentModel, onModelChange }) => {
  const [selected, setSelected] = React.useState(currentModel || 'google');
  const [models, setModels] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  
  // Fetch available models from server on load
  React.useEffect(() => {
    fetch('/models')
      .then(response => response.json())
      .then(data => {
        setModels(data.models || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching models:', error);
        // Fallback models in case of error
        setModels(['google', 'vosk', 'whisper']);
        setLoading(false);
      });
  }, []);
  
  // Update selected model when prop changes
  React.useEffect(() => {
    if (currentModel && currentModel !== selected) {
      setSelected(currentModel);
    }
  }, [currentModel]);
  
  const handleModelChange = (model) => {
    setSelected(model);
    if (onModelChange) {
      onModelChange(model);
    }
  };
  
  // Render loading indicator if models are still loading
  if (loading) {
    return (
      <div className="p-2 text-center">
        <p className="text-gray-500 dark:text-gray-400">Loading models...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {models.map(model => (
        <div key={model} className="flex items-center">
          <input
            type="radio"
            id={`model-${model}`}
            name="speech-model"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            checked={selected === model}
            onChange={() => handleModelChange(model)}
          />
          <label htmlFor={`model-${model}`} className="ml-2 block text-sm capitalize">
            {model}
            {model === 'google' && ' (Online)'}
            {model === 'vosk' && ' (Offline)'}
            {model === 'whisper' && ' (OpenAI)'}
          </label>
        </div>
      ))}
      
      <div className="mt-4 text-xs">
        <p className="text-gray-500 dark:text-gray-400">
          {selected === 'google' && 'Google Speech API provides high accuracy but requires internet connection.'}
          {selected === 'vosk' && 'Vosk runs completely offline with lower resource usage.'}
          {selected === 'whisper' && 'OpenAI Whisper provides excellent accuracy for complex audio.'}
        </p>
      </div>
    </div>
  );
};
