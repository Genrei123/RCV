// @ts-ignore - jsPDF types may not be available
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { Company } from '@/typeorm/entities/company.entity';
import type { Product } from '@/typeorm/entities/product.entity';
import CryptoJS from 'crypto-js';
import { apiClient } from './axiosConfig';

export class PDFGenerationService {
  /**
   * Calculate SHA-256 hash of PDF blob
   */
  private static async calculatePDFHash(pdfBlob: Blob): Promise<string> {
    // Read blob as array buffer
    const arrayBuffer = await pdfBlob.arrayBuffer();
    
    // Convert to WordArray for CryptoJS
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer as any);
    
    // Calculate SHA-256 hash
    const hash = CryptoJS.SHA256(wordArray).toString();
    
    return hash;
  }

  /**
   * Add certificate to blockchain
   */
  private static async addToBlockchain(
    certificateId: string,
    certificateType: 'company' | 'product',
    pdfHash: string,
    entityId: string,
    entityName: string,
    licenseNumber?: string,
    ltoNumber?: string,
    cfprNumber?: string
  ): Promise<{ success: boolean; blockIndex?: number; message?: string }> {
    try {
      const response = await apiClient.post('/certificate-blockchain/add', {
        certificateId,
        certificateType,
        pdfHash,
        entityId,
        entityName,
        licenseNumber,
        ltoNumber,
        cfprNumber,
        metadata: {
          generatedAt: new Date().toISOString(),
          source: 'web-admin'
        }
      });

      return {
        success: true,
        blockIndex: response.data.certificate.blockIndex,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Failed to add certificate to blockchain:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to add to blockchain'
      };
    }
  }

  /**
   * Generate a Company Registration Certificate PDF with QR Code
   */
  static async generateCompanyCertificate(company: Company, certificateId?: string): Promise<Blob> {
    // Create new PDF document (A4 size: 210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Add elegant border
    pdf.setDrawColor(0, 84, 64); // Teal color
    pdf.setLineWidth(1.5);
    pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
    
    // Inner border
    pdf.setLineWidth(0.5);
    pdf.rect(12, 12, pageWidth - 24, pageHeight - 24);

    // Logo - centered at top with teal background
    let yPosition = 30;
    try {
      // Load logo from public folder
      const logoImg = new Image();
      logoImg.src = '/logo.png';
      const logoSize = 40;
      const logoX = (pageWidth - logoSize) / 2;
      
      // Add teal circular background for logo
      const circleRadius = (logoSize / 2) + 5;
      const circleCenterX = logoX + (logoSize / 2);
      const circleCenterY = yPosition + (logoSize / 2);
      
      pdf.setFillColor(0, 84, 64); // Teal background
      pdf.circle(circleCenterX, circleCenterY, circleRadius, 'F');
      
      // Add logo on top of teal background
      pdf.addImage(logoImg, 'PNG', logoX, yPosition, logoSize, logoSize);
      yPosition += logoSize + 15;
    } catch (error) {
      console.warn('Logo not loaded, using text fallback');
      pdf.setFontSize(24);
      pdf.setTextColor(0, 84, 64);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RCV', pageWidth / 2, yPosition + 10, { align: 'center' });
      yPosition += 25;
    }

    // Document Title
    pdf.setFontSize(20);
    pdf.setTextColor(0, 84, 64);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CERTIFICATE OF REGISTRATION', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Company Name - Large and prominent
    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(company.name.toUpperCase(), pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // License Number
    pdf.setFontSize(12);
    pdf.setTextColor(60, 60, 60);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`License No: ${company.licenseNumber}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Certification Statement
    pdf.setFontSize(11);
    pdf.setTextColor(40, 40, 40);
    pdf.setFont('helvetica', 'normal');
    
    const certificationText = `The Regulatory Compliance Verification System (RCV) hereby certifies that ${company.name} is officially registered and authorized to operate under the jurisdiction of this regulatory framework. This certificate validates that the company has met all necessary compliance requirements and standards for regulatory verification.`;
    
    const certLines = pdf.splitTextToSize(certificationText, contentWidth - 20);
    pdf.text(certLines, pageWidth / 2, yPosition, { align: 'center', maxWidth: contentWidth - 20 });
    yPosition += (certLines.length * 6) + 15;

    // Certificate Metadata
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Date Issued: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 10;

    // Generate QR Code containing company data as JSON
    const companyData = {
      certificateId: certificateId || `CERT-COMP-${company._id}-${Date.now()}`,
      id: company._id,
      name: company.name,
      licenseNumber: company.licenseNumber,
      address: company.address,
      certificateDate: new Date().toISOString(),
      type: 'company-certificate',
    };

    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(companyData), {
      width: 400,
      margin: 2,
      color: {
        dark: '#005440',
        light: '#FFFFFF',
      },
    });

    // Position QR code at bottom center
    const qrSize = 50;
    const qrX = (pageWidth - qrSize) / 2;
    const qrY = pageHeight - margin - qrSize - 35;

    // Add QR code
    pdf.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // QR code label
    pdf.setFontSize(8);
    pdf.setTextColor(60, 60, 60);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Scan to verify certificate authenticity', pageWidth / 2, qrY + qrSize + 5, { align: 'center' });

    // Footer - Authority Statement
    const footerY = pageHeight - 20;
    pdf.setDrawColor(0, 186, 142);
    pdf.setLineWidth(0.3);
    pdf.line(margin, footerY - 8, pageWidth - margin, footerY - 8);
    
    pdf.setFontSize(8);
    pdf.setTextColor(80, 80, 80);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Regulatory Compliance Verification System', pageWidth / 2, footerY - 3, { align: 'center' });
    
    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 120);
    pdf.text('This certificate is valid and issued under the authority of RCV', pageWidth / 2, footerY + 2, { align: 'center' });
    pdf.text(`© ${new Date().getFullYear()} RCV. All rights reserved. | Document ID: ${company._id}`, pageWidth / 2, footerY + 4, { align: 'center' });

    // Return PDF as blob
    return pdf.output('blob');
  }

  /**
   * Download the generated PDF
   */
  static downloadPDF(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate and download company certificate
   */
  static async generateAndDownloadCompanyCertificate(company: Company) {
    try {
      // Generate unique certificate ID
      const certificateId = `CERT-COMP-${company._id}-${Date.now()}`;
      
      // Generate PDF blob
      const pdfBlob = await this.generateCompanyCertificate(company, certificateId);
      
      // Calculate PDF hash
      const pdfHash = await this.calculatePDFHash(pdfBlob);
      
      // Add to blockchain
      const blockchainResult = await this.addToBlockchain(
        certificateId,
        'company',
        pdfHash,
        company._id,
        company.name,
        company.licenseNumber
      );

      if (blockchainResult.success) {
        console.log(`✅ Certificate added to blockchain at block ${blockchainResult.blockIndex}`);
        console.log(`📄 Certificate ID: ${certificateId}`);
        console.log(`🔐 PDF Hash: ${pdfHash}`);
      } else {
        console.warn('⚠️ Failed to add certificate to blockchain:', blockchainResult.message);
      }
      
      // Download PDF
      const filename = `Company_Certificate_${company.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
      this.downloadPDF(pdfBlob, filename);
      return true;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  /**
   * Generate a Product Registration Certificate PDF with QR Code
   */
  static async generateProductCertificate(product: Product, certificateId?: string): Promise<Blob> {
    // Create new PDF document (A4 size: 210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Add elegant border
    pdf.setDrawColor(0, 84, 64); // Teal color
    pdf.setLineWidth(1.5);
    pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
    
    // Inner border
    pdf.setLineWidth(0.5);
    pdf.rect(12, 12, pageWidth - 24, pageHeight - 24);

    // Logo - centered at top with teal background
    let yPosition = 30;
    try {
      // Load logo from public folder
      const logoImg = new Image();
      logoImg.src = '/logo.png';
      const logoSize = 40;
      const logoX = (pageWidth - logoSize) / 2;
      
      // Add teal circular background for logo
      const circleRadius = (logoSize / 2) + 5;
      const circleCenterX = logoX + (logoSize / 2);
      const circleCenterY = yPosition + (logoSize / 2);
      
      pdf.setFillColor(0, 84, 64); // Teal background
      pdf.circle(circleCenterX, circleCenterY, circleRadius, 'F');
      
      // Add logo on top of teal background
      pdf.addImage(logoImg, 'PNG', logoX, yPosition, logoSize, logoSize);
      yPosition += logoSize + 15;
    } catch (error) {
      console.warn('Logo not loaded, using text fallback');
      pdf.setFontSize(24);
      pdf.setTextColor(0, 84, 64);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RCV', pageWidth / 2, yPosition + 10, { align: 'center' });
      yPosition += 25;
    }

    // Document Title
    pdf.setFontSize(20);
    pdf.setTextColor(0, 84, 64);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PRODUCT REGISTRATION CERTIFICATE', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Product Name - Large and prominent
    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(product.productName.toUpperCase(), pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    // Brand Name
    pdf.setFontSize(14);
    pdf.setTextColor(60, 60, 60);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Brand: ${product.brandName}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // LTO and CFPR Numbers
    pdf.setFontSize(11);
    pdf.setTextColor(60, 60, 60);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`LTO No: ${product.LTONumber}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 6;
    pdf.text(`CFPR No: ${product.CFPRNumber}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Certification Statement
    pdf.setFontSize(11);
    pdf.setTextColor(40, 40, 40);
    pdf.setFont('helvetica', 'normal');
    
    const companyName = typeof product.company === 'object' ? product.company.name : 'the registered company';
    const certificationText = `The Regulatory Compliance Verification System (RCV) hereby certifies that ${product.productName} by ${companyName} is officially registered and authorized for distribution under the jurisdiction of this regulatory framework. This certificate validates that the product has met all necessary compliance requirements and standards for regulatory verification.`;
    
    const certLines = pdf.splitTextToSize(certificationText, contentWidth - 20);
    pdf.text(certLines, pageWidth / 2, yPosition, { align: 'center', maxWidth: contentWidth - 20 });
    yPosition += (certLines.length * 6) + 20;

    // Certificate Issued Date
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Certificate Issued: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 15;

    // Generate QR Code containing product data as JSON
    const productData = {
      certificateId: certificateId || `CERT-PROD-${product._id}-${Date.now()}`,
      id: product._id,
      ltoNumber: product.LTONumber,
      cfprNumber: product.CFPRNumber,
      productName: product.productName,
      brandName: product.brandName,
      lotNumber: product.lotNumber,
      expirationDate: product.expirationDate,
      certificateDate: new Date().toISOString(),
      type: 'product-certificate',
    };

    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(productData), {
      width: 400,
      margin: 2,
      color: {
        dark: '#005440',
        light: '#FFFFFF',
      },
    });

    // Position QR code at bottom center
    const qrSize = 50;
    const qrX = (pageWidth - qrSize) / 2;
    const qrY = pageHeight - margin - qrSize - 35;

    // Add QR code
    pdf.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // QR code label
    pdf.setFontSize(8);
    pdf.setTextColor(60, 60, 60);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Scan to verify certificate authenticity', pageWidth / 2, qrY + qrSize + 5, { align: 'center' });

    // Footer - Authority Statement
    const footerY = pageHeight - 20;
    pdf.setDrawColor(0, 186, 142);
    pdf.setLineWidth(0.3);
    pdf.line(margin, footerY - 8, pageWidth - margin, footerY - 8);
    
    pdf.setFontSize(8);
    pdf.setTextColor(80, 80, 80);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Regulatory Compliance Verification System', pageWidth / 2, footerY - 3, { align: 'center' });
    
    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 120);
    pdf.text('This certificate is valid and issued under the authority of RCV', pageWidth / 2, footerY + 2, { align: 'center' });
    pdf.text(`© ${new Date().getFullYear()} RCV. All rights reserved. | Document ID: ${product._id}`, pageWidth / 2, footerY + 4, { align: 'center' });

    // Return PDF as blob
    return pdf.output('blob');
  }

  /**
   * Generate and download product certificate
   */
  static async generateAndDownloadProductCertificate(product: Product) {
    try {
      // Generate unique certificate ID
      const certificateId = `CERT-PROD-${product._id}-${Date.now()}`;
      
      // Generate PDF blob
      const pdfBlob = await this.generateProductCertificate(product, certificateId);
      
      // Calculate PDF hash
      const pdfHash = await this.calculatePDFHash(pdfBlob);
      
      // Get company name for blockchain
      const companyName = typeof product.company === 'object' ? product.company.name : 'Unknown Company';
      
      // Add to blockchain
      const blockchainResult = await this.addToBlockchain(
        certificateId,
        'product',
        pdfHash,
        product._id || 'unknown',
        `${product.productName} by ${companyName}`,
        undefined, // licenseNumber
        product.LTONumber,
        product.CFPRNumber
      );

      if (blockchainResult.success) {
        console.log(`✅ Product certificate added to blockchain at block ${blockchainResult.blockIndex}`);
        console.log(`📄 Certificate ID: ${certificateId}`);
        console.log(`🔐 PDF Hash: ${pdfHash}`);
      } else {
        console.warn('⚠️ Failed to add certificate to blockchain:', blockchainResult.message);
      }
      
      // Download PDF
      const filename = `Product_Certificate_${product.productName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
      this.downloadPDF(pdfBlob, filename);
      return true;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }
}
