import { User, Mail, MapPin, Calendar, Phone, Badge as BadgeIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable, type Column } from "@/components/DataTable"
import { Pagination } from "@/components/Pagination"
import { PageContainer } from "@/components/PageContainer"
import { useEffect, useState } from "react"
import { UserPageService } from "@/services/userPageService"

// Define activity data type
export interface Activity {
  id: string;
  action: string;
  type: 'Logged Out' | 'Removed' | 'Archived' | 'Logged In';
  date: string;
  time: string;
}

export interface ProfileUser {
  _id?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  name?: string; // For backward compatibility with mock data
  role?: string | number;
  avatar?: string;
  email: string;
  location?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  badgeId?: string;
  stationedAt?: string;
}

interface ProfileProps {
  user?: ProfileUser;
  activities?: Activity[];
  loading?: boolean;
  onEdit?: () => void;
  onActivityView?: (activity: Activity) => void;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
}

export function Profile({
  user: propUser,
  activities: propActivities,
  loading: propLoading = false,
  onEdit,
  onActivityView,
  currentPage = 1,
  totalPages = 4,
  totalItems = 40,
  itemsPerPage = 10,
  onPageChange
}: ProfileProps) {
  const [user, setUser] = useState<ProfileUser | null>(propUser || null);
  const [loading, setLoading] = useState(propLoading);

  // Fetch profile data on mount
  useEffect(() => {
    if (!propUser) {
      fetchProfile();
    } else {
      setUser(propUser);
    }
  }, [propUser]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await UserPageService.getProfile();
      if (data.profile) {
        setUser(data.profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get role name
  const getRoleName = (role?: string | number): string => {
    if (typeof role === 'string') return role;
    const roleMap: { [key: number]: string } = {
      1: "Agent",
      2: "Admin",
      3: "Super Admin"
    };
    return roleMap[role || 1] || "User";
  };

  // Helper function to get full name
  const getFullName = (userData: ProfileUser | null): string => {
    if (!userData) return "User";
    if (userData.name) return userData.name;
    const parts = [
      userData.firstName,
      userData.middleName,
      userData.lastName
    ].filter(Boolean);
    return parts.join(' ') || "User";
  };

  // Default activities data
  const defaultActivities: Activity[] = [
    {
      id: "1",
      action: "You has been Logged Out",
      type: "Logged Out",
      date: "2024-01-15",
      time: "14:30"
    },
    {
      id: "2", 
      action: "You successfully removed UserID 18",
      type: "Removed",
      date: "2024-01-15",
      time: "13:45"
    },
    {
      id: "3",
      action: "You archived UserID 18",
      type: "Archived", 
      date: "2024-01-15",
      time: "13:30"
    },
    {
      id: "4",
      action: "You logged in",
      type: "Logged In",
      date: "2024-01-15",
      time: "09:00"
    },
    {
      id: "5",
      action: "You successfully removed UserID 18",
      type: "Removed",
      date: "2024-01-14",
      time: "16:20"
    },
    {
      id: "6",
      action: "You has been Logged Out",
      type: "Logged Out",
      date: "2024-01-14",
      time: "18:00"
    },
    {
      id: "7",
      action: "You archived UserID 18",
      type: "Archived",
      date: "2024-01-14",
      time: "15:45"
    },
    {
      id: "8",
      action: "You logged in",
      type: "Logged In",
      date: "2024-01-14",
      time: "08:30"
    },
    {
      id: "9",
      action: "You successfully removed UserID 18",
      type: "Removed",
      date: "2024-01-13",
      time: "14:15"
    },
    {
      id: "10",
      action: "You has been Logged Out", 
      type: "Logged Out",
      date: "2024-01-13",
      time: "17:30"
    },
    {
      id: "11",
      action: "You archived UserID 18",
      type: "Archived",
      date: "2024-01-13", 
      time: "12:00"
    },
    {
      id: "12",
      action: "You logged in",
      type: "Logged In",
      date: "2024-01-13",
      time: "08:45"
    }
  ];

  // Activity table columns
  const activityColumns: Column[] = [
    { key: 'action', label: 'Action' },
    { 
      key: 'type', 
      label: 'Type',
      render: (value) => {
        const getVariant = (type: string) => {
          switch(type) {
            case 'Logged Out': return 'destructive';
            case 'Removed': return 'default';  // Black background
            case 'Archived': return 'secondary'; // Orange-ish
            case 'Logged In': return 'default';
            default: return 'secondary';
          }
        };
        
        const getCustomClass = (type: string) => {
          switch(type) {
            case 'Removed': return 'bg-black text-white hover:bg-gray-800';
            case 'Archived': return 'bg-orange-500 text-white hover:bg-orange-600';
            case 'Logged In': return 'bg-green-500 text-white hover:bg-green-600';
            default: return '';
          }
        };

        return (
          <Badge 
            variant={getVariant(value)} 
            className={getCustomClass(value)}
          >
            {value}
          </Badge>
        );
      }
    },
    { 
      key: 'view', 
      label: 'Action',
      render: (_, row) => (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onActivityView?.(row)}
          className="text-xs"
        >
          View
        </Button>
      )
    }
  ];

  const activityData = propActivities || defaultActivities;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageContainer title="Profile" description="Manage your personal account information and activity"
      headerAction={
        <Button 
          onClick={onEdit}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          Edit Profile
        </Button>
      }
    >

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Profile Information */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Profile Information</h2>
              <p className="text-sm text-gray-600">Update your personal account</p>
            </div>

            {/* Avatar Section */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  {user?.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={getFullName(user)}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-gray-500" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{getFullName(user)}</h3>
                <p className="text-sm text-gray-600">{getRoleName(user?.role)}</p>
              </div>
            </div>

            {/* Profile Details */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                <Mail className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">{user?.email || 'Not provided'}</p>
                </div>
              </div>

              {user?.location && (
                <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Location</p>
                    <p className="text-sm text-gray-600">{user.location}</p>
                  </div>
                </div>
              )}

              {user?.dateOfBirth && (
                <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Date of Birth</p>
                    <p className="text-sm text-gray-600">{user.dateOfBirth}</p>
                  </div>
                </div>
              )}

              {user?.phoneNumber && (
                <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Phone Number</p>
                    <p className="text-sm text-gray-600">{user.phoneNumber}</p>
                  </div>
                </div>
              )}

              {user?.badgeId && (
                <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                  <BadgeIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Badge ID</p>
                    <p className="text-sm text-gray-600">{user.badgeId}</p>
                  </div>
                </div>
              )}

              {user?.stationedAt && (
                <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                  <BadgeIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Stationed At</p>
                    <p className="text-sm text-gray-600">{user.stationedAt}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Your Recent Activities</h2>
            </div>

            {/* Activities Table */}
            <div className="mb-6">
              <DataTable
                title=""
                columns={activityColumns}
                data={activityData}
                loading={loading}
                emptyStateTitle="No Activities Found"
                emptyStateDescription="Your recent activities will appear here."
                showSearch={false}
                showSort={false}
              />
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={onPageChange}
              showingText={`Showing ${Math.min(activityData.length, itemsPerPage)} out of ${totalItems} activities`}
            />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
