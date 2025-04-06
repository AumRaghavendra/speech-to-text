// Demo Mode Manager
// This module centralizes all demo mode functionality to ensure consistent behavior

const DemoModeManager = (() => {
  // Private variables
  let isDemoModeActive = false;
  let demoInterval = null;
  let currentModel = 'google';
  let sentimentEnabled = true;
  
  // Initialize with ClientSideDemo module
  const init = () => {
    // Set initial state if checkbox exists
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        const demoModeCheckbox = document.querySelector("#demoMode");
        if (demoModeCheckbox) {
          isDemoModeActive = demoModeCheckbox.checked;
          console.log("Initial demo mode state:", isDemoModeActive);
          
          // Listen for changes
          demoModeCheckbox.addEventListener('change', (e) => {
            setDemoMode(e.target.checked);
          });
        }
        
        // Listen for model changes
        document.addEventListener('modelChanged', (event) => {
          if (event.detail && event.detail.model) {
            currentModel = event.detail.model;
          }
        });
      }, 1000);
    });
  };
  
  // Function to check if demo mode is active
  const isDemoMode = () => {
    return isDemoModeActive;
  };
  
  // Function to set demo mode state
  const setDemoMode = (isActive) => {
    isDemoModeActive = isActive;
    console.log("Demo mode set to:", isActive);
    
    if (isActive) {
      startDemoInterval();
    } else {
      stopDemoInterval();
    }
    
    // Dispatch event for other components
    const event = new CustomEvent("demoModeChanged", {
      detail: { enabled: isActive }
    });
    document.dispatchEvent(event);
  };
  
  // Start generating demo transcriptions
  const startDemoInterval = () => {
    // Clear any existing interval
    stopDemoInterval();
    
    // Start new interval
    demoInterval = setInterval(() => {
      generateDemoTranscription();
    }, 4000);
    
    // Generate first transcription immediately
    setTimeout(generateDemoTranscription, 500);
  };
  
  // Stop demo interval
  const stopDemoInterval = () => {
    if (demoInterval) {
      clearInterval(demoInterval);
      demoInterval = null;
    }
    
    // Also clear any global intervals
    if (window.backupDemoInterval) {
      clearInterval(window.backupDemoInterval);
      window.backupDemoInterval = null;
    }
  };
  
  // Generate a demo transcription
  const generateDemoTranscription = () => {
    if (!isDemoModeActive) {
      return;
    }
    
    try {
      // Use ClientSideDemo if available
      if (typeof ClientSideDemo !== 'undefined') {
        const result = ClientSideDemo.generateTranscription(currentModel, sentimentEnabled);
        
        // Dispatch event with the result
        const event = new CustomEvent("demoTranscription", { 
          detail: result 
        });
        document.dispatchEvent(event);
        console.log("Demo transcription generated");
      } else {
        console.warn("ClientSideDemo module not available");
      }
    } catch (error) {
      console.error("Error generating demo transcription:", error);
    }
  };
  
  // Set sentiment analysis state
  const setSentimentEnabled = (enabled) => {
    sentimentEnabled = enabled;
  };
  
  // Return public API
  return {
    init,
    isDemoMode,
    setDemoMode,
    startDemoInterval,
    stopDemoInterval,
    generateDemoTranscription,
    setSentimentEnabled
  };
})();

// Auto-initialize
DemoModeManager.init();
