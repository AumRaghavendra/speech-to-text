// Demo Mode Activator

// This component manages the demo mode activation
// When enabled, it provides fallback data when the real API isn't working

class DemoModeActivator extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      isDemoModeActive: false
    };
  }
  
  componentDidMount() {
    console.log("Demo Mode Activator initialized - real microphone recording enabled");
    
    // IMPORTANT: Set demo mode to disabled by default
    window._transcriptionBackupActive = false;
    
    // Handle demoTranscription events from the global scope
    document.addEventListener('demoTranscription', this.handleDemoTranscription);
    
    // Check if the client is manually in demo mode (for testing)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('demo') && urlParams.get('demo') === 'true') {
      this.activateBackupDemoMode();
    }
  }
  
  componentWillUnmount() {
    document.removeEventListener('demoTranscription', this.handleDemoTranscription);
    
    // Clear any demo interval
    if (window._demoInterval) {
      clearInterval(window._demoInterval);
    }
  }
  
  // Handle demo transcription events
  handleDemoTranscription = (event) => {
    // Check if we should actually use this event
    if (!window._transcriptionBackupActive) {
      console.log("Demo transcription received but demo mode is inactive");
      return;
    }
    
    if (event.detail) {
      this.insertTranscriptionIntoDOM(event.detail);
      this.updateMetricsDisplay(event.detail);
    }
  }
  
  // Function to manually activate backup demo mode
  activateBackupDemoMode = () => {
    console.log("Manually activating demo mode");
    window._transcriptionBackupActive = true;
    this.setState({ isDemoModeActive: true });
    
    // For testing only - generate a demo transcription periodically
    // In real usage, this would only be used as a fallback
  }
  
  // Function to insert demo transcription into the DOM
  insertTranscriptionIntoDOM = (result) => {
    try {
      // Insert transcription into correct container
      const transcriptionContainer = document.querySelector('#transcription-container');
      if (!transcriptionContainer) return;
      
      // Create a new entry and add it
      const entryDiv = document.createElement('div');
      entryDiv.className = "mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow";
      
      const modelSpan = document.createElement('span');
      modelSpan.className = "text-xs font-medium px-2 py-1 rounded mr-2";
      
      // Set color based on model
      if (result.model === 'google') {
        modelSpan.className += " bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      } else if (result.model === 'vosk') {
        modelSpan.className += " bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      } else if (result.model === 'whisper') {
        modelSpan.className += " bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      }
      
      modelSpan.textContent = result.model.toUpperCase();
      
      // Add demo indicator
      const demoSpan = document.createElement('span');
      demoSpan.className = "text-xs font-medium px-2 py-1 rounded mr-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      demoSpan.textContent = "DEMO";
      
      // Create confidence badge
      const confidenceSpan = document.createElement('span');
      confidenceSpan.className = "text-xs px-2 py-1 rounded bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
      confidenceSpan.textContent = `${Math.round(result.confidence * 100)}% confidence`;
      
      // Create header div
      const headerDiv = document.createElement('div');
      headerDiv.className = "flex items-center justify-between mb-2";
      
      const leftDiv = document.createElement('div');
      leftDiv.appendChild(modelSpan);
      leftDiv.appendChild(demoSpan);
      
      headerDiv.appendChild(leftDiv);
      headerDiv.appendChild(confidenceSpan);
      
      // Create text content
      const textDiv = document.createElement('div');
      textDiv.className = "text-gray-800 dark:text-gray-100 text-lg";
      textDiv.textContent = result.text;
      
      // Sentiment display if available
      if (result.sentiment) {
        const sentimentDiv = document.createElement('div');
        sentimentDiv.className = "mt-2 flex items-center";
        
        const emojiSpan = document.createElement('span');
        emojiSpan.className = "text-2xl mr-2";
        emojiSpan.textContent = result.sentiment.emoji;
        
        const sentimentLabel = document.createElement('span');
        sentimentLabel.className = "text-sm text-gray-700 dark:text-gray-300";
        sentimentLabel.textContent = `${result.sentiment.label}`;
        
        if (result.sentiment.specific_emotion) {
          sentimentLabel.textContent += ` (${result.sentiment.specific_emotion})`;
        }
        
        sentimentDiv.appendChild(emojiSpan);
        sentimentDiv.appendChild(sentimentLabel);
        
        textDiv.appendChild(sentimentDiv);
      }
      
      // Processing time
      const timeDiv = document.createElement('div');
      timeDiv.className = "text-xs text-gray-500 dark:text-gray-400 mt-2";
      timeDiv.textContent = `Processed in ${result.processing_time}ms`;
      
      // Assemble components
      entryDiv.appendChild(headerDiv);
      entryDiv.appendChild(textDiv);
      entryDiv.appendChild(timeDiv);
      
      // Add to container at the beginning
      transcriptionContainer.insertBefore(entryDiv, transcriptionContainer.firstChild);
    } catch (e) {
      console.error("Error inserting demo transcription:", e);
    }
  }
  
  // Function to update metrics display with demo data
  updateMetricsDisplay = (result) => {
    try {
      // Find the metrics container
      const metricsContainer = document.querySelector('#metrics-container');
      if (!metricsContainer) return;
      
      // Update metrics based on model
      const model = result.model;
      const confidence = result.confidence;
      const processingTime = result.processing_time;
      
      // Find or create model row
      let modelRow = metricsContainer.querySelector(`[data-model="${model}"]`);
      
      if (!modelRow) {
        modelRow = document.createElement('tr');
        modelRow.setAttribute('data-model', model);
        
        // Create cells
        const cells = [
          document.createElement('td'), // Model name
          document.createElement('td'), // Accuracy
          document.createElement('td'), // Speed
          document.createElement('td'), // Count
        ];
        
        cells[0].className = "px-4 py-2 font-medium";
        cells[0].textContent = model.toUpperCase();
        
        cells[1].className = "px-4 py-2 text-center";
        cells[2].className = "px-4 py-2 text-center";
        cells[3].className = "px-4 py-2 text-center";
        
        cells.forEach(cell => modelRow.appendChild(cell));
        
        // Add model row to table
        const tbody = metricsContainer.querySelector('tbody');
        if (tbody) {
          tbody.appendChild(modelRow);
        }
      }
      
      // Get current values
      let count = parseInt(modelRow.querySelector('td:nth-child(4)').textContent || '0');
      let avgConfidence = parseFloat(modelRow.querySelector('td:nth-child(2)').textContent || '0');
      let avgSpeed = parseFloat(modelRow.querySelector('td:nth-child(3)').textContent || '0');
      
      // Calculate new running averages
      count += 1;
      avgConfidence = ((avgConfidence * (count - 1)) + (confidence * 100)) / count;
      avgSpeed = ((avgSpeed * (count - 1)) + processingTime) / count;
      
      // Update the display
      modelRow.querySelector('td:nth-child(2)').textContent = avgConfidence.toFixed(1) + '%';
      modelRow.querySelector('td:nth-child(3)').textContent = avgSpeed.toFixed(0) + 'ms';
      modelRow.querySelector('td:nth-child(4)').textContent = count;
    } catch (e) {
      console.error("Error updating metrics display:", e);
    }
  }
  
  render() {
    return (
      <div className={`fixed top-0 right-0 p-2 ${this.state.isDemoModeActive ? 'block' : 'hidden'}`}>
        <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded p-1">
          Demo Mode Active
        </div>
      </div>
    );
  }
}
