# 🔐 Certificate Blockchain System

## Overview

The RCV Certificate Blockchain System provides **tamper-proof PDF certificates** for companies and products using blockchain technology. Every generated PDF certificate is cryptographically hashed and stored in an immutable blockchain, ensuring authenticity and preventing forgery.

---

## 🎯 How It Works

### 1. **Certificate Generation**
When a company or product certificate is generated:

```
PDF Generation → SHA-256 Hash Calculation → Blockchain Storage → QR Code Embedding
```

**Example Flow:**
1. Admin clicks "Download Certificate" for a company
2. System generates PDF with company details
3. Calculates SHA-256 hash of the PDF bytes (64-character hex string)
4. Creates unique Certificate ID: `CERT-COMP-{companyId}-{timestamp}`
5. Mines a new blockchain block (Proof of Work)
6. Stores certificate metadata + PDF hash in block
7. Embeds Certificate ID in PDF's QR code
8. Downloads PDF to user

### 2. **Blockchain Block Structure**

Each certificate block contains:

```typescript
{
  index: number;              // Block position in chain
  timestamp: Date;            // When block was created
  precedingHash: string;      // Hash of previous block (chain linkage)
  hash: string;               // This block's hash (SHA-256)
  nonce: number;              // Proof of Work nonce
  difficulty: 4;              // Mining difficulty
  data: {
    certificateId: string;    // Unique ID: CERT-COMP-xxx or CERT-PROD-xxx
    certificateType: 'company' | 'product';
    pdfHash: string;          // SHA-256 hash of PDF file
    entityId: string;         // Company/Product database ID
    entityName: string;       // Display name
    licenseNumber?: string;   // For companies
    ltoNumber?: string;       // For products
    cfprNumber?: string;      // For products
    issuedDate: Date;         // Certificate issue date
    metadata?: object;        // Additional info
  }
}
```

### 3. **Proof of Work (Mining)**

Each block must be "mined" before being added to the chain:

```typescript
// Block hash must start with 4 zeros (difficulty = 4)
while (!hash.startsWith("0000")) {
  nonce++;
  hash = SHA256(index + precedingHash + timestamp + data + nonce);
}
```

**Why?** Makes it computationally expensive to tamper with the blockchain.

### 4. **Chain Validation**

The blockchain validates integrity by checking:
- ✅ Each block's hash matches its recomputed hash
- ✅ Each block's `precedingHash` matches the previous block's `hash`
- ✅ All blocks follow the chain from genesis to latest

```typescript
// Validation pseudocode
for (let i = 1; i < blockchain.length; i++) {
  const current = blockchain[i];
  const previous = blockchain[i - 1];
  
  // Verify hash integrity
  if (current.hash !== current.computeHash()) {
    return false; // Block tampered!
  }
  
  // Verify chain linkage
  if (current.precedingHash !== previous.hash) {
    return false; // Chain broken!
  }
}
return true; // Blockchain is valid
```

---

## 📋 API Endpoints

### **Add Certificate to Blockchain**
```http
POST /api/v1/certificate-blockchain/add
Content-Type: application/json

{
  "certificateId": "CERT-COMP-uuid-1234567890",
  "certificateType": "company",
  "pdfHash": "a1b2c3d4e5f6...64-char-hex",
  "entityId": "company-uuid",
  "entityName": "Acme Corporation",
  "licenseNumber": "LIC-12345"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Certificate successfully added to blockchain",
  "certificate": {
    "certificateId": "CERT-COMP-uuid-1234567890",
    "blockIndex": 42,
    "blockHash": "00007a3f...",
    "timestamp": "2025-11-05T10:30:00Z",
    "certificateType": "company",
    "entityName": "Acme Corporation",
    "pdfHash": "a1b2c3d4e5f6...",
    "isChainValid": true
  }
}
```

### **Verify Certificate PDF**
```http
POST /api/v1/certificate-blockchain/verify
Content-Type: application/json

{
  "certificateId": "CERT-COMP-uuid-1234567890",
  "pdfHash": "a1b2c3d4e5f6...64-char-hex"
}
```

**Response (Valid):**
```json
{
  "success": true,
  "message": "Certificate is authentic and verified",
  "verification": {
    "isValid": true,
    "certificateId": "CERT-COMP-uuid-1234567890",
    "blockIndex": 42,
    "certificateType": "company",
    "entityName": "Acme Corporation",
    "issuedDate": "2025-11-05T10:30:00Z",
    "pdfHashMatch": true,
    "blockIntegrity": true
  }
}
```

**Response (Tampered):**
```json
{
  "success": false,
  "message": "PDF has been tampered with - hash does not match blockchain record",
  "verification": {
    "isValid": false,
    "pdfHashMatch": false,
    "blockIntegrity": true
  }
}
```

### **Get Certificate Details**
```http
GET /api/v1/certificate-blockchain/certificate/{certificateId}
```

### **Get All Certificates (Paginated)**
```http
GET /api/v1/certificate-blockchain/certificates?page=1&limit=20
```

