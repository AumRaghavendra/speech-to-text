// Demo Mode Activator
// This script ensures that even if socket.io connection fails,
// the demo mode will still work by directly inserting transcription results

(() => {
  // Initialize when document is loaded
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Demo Mode Activator loaded');
    
    // Add a global flag to track if we need backup demo mode
    window.needsBackupDemoMode = true;
    
    // Check initial state of demo mode
    const demoModeCheckbox = document.querySelector("#demoMode");
    window.needsBackupDemoMode = demoModeCheckbox && demoModeCheckbox.checked;
    
    // Set up event listener for demo mode changes
    document.addEventListener("demoModeChanged", (event) => {
      console.log("Demo mode change detected:", event.detail.enabled);
      window.needsBackupDemoMode = event.detail.enabled;
      
      if (event.detail.enabled) {
        activateBackupDemoMode();
      } else {
        if (window.backupDemoInterval) {
          clearInterval(window.backupDemoInterval);
          window.backupDemoInterval = null;
        }
      }
    });
    
    // Set initial backup demo mode after a short delay
    setTimeout(() => {
      activateBackupDemoMode();
    }, 3000);
  });
  
  function activateBackupDemoMode() {
    try {
      // If the DemoModeManager is available and already running,
      // don't create another instance
      if (typeof DemoModeManager !== 'undefined' && 
          DemoModeManager.isDemoMode && 
          DemoModeManager.isDemoMode()) {
        console.log('DemoModeManager is already active, skipping backup setup');
        return;
      }
      
      // If we already have an interval running, don't create another one
      if (window.backupDemoInterval) {
        return;
      }
      
      console.log('Setting up backup demo mode');
      
      // Set up an interval to check if we have recent transcriptions
      let lastTranscriptionCount = 0;
      let currentTranscriptionCount = 0;
      let noProgressCounter = 0;
      
      window.backupDemoInterval = setInterval(() => {
        // First, check if the main DemoModeManager is available and active
        if (typeof DemoModeManager !== 'undefined' && 
            DemoModeManager.isDemoMode && 
            DemoModeManager.isDemoMode()) {
          console.log('DemoModeManager is now active, clearing backup');
          clearInterval(window.backupDemoInterval);
          window.backupDemoInterval = null;
          return;
        }
        
        // Check if demo mode is enabled by looking for the checkbox
        const demoModeCheckbox = document.querySelector('#demoMode');
        const isDemoModeEnabled = demoModeCheckbox && demoModeCheckbox.checked;
        
        // If demo mode is disabled, don't generate backup transcriptions
        if (!isDemoModeEnabled && !window.needsBackupDemoMode) {
          return;
        }
        
        // Check if recording is active by looking for active visualizer
        const visualizer = document.querySelector('.audio-visualizer');
        const isVisualizerActive = visualizer && visualizer.classList.contains('active');
        
        // Count transcription results
        const transcriptionItems = document.querySelectorAll('.transcription-item');
        currentTranscriptionCount = transcriptionItems.length;
        
        // Check if we need to generate a backup transcription
        if (isVisualizerActive) {
          // If recording but no new transcriptions, increment counter
          if (currentTranscriptionCount === lastTranscriptionCount) {
            noProgressCounter++;
            
            // After 3 seconds without new transcriptions, start generating them
            if (noProgressCounter >= 3) {
  function generateBackupTranscription() {
    try {
      // First, try to use the DemoModeManager if available
      if (typeof DemoModeManager !== 'undefined' && DemoModeManager.generateDemoTranscription) {
        DemoModeManager.generateDemoTranscription();
        return;
      }
      
      // Find the current model
      let currentModel = 'google'; // Default
      const modelButtons = document.querySelectorAll('.model-button');
      modelButtons.forEach(button => {
        if (button.classList.contains('active')) {
          currentModel = button.getAttribute('data-model') || currentModel;
        }
      });
      
      // Check if sentiment analysis is enabled
      const sentimentToggle = document.querySelector('#sentiment-toggle');
      const sentimentEnabled = sentimentToggle ? sentimentToggle.checked : true;
      
      // Generate client-side demo transcription
      if (typeof ClientSideDemo !== 'undefined' && ClientSideDemo.generateTranscription) {
        const result = ClientSideDemo.generateTranscription(currentModel, sentimentEnabled);
        
        // Create and dispatch custom event
        const event = new CustomEvent("demoTranscription", { 
          detail: result 
        });
        document.dispatchEvent(event);
        console.log("Demo transcription generated by backup system");
      } else {
        // Last resort - hardcoded demo transcription
        const demoTexts = [
          "This is a demonstration of the speech recognition system.",
          "I'm really excited about using this application for my project.",
          "The weather today is absolutely beautiful outside.",
          "Can you tell me how well the different speech recognition models compare?",
          "I'm not sure if my microphone is working correctly but this is a test.",
          "Speech recognition technology has improved tremendously in recent years.",
          "I'm feeling happy today and looking forward to learning more about this system.",
          "This dark mode interface looks amazing with the audio visualizer.",
          "Could you analyze the sentiment of this message please?",
          "Using artificial intelligence for speech recognition is fascinating."
        ];
        
        const randomText = demoTexts[Math.floor(Math.random() * demoTexts.length)];
        
        // Create a basic transcription result
        const result = {
          text: randomText,
          confidence: 0.85,
          model: currentModel,
          processing_time: 200,
          timestamp: Date.now(),
          demo_mode: true,
          sentiment: {
            polarity: Math.random() * 2 - 1,
            label: "Neutral",
            emoji: "😐",
            confidence: 0.8,
            specific_emotion: "interest"
          }
        };
        
        // Dispatch event
        const event = new CustomEvent("demoTranscription", { 
          detail: result 
        });
        document.dispatchEvent(event);
        console.log("Demo transcription generated (emergency fallback)");
      }
    } catch (err) {
      console.error('Error generating backup transcription:', err);
    }
  }
    try {
      // First, try to use the DemoModeManager if available
      if (typeof DemoModeManager !== 'undefined' && DemoModeManager.generateDemoTranscription) {
        DemoModeManager.generateDemoTranscription();
        return;
      }
      
      // Find the current model
      let currentModel = 'google'; // Default
      const modelButtons = document.querySelectorAll('.model-button');
      modelButtons.forEach(button => {
        if (button.classList.contains('active')) {
          currentModel = button.getAttribute('data-model') || currentModel;
        }
      });
      
      // Check if sentiment analysis is enabled
      const sentimentToggle = document.querySelector('input[type="checkbox"][checked]');
      const sentimentEnabled = sentimentToggle !== null;
      
      // Generate client-side demo transcription
      if (typeof ClientSideDemo !== 'undefined' && ClientSideDemo.generateTranscription) {
        const result = ClientSideDemo.generateTranscription(currentModel, sentimentEnabled);
        
        // Create and dispatch custom event
        const event = new CustomEvent("demoTranscription", { 
          detail: result 
        });
        document.dispatchEvent(event);
        console.log("Demo transcription generated");
      } else {
        console.warn("ClientSideDemo module not available");
      }
    } catch (err) {
      console.error('Error generating backup transcription:', err);
    }
  }
})();
