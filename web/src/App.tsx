import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Dashboard, type DashboardProps } from './pages/Dashboard';
import { Products, type ProductsProps } from './pages/Products';
import { Companies, type CompaniesProps } from './pages/Companies';
import { Maps } from './pages/Maps';
import { Profile } from './pages/Profile';
import { Blockchain } from './pages/Blockchain';
import { ScanHistory } from './pages/ScanHistory';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { AuthService } from './services/authService';
import { useEffect, useState, type ReactNode } from 'react';
import { DashboardService } from './services/dashboardService';
import { ProductService } from './services/productService';
import { LogIn } from 'lucide-react';
import { AuthPage } from './pages/AuthPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { CompanyService } from './services/companyService';

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
        navigate('/login');
      }
      setIsLoggedIn(true);
    });
  }, []);
  if (isLoggedIn === null) {
    return <div>Loading...</div>; // or a spinner
  }
  if (!isLoggedIn) {
    return <div>Access Denied. Redirecting to Login...</div>;
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
      if (!loggedIn) {
        setIsLoggedIn(false);
      }
      setIsLoggedIn(true);
    });
  }, []);

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

    CompanyService.getAllCompanies().then((data) => {
      setCompanies(data);
    }).catch((error) => {
      console.error('Error fetching companies data:', error);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* This is for future reference once we have admin access */}
      {/* <div className={`flex-1 ${isLoggedIn ? "" : 'grid'} grid-cols-1 md:grid-cols-[250px_1fr]`}>
        {isLoggedIn ? "" :
          <div className="w-full">
            <aside className="hidden md:block bg-slate-800 text-white shadow-lg">
              <Sidebar />
            </aside>
          </div>
        } */}

      <div className={`flex-1 grid grid-cols-1 md:grid-cols-[250px_1fr]`}>
        <aside className="hidden md:block bg-slate-800 text-white shadow-lg">
          <Sidebar />
        </aside>
        <main className="flex flex-col min-h-screen md:min-h-0 h-[100vh]">
          <div className="flex-1 bg-white m-2 md:m-4 rounded-lg shadow-sm overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard {...dashboardData} />} />
              <Route path="/dashboard" element={<Dashboard {...dashboardData} />} />
              <Route path="/products" element={<Products {...productsData} />} />
              <Route path="/companies" element={<Companies {...companiesData} />} />
              <Route path="/maps" element={<Maps />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/blockchain" element={<Blockchain />} />
              <Route path="/scan-history" element={<ScanHistory />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
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