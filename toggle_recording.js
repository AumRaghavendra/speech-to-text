  // Handle recording toggle
  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stopRecording();
      }
      
      // Clear any demo intervals
      if (demoModeInterval) {
        clearInterval(demoModeInterval);
        setDemoModeInterval(null);
      }
      
      // Clear backup demo mode interval if it exists
      if (window.backupDemoInterval) {
        clearInterval(window.backupDemoInterval);
        window.backupDemoInterval = null;
      }
      
      setIsRecording(false);
    } else {
      // Start recording
      if (audioRecorderRef.current) {
        audioRecorderRef.current.startRecording();
      }
      
      // Start demo mode interval only if demo mode is enabled
      if (demoMode) {
        const interval = setInterval(generateDemoTranscription, 4000);
        setDemoModeInterval(interval);
        
        // Generate first transcription immediately
        setTimeout(generateDemoTranscription, 500);
      }
      
      setIsRecording(true);
    }
  };
