export const officer = {
  id: "CRPF-2024-0042",
  name: "Rajesh Kumar",
  department: "Procurement Division | CRPF HQ",
  lastLogin: "14 Jan 2025, 09:32 AM",
  initials: "RK",
};

export const tenders = [
  {
    id: "TND-2025-0042",
    title: "Supply of Medical Equipment 2025",
    category: "Medical & Healthcare",
    authority: "CRPF Procurement Wing",
    deadline: "31 Jan 2025, 05:00 PM",
    value: 5000000,
    status: "OPEN",
    description: "Procurement of life-saving medical equipment including ventilators, defibrillators, and multi-para monitors for CRPF base hospitals.",
  },
  {
    id: "TND-2025-0043",
    title: "Annual Maintenance of IT Infrastructure",
    category: "Technology & IT",
    authority: "Ministry of Defence",
    deadline: "15 Feb 2025, 03:00 PM",
    value: 12000000,
    status: "OPEN",
    description: "Comprehensive AMC for servers, networking equipment, and end-user devices across Northern Command.",
  },
  {
    id: "TND-2025-0044",
    title: "Construction of Barracks in Sector 4",
    category: "Construction & Infrastructure",
    authority: "CPWD",
    deadline: "10 Feb 2025, 04:00 PM",
    value: 85000000,
    status: "OPEN",
    description: "Construction of G+3 barracks with allied services including water supply and electrical works.",
  }
];

