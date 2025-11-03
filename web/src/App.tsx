import { Routes, Route, useNavigate } from 'react-router-dom';
import { Dashboard, type DashboardProps } from './pages/Dashboard';
import { Products, type ProductsProps } from './pages/Products';
import { Companies, type CompaniesProps } from './pages/Companies';
import { Maps } from './pages/Maps';
import { Profile } from './pages/Profile';
import { Blockchain } from './pages/Blockchain';
import { ScanHistory } from './pages/ScanHistory';
import { RemoteConfig } from './pages/RemoteConfig';
import { KioskMonitor } from './pages/KioskMonitor';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { AuthService } from './services/authService';
import { useEffect, useState, type ReactNode } from 'react';
import { DashboardService } from './services/dashboardService';
import { ProductService } from './services/productService';
import { AuthPage } from './pages/AuthPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { PendingApprovalPage } from './pages/PendingApprovalPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { CompanyService } from './services/companyService';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ProtectedRoutesProps {
  children: ReactNode;
}

const PublicRoute = ({ children }: ProtectedRoutesProps) => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    AuthService.initializeAuthenticaiton().then((loggedIn) => {
      setIsLoggedIn(loggedIn);
      if (loggedIn) {
        // If already logged in, redirect to dashboard
        navigate('/dashboard', { replace: true });
      }
    });
  }, [navigate]);

  if (isLoggedIn === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

const ProtectedRoutes = ({ children }: ProtectedRoutesProps) => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    AuthService.initializeAuthenticaiton().then((loggedIn) => {
      if (!loggedIn) {
        setIsLoggedIn(false);
        navigate('/login', { replace: true });
      } else {
        setIsLoggedIn(true);
      }
    });
  }, [navigate]);
  
  if (isLoggedIn === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Access Denied. Redirecting to Login...</p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

function App() {
  const [dashboardData, setDashboardData] = useState<DashboardProps>();
  const [productsData, setProductsData] = useState<ProductsProps>();
  const [companiesData, setCompanies] = useState<CompaniesProps>();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    AuthService.initializeAuthenticaiton().then((loggedIn) => {
      setIsLoggedIn(loggedIn);
    });
  }, []);

  const fetchProductsData = () => {
    ProductService.getAllProducts().then((data) => {
      setProductsData(data);
    }).catch((error) => {
      console.error('Error fetching products data:', error);
    });
  };

  const fetchCompaniesData = () => {
    CompanyService.getAllCompanies().then((data) => {
      setCompanies(data);
    }).catch((error) => {
      console.error('Error fetching companies data:', error);
    });
  };

  useEffect(() => {
    // Only fetch data if user is logged in
    if (isLoggedIn) {
      DashboardService.getAllUsers().then((data) => {
        setDashboardData(data);
      }).catch((error) => {
        console.error('Error fetching dashboard data:', error);
      });

      fetchProductsData();
      fetchCompaniesData();
    }
  }, [isLoggedIn]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <div className={`flex-1 ${isLoggedIn ? 'grid grid-cols-1 md:grid-cols-[250px_1fr]' : ''}`}>
        {/* Sidebar - Only show when logged in */}
        {isLoggedIn && (
          <aside className="hidden md:block bg-slate-800 text-white shadow-lg">
            <Sidebar />
          </aside>
        )}

        <main className="flex flex-col min-h-screen md:min-h-0 h-[100vh]">
          <div className="flex-1 bg-white rounded-lg shadow-sm overflow-y-auto m-0">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={
                <PublicRoute>
                  <AuthPage />
                </PublicRoute>
              } />
              <Route path="/forgot-password" element={
                <PublicRoute>
                  <ForgotPasswordPage />
                </PublicRoute>
              } />
              <Route path="/pending-approval" element={
                <PendingApprovalPage />
              } />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoutes>
                  <Dashboard {...dashboardData} />
                </ProtectedRoutes>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoutes>
                  <Dashboard {...dashboardData} />
                </ProtectedRoutes>
              } />
              <Route path="/products" element={
                <ProtectedRoutes>
                  <Products 
                    {...productsData} 
                    companies={companiesData?.companies}
                    onRefresh={fetchProductsData}
                  />
                </ProtectedRoutes>
              } />
              <Route path="/companies" element={
                <ProtectedRoutes>
                  <Companies 
                    {...companiesData}
                    onRefresh={fetchCompaniesData}
                  />
                </ProtectedRoutes>
              } />
              <Route path="/maps" element={
                <ProtectedRoutes>
                  <Maps />
                </ProtectedRoutes>
              } />
              <Route path="/profile" element={
                <ProtectedRoutes>
                  <Profile />
                </ProtectedRoutes>
              } />
              <Route path="/blockchain" element={
                <ProtectedRoutes>
                  <Blockchain />
                </ProtectedRoutes>
              } />
              <Route path="/scan-history" element={
                <ProtectedRoutes>
                  <ScanHistory />
                </ProtectedRoutes>
              } />
              <Route path="/remote-config" element={
                <ProtectedRoutes>
                  <RemoteConfig />
                </ProtectedRoutes>
              } />
              <Route path="/kiosk-monitor" element={
                <ProtectedRoutes>
                  <KioskMonitor />
                </ProtectedRoutes>
              } />
              
              {/* 404 Catch-all Route - Must be last */}
              <Route path="*" element={<NotFoundPage />} />
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