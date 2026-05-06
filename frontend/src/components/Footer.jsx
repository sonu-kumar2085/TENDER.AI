import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, BookOpen, FileText, Shield, Phone, Mail, ExternalLink } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col z-10">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-xl font-bold text-government-primaryDark">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={22} />
          </button>
        </div>
        <div className="overflow-y-auto p-5 text-sm text-gray-700 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
};

const Footer = () => {
  const [helpOpen, setHelpOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [isoOpen, setIsoOpen] = useState(false);

  return (
    <>
      <footer className="bg-government-footerBg text-government-footerText w-full mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div className="space-y-2">
            <div className="text-white font-bold text-lg flex items-center gap-2">
              <img src="/emblem.svg" alt="National Emblem" className="h-7 w-7 object-contain brightness-0 invert" />
              TENDER
            </div>
            <div className="text-government-primaryPale">Government Procurement Intelligence System</div>
            <div className="text-government-primaryPale pt-4">© 2025 Government of India. All Rights Reserved.</div>
          </div>

          <div className="space-y-2 flex flex-col">
            <Link to="/dashboard" className="text-white hover:text-government-primaryPale transition-colors py-1">Home</Link>
            <Link to="/dashboard" className="text-white hover:text-government-primaryPale transition-colors py-1">Active Tenders</Link>
            <button onClick={() => setAuditOpen(true)} className="text-white hover:text-government-primaryPale transition-colors py-1 text-left">Audit Logs</button>
            <button onClick={() => setHelpOpen(true)} className="text-white hover:text-government-primaryPale transition-colors py-1 text-left">Help & Documentation</button>
            <a
              href="https://rtionline.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-government-primaryPale transition-colors py-1 flex items-center gap-1"
            >
              RTI Portal <ExternalLink size={12} />
            </a>
          </div>

          <div className="space-y-2">
            <a
              href="mailto:procurement@gov.in"
              className="text-white hover:text-government-primaryPale transition-colors flex items-center gap-2"
            >
              <Mail size={14} />
              Nodal Officer: procurement@gov.in
            </a>
            <a
              href="tel:18001234567"
              className="text-white hover:text-government-primaryPale transition-colors flex items-center gap-2"
            >
              <Phone size={14} />
              Helpline: 1800-123-4567 (Toll Free)
            </a>
            <a
              href="https://www.nic.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-government-primaryPale transition-colors pt-2 flex items-center gap-1"
            >
              NIC Data Centre Hosted <ExternalLink size={12} />
            </a>
            <button
              onClick={() => setIsoOpen(true)}
              className="text-white hover:text-government-primaryPale transition-colors flex items-center gap-2"
            >
              <Shield size={14} />
              ISO 27001 Certified
            </button>
          </div>
        </div>

        <div className="bg-[#0D3D11] text-center py-3 text-xs text-government-primaryPale">
          Site designed and developed by National Informatics Centre (NIC) | Best viewed in Chrome 90+ at 1280x720<br />
          All evaluation actions are recorded under the Electronic Evidence Act. Audit trail is CAG-compliant and RTI-ready.
        </div>
      </footer>

      {/* Help & Documentation Modal */}
      <Modal isOpen={helpOpen} onClose={() => setHelpOpen(false)} title="Help & Documentation">
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <BookOpen size={20} className="text-government-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-government-primaryDark mb-1">Getting Started</h3>
              <p>Login using your Employee ID and password provided by your nodal officer. Select your department from the dropdown before signing in.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <FileText size={20} className="text-government-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-government-primaryDark mb-1">Creating a Tender</h3>
              <p>From the Dashboard, click <strong>+ Add New Tender</strong>. Fill in the tender name, type, issuing authority, submission deadline, and estimated value. Upload the official tender PDF document and click <strong>Create Tender</strong>.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <FileText size={20} className="text-government-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-government-primaryDark mb-1">Submitting a Proposal</h3>
              <p>Navigate to a tender by clicking it on the Dashboard. Click <strong>+ Add Proposal</strong>, fill in vendor details, bid value, and upload all PDF documents (bid document, ISO cert, GST certificate, EMD receipt, etc.).</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Shield size={20} className="text-government-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-government-primaryDark mb-1">AI Analysis & Decision</h3>
              <p>After proposal submission, the system automatically extracts and evaluates criteria. Results are ranked by confidence score. Officers can review flagged items and submit a final decision (Approve / Reject / Clarification). All decisions are permanently recorded in the audit trail.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Shield size={20} className="text-government-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-government-primaryDark mb-1">Fraud Detection</h3>
              <p>The system automatically detects anomalies such as duplicate certificates, identical financial figures, and network-linked bidders. Proposals flagged with a fraud risk indicator require heightened scrutiny before a final decision.</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
            <strong>Support:</strong> For technical issues, contact <a href="mailto:support@nic.in" className="underline">support@nic.in</a> or call the helpline at 1800-123-4567.
          </div>
        </div>
      </Modal>

      {/* Audit Logs Modal */}
      <Modal isOpen={auditOpen} onClose={() => setAuditOpen(false)} title="Audit Log Information">
        <div className="space-y-5">
          <p className="text-government-textPrimary">
            TENDER.AI maintains a complete, tamper-evident audit trail of all procurement actions in compliance with the <strong>Electronic Evidence Act</strong> and <strong>CAG auditing standards</strong>.
          </p>

          <div className="space-y-3">
            <h3 className="font-bold text-government-primaryDark border-b pb-1">What is Logged?</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Officer login and session activity (with timestamps and IP)</li>
              <li>Tender creation, modification, and status changes</li>
              <li>All proposal submissions (with document hashes)</li>
              <li>AI analysis results and confidence scores (with SHA-256 audit hash)</li>
              <li>Manual review decisions with officer ID and justification</li>
              <li>Final evaluation decisions (Approve/Reject)</li>
              <li>Fraud flag triggers and detection events</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-government-primaryDark border-b pb-1">Compliance</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>All records are CAG-compliant and RTI-ready</li>
              <li>Data hosted at NIC Data Centre (ISO 27001 certified)</li>
              <li>Audit hashes generated using SHA-256 for tamper detection</li>
              <li>Records are retained for a minimum of 7 years</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-800">
            <strong>Note:</strong> Full audit log export is available to authorized officers and CAG auditors. Contact your nodal officer at <a href="mailto:procurement@gov.in" className="underline">procurement@gov.in</a> to request access.
          </div>
        </div>
      </Modal>

      {/* ISO Certification Modal */}
      <Modal isOpen={isoOpen} onClose={() => setIsoOpen(false)} title="ISO 27001:2022 Certification">
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <Shield size={40} className="text-green-700 flex-shrink-0" />
            <div>
              <p className="font-bold text-green-800 text-base">ISO/IEC 27001:2022 Certified</p>
              <p className="text-green-700 text-sm">Information Security Management System</p>
            </div>
          </div>

          <p className="text-government-textPrimary">
            The TENDER.AI platform is hosted at the <strong>National Informatics Centre (NIC) Data Centre</strong>, which holds ISO/IEC 27001:2022 certification for its Information Security Management System (ISMS).
          </p>

          <div className="space-y-2">
            <h3 className="font-bold text-government-primaryDark">What this means for you:</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Your data is protected by internationally recognized security standards</li>
              <li>Regular security audits and vulnerability assessments are conducted</li>
              <li>Physical and logical access controls are strictly enforced</li>
              <li>Disaster recovery and business continuity plans are in place</li>
              <li>Data encryption in transit (TLS 1.3) and at rest (AES-256)</li>
            </ul>
          </div>

          <a
            href="https://www.nic.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-government-primary hover:underline text-sm font-medium"
          >
            Visit NIC official website <ExternalLink size={14} />
          </a>
        </div>
      </Modal>
    </>
  );
};

export default Footer;
