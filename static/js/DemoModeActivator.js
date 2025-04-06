// Demo Mode Activator
// This component is only used for demonstration purposes

const DemoModeActivator = () => {
  const [demoActive, setDemoActive] = React.useState(false);
  
  const toggleDemoMode = () => {
    setDemoActive(!demoActive);
    
    // This would typically send an event to the server
    // to activate demo mode, but we'll just simulate it in the UI
    
    if (!demoActive) {
      alert('Demo mode is for UI testing only. No actual recording will happen.');
    }
  };
  
  return (
    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
      <button
        onClick={toggleDemoMode}
        className={`text-xs px-2 py-1 ${
          demoActive
            ? 'bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
            : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        } rounded`}
      >
        {demoActive ? 'Disable Demo Mode' : 'Enable Demo Mode'}
      </button>
      
      {demoActive && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Demo mode is active. Data is simulated for UI testing.
        </p>
      )}
    </div>
  );
};
