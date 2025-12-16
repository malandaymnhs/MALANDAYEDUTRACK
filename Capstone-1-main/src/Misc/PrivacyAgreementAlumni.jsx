import PropTypes from 'prop-types';

const PrivacyAgreementAlumni = ({ isOverlay = false, onClose = null }) => {
  return (
    <div className={`${isOverlay ? "" : "bg-white rounded-xl shadow-xl w-full max-w-2xl mx-auto my-8"}`}>
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-[#274690] text-white rounded-t-xl">
        <h2 className="text-xl font-bold flex items-center">
          <span className="mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </span>
          Privacy Consent Form
 </h2>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Logo and title */}
        <div className="text-center mb-6">
          <div className="mb-2 flex justify-center">
            <img src="logo natin.png" alt="School Logo" className="h-16" />
          </div>
          <h2 className="text-xl font-bold text-[#274690]">Malanday National High School</h2>
          <p className="text-gray-600">Alumni Document Request System</p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-lg font-semibold text-[#274690] mb-4">Alumni Document Request Process</h3>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 flex items-start">
                <div className="bg-[#274690] text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Review Privacy Agreement</h4>
                <p className="text-sm text-gray-600">Please read through our privacy policy to understand how your information will be handled and protected.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 flex items-start">
                <div className="bg-[#274690] text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Complete Alumni Request Form</h4>
                <p className="text-sm text-gray-600">Fill out all necessary alumni information and select your preferred claiming date for document pickup.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 flex items-start">
                <div className="bg-[#274690] text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Registrar Verification</h4>
                <p className="text-sm text-gray-600">Your alumni status and records will be verified by the registrar before document preparation.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 flex items-start">
                <div className="bg-[#274690] text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
                  4
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Email Updates</h4>
                <p className="text-sm text-gray-600">Receive status updates about your document request via the email address provided.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 flex items-start">
                <div className="bg-[#274690] text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
                  5
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Document Pickup</h4>
                <p className="text-sm text-gray-600">Visit the school on your scheduled date with valid ID to collect your requested document.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-amber-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              PRIVACY NOTICE
            </h3>
            <p className="text-sm text-amber-700 mb-2">
              Malanday National High School is committed to protecting and respecting your privacy in accordance
              with Republic Act No. 10173, or the Data Privacy Act of 2012.
            </p>
          </div>
          
           
          <h4 className="font-semibold text-gray-800 mb-2">COLLECTION OF PERSONAL INFORMATION</h4>
          <p className="text-sm text-gray-600 mb-2">When requesting school documents, the following personal information may be collected:</p>
          <ul className="list-disc pl-5 mb-4 text-sm text-gray-600 space-y-1">
            <li>Full Name</li>
            <li>Student or Alumni ID</li>
            <li>Contact Information (Email Address and Mobile Number)</li>
            <li>Learner Reference Number (LRN) or ID Number</li>
            <li>Appointment Details (Preferred Date and Time)</li>
            <li>Educational Information (Current Grade, Section, Graduation Year)
            </li>
            <li>Uploaded Documents (e.g., Valid ID, School ID, Request Letter)
            </li>
            <li>In addition, the system collects system-generated data such as request history, QR code identifiers for document authentication, and system access l
             </li>
          </ul>
          <p className="text-sm text-gray-600 mb-4">By submitting a request, you confirm that the information provided is accurate and complete.</p>
          
          <h4 className="font-semibold text-gray-800 mb-2">PURPOSE OF DATA COLLECTION</h4>
          <p className="text-sm text-gray-600 mb-2">The personal information you provide will be used for the following purposes:</p>
          <ul className="list-disc pl-5 mb-4 text-sm text-gray-600 space-y-1">
            <li>To verify your identity and authenticate document requests</li>
            <li>To schedule and process document claims efficiently</li>
            <li>To communicate with you regarding request status and updates</li>
            <li>To ensure the authenticity of school-issued documents through QR code integration</li>
            <li>To manage internal analytics to improve school services</li>
          </ul>
          
          <h4 className="font-semibold text-gray-800 mb-2">DATA PROTECTION AND SECURITY</h4>
          <p className="text-sm text-gray-600 mb-4">
          Your information will <b>only </b>be accessible to authorized personnel (Registrar and ICT Admin staff) for official school transactions.
         </p>
          <p className="text-sm text-gray-600 mb-4">
            Your personal data will not be shared with third parties unless required by law, a court order,
            or a government authority.
          </p>
         <p className="text-sm text-gray-600 mb-4"> 
           QR codes attached to documents will only display verification results and basic document authenticity confirmation; no sensitive personal data will be exposed publicly.
         </p>

          <h4 className="font-semibold text-gray-800 mb-2">DATA RETENTION</h4>
          <p className="text-sm text-gray-600 mb-4">
          Personal data collected will be retained for a period of <b>five (5) 
          years </b>in accordance with school policies and DepEd guidelines.

          </p>
          <p className="text-sm text-gray-600 mb-4"> After the retention period, all records will be securely disposed of through secure deletion 
            or physical shredding (for printed requests, if any).</p>
          
          <h4 className="font-semibold text-gray-800 mb-2">YOUR RIGHTS UNDER THE DATA PRIVACY ACT</h4>
          <p className="text-sm text-gray-600 mb-2">In accordance with the Data Privacy Act of 2012, you have the following rights:</p>
          <ul className="list-disc pl-5 mb-4 text-sm text-gray-600 space-y-1">
            <li>Access and correct your personal data</li>
            <li>Withdraw consent at any time (Note: Withdrawal may affect your ongoing request)</li>
            <li>Lodge a complaint with the National Privacy Commission if you believe your data privacy rights have been violated </li>
            
          </ul>
          
          <h4 className="font-semibold text-gray-800 mb-2">CONTACT INFORMATION</h4>
          <p className="text-sm text-gray-600 mb-2">
            For any concerns regarding your data privacy, you may contact:
          </p>
          <div className="text-sm text-gray-600 mb-4 pl-5">
            <p>Data Protection Officer</p>
            <p>Malanday National High School</p>
            <p>Email: 305706@deped.gov.ph</p>
          </div>
          
          <h4 className="font-semibold text-gray-800 mb-2">CONSENT</h4>
          <p className="text-sm text-gray-600 mb-4">
          By clicking “Agree” or signing below, you acknowledge that you have read and understood 
          this Privacy Notice, and that you voluntarily consent to the collection, use, storage, and processing 
          of your personal information by Malanday National High School for the purposes stated above.
          </p>
        </div>
      </div>
      
      <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-xl text-center">
        <p className="text-sm text-gray-600">
          Malanday National High School
        </p>
        
        {isOverlay && onClose && (
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-[#274690] hover:bg-[#1b3469] text-white rounded-lg transition-colors shadow-md"
          >
            I Understand
          </button>
        )}
      </div>
    </div>
  );
};

PrivacyAgreementAlumni.propTypes = {
  isOverlay: PropTypes.bool,
  onClose: PropTypes.func
};

export default PrivacyAgreementAlumni;