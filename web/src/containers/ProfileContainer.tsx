import { useState, useEffect } from "react"
import { Profile } from "@/pages/Profile"
import type { ProfileUser } from "@/pages/Profile"

export function ProfileContainer() {
  const [user, setUser] = useState<ProfileUser | null>(null)
  const [loading, setLoading] = useState(true)

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