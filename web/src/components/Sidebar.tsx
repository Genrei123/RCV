import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  MapPin,
  User,
  LogOut,
  Building2,
  BarChart3,
  Sliders,
  Verified,
  ChevronDown,
  Wallet,
  ExternalLink,
} from "lucide-react";
import { LogoutModal } from "./LogoutModal";
import { AuthService } from "@/services/authService";
import { toast } from "react-toastify";
import { useMetaMask } from "@/contexts/MetaMaskContext";

interface CurrentUser {
  _id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  role?: number | string;
  isSuperAdmin?: boolean;
  avatar?: string;
}

// Inline logo component (hexagon + inner circle) — used in desktop header (and can be reused elsewhere)
const LogoIcon = ({ className = "w-8 h-8 app-bg-primary" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden
  >
    <defs>
      <linearGradient id="rcvGrad" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor="#005440" />
        <stop offset="100%" stopColor="#00B087" />
      </linearGradient>
    </defs>
    <polygon
      points="12,2 20,7 20,17 12,22 4,17 4,7"
      fill="url(#rcvGrad)"
      stroke="#0b3b2f"
      strokeWidth="0.5"
    />
    <circle cx="12" cy="12" r="3.1" fill="white" />
  </svg>
);

export function Sidebar({
  open = false,
  onClose,
}: {
  open: boolean;
  onClose?: () => void;
}) {
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const visible = open;
  const closeDrawer = () => onClose?.();
  const { isConnected, walletAddress, isAuthorized, isMetaMaskInstalled, connect, disconnect, switchAccount } = useMetaMask();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Load avatar from localStorage first, else fallback to user avatar
  useEffect(() => {
    const loadAvatar = () => {
      try {
        const saved = localStorage.getItem("profile_avatar_data");
        if (saved) {
          setAvatarUrl(saved);
        } else if (currentUser?.avatar) {
          setAvatarUrl(currentUser.avatar);
        } else {
          setAvatarUrl(null);
        }
      } catch {
        setAvatarUrl(currentUser?.avatar || null);
      }
    };
    loadAvatar();

    const handler = () => loadAvatar();
    window.addEventListener("storage", handler);
    window.addEventListener("profile-avatar-updated", handler as EventListener);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener(
        "profile-avatar-updated",
        handler as EventListener
      );
    };
  }, [currentUser]);

  const fetchCurrentUser = async () => {
    setLoading(true);
    try {
      const user = await AuthService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
      toast.error("Failed to load user information");
    } finally {
      setLoading(false);
    }
  };

  const getFullName = (): string => {
    if (!currentUser) return "Loading...";
    const parts = [
      currentUser.firstName,
      currentUser.middleName,
      currentUser.lastName,
    ].filter(Boolean);
    return parts.join(" ") || "User";
  };

  const getRoleName = (): string => {
    if (!currentUser) return "Loading...";
    if (currentUser.role === undefined || currentUser.role === null)
      return "Agent";

    // Handle both string and number role formats
    if (typeof currentUser.role === 'string') {
      const stringRoleMap: { [key: string]: string } = {
        'AGENT': 'Agent',
        'ADMIN': 'Admin',
        'USER': 'User',
      };
      return stringRoleMap[currentUser.role] || "Agent";
    }

    const roleMap: { [key: number]: string } = {
      1: "Agent",
      2: "Admin",
      3: "Super Admin",
    };
    return roleMap[currentUser.role] || "Agent";
  };

  const menuItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/products", label: "Products", icon: Package },
    { path: "/companies", label: "Companies", icon: Building2 },
    { path: "/maps", label: "Maps", icon: MapPin },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
    { path: "/remote-config", label: "Mobile Config", icon: Sliders },
    // { path: '/kiosk-monitor', label: 'Kiosk Monitor', icon: Activity },
    // { path: '/users', label: 'Users', icon: Users },
    { path: "/blockchain", label: "Blockchain", icon: Verified },
  ];

  const handleLogout = async () => {
    setShowLogoutModal(false);

    try {
      toast.info("Signing out...");
      await AuthService.logout();
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout. Please try again.");
    }
  };

  return (
    <>
      {/* Desktop sidebar: sticky with max height; allows global footer to appear below */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:sticky lg:top-0 lg:max-h-screen bg-white border-r overflow-y-auto flex-shrink-0">
        {/* Logo Section */}
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-center gap-2 ">
            {/* Figma-style logo */}
            <div className="flex items-center justify-center">
              <LogoIcon className="w-8 h-8" />
            </div>
            <span className="text-xl font-semibold app-text-primary">RCV</span>
            <span className="text-xs text-neutral-400">v.01</span>
          </div>
        </div>

        {/* User Profile Section (click to open profile menu) */}
        <div className="p-6 border-b border-neutral-200 relative cursor-pointer">
          <button
            type="button"
            onClick={() => setShowProfileMenu((s) => !s)}
            className="w-full flex items-center gap-3 text-left focus:outline-none cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-300 flex items-center justify-center flex-shrink-0 cursor-pointer">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-10 h-10 object-cover"
                />
              ) : (
                <User size={20} className="text-neutral-600" />
              )}
            </div>
            <div className="flex-1 min-w-0 cursor-pointer">
              <p className="font-medium text-neutral-800 text-sm truncate">
                {loading ? "Loading..." : getFullName()}
              </p>
              <p className="text-xs text-neutral-500 cursor-pointer">
                {loading ? "Please wait..." : getRoleName()}
              </p>
            </div>
            <ChevronDown
              size={16}
              className={`transition-transform ${
                showProfileMenu ? "rotate-180 cursor-pointer" : ""
              }`}
            />
          </button>

          {/* Profile dropdown (desktop) */}
          {showProfileMenu && (
            <div className="absolute left-4 bottom-0 translate-y-full mt-2 w-48 bg-white border rounded-lg shadow-lg overflow-hidden z-50  ">
              <div className="py-1 ">
                <Link
                  to="/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  <User size={16} />
                  <span className="text-sm">View Profile</span>
                </Link>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowLogoutModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 "
                >
                  <LogOut size={16} />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "app-bg-primary text-white"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <span className="text-xs">›</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* MetaMask Wallet Section */}
        <div className="p-4 border-t border-neutral-200">
          <div className="bg-neutral-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-orange-500" />
                <span className="text-xs font-medium text-neutral-700">Wallet</span>
              </div>
              {isConnected && (
                <div className={`w-2 h-2 rounded-full ${isAuthorized ? 'bg-green-500' : 'bg-yellow-500'}`} />
              )}
            </div>
            {isConnected && walletAddress ? (
              <div className="space-y-2">
                <p className="text-xs font-mono text-neutral-600 truncate" title={walletAddress}>
                  {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={switchAccount}
                    className="flex-1 text-xs text-blue-500 hover:text-blue-700 py-1"
                    title="Switch to another account"
                  >
                    Switch
                  </button>
                  <button
                    onClick={disconnect}
                    className="flex-1 text-xs text-red-500 hover:text-red-700 py-1"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : !isMetaMaskInstalled ? (
              <button
                onClick={() => window.open('https://metamask.io/download/', '_blank')}
                className="w-full text-xs text-white bg-[#f6851b] hover:bg-[#e2761b] py-2 px-3 rounded flex items-center justify-center gap-1"
              >
                <ExternalLink size={12} />
                Install MetaMask
              </button>
            ) : (
              <button
                onClick={() => connect(true)}
                className="w-full text-xs app-text-primary hover:opacity-80 py-1 flex items-center justify-center gap-1"
              >
                <Wallet size={12} />
                Connect MetaMask
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* mobile/tablet drawer: visible below lg, use visible & closeDrawer */}
      <div
        className={`fixed inset-0 z-[1100] lg:hidden transition-opacity ${
          visible
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!visible}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeDrawer}
        />

        {/* Drawer: full width on xs, constrained on sm/md */}
        <div
          className={`absolute left-0 top-0 h-full w-full sm:max-w-xs md:max-w-sm bg-white shadow-lg transform transition-transform ${
            visible ? "translate-x-0" : "-translate-x-full"
          } overflow-y-auto`}
        >
          {/* Drawer header: logo + title + close button */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <LogoIcon className="w-7 h-7" />
              <span className="text-base font-medium text-neutral-800">RCV</span>
              <span className="text-xs text-neutral-400">v.01</span>
            </div>
            <button
              onClick={closeDrawer}
              className="p-1 text-neutral-400 hover:text-neutral-600"
              aria-label="Close menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
          </div>

          {/* User Profile Section (Mobile) - Moved to top */}
          <div className="px-6 py-4 border-b border-neutral-200">
            <button
              type="button"
              onClick={() => setShowProfileMenu((s) => !s)}
              className="w-full flex items-center gap-3 text-left focus:outline-none"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-300 flex items-center justify-center flex-shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-10 h-10 object-cover"
                  />
                ) : (
                  <User size={20} className="text-neutral-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-neutral-800 text-sm truncate">
                  {loading ? "Loading..." : getFullName()}
                </p>
                <p className="text-xs text-neutral-500">
                  {loading ? "Please wait..." : getRoleName()}
                </p>
              </div>
              <ChevronDown
                size={16}
                className={`transition-transform ${
                  showProfileMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* mobile inline profile menu */}
            {showProfileMenu && (
              <div className="mt-3 rounded-md bg-slate-50 p-2">
                <Link
                  to="/profile"
                  onClick={() => {
                    setShowProfileMenu(false);
                    closeDrawer?.();
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded"
                >
                  <User size={16} />
                  <span className="text-sm">View Profile</span>
                </Link>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowLogoutModal(true);
                    closeDrawer();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded mt-1"
                >
                  <LogOut size={16} />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Drawer nav: reuse menuItems, ensure links call closeDrawer */}
          <nav className="px-4 py-4 space-y-1 flex-1">
            {menuItems.map((m) => {
              const Icon = m.icon;
              const isActive = location.pathname === m.path;
              return (
                <Link
                  key={m.path}
                  to={m.path}
                  onClick={() => {
                    closeDrawer();
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "app-bg-primary text-white"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} />
                    <span className="font-medium">{m.label}</span>
                  </div>
                  <span className="text-xs">›</span>
                </Link>
              );
            })}
          </nav>

          {/* MetaMask Wallet Section (Mobile) */}
          <div className="px-4 pb-4 border-t border-neutral-200 pt-4">
            <div className="bg-neutral-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-orange-500" />
                  <span className="text-xs font-medium text-neutral-700">Wallet</span>
                </div>
                {isConnected && (
                  <div className={`w-2 h-2 rounded-full ${isAuthorized ? 'bg-green-500' : 'bg-yellow-500'}`} />
                )}
              </div>
              {isConnected && walletAddress ? (
                <div className="space-y-2">
                  <p className="text-xs font-mono text-neutral-600 truncate" title={walletAddress}>
                    {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={switchAccount}
                      className="flex-1 text-xs text-blue-500 hover:text-blue-700 py-1"
                      title="Switch to another account"
                    >
                      Switch
                    </button>
                    <button
                      onClick={disconnect}
                      className="flex-1 text-xs text-red-500 hover:text-red-700 py-1"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : !isMetaMaskInstalled ? (
                <button
                  onClick={() => window.open('https://metamask.io/download/', '_blank')}
                  className="w-full text-xs text-white bg-[#f6851b] hover:bg-[#e2761b] py-2 px-3 rounded flex items-center justify-center gap-1"
                >
                  <ExternalLink size={12} />
                  Install MetaMask
                </button>
              ) : (
                <button
                  onClick={() => connect(true)}
                  className="w-full text-xs app-text-primary hover:opacity-80 py-1 flex items-center justify-center gap-1"
                >
                  <Wallet size={12} />
                  Connect MetaMask
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        userName={getFullName()}
      />
    </>
  );
}

export default Sidebar;
