import { useState, useEffect } from "react"
import { Profile } from "@/pages/Profile"
import type { ProfileUser, Activity } from "@/pages/Profile"

export function ProfileContainer() {
  const [user, setUser] = useState<ProfileUser | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  // Simulate API call for user data
  const fetchUserProfile = async (): Promise<ProfileUser> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800))
    
    return {
      name: "Karina Dela Cruz",
      role: "Admin User",
      email: "Yuulmin04@gmail.com",
      location: "Caloocan City, Metro Manila",
      dateOfBirth: "January 1, 1990",
      phoneNumber: "09-123-456789",
      badgeId: "Caloocan City, Metro Manila",
      avatar: "" // Could be a real image URL
    }
  }

  // Simulate API call for activities
  const fetchUserActivities = async (): Promise<Activity[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600))
    
    return [
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
      }
    ]
  }

  // Load profile data on component mount
  useEffect(() => {
    Promise.all([
      fetchUserProfile(),
      fetchUserActivities()
    ])
    .then(([userData, activitiesData]) => {
      setUser(userData)
      setActivities(activitiesData)
    })
    .finally(() => setLoading(false))
  }, [])

  // Handle edit profile
  const handleEdit = () => {
    console.log('Edit profile clicked')
    // In real app, navigate to edit form or open modal
  }

  // Handle activity view
  const handleActivityView = (activity: Activity) => {
    console.log('Activity view clicked:', activity)
    // In real app, show activity details modal or navigate to detail page
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    console.log('Page changed to:', page)
    // In real app, make API call with new page
  }

  return (
    <Profile
      user={user || undefined}
      activities={activities}
      loading={loading}
      onEdit={handleEdit}
      onActivityView={handleActivityView}
      currentPage={currentPage}
      totalPages={4}
      totalItems={40}
      itemsPerPage={10}
      onPageChange={handlePageChange}
    />
  )
}