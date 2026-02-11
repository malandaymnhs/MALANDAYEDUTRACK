import { useEffect, useState } from "react";
import { FaFacebook, FaTwitter, FaYoutube } from 'react-icons/fa';

function Footer() {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    document.getElementById("current-year").textContent = new Date().getFullYear();
  }, []);

  return (
    <>
    <footer className="bg-[#0f172a] text-gray-300 px-6 py-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        
        <div>
          <h2 className="text-xl font-bold text-white mb-4">
            <a 
              href="https://web.facebook.com/malandaynhsvalenzuelaofficial" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-sky-400 transition"
            >
              Malanday National High School
            </a>
          </h2>
          <ul className="space-y-4 text-sm">
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 mt-1 text-sky-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <a href="https://maps.app.goo.gl/qWjS5WAJGAMYR4r88" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Malanday, Valenzuela City, Metro Manila</a>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 mt-1 text-sky-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              <a href="tel:+63229231901" className="hover:text-white transition">(02) 292-31901</a>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 mt-1 text-sky-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <a href="mailto:malandaymnhs@gmail.com" className="hover:text-white transition">malandaymnhs@gmail.com</a>
            </li>
            <li className="flex items-center gap-3">
              <FaFacebook className="text-sky-400 text-lg" />
              <a
                href="https://www.facebook.com/malandaynhsvalenzuelaofficial"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition"
              >
                malandaynhsvalenzuelaofficial
              </a>
            </li>
          </ul>
          <button
            type="button"
            onClick={() => setShowPrivacyModal(true)}
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sky-300 hover:text-white transition underline decoration-dotted"
          >
            Privacy &amp; Policy
          </button>
        </div>

       
        <div className="text-sm">
          <h3 className="text-white text-lg font-semibold mb-1">In Partnership With</h3>
          <h4 className="text-sky-400 font-semibold">Pamantasan ng Lungsod ng Valenzuela</h4>
          <p>Department of Information Technology</p>
          <div className="mt-4 rounded overflow-hidden shadow-lg border border-slate-700">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3858.9436223176112!2d120.95116787589807!3d14.715779474244789!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397b39782747343%3A0x96851c9cc0434cca!2sMalanday%20National%20High%20School%20-%20Valenzuela%20City!5e0!3m2!1sen!2sph!4v1744250657489!5m2!1sen!2sph"
              className="w-full h-48"
              allowFullScreen
              loading="lazy"
              title="School Location"
            ></iframe>
          </div>
        </div>

       
        <div className="flex flex-col justify-between items-start">
          {/* Logo Section */}
          <div className="flex items-center gap-4 sm:gap-3 md:gap-4 lg:gap-6 mt-0">
            <img 
              src="/logo_mnhs-removebg-preview.png" 
              alt="MNHS Logo" 
              className="h-24 sm:h-28 md:h-32 filter brightness-0 invert" 
            />
            <img 
              src="/SDO-LOGO.png" 
              alt="SDO Logo" 
              className="h-24 sm:h-28 md:h-32" 
            />
          </div>

          {/* Development Team Section */}
          <div className="mt-4">
            <h3 className="text-white text-[11px] font-semibold mb-1">Development Team</h3>
            <ul className="space-y-1 text-[11px] text-gray-400">
              {[
                "Anne Franchesca S. Cleofas",
                "Kenshin L. Calma",
                "De Guzman, Sean Quintin C.",
                "Valenzuela, Arc Diñel D."
              ].map((dev, i) => (
                <li key={i} className="flex items-center gap-2">
                  
                  {dev}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <p>© <span id="current-year"></span> Malanday National High School</p>
            <p>All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
    {showPrivacyModal && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <p className="text-xs uppercase tracking-widest text-amber-500 font-semibold">Privacy Policy of Malanday EduTrack</p>
              <h2 className="text-xl font-bold text-[#0A2463]">Privacy &amp; Policy</h2>
            </div>
            <button
              onClick={() => setShowPrivacyModal(false)}
              className="text-gray-500 hover:text-gray-800 text-xl font-semibold"
              aria-label="Close privacy policy"
            >
              ×
            </button>
          </div>
          <div className="px-6 py-4 overflow-y-auto text-sm text-gray-700 space-y-5">
            <p>
              Malanday National High School (“we”, “our”, “the School”) is committed to protecting your personal data and ensuring compliance with Republic Act No. 10173 – Data Privacy Act of 2012. This Privacy Policy explains how the Malanday EduTrack System collects, uses, stores, and protects your information when you access or use the platform.
            </p>

            <section>
              <h3 className="text-lg font-semibold text-[#0A2463] mb-2">1. Information We Collect</h3>
              <p className="font-semibold">A. Personal Information Provided by Users</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Full Name</li>
                <li>Student/Alumni ID</li>
                <li>Learner Reference Number (LRN) or ID Number</li>
                <li>Contact Information (Email Address and Mobile Number)</li>
                <li>Appointment Details (Preferred Date and Time)</li>
                <li>Educational Information (Grade, Section, Graduation Year)</li>
                <li>Uploaded Documents (Valid ID, School ID, Request Letter)</li>
              </ul>
              <p className="font-semibold mt-3">B. System-Generated Information</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Request history and transaction logs</li>
                <li>QR code identifiers for document authentication</li>
                <li>Date/time of access and activities performed</li>
                <li>Device information (browser type, IP address, operating system)</li>
              </ul>
              <p className="mt-2">
                By accessing the system, you confirm that all information you provide is accurate and complete.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-[#0A2463] mb-2">2. Purpose of Data Collection</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Verify your identity for school document requests</li>
                <li>Schedule and process appointments efficiently</li>
                <li>Update you regarding request status, approvals, or issues</li>
                <li>Authenticate school-issued documents through QR verification</li>
                <li>Maintain accurate student records for administrative operations</li>
                <li>Perform internal analytics to improve system performance and services</li>
                <li>Ensure secure access to student and administrative modules</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-[#0A2463] mb-2">3. Data Protection and Security</h3>
              <p>
                We implement strict administrative, physical, and technical safeguards to protect your personal information. Access to your data is limited to authorized school personnel such as Registrar staff and ICT Admins.
              </p>
              <p className="mt-2">
                Personal information is not shared with external parties unless required by law, court order, or a government authority. QR codes displayed on school-issued documents will show only verification results and document authenticity. No sensitive personal information is exposed.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-[#0A2463] mb-2">4. Data Retention</h3>
              <p>All collected personal data will be retained for five (5) years, or as required by DepEd guidelines and school policies.</p>
              <p className="mt-2">After the retention period, data will be securely deleted through:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Digital file destruction</li>
                <li>Physical shredding for printed copies (if any)</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-[#0A2463] mb-2">5. Your Rights Under the Data Privacy Act</h3>
              <p>As a data subject, you have the right to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Access your personal data</li>
                <li>Correct/Update inaccurate or outdated information</li>
                <li>Withdraw consent at any time (Note: Withdrawal may affect ongoing requests or access to services.)</li>
                <li>File a complaint with the National Privacy Commission (NPC) if you believe your rights were violated</li>
                <li>Be informed about how your data is processed</li>
                <li>Object to certain types of data processing</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-[#0A2463] mb-2">6. Cookies and Tracking Technologies</h3>
              <p>
                The system may use cookies to improve user experience, maintain login sessions, and analyze system usage. You may disable cookies through browser settings, but this may affect system functionality.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-[#0A2463] mb-2">7. Contact Information</h3>
              <p>For concerns, clarification, or data privacy requests, you may contact:</p>
              <p className="mt-1 font-semibold">Data Protection Officer</p>
              <p>Malanday National High School</p>
              <p>Email: 305706@deped.gov.ph</p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-[#0A2463] mb-2">8. Consent</h3>
              <p>
                By creating an account, logging in, or clicking “AGREE,” you confirm that you have read and understood this Privacy Policy, voluntarily consent to the collection, use, and processing of your personal data, and accept the responsibilities and conditions stated above.
              </p>
            </section>
          </div>
          <div className="px-6 py-3 border-t flex justify-end">
            <button
              onClick={() => setShowPrivacyModal(false)}
              className="px-5 py-2 bg-[#0A2463] text-white rounded-lg hover:bg-[#142a6b] transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default Footer;