### **Get Blockchain Statistics**
```http
GET /api/v1/certificate-blockchain/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalCertificates": 156,
    "isValid": true,
    "difficulty": 4,
    "companyCertificates": 45,
    "productCertificates": 111,
    "totalBlocks": 157,
    "chainIntegrity": true,
    "latestCertificate": {
      "certificateId": "CERT-PROD-uuid-9876543210",
      "entityName": "Premium Coffee Beans"
    }
  }
}
```

### **Validate Blockchain Integrity**
```http
GET /api/v1/certificate-blockchain/validate
```

### **Calculate PDF Hash (Utility)**
```http
POST /api/v1/certificate-blockchain/calculate-hash
Content-Type: application/json

{
  "pdfBase64": "JVBERi0xLjcKCjQgMCBvYmoKPDwKL0ZpbHRlci..."
}
```

---

## 🔍 Certificate Verification Process

### **Scenario: Verifying a Downloaded Certificate**

#### **Web App (Manual Upload Verification)**
```typescript
// User uploads PDF file
const file = document.getElementById('pdfUpload').files[0];

// Calculate hash
const pdfHash = await CertificateBlockchainService.calculatePDFHash(file);

// Extract certificate ID from QR code (user scans QR code on PDF)
const qrData = JSON.parse(scannedQRCodeData);
const certificateId = qrData.certificateId;

// Verify against blockchain
const result = await CertificateBlockchainService.verifyCertificate(
  certificateId, 
  pdfHash
);

if (result.verification.isValid) {
  alert("✅ Certificate is authentic!");
} else {
  alert("❌ Certificate has been tampered with!");
}
```

#### **Mobile App (QR Code Scan)**
```dart
// Scan QR code on certificate PDF
final qrData = await scanQR();
final certData = jsonDecode(qrData);

// Show certificate info to user
showDialog(
  title: 'Certificate Found',
  content: 'Entity: ${certData['entityName']}\n'
           'Type: ${certData['type']}\n'
           'Issued: ${certData['certificateDate']}'
);

// Option: Verify with blockchain (requires PDF upload)
if (userWantsToVerify) {
  final pdfFile = await pickPDF();
  final hash = await calculateHash(pdfFile);
  final isValid = await verifyCertificate(
    certData['certificateId'], 
    hash
  );
  
  if (isValid) {
    showSuccessMessage('Certificate is authentic');
  } else {
    showErrorMessage('Certificate has been tampered with');
  }
}
```

---

## 🛡️ Security Features

### **1. Tamper Detection**
Any modification to the PDF (even changing a single byte) will:
- Change the SHA-256 hash completely
- Fail verification against blockchain record
- Alert that certificate is not authentic

**Example:**
```
Original PDF Hash: a1b2c3d4e5f6...
Modified PDF Hash: 9z8y7x6w5v4u... (completely different)
Blockchain Hash:   a1b2c3d4e5f6... (original)
Result: ❌ TAMPERED - Hashes don't match!
```

### **2. Immutable Blockchain**
- Cannot delete or modify blocks without breaking chain
- Proof of Work makes rewriting expensive
- Chain validation detects any tampering
- Decentralized trust model

