import { useState, useRef, useEffect } from "react";

function PrivacyPolicyPopup({ setShowPrivacyPolicy, setPolicyAccepted }) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const policyContentRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (policyContentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = policyContentRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 10) {
          setScrolledToBottom(true);
        }
      }
    };

    const ref = policyContentRef.current;
    if (ref) ref.addEventListener("scroll", handleScroll);
    return () => {
      if (ref) ref.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="privacy-overlay">
      <div className="privacy-popup">
        <button className="close-btn" onClick={() => setShowPrivacyPolicy(false)}>
          &times;
        </button>
        <h2>Privacy Policy for Students & Alumni</h2>

        <div className="privacy-content" ref={policyContentRef}>
          <p>
            Welcome to **[Your Institution Name]**. We value your privacy and are committed to protecting your personal information.
            This Privacy Policy explains how we collect, use, and safeguard your data when you register as a student or alumni.
          </p>
          <h3>1. Information We Collect</h3>
          <p>✔️ Personal details, LRN, email, contact number, and more.</p>
          <h3>2. How We Use Your Information</h3>
          <p>✔️ For identity verification, account security, and communication.</p>
          <h3>3. Data Protection & Security</h3>
          <p>🔒 Your data is encrypted and protected from unauthorized access.</p>
          <h3>4. Your Rights & Responsibilities</h3>
          <p>✅ You can request data access, updates, or deletion as needed.</p>
          <p><strong>By continuing, you confirm that you agree to our Privacy Policy.</strong></p>
        </div>

        <div className="privacy-checkbox">
          <input
            type="checkbox"
            id="agree"
            disabled={!scrolledToBottom}
            onChange={(e) => setPolicyAccepted(e.target.checked)}
          />
          <label htmlFor="agree">I have read and agree to the Privacy Policy.</label>
        </div>

        <button className="close-popup-btn" onClick={() => setShowPrivacyPolicy(false)} disabled={!scrolledToBottom}>
          Close
        </button>
      </div>
    </div>
  );
}

export default PrivacyPolicyPopup;
