import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  Package,
  MapPin,
  User,
  LogOut,
  ChevronDown,
  Bell,
  Building2,
  Sliders,
  Activity,
  BarChart3
} from 'lucide-react'
import { LogoutModal } from './LogoutModal'
import { AuthService } from '@/services/authService'
import { toast } from 'react-toastify'

interface CurrentUser {
  _id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  role?: number;
}

export function Sidebar() {
  const location = useLocation()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  const fetchCurrentUser = async () => {
    setLoading(true)
    try {
      const user = await AuthService.getCurrentUser()
      console.log('Fetched user data:', user) // Debug log
      if (user) {
        setCurrentUser(user)
      }
    } catch (error) {
      console.error('Error fetching current user:', error)
      toast.error('Failed to load user information')
    } finally {
      setLoading(false)
    }
  }

  const getFullName = (): string => {
    if (!currentUser) return 'Loading...'
    const parts = [
      currentUser.firstName,
      currentUser.middleName,
      currentUser.lastName
    ].filter(Boolean)
    return parts.join(' ') || 'User'
  }

  const getRoleName = (): string => {
    if (!currentUser) return 'Loading...'
    if (currentUser.role === undefined || currentUser.role === null) return 'Agent'
    
    const roleMap: { [key: number]: string } = {
      1: "Agent",
      2: "Admin",
      3: "Super Admin"
    }
    return roleMap[currentUser.role] || "Agent"
  }
  
  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/companies', label: 'Companies', icon: Building2 },
    { path: '/maps', label: 'Maps', icon: MapPin },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/remote-config', label: 'Mobile Config', icon: Sliders },
    { path: '/kiosk-monitor', label: 'Kiosk Monitor', icon: Activity },
    // { path: '/users', label: 'Users', icon: Users },
  ]

  const profileMenuItems = [
    { path: '/profile', label: 'View Profile', icon: User },
    { path: '/notifications', label: 'Notifications', icon: Bell },
  ]

  const handleLogout = async () => {
    setShowLogoutModal(false)
    setShowProfileMenu(false)
    
    try {
      toast.info('Signing out...')
      await AuthService.logout()
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Failed to logout. Please try again.')
    }
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="mb-1">
            <h2 className="text-xl font-bold text-white">RCV System</h2>
            <p className="text-slate-400 text-sm font-medium">Product Verification</p>
          </div>
        </div>
        
        {/* Main Navigation */}
        <nav className="flex-1 px-4 py-6">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <Icon 
                    size={20} 
                    className={`transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Profile Section */}
        <div className="p-4 border-t border-slate-700">
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                showProfileMenu
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">
                  {loading ? 'Loading...' : getFullName()}
                </p>
                <p className="text-xs text-slate-400">
                  {loading ? 'Please wait...' : getRoleName()}
                </p>
              </div>
              <ChevronDown 
                size={16} 
                className={`transition-transform duration-200 ${
                  showProfileMenu ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-lg overflow-hidden">
                <div className="py-2">
                  {profileMenuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setShowProfileMenu(false)}
                        className={`w-full flex items-center gap-3 px-4 py-2 transition-colors ${
                          isActive
                            ? 'bg-teal-600/10 text-teal-400'
                            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        <Icon size={16} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </Link>
                    )
                  })}
                  
                  <div className="border-t border-slate-700 mt-2 pt-2">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false)
                        setShowLogoutModal(true)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-slate-300 hover:bg-red-600/10 hover:text-red-400 transition-colors"
                    >
                      <LogOut size={16} />
                      <span className="text-sm font-medium">Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
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
  )
}