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

        {/* Protected Routes wrapped with AppLayout */}
        <Route
          path="/"
          element={
            <ProtectedRoutes>
              <AppLayout>
                <Dashboard {...dashboardData} />
              </AppLayout>
            </ProtectedRoutes>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoutes>
              <AppLayout>
                <Dashboard {...dashboardData} />
              </AppLayout>
            </ProtectedRoutes>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoutes>
              <AppLayout>
                <Products
                  {...productsData}
                  companies={companiesData?.companies}
                  onRefresh={fetchProductsData}
                />
              </AppLayout>
            </ProtectedRoutes>
          }
        />
        <Route
          path="/companies"
          element={
            <ProtectedRoutes>
              <AppLayout>
                <Companies {...companiesData} onRefresh={fetchCompaniesData} />
              </AppLayout>
            </ProtectedRoutes>
          }
        />
        <Route
          path="/maps"
          element={
            <ProtectedRoutes>
              <AppLayout fullBleed hideFooter>
                <Maps />
              </AppLayout>
            </ProtectedRoutes>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoutes>
              <AppLayout hideFooter fullBleed>
                <Analytics />
              </AppLayout>
            </ProtectedRoutes>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoutes>
              <AppLayout>
                <Profile />
              </AppLayout>
            </ProtectedRoutes>
          }
        />
        <Route
          path="/users/:id"
          element={
            <ProtectedRoutes>
              <AppLayout>
                <UserProfileView />
              </AppLayout>
            </ProtectedRoutes>
          }
        />
        <Route
          path="/blockchain"
          element={
            <ProtectedRoutes>
              <AppLayout>
                <Blockchain />
              </AppLayout>
            </ProtectedRoutes>
          }
        />
        <Route
          path="/verify-certificate"
          element={
            <ProtectedRoutes>
              <AppLayout>
                <CertificateVerifier />
              </AppLayout>
            </ProtectedRoutes>
          }
        />
        <Route
          path="/scan-history"
          element={
            <ProtectedRoutes>
              <AppLayout>
                <ScanHistory />
              </AppLayout>
            </ProtectedRoutes>
          }
        />
        <Route
          path="/remote-config"
          element={
            <ProtectedRoutes>
              <AppLayout>
                <RemoteConfig />
              </AppLayout>
            </ProtectedRoutes>
          }
        />
        <Route
          path="/kiosk-monitor"
          element={
            <ProtectedRoutes>
              <AppLayout>
                <KioskMonitor />
              </AppLayout>
            </ProtectedRoutes>
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
