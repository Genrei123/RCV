import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, MapPin, Phone, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiClient } from "@/services/axiosConfig";
import { toast } from "react-toastify";
import { AuthService } from "@/services/authService";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Contact() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    concern: "",
    details: "",
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const primaryButtonClass = "app-bg-primary hover:app-bg-primary text-white";
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post("/contact/send", formData);
      toast.success("Message sent successfully");
      setFormData({ fullName: "", email: "", concern: "", details: "" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to send message");
    }
  };

  useEffect(() => {
    // Determine if a user is logged in and prefill email
    (async () => {
      try {
        const user = await AuthService.getCurrentUser();
        if (user) {
          setIsLoggedIn(true);
          setFormData((prev) => ({ ...prev, email: user.email || prev.email }));
        }
      } catch (e) {
        setIsLoggedIn(false);
      }
    })();
  }, []);

  return (
    <PageContainer title="Contact" description="Send us a review">
      <Button
        onClick={() => navigate(-1)}
        className="app-bg-primary hover:app-bg-secondary app-text-white mb-8"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Page
      </Button>
      <div className="min-h-screen">
        {/* Header */}
        <div className="max-w-7xl mx-auto">
          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            {/* Left Side - Form */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Send Us a Message
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="fullName" className="text-sm font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="mt-1 app-bg-neutral-300 rounded-lg border-2 app-border-text"
                  />
                </div>

                {!isLoggedIn && (
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="mt-1 app-bg-neutral-300 rounded-lg border-2 app-border-text"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="concern" className="text-sm font-medium">
                    Type of Concern
                  </Label>
                  <Select
                    value={formData.concern}
                    onValueChange={(value) =>
                      setFormData({ ...formData, concern: value })
                    }
                  >
                    <SelectTrigger
                      id="concern"
                      className="mt-1 app-bg-neutral-300 rounded-lg border-2 app-border-text"
                    >
                      <SelectValue placeholder="Select a concern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="bug report">Bug Report</SelectItem>
                      <SelectItem value="feature request">
                        Feature Request
                      </SelectItem>
                      <SelectItem value="account issues">
                        Account Issues
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="details" className="text-sm font-medium">
                    Details
                  </Label>
                  <Textarea
                    id="details"
                    value={formData.details}
                    onChange={(e) =>
                      setFormData({ ...formData, details: e.target.value })
                    }
                    rows={12}
                    className="mt-1 app-bg-neutral-500 rounded-lg resize-none h-64 border-2 app-border-text"
                  />
                </div>

                <Button
                  type="submit"
                  className="app-bg-primary hover:app-bg-secondary app-text-white"
                >
                  Send Message
                </Button>
              </form>
            </div>

            {/* Right Side - Contact Info */}
            <div className="flex flex-col items-center lg:items-start lg:pl-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 text-center lg:text-left">
                Contact our team!
              </h2>
              <p className="text-gray-600 text-center lg:text-left mb-8 max-w-md">
                Our team is here to help! Reach out through any of the channels
                below and we'll respond as soon as possible.
              </p>

              <div className="space-y-6 w-full max-w-md">
                {/* Location */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full border-2 app-border-primary flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 app-text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Our Location
                    </h3>
                    <p className="text-gray-600 text-sm">
                      University of Caloocan City - North, Caloocan City,
                      Philippines
                    </p>
                  </div>
                </div>

                {/* Project Lead */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full border-2 app-border-primary flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 app-text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Project Lead
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Genrey O. Cristobal, Project Development Lead
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full border-2 app-border-primary flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 app-text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Email Address
                    </h3>
                    <p className="text-gray-600 text-sm">
                      rcvsteel.connect@gmail.com
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

export default Contact;
