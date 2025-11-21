import { Routes, Route, useNavigate } from "react-router-dom";
import { Dashboard, type DashboardProps } from "./pages/Dashboard";
import { Products, type ProductsProps } from "./pages/Products";
import { Companies, type CompaniesProps } from "./pages/Companies";
import { Maps } from "./pages/Maps";
import { Analytics } from "./pages/Analytics";
import { Profile } from "./pages/Profile";
import { Blockchain } from "./pages/Blockchain";
import { CertificateVerifier } from "./pages/CertificateVerifier";
import { ScanHistory } from "./pages/ScanHistory";
import { RemoteConfig } from "./pages/RemoteConfig";
import { KioskMonitor } from "./pages/KioskMonitor";
import { Sidebar } from "./components/Sidebar";
import { Footer } from "./components/Footer";
import { GlobalLoadingIndicator } from "./components/GlobalLoadingIndicator";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { AuthService } from "./services/authService";
import { useEffect, useState, type ReactNode } from "react";
import { DashboardService } from "./services/dashboardService";
import { ProductService } from "./services/productService";
import { AuthPage } from "./pages/AuthPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { PendingApprovalPage } from "./pages/PendingApprovalPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { CompanyService } from "./services/companyService";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Global Loading Indicator for all API requests */}
      <GlobalLoadingIndicator />

      {/* Toast Notifications */}
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

      <div
        className={`flex-1 ${
          isLoggedIn
            ? "grid grid-cols-1 md:grid-cols-[250px_1fr] grid-rows-[1fr_auto]"
            : ""
        }`}
      >
        {/* Sidebar - Only show when logged in.
            Remove extra dark background so it doesn't cover content/footer. */}
        {isLoggedIn && (
          <aside className="hidden md:block">
            <Sidebar />
          </aside>
        )}

        <main className="flex flex-col min-h-0 flex-1 overflow-hidden">
          <div className="flex-1 bg-white rounded-lg shadow-sm overflow-y-auto m-0 flex flex-col">
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
                path="/pending-approval"
                element={<PendingApprovalPage />}
              />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoutes>
                    <Dashboard {...dashboardData} />
                  </ProtectedRoutes>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoutes>
                    <Dashboard {...dashboardData} />
                  </ProtectedRoutes>
                }
              />
              <Route
                path="/products"
                element={
                  <ProtectedRoutes>
                    <Products
                      {...productsData}
                      companies={companiesData?.companies}
                      onRefresh={fetchProductsData}
                    />
                  </ProtectedRoutes>
                }
              />
              <Route
                path="/companies"
                element={
                  <ProtectedRoutes>
                    <Companies
                      {...companiesData}
                      onRefresh={fetchCompaniesData}
                    />
                  </ProtectedRoutes>
                }
              />
              <Route
                path="/maps"
                element={
                  <ProtectedRoutes>
                    <Maps />
                  </ProtectedRoutes>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoutes>
                    <Analytics />
                  </ProtectedRoutes>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoutes>
                    <Profile />
                  </ProtectedRoutes>
                }
              />
              <Route
                path="/blockchain"
                element={
                  <ProtectedRoutes>
                    <Blockchain />
                  </ProtectedRoutes>
                }
              />
              <Route
                path="/verify-certificate"
                element={
                  <ProtectedRoutes>
                    <CertificateVerifier />
                  </ProtectedRoutes>
                }
              />
              <Route
                path="/scan-history"
                element={
                  <ProtectedRoutes>
                    <ScanHistory />
                  </ProtectedRoutes>
                }
              />
              <Route
                path="/remote-config"
                element={
                  <ProtectedRoutes>
                    <RemoteConfig />
                  </ProtectedRoutes>
                }
              />
              <Route
                path="/kiosk-monitor"
                element={
                  <ProtectedRoutes>
                    <KioskMonitor />
                  </ProtectedRoutes>
                }
              />

              {/* 404 Catch-all Route - Must be last */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </main>

        {/* Footer - spans both columns when logged in */}
        <div className={isLoggedIn ? "col-span-1 md:col-span-2 w-full" : "w-full"}>
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default App;
