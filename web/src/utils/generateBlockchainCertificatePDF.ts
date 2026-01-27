import { jsPDF } from 'jspdf';

export interface BlockchainCertificateData {
  entityName: string;
  entityType: 'product' | 'company';
  certificateId: string;
  pdfHash: string;
  timestamp: string;
  blockNumber?: number;
  blockTimestamp?: string;
  transactionHash: string;
  version?: string;
  // Renewal fields
  isRenewal?: boolean;
  previousCertificateHash?: string;
}

/**
 * Generate a Blockchain Verification Certificate PDF
 * This certificate proves that the entity was registered on the Sepolia blockchain
 * and can be used as proof of authenticity even if the original database is lost.
 */
export const generateBlockchainCertificatePDF = (data: BlockchainCertificateData): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Colors
  const primaryColor: [number, number, number] = [88, 28, 135]; // Purple-800
  const secondaryColor: [number, number, number] = [107, 114, 128]; // Gray-500
  const successColor: [number, number, number] = [22, 163, 74]; // Green-600

  // Border
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  
  // Inner border
  doc.setLineWidth(0.5);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

  // Header
  yPos = 35;
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('BLOCKCHAIN VERIFICATION CERTIFICATE', pageWidth / 2, yPos, { align: 'center' });

  // Title
  yPos += 12;
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.text('Certificate of Authenticity', pageWidth / 2, yPos, { align: 'center' });

  // Subtitle
  yPos += 10;
  doc.setFontSize(11);
  doc.setTextColor(...secondaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Secured on Ethereum Sepolia Blockchain', pageWidth / 2, yPos, { align: 'center' });

  // Decorative line
  yPos += 10;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(1);
  doc.line(margin + 30, yPos, pageWidth - margin - 30, yPos);

  // Entity Type Badge
  yPos += 15;
  const badgeWidth = 40;
  const badgeHeight = 8;
  const badgeX = (pageWidth - badgeWidth) / 2;
  doc.setFillColor(...primaryColor);
  doc.roundedRect(badgeX, yPos - 6, badgeWidth, badgeHeight, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(data.entityType.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });

  // Renewal Badge (if applicable)
  if (data.isRenewal) {
    yPos += 12;
    const renewalBadgeWidth = 50;
    const renewalBadgeHeight = 8;
    const renewalBadgeX = (pageWidth - renewalBadgeWidth) / 2;
    const orangeColor: [number, number, number] = [234, 88, 12]; // Orange-600
    doc.setFillColor(...orangeColor);
    doc.roundedRect(renewalBadgeX, yPos - 6, renewalBadgeWidth, renewalBadgeHeight, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('RENEWAL', pageWidth / 2, yPos, { align: 'center' });
  }

  // Entity Name
  yPos += 15;
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  
  // Handle long names
  const maxNameWidth = pageWidth - (margin * 2) - 20;
  const nameLines = doc.splitTextToSize(data.entityName, maxNameWidth);
  doc.text(nameLines, pageWidth / 2, yPos, { align: 'center' });
  yPos += (nameLines.length * 8) + 5;

  // Certificate ID
  yPos += 5;
  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Certificate ID:', pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  doc.setFontSize(9);
  doc.setFont('courier', 'normal');
  doc.text(data.certificateId, pageWidth / 2, yPos, { align: 'center' });

  // Verification Status
  yPos += 15;
  doc.setFillColor(236, 253, 245); // Green-50
  doc.roundedRect(margin + 20, yPos - 5, pageWidth - margin * 2 - 40, 20, 3, 3, 'F');
  doc.setFontSize(12);
  doc.setTextColor(...successColor);
  doc.setFont('helvetica', 'bold');
  doc.text('✓ VERIFIED ON BLOCKCHAIN', pageWidth / 2, yPos + 7, { align: 'center' });

  // Details Section
  yPos += 30;
  doc.setDrawColor(229, 231, 235); // Gray-200
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 10;
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('BLOCKCHAIN DETAILS', margin, yPos);

  // Details table
  const labelX = margin;
  const valueX = margin + 50;
  const detailFontSize = 9;

  yPos += 10;
  doc.setFontSize(detailFontSize);
  doc.setTextColor(...secondaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Network:', labelX, yPos);
  doc.setTextColor(0, 0, 0);
  doc.text('Ethereum Sepolia Testnet', valueX, yPos);

  yPos += 7;
  doc.setTextColor(...secondaryColor);
  doc.text('Block Number:', labelX, yPos);
  doc.setTextColor(0, 0, 0);
  doc.text(data.blockNumber?.toString() || 'Confirmed', valueX, yPos);

  yPos += 7;
  doc.setTextColor(...secondaryColor);
  doc.text('Block Time:', labelX, yPos);
  doc.setTextColor(0, 0, 0);
  const blockTime = data.blockTimestamp 
    ? new Date(data.blockTimestamp).toLocaleString()
    : new Date(data.timestamp).toLocaleString();
  doc.text(blockTime, valueX, yPos);

  yPos += 7;
  doc.setTextColor(...secondaryColor);
  doc.text('Created:', labelX, yPos);
  doc.setTextColor(0, 0, 0);
  doc.text(new Date(data.timestamp).toLocaleString(), valueX, yPos);

  // Transaction Hash Section
  yPos += 15;
  doc.setFillColor(250, 245, 255); // Purple-50
  doc.roundedRect(margin, yPos - 3, pageWidth - margin * 2, 25, 2, 2, 'F');
  
  yPos += 5;
  doc.setFontSize(8);
  doc.setTextColor(...secondaryColor);
  doc.text('TRANSACTION HASH (Verify on Etherscan)', margin + 5, yPos);
  
  yPos += 6;
  doc.setFontSize(7);
  doc.setFont('courier', 'normal');
  doc.setTextColor(...primaryColor);
  doc.text(data.transactionHash, margin + 5, yPos);

  yPos += 6;
  doc.setFontSize(7);
  doc.setTextColor(59, 130, 246); // Blue-500
  doc.textWithLink(
    `https://sepolia.etherscan.io/tx/${data.transactionHash}`,
    margin + 5,
    yPos,
    { url: `https://sepolia.etherscan.io/tx/${data.transactionHash}` }
  );

  // Previous Certificate Section (for renewals)
  if (data.isRenewal && data.previousCertificateHash) {
    yPos += 20;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 10;
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('PREVIOUS CERTIFICATE', margin, yPos);

    yPos += 8;
    const renewalInfoColor: [number, number, number] = [255, 247, 237]; // Orange-50
    doc.setFillColor(...renewalInfoColor);
    doc.roundedRect(margin, yPos - 3, pageWidth - margin * 2, 25, 2, 2, 'F');
    
    yPos += 5;
    doc.setFontSize(8);
    doc.setTextColor(...secondaryColor);
    doc.text('This certificate renews the previous registration:', margin + 5, yPos);
    
    yPos += 6;
    doc.setFontSize(7);
    doc.setFont('courier', 'normal');
    doc.setTextColor(...primaryColor);
    doc.text(data.previousCertificateHash, margin + 5, yPos);

    yPos += 6;
    doc.setFontSize(7);
    doc.setTextColor(59, 130, 246); // Blue-500
    doc.textWithLink(
      `https://sepolia.etherscan.io/tx/${data.previousCertificateHash}`,
      margin + 5,
      yPos,
      { url: `https://sepolia.etherscan.io/tx/${data.previousCertificateHash}` }
    );
  }

  // PDF Hash Section
  yPos += 20;
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 10;
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('DOCUMENT FINGERPRINT (SHA-256)', margin, yPos);

  yPos += 8;
  doc.setFillColor(249, 250, 251); // Gray-50
  doc.roundedRect(margin, yPos - 3, pageWidth - margin * 2, 15, 2, 2, 'F');
  
  yPos += 5;
  doc.setFontSize(6);
  doc.setFont('courier', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(data.pdfHash, pageWidth / 2, yPos, { align: 'center' });

  // Footer note
  yPos += 20;
  doc.setFontSize(8);
  doc.setTextColor(...secondaryColor);
  doc.setFont('helvetica', 'italic');
  const footerNote = 'This certificate is generated from immutable blockchain data. The information above is permanently recorded on the Ethereum Sepolia blockchain and cannot be altered or deleted.';
  const footerLines = doc.splitTextToSize(footerNote, pageWidth - margin * 2 - 20);
  doc.text(footerLines, pageWidth / 2, yPos, { align: 'center' });

  // Bottom decorative line
  yPos = pageHeight - 35;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(1);
  doc.line(margin + 30, yPos, pageWidth - margin - 30, yPos);

  // Generation timestamp
  yPos += 10;
  doc.setFontSize(7);
  doc.setTextColor(...secondaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });

  yPos += 5;
  doc.text('RCV - Regulatory Compliance Verification System', pageWidth / 2, yPos, { align: 'center' });

  // Save the PDF
  const fileName = `blockchain-certificate-${data.certificateId.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
  doc.save(fileName);
};

export default generateBlockchainCertificatePDF;
