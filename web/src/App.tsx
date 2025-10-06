import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Dashboard, type DashboardProps } from './pages/Dashboard';
import { Products, type ProductsProps } from './pages/Products';
import { Maps } from './pages/Maps';
import { Profile } from './pages/Profile';
import { Blockchain } from './pages/Blockchain';
import { ScanHistory } from './pages/ScanHistory';
import { UsersPage } from './pages/UsersPage';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { AuthService } from './services/authService';
import { useEffect, useState, type ReactNode } from 'react';
import { DashboardService } from './services/dashboardService';
import { ProductService } from './services/productService';

interface ProtectedRoutesProps {
  children: ReactNode;
}

const ProtectedRoutes = ({ children }: ProtectedRoutesProps) => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    AuthService.initializeAuthenticaiton().then((loggedIn) => {
      if (!loggedIn) {
        setIsLoggedIn(false);
        navigate('/products');
      }
      setIsLoggedIn(true);
    });
  }, []);
  if (isLoggedIn === null) {
    return <div>Loading...</div>; // or a spinner
  }
  if (!isLoggedIn) {
    return <div>Access Denied. Redirecting to Products...</div>;
  }
  return <>{children}</>;
}

function App() {
  const [dashboardData, setDashboardData] = useState<DashboardProps>();
  const [productsData, setProductsData] = useState<ProductsProps>();

  useEffect(() => {
    DashboardService.getAllUsers().then((data) => {
      setDashboardData(data);
    }).catch((error) => {
      console.error('Error fetching dashboard data:', error);
    });

    ProductService.getAllProducts().then((data) => {
      setProductsData(data);
    }).catch((error) => {
      console.error('Error fetching products data:', error);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[250px_1fr]">
        <aside className="hidden md:block bg-slate-800 text-white shadow-lg">
          <Sidebar />
        </aside>

        <main className="flex flex-col min-h-screen md:min-h-0 h-[100vh]">
          <div className="flex-1 bg-white m-2 md:m-4 rounded-lg shadow-sm overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard {...dashboardData} />} />
              <Route path="/products" element={<Products {...productsData}/>} />
              <Route path="/maps" element={<Maps />} />
              <Route path="/profile" element={<Profile />} />
              {/* <Route path="/users" element={<UsersPage />} /> */}
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
            </Routes>
          </div>
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;