import { User, Mail, MapPin, Calendar, Phone, Badge as BadgeIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DataTable, type Column } from "@/components/DataTable"
import { Pagination } from "@/components/Pagination"
import { PageContainer } from "@/components/PageContainer"
import { useState } from "react"

// Define activity data type
export interface Activity {
  id: string;
  action: string;
  type: 'Logged Out' | 'Removed' | 'Archived' | 'Logged In';
  date: string;
  time: string;
}

export interface ProfileUser {
  name: string;
  role: string;
  avatar?: string;
  email: string;
  location: string;
  dateOfBirth: string;
  phoneNumber: string;
  badgeId: string;
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
  user,
  activities,
  loading = false,
  onEdit,
  onActivityView,
  currentPage = 1,
  totalPages = 4,
  totalItems = 40,
  itemsPerPage = 10,
  onPageChange
}: ProfileProps) {
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });


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

  // Default user data
  const defaultUser: ProfileUser = {
    name: "Karina Dela Cruz",
    role: "Admin User",
    email: "Yuulmin04@gmail.com",
    location: "Caloocan City, Metro Manila",
    dateOfBirth: "January 1, 1990",
    phoneNumber: "09-123-456789",
    badgeId: "Caloocan City, Metro Manila"
  };

  const userData = user || defaultUser;
  const activityData = defaultActivities;

  // Initialize edit form when entering edit mode
  const handleEditClick = () => {
    setEditForm({
      name: userData.name,
      email: userData.email,
      password: '',
      confirmPassword: ''
    });
    setIsEditing(true);
    onEdit?.();
  };

  // Handle form input changes
  const handleInputChange = (field: keyof typeof editForm, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  // Handle save changes
  const handleSaveChanges = () => {
    // Here you would typically call an API to save the changes
    // For now, just exit edit mode
    console.log('Saving changes:', editForm);
    setIsEditing(false);
    // You can add validation here before saving
    if (editForm.password !== editForm.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    // Call parent save handler if provided
    // onSave?.(editForm);
  };



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
    <PageContainer title="Profile" description="Manage your personal account information and activity">

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Profile Information */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Profile Information</h2>
                <p className="text-sm text-gray-600">Update your personal account</p>
              </div>
              {!isEditing && (
                <Button 
                  onClick={handleEditClick}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  size="sm"
                >
                  Edit Profile
                </Button>
              )}
            </div>

            {/* Avatar Section */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  {userData.avatar ? (
                    <img 
                      src={userData.avatar} 
                      alt={userData.name}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-gray-500" />
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="text-center text-lg font-semibold"
                      placeholder="Full Name"
                    />
                    <p className="text-sm text-gray-600">{userData.role}</p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{userData.name}</h3>
                    <p className="text-sm text-gray-600">{userData.role}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Details */}
            <div className="space-y-4">
              {/* Email Field - Editable */}
              <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                <Mail className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="mt-1"
                      placeholder="Email address"
                    />
                  ) : (
                    <p className="text-sm text-gray-600">{userData.email}</p>
                  )}
                </div>
              </div>

              {/* Password Fields - Only show when editing */}
              {isEditing && (
                <>
                  <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">New Password</p>
                      <Input
                        type="password"
                        value={editForm.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="mt-1"
                        placeholder="Enter new password"
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Confirm Password</p>
                      <Input
                        type="password"
                        value={editForm.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className="mt-1"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Non-editable fields - hidden during editing */}
              {!isEditing && (
                <>
                  <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Location</p>
                      <p className="text-sm text-gray-600">{userData.location}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Date of Birth</p>
                      <p className="text-sm text-gray-600">{userData.dateOfBirth}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                    <Phone className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Phone Number</p>
                      <p className="text-sm text-gray-600">{userData.phoneNumber}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                    <BadgeIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Badge ID</p>
                      <p className="text-sm text-gray-600">{userData.badgeId}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Cancel and Save buttons - bottom right when editing */}
            {isEditing && (
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-red-200">
                <Button 
                  onClick={handleCancelEdit}
                  variant="outline"
                  size="sm"
                  className="border-red-500 text-red-500 hover:bg-red-50 hover:border-red-600 hover:text-red-600"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveChanges}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  size="sm"
                >
                  Save
                </Button>
              </div>
            )}
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
