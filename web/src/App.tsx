import { Routes, Route, useNavigate } from "react-router-dom";
import { Dashboard, type DashboardProps } from "./pages/Dashboard";
import { Products, type ProductsProps } from "./pages/Products";
import { Companies, type CompaniesProps } from "./pages/Companies";
import { Maps } from "./pages/Maps";
import { Analytics } from "./pages/Analytics";
import { Profile } from "./pages/Profile";
import { UserProfileView } from "./pages/UserProfileView";
import { Blockchain } from "./pages/Blockchain";
import { CertificateVerifier } from "./pages/CertificateVerifier";
import { ScanHistory } from "./pages/ScanHistory";
import { RemoteConfig } from "./pages/RemoteConfig";
import { KioskMonitor } from "./pages/KioskMonitor";
import { AppLayout } from "./components/AppLayout";
import { GlobalLoadingIndicator } from "./components/GlobalLoadingIndicator";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { AuthService } from "./services/authService";
import { useEffect, useState, type ReactNode } from "react";
import { DashboardService } from "./services/dashboardService";
import { ProductService } from "./services/productService";
import { AuthPage } from "./pages/AuthPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { PendingApprovalPage } from "./pages/PendingApprovalPage";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { TermsOfService } from "./pages/TermsOfService";
import { NotFoundPage } from "./pages/NotFoundPage";
import { CompanyService } from "./services/companyService";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import About from "./pages/AboutUs";
import Contact from "./pages/ContactUs";
import { LandingPage } from "./pages/LandingPage";
import { GetStartedPage } from "./pages/GetStartedPage";
import { KioskLandingPage } from "./pages/KioskLandingPage";
import { CompanyRegistrationPage } from "./pages/CompanyRegistrationPage";
import { CompanyLoginPage } from "./pages/CompanyLoginPage";
import { CompanyPendingApprovalPage } from "./pages/CompanyPendingApprovalPage";
import { CompanyDashboard } from "./pages/CompanyDashboard";
import { CompanyEmailVerificationPage } from "./pages/CompanyEmailVerificationPage";
import { CompanyOwnerService } from "./services/companyOwnerService";
import { CompanyProducts } from "./pages/CompanyOwner/CompanyProducts";
import { CompanyMaps } from "./pages/CompanyOwner/CompanyMaps";
import { CompanyEmployees } from "./pages/CompanyOwner/CompanyEmployees";

interface ProtectedRoutesProps {
  children: ReactNode;
}

const CompanyProtectedRoute = ({ children }: ProtectedRoutesProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Check if user is a company owner (wallet-based auth)
      const isCompanyOwner = CompanyOwnerService.isCompanyOwnerLoggedIn();
      
      // Check if user is an employee with JWT auth
      const isEmployee = await AuthService.initializeAuthenticaiton();
      
      // Check if employee has web access (from localStorage set during login)
      const hasWebAccess = localStorage.getItem('hasWebAccess') === 'true';
      const companyOwnerId = localStorage.getItem('companyOwnerId');

      // Allow access if:
      // 1. User is a company owner (wallet auth), OR
      // 2. User is an employee with JWT AND has web access AND belongs to a company
      if (!isCompanyOwner && !(isEmployee && hasWebAccess && companyOwnerId)) {
        navigate("/login", { replace: true });
        return;
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: ProtectedRoutesProps) => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    AuthService.initializeAuthenticaiton().then((loggedIn) => {
      setIsLoggedIn(loggedIn);
      if (loggedIn) {
        // If already logged in, redirect to dashboard
        navigate("/dashboard", { replace: true });
      }
    });
  }, [navigate]);

  if (isLoggedIn === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
};

const AccessibleRoute = ({ children }: ProtectedRoutesProps) => {
  // Routes that are accessible to both logged-in and non-logged-in users
  return <>{children}</>;
};

