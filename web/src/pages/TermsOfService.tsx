import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function TermsOfService() {
  const navigate = useNavigate();

  const handleSectionScroll = useCallback((sectionId: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    window.history.replaceState(null, '', `#${sectionId}`);
  }, []);

  const sections = [
    {
      id: 'purpose-of-service',
      title: '1. Purpose of Service',
      content: [
        {
          text: 'The Regulatory Compliance Verification (R.C.V.) system is provided to assist Bureau of Animal Industry (BAI) regulatory officers and inspectors in verifying animal feed product compliance with Administrative Order No. 12, series of 2017. The system\'s functionalities include automated OCR technology, real-time database verification, and automated report generation.'
        },
        {
          subtitle: 'Scope',
          text: 'These Terms of Service ("Terms") govern your use of the R.C.V. system, including its mobile application and office-based kiosk machine. By accessing or using the system, you agree to be bound by these Terms.'
        }
      ]
    },
    {
      id: 'user-responsibilities',
      title: '2. User Responsibilities and Conduct',
      content: [
        {
          subtitle: 'Authorized Use',
          text: 'As an authorized user of the R.C.V. system, you are responsible for your actions and the data you submit. You agree to:'
        },
        {
          text: '• Use the system exclusively for official BAI regulatory purposes.',
          indent: true
        },
        {
          text: '• Ensure that any data manually entered into the system is accurate and truthful.',
          indent: true
        },
        {
          text: '• Protect your user credentials and prevent unauthorized access to the system.',
          indent: true
        },
        {
          text: '• Comply with all applicable Philippine laws and regulations in your use of the system.',
          indent: true
        },
        {
          subtitle: 'Prohibited Conduct',
          text: 'You may not:'
        },
        {
          text: '• Attempt to gain unauthorized access to the system or its data.',
          indent: true
        },
        {
          text: '• Modify, reverse-engineer, or attempt to circumvent system security measures.',
          indent: true
        },
        {
          text: '• Use the system for any unlawful or fraudulent purposes.',
          indent: true
        },
        {
          text: '• Share your credentials with unauthorized individuals.',
          indent: true
        }
      ]
    },
    {
      id: 'system-limitations',
      title: '3. System Limitations',
      content: [
        {
          subtitle: 'As-Is Basis',
          text: 'The R.C.V. system is provided on an "as-is" basis. While we strive for accuracy, the system may contain errors or limitations.'
        },
        {
          subtitle: 'OCR Technology',
          text: 'The Optical Character Recognition (OCR) technology used in the system is designed to extract data from product packaging images. However, OCR results may not be 100% accurate due to image quality, language variations, or unusual formatting. Users are responsible for verifying extracted information before submission.'
        },
        {
          subtitle: 'Availability',
          text: 'While we endeavor to maintain 99% system uptime, we do not guarantee uninterrupted service. Scheduled maintenance and unforeseen technical issues may affect availability.'
        }
      ]
    },
    {
      id: 'intellectual-property',
      title: '4. Intellectual Property',
      content: [
        {
          subtitle: 'Ownership',
          text: 'The R.C.V. system, including its design, technology, and content, is the intellectual property of the Bureau of Animal Industry or its authorized licensors.'
        },
        {
          subtitle: 'Limited License',
          text: 'You are granted a limited, non-exclusive, non-transferable license to use the system solely for its intended regulatory purposes. You may not reproduce, distribute, or publish any part of the system without prior written authorization.'
        }
      ]
    },
    {
      id: 'limitation-of-liability',
      title: '5. Limitation of Liability',
      content: [
        {
          subtitle: 'Disclaimer',
          text: 'To the fullest extent permitted by law, the Bureau of Animal Industry and its representatives shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the R.C.V. system.'
        },
        {
          subtitle: 'Accuracy of Data',
          text: 'While we strive to maintain accurate data, the Bureau does not warrant the accuracy, completeness, or timeliness of information provided by the system. Users should verify critical information through additional means when necessary.'
        },
        {
          subtitle: 'User Error',
          text: 'The Bureau is not responsible for any damages or losses resulting from user error, including but not limited to incorrect data entry or misuse of the system.'
        }
      ]
    },
    {
      id: 'modifications',
      title: '6. Modifications to Terms',
      content: [
        {
          subtitle: 'Right to Modify',
          text: 'The Bureau of Animal Industry reserves the right to modify these Terms of Service at any time. Changes will be posted to the system and communicated to users. Continued use of the system following such modifications constitutes acceptance of the updated Terms.'
        },
        {
          subtitle: 'Effective Date',
          text: 'Any updates to these Terms will be effective upon posting, and your continued use of the system indicates your acceptance of such changes.'
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
            <h1 className="text-4xl font-bold text-gray-900">Terms of Service</h1>
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
              Welcome to the Regulatory Compliance Verification System (R.C.V.), a tool developed for the Bureau of 
              Animal Industry (BAI). These Terms of Service ("Terms") govern your use of the R.C.V. system, including 
              its mobile application and office-based kiosk machine. By accessing or using the system, you agree to 
              be bound by these Terms.
            </p>
          </CardContent>
        </Card>

        {/* Contents Sidebar */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Sections */}
            {sections.map((section) => (
                <div key={section.id} id={section.id} className="scroll-mt-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">{section.title}</h2>

                  <div className="space-y-6">
                    {section.content.map((item, idx) => (
                      <div key={idx}>
                        {item.subtitle && (
                          <h3 className="font-semibold text-gray-800 mb-2">{item.subtitle}</h3>
                        )}
                        <p className={`text-gray-700 leading-relaxed text-sm ${('indent' in item && item.indent) ? 'ml-4' : ''}`}>
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
            ))}

            {/* Dispute Resolution */}
            <div id="dispute-resolution" className="mt-12 pt-8 border-t border-gray-200 scroll-mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Dispute Resolution and Governing Law</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Governing Law</h3>
                  <p className="text-gray-700 leading-relaxed text-sm">
                    These Terms of Service shall be governed by and construed in accordance with the laws of the 
                    Republic of the Philippines, without regard to its conflict of law provisions.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Dispute Resolution</h3>
                  <p className="text-gray-700 leading-relaxed text-sm">
                    Any disputes arising from your use of the R.C.V. system shall be subject to the jurisdiction 
                    of the Philippine courts. In case of disputes, both parties agree to attempt resolution through 
                    good-faith negotiation before pursuing legal action.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div id="contact" className="mt-8 scroll-mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed text-sm">
                If you have questions regarding these Terms of Service or the R.C.V. system, please contact 
                your system administrator or the Bureau of Animal Industry at:
              </p>
              <div className="mt-4 space-y-2 text-gray-700 text-sm">
                <p className="font-semibold">Bureau of Animal Industry</p>
                <p>Quezon City, Philippines</p>
                <p>Email: inquiries@bai.gov.ph</p>
              </div>
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
                    href="#dispute-resolution"
                    onClick={handleSectionScroll('dispute-resolution')}
                    className="block text-sm text-gray-700 hover:text-app-primary transition-colors"
                  >
                    Dispute Resolution
                  </a>
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
