// Backup of App.tsx with working simple version
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

function TestApp() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-8">
          <div className="text-6xl text-blue-500 mb-4">📅</div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">BookingPro</h1>
          <p className="text-slate-600">Professional appointment scheduling platform</p>
        </div>
        
        <div className="space-y-4">
          <p className="text-slate-700">React 18.3.1 with modern tech stack</p>
          
          <a 
            href="/api/login" 
            className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium inline-block"
          >
            Sign In to Get Started
          </a>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-50">
        <TestApp />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;