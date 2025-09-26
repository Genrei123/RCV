import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Blockchain } from './pages/Blockchain';
import { ScanHistory } from './pages/ScanHistory';
import { UsersPage } from './pages/UsersPage';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';


function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 grid grid-cols-1 md:grid-cols-[250px_1fr] grid-rows-[1fr_auto]">
        <aside className="hidden md:block bg-slate-800 text-white shadow-lg overflow-y-auto">
          <Sidebar />
        </aside>
        
        <main className="p-4 md:p-8 overflow-y-auto bg-white m-2 md:m-4 rounded-lg shadow-sm">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<Products />} />
            <Route path="/location" element={<Blockchain />} />
            <Route path="/profile" element={<ScanHistory />} />
            <Route path="/logout" element={<UsersPage />} />
          </Routes>
        </main>
        
        
          <Footer />
        
      </div>
    </Router>
  );
}

export default App;