export const proposals = [
  {
    id: "PROP-001",
    tenderId: "TND-2025-0042",
    companyName: "M/s Sharma Medical Pvt Ltd",
    regNo: "U74999DL2015PTC123456",
    submissionTime: "14 Jan 2025, 03:42:17 PM",
    bidValue: 4850000,
    confidence: 0.87,
    msmeStatus: "Registered",
    rank: 2,
    result: "ELIGIBLE",
    fraudRisk: false,
    matched: [
      { name: "Annual Turnover", required: "min ₹1 Cr", extracted: "₹1.25 Cr", source: "Page 4, Annual Report PDF", conf: 0.92, clause: "Clause 4.2(b)", reasoning: "The audited balance sheet on page 4 shows net revenue of ₹1.25 Cr for FY 2023-24, which exceeds the minimum threshold of ₹1 Cr specified in Clause 4.2(b)." },
      { name: "ISO 9001:2015 Certificate", required: "Valid Certificate", extracted: "Valid until Dec 2026", source: "Page 12, ISO Cert PDF", conf: 0.95, clause: "Clause 6.1", reasoning: "Certificate found and verification date indicates it is valid until December 2026." },
      { name: "GST Registration", required: "Active GSTIN", extracted: "Active, 07AABCS1429B1Z6", source: "Page 8, GST Cert", conf: 0.98, clause: "Clause 5.3", reasoning: "GST document matches required format and status is Active." },
      { name: "EMD Submitted", required: "₹2,50,000", extracted: "₹2,50,000 via RTGS", source: "Page 2, EMD Receipt", conf: 0.99, clause: "Clause 3.1", reasoning: "RTGS transfer receipt confirmed for the exact required amount." },
      { name: "MSME Registration", required: "Optional", extracted: "UDYAM-DL-10-0012345", source: "Page 10, Udyam Cert", conf: 0.96, clause: "Clause 7.2", reasoning: "Valid Udyam registration certificate provided." },
      { name: "Years of Experience", required: "min 3 yrs", extracted: "8 years", source: "Page 6, Company Profile", conf: 0.88, clause: "Clause 4.1", reasoning: "Company established in 2015, yielding over 8 years of operational history." },
      { name: "PAN Card", required: "Valid PAN", extracted: "AABCS1429B verified", source: "Page 9, PAN Copy", conf: 0.99, clause: "Clause 5.4", reasoning: "PAN details match the applying entity." },
      { name: "No Blacklisting Declaration", required: "Submitted", extracted: "Submitted and signed", source: "Page 15, Annexure B", conf: 0.91, clause: "Clause 8.1", reasoning: "Signed declaration on letterhead confirming no blacklisting history." }
    ],
    unmatched: [
      { name: "ISO 13485:2016 (Medical Devices)", required: "ISO 13485:2016", found: "ISO 14001", source: "Page 13, ISO Cert PDF", clause: "Clause 6.2", reasoning: "The ISO certificate provided (ISO 14001:2015) does not match the required certification type (ISO 13485:2016 — Medical Devices). Certificate number MED-ISO-2021-4412 is for environmental management, not medical device quality management.", evidence: [{ doc: "ISO Cert PDF", page: "13", text: "ISO 14001:2015 Environmental Management", reason: "Wrong ISO standard" }] },
      { name: "Minimum Bid Security", required: "₹5,00,000", found: "₹2,50,000", source: "Page 2, EMD Receipt", clause: "Clause 3.2", reasoning: "Only ₹2,50,000 EMD found, which is less than the required ₹5,00,000.", evidence: [{ doc: "EMD Receipt", page: "2", text: "Amount: 2,50,000 INR", reason: "Amount insufficient" }] }
    ],
    manualReview: [
      { name: "Turnover figure", expected: "Clear number", extracted: "Partially unclear", conf: 0.61, reason: "OCR confidence 0.61 — handwritten signature partially obscured on page 7", source: "Page 7, Balance Sheet" },
      { name: "Director's signature", expected: "Clear signature", extracted: "Skewed scan", conf: 0.58, reason: "OCR confidence 0.58 — scanned copy is skewed on page 15", source: "Page 15, Annexure B" },
      { name: "EMD bank stamp", expected: "Legible stamp", extracted: "Illegible", conf: 0.54, reason: "OCR confidence 0.54 — EMD bank stamp not clearly legible", source: "Page 2, EMD Receipt" }
    ]
  },
  {
    id: "PROP-002",
    tenderId: "TND-2025-0042",
    companyName: "Apollo Bio-Tech Industries",
    regNo: "U85110MH2010PTC210987",
    submissionTime: "13 Jan 2025, 11:20:05 AM",
    bidValue: 4920000,
    confidence: 0.95,
    msmeStatus: "Not Registered",
    rank: 1,
    result: "ELIGIBLE",
    fraudRisk: false,
    matched: [],
    unmatched: [],
    manualReview: []
  },
  {
    id: "PROP-003",
    tenderId: "TND-2025-0042",
    companyName: "Global Healthcare Solutions",
    regNo: "U74900KA2018PTC345678",
    submissionTime: "14 Jan 2025, 04:55:12 PM",
    bidValue: 4700000,
    confidence: 0.42,
    msmeStatus: "Registered",
    rank: 12,
    result: "MANUAL REVIEW",
    fraudRisk: true,
    matched: [],
    unmatched: [],
    manualReview: []
  },
  {
    id: "PROP-004",
    tenderId: "TND-2025-0042",
    companyName: "LifeCare Equipments",
    regNo: "U29210GJ2005PTC098765",
    submissionTime: "12 Jan 2025, 09:15:30 AM",
    bidValue: 5100000,
    confidence: 0.82,
    msmeStatus: "Registered",
    rank: 4,
    result: "REJECTED",
    fraudRisk: false,
    matched: [],
    unmatched: [],
    manualReview: []
  }
];

export const categories = [
  {
    id: "cat-1",
    icon: "🏥",
    title: "Medical & Healthcare",
    desc: "Medicines, equipment, PPE, hospital infrastructure",
    count: 8
  },
  {
    id: "cat-2",
    icon: "🍽️",
    title: "Food & Catering",
    desc: "Ration supply, canteen services, packaged food",
    count: 5
  },
  {
    id: "cat-3",
    icon: "🏗️",
    title: "Construction & Infrastructure",
    desc: "Civil works, roads, buildings, maintenance",
    count: 12
  },
  {
    id: "cat-4",
    icon: "💻",
    title: "Technology & IT",
    desc: "Hardware, software, networking, cybersecurity",
    count: 3
  },
  {
    id: "cat-5",
    icon: "📋",
    title: "Technical & Engineering",
    desc: "Machinery, vehicles, specialized equipment",
    count: 7
  },
  {
    id: "cat-6",
    icon: "💰",
    title: "Finance & Consulting",
    desc: "Audit services, legal, financial advisory",
    count: 2
  }
];