### **3. Cryptographic Proof**
- SHA-256 hash function (256-bit security)
- Collision resistance (impossible to find two PDFs with same hash)
- One-way function (can't reverse hash to get PDF)

### **4. Chain Linkage**
```
Block 1 → Block 2 → Block 3 → Block 4
  |         |         |         |
Hash A    Hash B    Hash C    Hash D
  ↑         ↑         ↑         ↑
  └─────────┴─────────┴─────────┘
  Changing any block breaks all subsequent blocks
```

---

## 📊 Blockchain Page (Web Dashboard)

### **Features:**
- **Statistics Cards**: Total certificates, company/product counts, chain status
- **Blockchain Info**: Total blocks, difficulty, integrity percentage
- **Certificate Table**: Paginated list with search and filters
- **Certificate Details**: Click to view full block data
- **Real-time Status**: Chain validity indicator

### **UI Components:**
- Green dot 🟢 = Valid blockchain
- Red dot 🔴 = Compromised blockchain
- Block numbers with `#` badge
- Certificate type badges (Company/Product)
- Validity badges (✓ Valid / ✗ Invalid)

---

## 🔄 Integration with Existing Features

### **Company Registration**
```typescript
// In AddCompanyModal.tsx
const handleDownloadCertificate = async () => {
  // 1. Generate PDF
  // 2. Calculate hash
  // 3. Add to blockchain
  // 4. Download PDF with embedded certificate ID
  await PDFGenerationService.generateAndDownloadCompanyCertificate(company);
};
```

### **Product Creation**
```typescript
// In Products.tsx
const handleDownloadCertificate = async (product) => {
  // Automatically adds to blockchain when generating certificate
  await PDFGenerationService.generateAndDownloadProductCertificate(product);
};
```

### **QR Code Data**
```json
{
  "certificateId": "CERT-COMP-uuid-1234567890",
  "id": "company-uuid",
  "name": "Acme Corporation",
  "licenseNumber": "LIC-12345",
  "address": "123 Business St",
  "certificateDate": "2025-11-05T10:30:00Z",
  "type": "company-certificate"
}
```

**When scanned:**
- User sees company/product information
- Can verify certificate authenticity via blockchain lookup
- Optional: Upload PDF to verify hash matches blockchain

---

## 🚀 Testing the System

### **1. Generate a Certificate**
```bash
# Web app: Go to Companies page
# Click on a company → Download Certificate
# Console logs:
✅ Certificate added to blockchain at block 42
📄 Certificate ID: CERT-COMP-uuid-1234567890
🔐 PDF Hash: a1b2c3d4e5f6...
```

### **2. View Blockchain**
```bash
# Navigate to /blockchain page
# See the new certificate in the table
# Stats updated with new count
```

### **3. Verify via API**
```bash
curl -X POST http://localhost:3000/api/v1/certificate-blockchain/verify \
  -H "Content-Type: application/json" \
  -d '{
    "certificateId": "CERT-COMP-uuid-1234567890",
    "pdfHash": "a1b2c3d4e5f6..."
  }'
```

### **4. Test Tampering Detection**
```bash
# 1. Download a certificate PDF
# 2. Open in editor and change any text
# 3. Save the modified PDF
# 4. Calculate new hash (will be different)
# 5. Try to verify with original certificateId
# Result: ❌ "PDF has been tampered with"
```

### **5. Validate Chain**
```bash
curl http://localhost:3000/api/v1/certificate-blockchain/validate
# Should return: "isValid": true
```

---

## 📦 Database Storage

### **Note: In-Memory Blockchain**
Current implementation stores blockchain in **server memory** (RAM):

```typescript
// api/src/services/certificateblockchain.ts
let globalCertificateBlockchain: CertificateBlockchain | null = null;
```

**Implications:**
- ✅ Fast access (no DB queries)
- ✅ Simple implementation
- ❌ Lost on server restart
- ❌ Not shared across multiple server instances

### **Future: Persistent Storage**
For production, consider:

**Option 1: Database Table**
```sql
CREATE TABLE blockchain_certificates (
  block_index INT PRIMARY KEY,
  timestamp DATETIME,
  preceding_hash VARCHAR(64),
  block_hash VARCHAR(64),
  nonce INT,
  certificate_id VARCHAR(100),
  certificate_type ENUM('company', 'product'),
  pdf_hash VARCHAR(64),
  entity_id VARCHAR(36),
  entity_name VARCHAR(255),
  license_number VARCHAR(100),
  lto_number VARCHAR(100),
  cfpr_number VARCHAR(100),
  issued_date DATETIME,
  metadata JSON
);
```

**Option 2: Separate Blockchain Database (e.g., PostgreSQL with JSONB)**

**Option 3: Distributed Ledger (e.g., Hyperledger Fabric)**

---

## 🎓 Key Concepts

### **What is a Hash?**
A hash is a **unique fingerprint** of data. Think of it like:
- PDF file → SHA-256 → `a1b2c3d4e5f6...` (64 characters)
- Changing **1 byte** in PDF → Completely different hash
- Same PDF → Always same hash

### **What is Blockchain?**
A **chain of blocks** where:
- Each block contains data (certificates)
- Each block links to previous block (via hash)
- Changing one block breaks all subsequent blocks
- Makes historical records immutable

### **What is Proof of Work?**
A **mining puzzle** that:
- Requires computational effort to solve
- Makes it expensive to create fake blocks
- Easy to verify solution
- Difficulty adjustable (currently 4 leading zeros)

### **Why is this Secure?**
1. **Cryptographic Hashing**: Can't reverse or fake hashes
2. **Chain Linkage**: Tampering breaks the chain
3. **Proof of Work**: Expensive to rewrite history
4. **Public Verification**: Anyone can validate the chain

---

## 🔮 Future Enhancements

### **1. QR Code Self-Verification**
Include PDF hash in QR code:
```json
{
  "certificateId": "CERT-COMP-uuid-1234567890",
  "pdfHash": "a1b2c3d4e5f6...",
  "blockIndex": 42
}
```

### **2. Mobile Verification App**
- Scan QR code
- Upload PDF (optional)
- Show verification result with visual indicators

### **3. Blockchain Persistence**
- Save to MySQL on each block addition
- Load from DB on server startup
- Sync across multiple servers

### **4. Smart Contracts**
- Expiration handling
- Renewal workflows
- Revocation mechanism

### **5. Public Blockchain Explorer**
- Web page showing all blocks
- Search by certificate ID, entity name
- Block details with hash verification

### **6. Digital Signatures**
- Sign PDFs with private key
- Include signature in blockchain
- Verify authenticity + signer identity

---

## 📞 Support

For questions about the Certificate Blockchain System:
- Review this documentation
- Check API endpoint responses
- Validate blockchain integrity via `/validate` endpoint
- Inspect browser console logs for detailed information

---

**Document Version**: 1.0  
**Last Updated**: November 5, 2025  
**System**: RCV Certificate Blockchain
