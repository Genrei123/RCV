<p align="center">
<img width="125" height="136" alt="image" src="https://github.com/user-attachments/assets/3f63f493-04e0-4793-91e8-8009a2910608" />
</p>


# Regulatory Compliance Verification System (RCV)

## Overview

RCV is a Web3-enabled **R**egulatory **C**ompliance **V**erification system designed for the Bureau of Animal Industry (BAI) to verify animal feed products against Administrative Order No. 12, series of 2017. The system combines blockchain technology with automated verification processes to ensure product authenticity and regulatory compliance.

## Core Features

### Authentication & Authorization
- Role-based access control (ADMIN, AGENT, USER)
- JWT-based authentication with Firebase integration
- Wallet authorization system requiring admin approval
- Automatic logout on wallet mismatch detection

### Product Management
- Product registration with regulatory information (LTO Number, CFPR Number, Lot Number)
- Company and brand name association
- Product classification hierarchy
- Image upload support (front/back views)

### Company Management
- Business registration and details management
- Document management (permits, licenses, certificates)
- Google Maps location integration

### Blockchain Integration
- Certificate storage on Sepolia testnet
- MetaMask wallet integration
- Immutable certificate hash storage
- Transaction verification and tracking

### Multi-Signature Approval Workflow

The system implements a multi-signature approval process to prevent fraudulent certificate submissions:

1. **Submission**: AGENT/ADMIN creates product/company entry
   - System generates SHA-256 hash of entity data
   - Certificate submitted with "pending" status

2. **Review**: All admins must review and approve
   - Each admin signs approval via MetaMask
   - Server verifies signatures using ethers.js
   - Progress tracked (e.g., "2 of 3 admins approved")

3. **Rejection**: Any admin can reject with documented reason
   - Rejection requires MetaMask signature
   - Submitter notified and can modify/resubmit

4. **Approval**: After all admins approve
   - Certificate hash stored on Sepolia blockchain
   - Transaction hash saved to database
   - Certificate status updated to "approved"

**Security Guarantees:**
- No single person can submit fraudulent certificates
- All approvals require cryptographic signatures
- Submitters cannot approve their own submissions
- Same admin cannot approve twice
- Complete audit trail maintained
- Wallet mismatch triggers automatic logout

## Technology Stack

### Frontend (web)
- React 18 with TypeScript
- Vite build tooling
- TailwindCSS styling
- shadcn/ui components
- React Router
- Axios for API communication
- MetaMask integration

### Backend (api)
- Node.js with Express
- TypeScript
- TypeORM with PostgreSQL
- ethers.js v6 for blockchain operations
- Firebase Admin SDK
- Zod validation

### Blockchain
- Sepolia Testnet (Ethereum)
- Smart contract for certificate storage
- ethers.js v6

## Project Structure

```
RCV/
├── api/                          # Backend API
│   ├── src/
│   │   ├── controllers/          # Route handlers
│   │   │   ├── blockchain/       # Blockchain controllers
│   │   │   │   ├── CertificateApproval.ts
│   │   │   │   └── SepoliaBlockchain.ts
│   │   │   └── user/
│   │   ├── middleware/           # Express middleware
│   │   │   ├── verifyUser.ts
│   │   │   ├── verifyAdmin.ts
│   │   │   └── verifyWalletMatch.ts
│   │   ├── routes/               # API routes
│   │   ├── services/             # Business logic
│   │   │   ├── certificateApprovalService.ts
│   │   │   └── sepoliaBlockchainService.ts
│   │   ├── typeorm/              # Database
│   │   │   ├── entities/
│   │   │   │   ├── user.entity.ts
│   │   │   │   ├── certificateApproval.entity.ts
│   │   │   │   └── ...
│   │   │   └── data-source.ts
│   │   └── setUpApp.ts
│   └── package.json
│
├── web/                          # Frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── ApprovalQueue.tsx
│   │   │   ├── MySubmissions.tsx
│   │   │   ├── AddProductModal.tsx
│   │   │   ├── AddCompanyModal.tsx
│   │   │   └── MetaMaskConnector.tsx
│   │   ├── contexts/
│   │   │   └── MetaMaskContext.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   └── Blockchain.tsx
│   │   ├── services/
│   │   │   ├── approvalService.ts
│   │   │   ├── metaMaskService.ts
│   │   │   └── ...
│   │   └── typeorm/entities/
│   └── package.json
│
└── README.md
```

## Research Context

This system is part of a thesis study examining the integration of Web3 technologies to enhance regulatory compliance verification processes. The research focuses on:

- Automated OCR-based text extraction from product packaging
- Blockchain-backed certificate immutability
- Multi-signature approval workflows for fraud prevention
- Dual-platform accessibility (mobile and kiosk)
- Real-time compliance verification against regulatory databases

The system addresses current challenges in the Bureau of Animal Industry's manual verification processes, including time consumption, human error susceptibility, and limited audit capabilities.

<p align="center">
https://github.com/user-attachments/assets/682aa57a-7a8a-478c-a12e-1842a5151d06
</p>


