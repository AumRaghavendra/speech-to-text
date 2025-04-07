// A simplified version of the main app to diagnose loading issues

// Simple App component
const SimpleApp = () => {
  return (
    <div className="app-container gradient-dark min-h-screen flex flex-col items-center justify-center">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Speech-to-Text Comparison</h1>
        <p className="text-xl text-gray-300">Testing Application Loading</p>
      </header>
      
      <main className="container mx-auto px-4">
        <div className="bg-blue-900 bg-opacity-30 rounded-lg p-6 shadow-lg border border-blue-700">
          <p className="text-white text-center text-xl mb-4">
            If you can see this message, the React application is working!
          </p>
          
          <div className="flex justify-center mt-4">
            <button 
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => alert('Button clicked!')}
            >
              Test Button
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

// Render the app
ReactDOM.render(<SimpleApp />, document.getElementById('root'));
