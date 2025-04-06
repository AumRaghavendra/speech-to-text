// Demo Mode Activator
// This script ensures that even if socket.io connection fails,
// the demo mode will still work by directly inserting transcription results

(() => {
  // Wait for the page to load
  window.addEventListener('DOMContentLoaded', () => {
    console.log('Demo Mode Activator loaded');
    
    // Try to start the activator after App component is mounted
    setTimeout(() => {
      activateBackupDemoMode();
    }, 2000);
  });
  
  function activateBackupDemoMode() {
    try {
      console.log('Setting up backup demo mode');
      
      // Add a global flag to track if we need backup demo mode
      window.needsBackupDemoMode = true;
      
      // Set up an interval to check if we have recent transcriptions
      let lastTranscriptionCount = 0;
      let currentTranscriptionCount = 0;
      let noProgressCounter = 0;
      
      // Store interval reference for cleanup
      window.backupDemoInterval = setInterval(() => {
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
              console.log('Backup demo mode activated - generating transcription');
              generateBackupTranscription();
              noProgressCounter = 0; // Reset counter after generating
            }
          } else {
            // Reset counter if we got new transcriptions
            noProgressCounter = 0;
            lastTranscriptionCount = currentTranscriptionCount;
          }
        } else {
          // Not recording, reset counters
          noProgressCounter = 0;
        }
      }, 1000);
    } catch (err) {
      console.error('Error setting up backup demo mode:', err);
    }
  }
  
  function generateBackupTranscription() {
    try {
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
      const result = ClientSideDemo.generateTranscription(currentModel, sentimentEnabled);
      
      // Create and insert a new transcription item into the DOM
      insertTranscriptionIntoDOM(result);
      
      // Also update metrics display
      updateMetricsDisplay(result);
    } catch (err) {
      console.error('Error generating backup transcription:', err);
    }
  }
  
  function insertTranscriptionIntoDOM(result) {
    try {
      // Find the transcription container
      const container = document.querySelector('.transcription-items-container');
      if (!container) return;
      
      // Create a new transcription item
      const item = document.createElement('div');
      item.className = 'transcription-item bg-white dark:bg-gray-700 p-4 rounded-lg shadow mb-3 fade-in transition-all';
      
      // Format the confidence percentage
      const confidencePercent = Math.round(result.confidence * 100);
      
      // Create the HTML content
      let content = `
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <p class="text-gray-800 dark:text-gray-200">${result.text}</p>
            <div class="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
              <span class="mr-3">Model: <span class="font-medium">${result.model}</span></span>
              <span class="mr-3">Confidence: <span class="font-medium">${confidencePercent}%</span></span>
              <span>Time: <span class="font-medium">${result.processing_time}ms</span></span>
              <span class="ml-3 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">Demo</span>
            </div>
          </div>
      `;
      
      // Add sentiment if available
      if (result.sentiment) {
        content += `
          <div class="ml-4 flex-shrink-0 text-center">
            <div class="text-4xl mb-1">${result.sentiment.emoji}</div>
            <div class="text-xs font-medium text-gray-600 dark:text-gray-300">${result.sentiment.label}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">${result.sentiment.specific_emotion}</div>
          </div>
        `;
      }
      
      // Close the container
      content += `</div>`;
      
      // Set the HTML
      item.innerHTML = content;
      
      // Insert at the beginning of the container
      container.insertBefore(item, container.firstChild);
      
      // Limit to 20 items to prevent performance issues
      const items = container.querySelectorAll('.transcription-item');
      if (items.length > 20) {
        for (let i = 20; i < items.length; i++) {
          items[i].remove();
        }
      }
    } catch (err) {
      console.error('Error inserting transcription into DOM:', err);
    }
  }
  
  function updateMetricsDisplay(result) {
    try {
      // Find the metrics container
      const metricsContainer = document.querySelector('.performance-metrics-container');
      if (!metricsContainer) return;
      
      // Get the model-specific metrics section
      const modelSection = metricsContainer.querySelector(`[data-model="${result.model}"]`);
      if (!modelSection) return;
      
      // Update the values - we'll make simple incremental changes
      
      // Get the count element and increment
      const countElement = modelSection.querySelector('.count-value');
      if (countElement) {
        let count = parseInt(countElement.textContent) || 0;
        count++;
        countElement.textContent = count;
      }
      
      // Update average time
      const timeElement = modelSection.querySelector('.time-value');
      if (timeElement) {
        let time = parseInt(timeElement.textContent) || 0;
        timeElement.textContent = Math.round((time + result.processing_time) / 2);
      }
      
      // Update confidence
      const confidenceElement = modelSection.querySelector('.confidence-value');
      if (confidenceElement) {
        let confidence = parseFloat(confidenceElement.textContent) || 0;
        confidenceElement.textContent = ((confidence + (result.confidence * 100)) / 2).toFixed(1);
      }
    } catch (err) {
      console.error('Error updating metrics display:', err);
    }
  }
})();