const ProtectedRoutes = ({ children }: ProtectedRoutesProps) => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    AuthService.initializeAuthenticaiton().then((loggedIn) => {
      if (!loggedIn) {
        setIsLoggedIn(false);
        navigate("/login", { replace: true });
      } else {
        setIsLoggedIn(true);
      }
    });
  }, [navigate]);

  if (isLoggedIn === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">
            Access Denied. Redirecting to Login...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const SuperAdminProtectedRoute = ({ children }: ProtectedRoutesProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkSuperAdminAccess = async () => {
      try {
        // First check if user is logged in
        const isLoggedIn = await AuthService.initializeAuthenticaiton();
        
        if (!isLoggedIn) {
          navigate("/login", { replace: true });
          return;
        }

        // Check if user is super admin or admin
        const isSuperAdmin = AuthService.isSuperAdmin();
        const userRole = localStorage.getItem('userRole');
        
        if (isSuperAdmin || userRole === 'ADMIN') {
          setHasAccess(true);
        } else {
          // Not a super admin/admin, redirect to appropriate dashboard
          const hasWebAccess = localStorage.getItem('hasWebAccess') === 'true';
          const companyOwnerId = localStorage.getItem('companyOwnerId');
          
          if (hasWebAccess && companyOwnerId) {
            navigate("/company/dashboard", { replace: true });
          } else {
            navigate("/login", { replace: true });
          }
        }
      } catch (error) {
        console.error("Error checking super admin access:", error);
        navigate("/login", { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    checkSuperAdminAccess();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">
            Access Denied. You need super admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

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
    ProductService.getAllProducts()
      .then((data) => {
        setProductsData(data);
      })
      .catch((error) => {
        console.error("Error fetching products data:", error);
      });
  };

  const fetchCompaniesData = () => {
    CompanyService.getAllCompanies()
      .then((data) => {
        setCompanies(data);
      })
      .catch((error) => {
        console.error("Error fetching companies data:", error);
      });
  };

  useEffect(() => {
    // Only fetch data if user is logged in
    if (isLoggedIn) {
      DashboardService.getAllUsers()
        .then((data) => {
          setDashboardData(data);
        })
        .catch((error) => {
          console.error("Error fetching dashboard data:", error);
        });

      fetchProductsData();
      fetchCompaniesData();
    }
  }, [isLoggedIn]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalLoadingIndicator />
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
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Get Started Page */}
        <Route path="/get-started" element={<GetStartedPage />} />

        {/* Kiosk Landing Page */}
        <Route path="/kiosk" element={<KioskLandingPage />} />

        {/* Company Owner Routes */}
        <Route path="/company/register" element={<CompanyRegistrationPage />} />
        <Route path="/company/login" element={<CompanyLoginPage />} />
        <Route path="/company/pending-approval" element={<CompanyPendingApprovalPage />} />
        <Route path="/company/verify-email" element={<CompanyEmailVerificationPage />} />
        <Route
          path="/company/dashboard"
          element={
            <CompanyProtectedRoute>
              <CompanyDashboard />
            </CompanyProtectedRoute>
          }
        />
        <Route
          path="/company/products"
          element={
            <CompanyProtectedRoute>
              <CompanyProducts />
            </CompanyProtectedRoute>
          }
        />
        <Route
          path="/company/maps"
          element={
            <CompanyProtectedRoute>
              <CompanyMaps />
            </CompanyProtectedRoute>
          }
        />
        <Route
          path="/company/employees"
          element={
            <CompanyProtectedRoute>
              <CompanyEmployees />
            </CompanyProtectedRoute>
          }
        />

        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/privacy"
          element={
            <AccessibleRoute>
              <PrivacyPolicy />
            </AccessibleRoute>
          }
        />
        <Route
          path="/terms"
          element={
            <AccessibleRoute>
              <TermsOfService />
            </AccessibleRoute>
          }
        />
        <Route path="/pending-approval" element={<PendingApprovalPage />} />

        {/* Dashboard redirect - now goes to landing if not logged in */}
        <Route
          path="/dashboard"
          element={
            <SuperAdminProtectedRoute>
              <AppLayout>
                <Dashboard {...dashboardData} />
              </AppLayout>
            </SuperAdminProtectedRoute>
          }
        />

        {/* Protected Routes wrapped with AppLayout */}
        <Route
          path="/products"
          element={
            <SuperAdminProtectedRoute>
              <AppLayout>
                <Products
                  {...productsData}
                  companies={companiesData?.companies}
                  onRefresh={fetchProductsData}
                />
              </AppLayout>
            </SuperAdminProtectedRoute>
          }
        />
        <Route
          path="/companies"
          element={
            <SuperAdminProtectedRoute>
              <AppLayout>
                <Companies {...companiesData} onRefresh={fetchCompaniesData} />
              </AppLayout>
            </SuperAdminProtectedRoute>
          }
        />
        <Route
          path="/maps"
          element={
            <SuperAdminProtectedRoute>
              <AppLayout fullBleed hideFooter>
                <Maps />
              </AppLayout>
            </SuperAdminProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <SuperAdminProtectedRoute>
              <AppLayout hideFooter fullBleed>
                <Analytics />
              </AppLayout>
            </SuperAdminProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <CompanyProtectedRoute>
              <AppLayout>
                <Profile />
              </AppLayout>
            </CompanyProtectedRoute>
          }
        />
        <Route
          path="/users/:id"
          element={
            <SuperAdminProtectedRoute>
              <AppLayout>
                <UserProfileView />
              </AppLayout>
            </SuperAdminProtectedRoute>
          }
        />
        <Route
          path="/blockchain"
          element={
            <SuperAdminProtectedRoute>
              <AppLayout>
                <Blockchain />
              </AppLayout>
            </SuperAdminProtectedRoute>
          }
        />
        <Route
          path="/verify-certificate"
          element={<CertificateVerifier />}
        />
        <Route
          path="/scan-history"
          element={
            <SuperAdminProtectedRoute>
              <AppLayout>
                <ScanHistory />
              </AppLayout>
            </SuperAdminProtectedRoute>
          }
        />
        <Route
          path="/remote-config"
          element={
            <SuperAdminProtectedRoute>
              <AppLayout>
                <RemoteConfig />
              </AppLayout>
            </SuperAdminProtectedRoute>
          }
        />
        <Route
          path="/kiosk-monitor"
          element={
            <SuperAdminProtectedRoute>
              <AppLayout>
                <KioskMonitor />
              </AppLayout>
            </SuperAdminProtectedRoute>
          }
        />
        <Route
          path="/about"
          element={
            <ProtectedRoutes>
              <AppLayout>
                <About/>
              </AppLayout>
            </ProtectedRoutes>
          }
        />
        <Route
          path="/contact"
          element={
            <ProtectedRoutes>
              <AppLayout>
                <Contact/>
              </AppLayout>
            </ProtectedRoutes>
          }
        />

        {/* 404 Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default App;
