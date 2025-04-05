// Speech Recognition Manager Component

const SpeechRecognitionManager = () => {
  const [status, setStatus] = React.useState('idle');
  const [models, setModels] = React.useState([]);
  const [selectedModel, setSelectedModel] = React.useState('google');
  
  // Fetch available models on component mount
  React.useEffect(() => {
    fetchAvailableModels();
  }, []);
  
  // Fetch available models from the server
  const fetchAvailableModels = async () => {
    try {
      const response = await fetch('/api/models');
      const data = await response.json();
      setModels(data);
      
      // Select the first available model by default
      if (data.length > 0) {
        const availableModel = data.find(m => m.available);
        if (availableModel) {
          setSelectedModel(availableModel.id);
        }
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };
  
  // Change the selected model
  const changeModel = (modelId) => {
    setSelectedModel(modelId);
    // Update server settings
    updateSettings({ model: modelId });
  };
  
  // Update settings on the server
  const updateSettings = async (settings) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      await response.json();
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };
  
  return {
    status,
    models,
    selectedModel,
    changeModel
  };
};
