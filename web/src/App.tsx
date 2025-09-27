import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Maps } from './pages/Maps';
import { Profile } from './pages/Profile';
import { Blockchain } from './pages/Blockchain';
import { ScanHistory } from './pages/ScanHistory';
import { UsersPage } from './pages/UsersPage';
import { DebugProductPage } from './pages/DebugProductPage';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';


function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Main Content Area */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[250px_1fr]">
          <aside className="hidden md:block bg-slate-800 text-white shadow-lg">
            <Sidebar />
          </aside>
          
          <main className="flex flex-col min-h-screen md:min-h-0 h-[100vh]">
            <div className="flex-1 bg-white m-2 md:m-4 rounded-lg shadow-sm overflow-y-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/products" element={<Products />} />
                <Route path="/maps" element={<Maps />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/settings" element={
                  <div className="min-h-[calc(100vh-12rem)] flex flex-col justify-center">
                    <div className="p-6">
                      <h1 className="text-2xl font-bold">Settings</h1>
                      <p className="text-gray-600">Settings page coming soon...</p>
                    </div>
                  </div>
                } />
                <Route path="/notifications" element={
                  <div className="min-h-[calc(100vh-12rem)] flex flex-col justify-center">
                    <div className="p-6">
                      <h1 className="text-2xl font-bold">Notifications</h1>
                      <p className="text-gray-600">Notifications page coming soon...</p>
                    </div>
                  </div>
                } />
                <Route path="/blockchain" element={<Blockchain />} />
                <Route path="/scan-history" element={<ScanHistory />} />
                <Route path="/debug" element={<DebugProductPage />} />
              </Routes>
            </div>
          </main>
        </div>
        
        {/* Footer */}
        <Footer />
      </div>
    </Router>
  );
}

export default App;