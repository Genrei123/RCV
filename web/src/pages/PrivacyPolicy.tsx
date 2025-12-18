import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function PrivacyPolicy() {
  const navigate = useNavigate();

  const handleSectionScroll = useCallback((sectionId: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    window.history.replaceState(null, '', `#${sectionId}`);
  }, []);

  const sections = [
    {
      id: 'information-collected',
      title: '1. Information We Collect',
      content: [
        {
          subtitle: 'Images of Product Packaging',
          text: 'We collect images of animal feed product labels. This includes text such as License to Operate (LTO) numbers, Certificate of Feed Product Registration (CFPR), manufacturer details, and guaranteed analysis, which is extracted using Optical Character Recognition (OCR) technology.'
        },
        {
          subtitle: 'Location Data',
          text: 'The mobile application collects the GPS location of the device during inspections. This data is used solely for the purpose of location tracking and mapping of inspection activities.'
        },
        {
          subtitle: 'User Information',
          text: 'The system collects and stores information related to BAI inspectors and personnel, which may include a unique user ID and assigned roles. This is used for system access, report generation, and accountability.'
        }
      ]
    },
    {
      id: 'how-we-use',
      title: '2. How We Use the Information',
      content: [
        {
          subtitle: 'Regulatory Compliance Verification',
          text: 'Your information is used to facilitate regulatory compliance verification of animal feed products with Administrative Order No. 12, series of 2017.'
        },
        {
          subtitle: 'System Access and Report Generation',
          text: 'User information is used to provide system access, track user actions, and generate accountability reports.'
        },
        {
          subtitle: 'Location-Based Analytics',
          text: 'Location data is used to map and analyze inspection activities geographically to improve operational efficiency.'
        }
      ]
    },
    {
      id: 'data-security',
      title: '3. Data Security and Storage',
      content: [
        {
          subtitle: 'Encryption and Protection',
          text: 'Data is protected through industry-standard encryption and secure storage mechanisms to prevent unauthorized access.'
        },
        {
          subtitle: 'Access Control',
          text: 'Only authorized BAI personnel with proper credentials can access the system and the data within it.'
        },
        {
          subtitle: 'Data Retention',
          text: 'Data is retained for the duration necessary to fulfill the purposes outlined in this policy and in accordance with applicable Philippine regulations.'
        }
      ]
    },
    {
      id: 'limitations',
      title: '4. Limitations and Non-Personal Data',
      content: [
        {
          subtitle: 'Non-Personal Data Collection',
          text: 'The system may collect aggregated and anonymized data for analytics and system improvement purposes. Such data cannot be used to identify individuals.'
        },
        {
          subtitle: 'Data Sharing Restrictions',
          text: 'Personal data will not be shared with third parties without proper authorization and in compliance with Philippine Data Privacy Act of 2012.'
        }
      ]
    },
    {
      id: 'your-consent',
      title: '5. Your Consent',
      content: [
        {
          subtitle: 'Agreement to Privacy Policy',
          text: 'By accessing and using the RCV system, you consent to the collection, use, and storage of information as described in this Privacy Policy.'
        },
        {
          subtitle: 'Your Rights',
          text: 'You have the right to request access to, correction of, or deletion of your personal data in accordance with applicable data privacy laws. For inquiries, please contact your system administrator.'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate(-1)}
            variant="link"
            className="mb-6 p-0 h-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back</span>
          </Button>

          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-gray-900">Privacy Policy</h1>
            <p className="text-gray-600">
              Last Updated: {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>

        {/* Introduction */}
        <Card className="mb-8 border-app-primary/30 bg-app-primary/5">
          <CardContent className="pt-6">
            <p className="text-gray-700 leading-relaxed">
              This Privacy Policy outlines how the Regulatory Compliance Verification System (R.C.V.) collects, uses, 
              and protects information gathered during its operations. The system is designed to assist Bureau of Animal 
              Industry (BAI) inspectors and personnel in verifying the compliance of animal feed products with regulatory standards.
            </p>
          </CardContent>
        </Card>

        {/* Contents Sidebar */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Sections */}
            {sections.map((section) => (
                <div key={section.id} id={section.id} className="scroll-mt-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.title}</h2>

                  <div className="space-y-6 ml-0">
                    {section.content.map((item, idx) => (
                      <div key={idx} className="space-y-2">
                        <h3 className="font-semibold text-gray-800">{item.subtitle}</h3>
                        <p className="text-gray-700 leading-relaxed text-sm">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
            ))}

            {/* Contact Section */}
            <div id="contact" className="mt-12 pt-8 border-t border-gray-200 scroll-mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact 
                your system administrator or the Bureau of Animal Industry.
              </p>
            </div>
          </div>

          {/* Contents Panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6 border-gray-200 bg-white">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-gray-900 mb-4 text-app-primary">Contents</h3>
                <nav className="space-y-3">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      onClick={handleSectionScroll(section.id)}
                      className="block text-sm text-gray-700 hover:text-app-primary transition-colors"
                    >
                      {section.title}
                    </a>
                  ))}
                  <a
                    href="#contact"
                    onClick={handleSectionScroll('contact')}
                    className="block text-sm text-gray-700 hover:text-app-primary transition-colors"
                  >
                    Contact Us
                  </a>
                </nav>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
