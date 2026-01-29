import { PageContainer } from "@/components/PageContainer";
import { ProfileCard } from "@/components/ProfileCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const teamMembers = [
  {
    name: "Cristobal, Genrey",
    role: "Project Manager",
    imageUrl: "/cristobal.png",
  },
  {
    name: "Fungo, Gian Higino",
    role: "System Analyst/Lead Frontend Developer",
    imageUrl: "/fungo.png",
  },
  {
    name: "Caram, Mike Ruffino",
    role: "Software Engineer/Lead Backend Developer",
    imageUrl: "/caram.png",
  },
  {
    name: "Vigil, Franklin",
    role: "Frontend Dev, Head QA",
    imageUrl: "/vigil.png",
  },
  {
    name: "Capalac, Garvy Ren",
    role: "Frontend Developer",
    imageUrl: "/garvy.png",
  },
  {
    name: "Gomez, Eugene PV",
    role: "Hardware Specialist",
    imageUrl: "/gomez.png",
  },
  {
    name: "Nabong, Jj Mcdal",
    role: "Documentation Head/Full Stack Dev",
    imageUrl: "/nabong.png",
  },
  {
    name: "Nepomuceno, Rogie",
    role: "Developer",
    imageUrl: "/rogie.png",
  },
];

export function About() {
  const navigate = useNavigate();

  return (
    <PageContainer title="About Us" description="Meet our Team">
      <div className="min-h-screen p-0">
        <div className="max-w-7xl mx-auto">
          <Button
            onClick={() => navigate(-1)}
            className="app-bg-primary  hover:app-bg-secondary app-text-white mb-8"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Page
          </Button>

          {/* Team Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {teamMembers.map((member, index) => (
              <div className="m-1 transform transition-transform duration-300 hover:scale-110 cursor-pointer">
                <ProfileCard
                  key={index}
                  name={member.name}
                  role={member.role}
                  imageUrl={member.imageUrl}
                  className="max-w-[220px] mx-auto"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

export default About;
