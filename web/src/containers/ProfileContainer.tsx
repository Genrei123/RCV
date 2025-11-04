import { useState, useEffect } from "react"
import { Profile } from "@/pages/Profile"
import type { ProfileUser } from "@/pages/Profile"
import { AuthService } from "@/services/authService"
import { toast } from "react-toastify"

export function ProfileContainer() {
  const [user, setUser] = useState<ProfileUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch real user data from API
  const fetchUserProfile = async (): Promise<ProfileUser | null> => {
    try {
      const userData = await AuthService.getCurrentUser()
      
      if (!userData) {
        toast.error("Failed to load user profile")
        return null
      }

      // Map backend user data to ProfileUser interface
      return {
        name: userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        role: userData.role || "User",
        email: userData.email || "",
        location: userData.location || "Not specified",
        dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : "Not specified",
        phoneNumber: userData.phoneNumber || "Not specified",
        badgeId: userData.badgeId || "Not specified",
        avatar: userData.avatarUrl || ""
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
      toast.error("Failed to load user profile")
      return null
    }
  }

  // Load profile data on component mount
  useEffect(() => {
    fetchUserProfile()
      .then((userData) => {
        setUser(userData)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <Profile
      user={user || undefined}
      loading={loading}
    />
  )
}