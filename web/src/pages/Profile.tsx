import { User, Mail, MapPin, Calendar, Phone, Badge as BadgeIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DataTable, type Column } from "@/components/DataTable"
import { Pagination } from "@/components/Pagination"
import { PageContainer } from "@/components/PageContainer"
import { useState } from "react"
import type { Activity } from "@/types/user_details"
import { UserService } from "@/services/userService"

export interface ProfileUser {
  name: string;
  role: string;
  avatar?: string;
  email: string;
  location: string;
  dateOfBirth: string;
  phoneNumber: string;
  badgeId: string;
  id: string;
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

  const styles = {
    fieldContainer: "flex items-start gap-3 p-3 border border-gray-200 rounded-lg",
    fieldLabel: "text-sm font-medium text-gray-900",
    fieldValue: "text-sm text-gray-600",
    icon: "w-5 h-5 text-gray-500 mt-0.5",
    avatarContainer: "w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4",
    avatarImage: "w-24 h-24 rounded-full object-cover",
    avatarIcon: "w-12 h-12 text-gray-500",
    input: "w-full p-2 border border-gray-300 rounded-md text-sm",
    sectionTitle: "text-xl font-semibold text-gray-900 mb-1",
    sectionSubtitle: "text-sm text-gray-600",
    primaryButton: "bg-teal-600 hover:bg-teal-700 text-white",
    cancelButton: "border-red-500 text-red-500 hover:bg-red-50 hover:border-red-600 hover:text-red-600",
    buttonContainer: "flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200"
  };

