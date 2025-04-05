// Model Selector Component

const ModelSelector = ({ currentModel, onModelChange, bestModel }) => {
  // Model data with descriptions
  const models = [
    {
      id: 'google',
      name: 'Google Speech Recognition',
      icon: 'fab fa-google',
      description: 'Cloud-based service with high accuracy. Internet connection required.',
      color: 'bg-blue-500',
      textColor: 'text-blue-800'
    },
    {
      id: 'vosk',
      name: 'Vosk',
      icon: 'fas fa-microphone-alt',
      description: 'Offline, on-device model. Works without internet connection.',
      color: 'bg-red-500',
      textColor: 'text-red-800'
    },
    {
      id: 'whisper',
      name: 'Whisper',
      icon: 'fas fa-comment-dots',
      description: 'OpenAI\'s speech recognition model. Excellent for various accents.',
      color: 'bg-green-500',
      textColor: 'text-green-800'
    }
  ];
  
  // Handle model selection
  const handleModelSelect = (modelId) => {
    if (modelId !== currentModel) {
      onModelChange(modelId);
    }
  };
  
  return (
    <div className="model-selector">
      <div className="grid grid-cols-1 gap-3">
        {models.map(model => (
          <div 
            key={model.id}
            className={`p-3 rounded-lg border-2 cursor-pointer model-transition ${
              model.id === currentModel 
                ? `border-${model.color.replace('bg-', '')} ${model.color.replace('bg-', 'bg-')} bg-opacity-10` 
                : 'border-gray-200 hover:border-gray-300'
            } ${model.id === bestModel ? 'best-model' : ''}`}
            onClick={() => handleModelSelect(model.id)}
          >
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full ${model.color} flex items-center justify-center text-white mr-3`}>
                <i className={model.icon}></i>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{model.name}</h4>
                <p className="text-xs text-gray-500">{model.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