    // Default activities data
  const defaultActivities: Activity[] = [
    {
      id: "1",
      action: "You has been Logged Out",
      type: "Logged Out",
      date: "2024-01-15",
      time: "14:30",
      username: "karina_dela_cruz"
    },
    {
      id: "2", 
      action: "You successfully removed UserID 18",
      type: "Removed",
      date: "2024-01-15",
      time: "13:45",
      username: "karina_dela_cruz"
    },
    {
      id: "3",
      action: "You archived UserID 18",
      type: "Archived", 
      date: "2024-01-15",
      time: "13:30",
      username: "karina_dela_cruz"
    },
    {
      id: "4",
      action: "You logged in",
      type: "Logged In",
      date: "2024-01-15",
      time: "09:00",
      username: "karina_dela_cruz"
    },
    {
      id: "5",
      action: "You successfully removed UserID 18",
      type: "Removed",
      date: "2024-01-14",
      time: "16:20",
      username: "karina_dela_cruz"
    },
    {
      id: "6",
      action: "You has been Logged Out",
      type: "Logged Out",
      date: "2024-01-14",
      time: "18:00",
      username: "karina_dela_cruz"
    },
    {
      id: "7",
      action: "You archived UserID 18",
      type: "Archived",
      date: "2024-01-14",
      time: "15:45",
      username: "karina_dela_cruz"
    },
    {
      id: "8",
      action: "You logged in",
      type: "Logged In",
      date: "2024-01-14",
      time: "08:30",
      username: "karina_dela_cruz"
    },
    {
      id: "9",
      action: "You successfully removed UserID 18",
      type: "Removed",
      date: "2024-01-13",
      time: "14:15",
      username: "karina_dela_cruz"
    },
    {
      id: "10",
      action: "You has been Logged Out", 
      type: "Logged Out",
      date: "2024-01-13",
      time: "17:30",
      username: "karina_dela_cruz"
    },
    {
      id: "11",
      action: "You archived UserID 18",
      type: "Archived",
      date: "2024-01-13", 
      time: "12:00",
      username: "karina_dela_cruz"
    },
    {
      id: "12",
      action: "You logged in",
      type: "Logged In",
      date: "2024-01-13",
      time: "08:45",
      username: "karina_dela_cruz"
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
    badgeId: "Caloocan City, Metro Manila",
    id: "1"
  };

  const userData = user || defaultUser;
  const activityData = defaultActivities;

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

  const handleInputChange = (field: keyof typeof editForm, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  const handleSaveChanges = async () => {
    let hasErrors = false;
    
    // Email validation
    if (editForm.email.trim() === '') {
      alert('Email is required');
      hasErrors = true;
    } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(editForm.email)) {
      alert('Please enter a valid email');
      hasErrors = true;
    }
    
    if (editForm.name.trim() === '') {
      alert('Name is required');
      hasErrors = true;
    }
    
    if (!editForm.password || !editForm.confirmPassword ) {
      alert('Password fields cannot be empty');
      hasErrors = true;
    }

    if (editForm.password || editForm.confirmPassword ) {
      if (editForm.password.length < 6) {
        alert('Password must be at least 6 characters long');
        hasErrors = true;
      } else if (editForm.password !== editForm.confirmPassword) {
        alert('Passwords do not match!');
        hasErrors = true;
      }
    }
    
    if (hasErrors) {
      return;
    }
    
    // API Call
    try {
      console.log('Saving changes for user ID:', userData.id);
      console.log('Update data:', editForm);
      
      const updateData = {
        firstName: editForm.name.split(' ')[0] || editForm.name,
        lastName: editForm.name.split(' ').slice(1).join(' ') || '',
        ...(editForm.password && { password: editForm.password })
      };
      
      const result = await UserService.updateUser(userData.id, updateData);
      
      alert('Profile updated successfully!');
      setIsEditing(false);
      
    } catch (error) {
      console.error('Error updating user profile:', error);
      alert('Failed to update profile. Please try again.');
    }
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
                <h2 className={styles.sectionTitle}>Profile Information</h2>
                <p className={styles.sectionSubtitle}>Update your personal account</p>
              </div>
              {!isEditing && (
                <Button 
                  onClick={handleEditClick}
                  className={styles.primaryButton}
                  size="sm"
                >
                  Edit Profile
                </Button>
              )}
            </div>

            {/* Avatar Section */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <div className={styles.avatarContainer}>
                  {userData.avatar ? (
                    <img 
                      src={userData.avatar} 
                      alt={userData.name}
                      className={styles.avatarImage}
                    />
                  ) : (
                    <User className={styles.avatarIcon} />
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
              <div className={styles.fieldContainer}>
                <Mail className={styles.icon} />
                <div className="flex-1">
                  <p className={styles.fieldLabel}>Email</p>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="mt-1"
                      placeholder="Email address"
                    />
                  ) : (
                    <p className={styles.fieldValue}>{userData.email}</p>
                  )}
                </div>
              </div>

              {/* Password Fields - Only show when editing */}
              {isEditing && (
                <>
                  <div className={styles.fieldContainer}>
                    <Mail className={styles.icon} />
                    <div className="flex-1">
                      <p className={styles.fieldLabel}>New Password</p>
                      <Input
                        type="password"
                        value={editForm.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="mt-1"
                        placeholder="Enter new password"
                      />
                    </div>
                  </div>

                  <div className={styles.fieldContainer}>
                    <Mail className={styles.icon} />
                    <div className="flex-1">
                      <p className={styles.fieldLabel}>Confirm Password</p>
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
                  <div className={styles.fieldContainer}>
                    <MapPin className={styles.icon} />
                    <div className="flex-1">
                      <p className={styles.fieldLabel}>Location</p>
                      <p className={styles.fieldValue}>{userData.location}</p>
                    </div>
                  </div>

                  <div className={styles.fieldContainer}>
                    <Calendar className={styles.icon} />
                    <div className="flex-1">
                      <p className={styles.fieldLabel}>Date of Birth</p>
                      <p className={styles.fieldValue}>{userData.dateOfBirth}</p>
                    </div>
                  </div>

                  <div className={styles.fieldContainer}>
                    <Phone className={styles.icon} />
                    <div className="flex-1">
                      <p className={styles.fieldLabel}>Phone Number</p>
                      <p className={styles.fieldValue}>{userData.phoneNumber}</p>
                    </div>
                  </div>

                  <div className={styles.fieldContainer}>
                    <BadgeIcon className={styles.icon} />
                    <div className="flex-1">
                      <p className={styles.fieldLabel}>Badge ID</p>
                      <p className={styles.fieldValue}>{userData.badgeId}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Cancel and Save buttons - bottom right when editing */}
            {isEditing && (
              <div className={styles.buttonContainer}>
                <Button 
                  onClick={handleCancelEdit}
                  variant="outline"
                  size="sm"
                  className={styles.cancelButton}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveChanges}
                  className={styles.primaryButton}
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
              <h2 className={styles.sectionTitle}>Your Recent Activities</h2>
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
