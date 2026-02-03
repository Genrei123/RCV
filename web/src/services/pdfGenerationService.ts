// @ts-ignore - jsPDF types may not be available
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { Company } from '@/typeorm/entities/company.entity';
import type { Product } from '@/typeorm/entities/product.entity';
import CryptoJS from 'crypto-js';
import { apiClient } from './axiosConfig';
import { FirebaseStorageService } from './firebaseStorageService';

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

    // Return PDF as blob (Firebase upload is handled in generateAndDownloadCompanyCertificate)
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
   * Note: For renewals/updates, pass the existing certificate ID to maintain QR code consistency
   */
  static async generateAndDownloadCompanyCertificate(company: Company, existingCertificateId?: string) {
    try {
      // Use existing certificate ID if provided (for renewals), otherwise generate new one
      const certificateId = existingCertificateId || `CERT-COMP-${company._id}-${Date.now()}`;
      
      // Generate PDF blob
      const pdfBlob = await this.generateCompanyCertificate(company, certificateId);
      
      // Calculate PDF hash
      const pdfHash = await this.calculatePDFHash(pdfBlob);
      
      // Upload PDF to Firebase Storage with certificate ID as filename
      const firebaseUrl = await FirebaseStorageService.uploadPDFBlob(
        pdfBlob,
        `certificates/company/${certificateId}.pdf`
      );

      if (!firebaseUrl) {
        console.warn('⚠️ Failed to upload PDF to Firebase Storage');
      }
      
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
        console.warn('⚠️ Failed to add certificate to blockchain:', blockchainResult.message);
      } 
      
      // Download PDF
      const filename = `${certificateId}.pdf`;
      this.downloadPDF(pdfBlob, filename);
      return true;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  /**
   * Generate a Product Registration Certificate PDF with QR Code
   * Page 1: Certificate with QR code
   * Page 2: Product details table and images
   */
  static async generateProductCertificate(product: Product, certificateId?: string): Promise<Blob> {
    // Ensure product properties are safely defined
    const safeProduct = {
      ...product,
      productName: product?.productName || 'Unknown Product',
      brandName: product?.brandName || 'Unknown Brand',
      LTONumber: product?.LTONumber || 'N/A',
      CFPRNumber: product?.CFPRNumber || 'N/A',
      lotNumber: product?.lotNumber || 'N/A',
      expirationDate: product?.expirationDate || new Date(),
    };

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

    // ==================== PAGE 1: Certificate ====================
    
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
    pdf.text(safeProduct.productName.toUpperCase(), pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    // Brand Name
    pdf.setFontSize(14);
    pdf.setTextColor(60, 60, 60);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Brand: ${safeProduct.brandName}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // LTO and CFPR Numbers
    pdf.setFontSize(11);
    pdf.setTextColor(60, 60, 60);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`LTO No: ${safeProduct.LTONumber}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 6;
    pdf.text(`CFPR No: ${safeProduct.CFPRNumber}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Certification Statement
    pdf.setFontSize(11);
    pdf.setTextColor(40, 40, 40);
    pdf.setFont('helvetica', 'normal');
    
    const companyName = typeof product?.company === 'object' ? product.company.name : 'the registered company';
    const certificationText = `The Regulatory Compliance Verification System (RCV) hereby certifies that ${safeProduct.productName} by ${companyName} is officially registered and authorized for distribution under the jurisdiction of this regulatory framework. This certificate validates that the product has met all necessary compliance requirements and standards for regulatory verification.`;
    
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
    const certId = certificateId || `CERT-PROD-${product._id}-${Date.now()}`;
    const productData = {
      certificateId: certId,
      id: product._id,
      ltoNumber: safeProduct.LTONumber,
      cfprNumber: safeProduct.CFPRNumber,
      productName: safeProduct.productName,
      brandName: safeProduct.brandName,
      lotNumber: safeProduct.lotNumber,
      expirationDate: safeProduct.expirationDate?.toString ? safeProduct.expirationDate.toString() : safeProduct.expirationDate,
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

    // ==================== PAGE 2: Product Details & Images ====================
    pdf.addPage();

    // Add border to page 2
    pdf.setDrawColor(0, 84, 64);
    pdf.setLineWidth(1.5);
    pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
    pdf.setLineWidth(0.5);
    pdf.rect(12, 12, pageWidth - 24, pageHeight - 24);

    // Page 2 Header
    yPosition = 25;
    pdf.setFontSize(16);
    pdf.setTextColor(0, 84, 64);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PRODUCT DETAILS', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;

    // Underline
    pdf.setDrawColor(0, 186, 142);
    pdf.setLineWidth(0.5);
    pdf.line(margin + 40, yPosition, pageWidth - margin - 40, yPosition);
    yPosition += 15;

    // Format dates helper
    const formatDate = (date: Date | string | undefined): string => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    // Get registered by name if available
    let registeredByName = 'N/A';
    if (product.registeredBy) {
      if (typeof product.registeredBy === 'object') {
        const user = product.registeredBy as any;
        registeredByName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'N/A';
      }
    }

    // Define table data
    const tableData = [
      { label: 'Product Name', value: safeProduct.productName || 'N/A' },
      { label: 'Brand Name', value: safeProduct.brandName || 'N/A' },
      { label: 'Company', value: companyName || 'N/A' },
      { label: 'LTO Number', value: safeProduct.LTONumber || 'N/A' },
      { label: 'CFPR Number', value: safeProduct.CFPRNumber || 'N/A' },
      { label: 'Lot Number', value: safeProduct.lotNumber || 'N/A' },
      { label: 'Classification', value: product?.productClassification || 'N/A' },
      { label: 'Sub-Classification', value: product?.productSubClassification || 'N/A' },
      { label: 'Expiration Date', value: formatDate(safeProduct.expirationDate) },
      { label: 'Registration Date', value: formatDate(product?.dateOfRegistration) },
      { label: 'Registered By', value: registeredByName },
      { label: 'Certificate ID', value: certId },
    ];

    // Table configuration
    const tableX = margin;
    const tableWidth = contentWidth;
    const labelColWidth = 50;
    const valueColWidth = tableWidth - labelColWidth;
    const rowHeight = 8;
    const tableStartY = yPosition;

    // Draw table
    tableData.forEach((row, index) => {
      const rowY = tableStartY + (index * rowHeight);
      
      // Alternate row background
      if (index % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
      } else {
        pdf.setFillColor(255, 255, 255);
      }
      pdf.rect(tableX, rowY, tableWidth, rowHeight, 'F');
      
      // Draw cell borders
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.2);
      pdf.rect(tableX, rowY, labelColWidth, rowHeight, 'S');
      pdf.rect(tableX + labelColWidth, rowY, valueColWidth, rowHeight, 'S');
      
      // Label text
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      pdf.text(row.label, tableX + 3, rowY + 5.5);
      
      // Value text - truncate if too long
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      let valueText = row.value;
      const maxValueLength = 60;
      if (valueText.length > maxValueLength) {
        valueText = valueText.substring(0, maxValueLength - 3) + '...';
      }
      pdf.text(valueText, tableX + labelColWidth + 3, rowY + 5.5);
    });

    // Draw outer table border
    pdf.setDrawColor(0, 84, 64);
    pdf.setLineWidth(0.5);
    pdf.rect(tableX, tableStartY, tableWidth, tableData.length * rowHeight, 'S');

    yPosition = tableStartY + (tableData.length * rowHeight) + 20;

    // Product Images Section
    pdf.setFontSize(14);
    pdf.setTextColor(0, 84, 64);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PRODUCT IMAGES', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;

    // Underline
    pdf.setDrawColor(0, 186, 142);
    pdf.setLineWidth(0.5);
    pdf.line(margin + 50, yPosition, pageWidth - margin - 50, yPosition);
    yPosition += 15;

    // Image dimensions - calculate available space
    const availableHeight = pageHeight - yPosition - 50; // Leave space for footer
    const imageHeight = Math.min(100, availableHeight - 15); // Max 100mm or available space
    const imageWidth = imageHeight * 0.75; // 3:4 aspect ratio
    const imageGap = 20;
    const totalImagesWidth = (imageWidth * 2) + imageGap;
    const imagesStartX = (pageWidth - totalImagesWidth) / 2;

    // Load and add product images
    const addProductImage = async (imageUrl: string | undefined, x: number, y: number, label: string) => {
      // Draw placeholder box with border
      pdf.setDrawColor(200, 200, 200);
      pdf.setFillColor(250, 250, 250);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(x, y, imageWidth, imageHeight, 2, 2, 'FD');

      if (imageUrl) {
        try {
          // Load image
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              try {
                // Calculate dimensions maintaining aspect ratio
                const aspectRatio = img.width / img.height;
                let drawWidth = imageWidth - 6;
                let drawHeight = imageHeight - 6;
                
                if (aspectRatio > drawWidth / drawHeight) {
                  drawHeight = drawWidth / aspectRatio;
                } else {
                  drawWidth = drawHeight * aspectRatio;
                }
                
                const drawX = x + (imageWidth - drawWidth) / 2;
                const drawY = y + (imageHeight - drawHeight) / 2;
                
                pdf.addImage(img, 'JPEG', drawX, drawY, drawWidth, drawHeight);
                resolve();
              } catch (e) {
                reject(e);
              }
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageUrl;
          });
        } catch (error) {
          console.warn(`Failed to load ${label} image:`, error);
          // Draw "No Image" text
          pdf.setFontSize(10);
          pdf.setTextColor(150, 150, 150);
          pdf.setFont('helvetica', 'italic');
          pdf.text('Image not available', x + imageWidth / 2, y + imageHeight / 2, { align: 'center' });
        }
      } else {
        // Draw "No Image" placeholder
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        pdf.setFont('helvetica', 'italic');
        pdf.text('No image', x + imageWidth / 2, y + imageHeight / 2, { align: 'center' });
      }

      // Add label below image
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, x + imageWidth / 2, y + imageHeight + 6, { align: 'center' });
    };

    // Add front and back images
    await addProductImage(product.productImageFront, imagesStartX, yPosition, 'Front View');
    await addProductImage(product.productImageBack, imagesStartX + imageWidth + imageGap, yPosition, 'Back View');

    // Page 2 Footer
    const page2FooterY = pageHeight - 20;
    pdf.setDrawColor(0, 186, 142);
    pdf.setLineWidth(0.3);
    pdf.line(margin, page2FooterY - 8, pageWidth - margin, page2FooterY - 8);
    
    pdf.setFontSize(8);
    pdf.setTextColor(80, 80, 80);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Regulatory Compliance Verification System', pageWidth / 2, page2FooterY - 3, { align: 'center' });
    
    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 120);
    pdf.text(`Page 2 of 2 | Certificate ID: ${certId}`, pageWidth / 2, page2FooterY + 2, { align: 'center' });

    // Return PDF as blob
    return pdf.output('blob');
  }

  /**
   * Generate and download product certificate
   * Note: For renewals/updates, pass the existing certificate ID to maintain QR code consistency
   */
  static async generateAndDownloadProductCertificate(product: Product, existingCertificateId?: string) {
    try {
      // Use existing certificate ID if provided (for renewals), otherwise generate new one
      const certificateId = existingCertificateId || `CERT-PROD-${product._id}-${Date.now()}`;
      
      // Generate PDF blob
      const pdfBlob = await this.generateProductCertificate(product, certificateId);
      
      // Calculate PDF hash
      const pdfHash = await this.calculatePDFHash(pdfBlob);
      
      // Upload PDF to Firebase Storage with certificate ID as filename
      const firebaseUrl = await FirebaseStorageService.uploadPDFBlob(
        pdfBlob,
        `certificates/product/${certificateId}.pdf`
      );

      if (!firebaseUrl) {
        console.warn('⚠️ Failed to upload PDF to Firebase Storage');
      }
      
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

      if (!blockchainResult.success) {
        console.warn('⚠️ Failed to add certificate to blockchain:', blockchainResult.message);
      } 
      
      // Download PDF
      const filename = `${certificateId}.pdf`;
      this.downloadPDF(pdfBlob, filename);
      return true;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  /**
   * Generate a Timeline History PDF for a product
   * Shows all approvals, renewals, updates, etc.
   */
  static async generateAndDownloadTimelinePDF(
    productName: string,
    productId: string,
    timeline: Array<{
      type: string;
      certificateId: string;
      approvalId: string;
      submittedAt: string;
      approvedAt?: string;
      approvers: Array<{
        approverName: string;
        approverWallet: string;
        approvalDate: string;
      }>;
      blockchainTxHash?: string;
      expirationDate?: string;
    }>
  ) {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Helper function to format date
    const formatDate = (dateStr: string) => {
      if (!dateStr) return 'N/A';
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // Helper function to truncate hash
    const truncateHash = (hash: string) => {
      if (!hash) return 'N/A';
      return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
    };

    // Helper function to get badge color for type
    const getTypeColor = (type: string): [number, number, number] => {
      switch (type) {
        case 'initial': return [0, 84, 64]; // Teal
        case 'renewal': return [37, 99, 235]; // Blue
        case 'update': return [147, 51, 234]; // Purple
        case 'archive': return [220, 38, 38]; // Red
        case 'unarchive': return [22, 163, 74]; // Green
        default: return [107, 114, 128]; // Gray
      }
    };

    // ==================== HEADER ====================
    // Add elegant border
    pdf.setDrawColor(0, 84, 64);
    pdf.setLineWidth(1.5);
    pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
    pdf.setLineWidth(0.5);
    pdf.rect(12, 12, pageWidth - 24, pageHeight - 24);

    let yPosition = 30;

    // Logo with teal background circle
    const logoSize = 30;
    const logoX = (pageWidth - logoSize) / 2;
    const circleRadius = (logoSize / 2) + 5;
    const circleCenterX = logoX + (logoSize / 2);
    const circleCenterY = yPosition + (logoSize / 2);
    
    // Draw teal circle background
    pdf.setFillColor(0, 84, 64);
    pdf.circle(circleCenterX, circleCenterY, circleRadius, 'F');
    
    // Load and add logo image
    try {
      const logoImg = new Image();
      logoImg.src = '/logo.png';
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => {
          try {
            pdf.addImage(logoImg, 'PNG', logoX, yPosition, logoSize, logoSize);
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        logoImg.onerror = () => reject(new Error('Failed to load logo'));
      });
    } catch (error) {
      // Fallback to text if logo fails
      console.warn('Logo not loaded, using text fallback');
      pdf.setFontSize(16);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RCV', circleCenterX, circleCenterY + 4, { align: 'center' });
    }
    yPosition += logoSize + 15;

    // Title
    pdf.setFontSize(20);
    pdf.setTextColor(0, 84, 64);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CERTIFICATE TIMELINE', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Product Name
    pdf.setFontSize(14);
    pdf.setTextColor(60, 60, 60);
    pdf.setFont('helvetica', 'normal');
    pdf.text(productName, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    // Product ID
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Product ID: ${productId}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;

    // Generated date
    pdf.setFontSize(9);
    pdf.text(`Generated: ${formatDate(new Date().toISOString())}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Divider
    pdf.setDrawColor(0, 186, 142);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Summary
    pdf.setFontSize(11);
    pdf.setTextColor(40, 40, 40);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Timeline Summary', margin, yPosition);
    yPosition += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const totalEntries = timeline.length;
    const renewals = timeline.filter(t => t.type === 'renewal').length;
    const updates = timeline.filter(t => t.type === 'update').length;
    pdf.text(`Total Entries: ${totalEntries} | Renewals: ${renewals} | Updates: ${updates}`, margin, yPosition);
    yPosition += 15;

    // ==================== TIMELINE ENTRIES ====================
    for (let i = 0; i < timeline.length; i++) {
      const entry = timeline[i];
      
      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        // Add border to new page
        pdf.setDrawColor(0, 84, 64);
        pdf.setLineWidth(1.5);
        pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
        pdf.setLineWidth(0.5);
        pdf.rect(12, 12, pageWidth - 24, pageHeight - 24);
        yPosition = 30;
      }

      // Entry number and type badge
      const [r, g, b] = getTypeColor(entry.type);
      
      // Type badge background
      pdf.setFillColor(r, g, b);
      const badgeText = entry.type.charAt(0).toUpperCase() + entry.type.slice(1);
      const badgeWidth = pdf.getTextWidth(badgeText) + 8;
      pdf.roundedRect(margin, yPosition - 4, badgeWidth, 7, 2, 2, 'F');
      
      // Badge text
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text(badgeText, margin + 4, yPosition);
      
      // Entry number
      pdf.setTextColor(100, 100, 100);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`#${i + 1}`, pageWidth - margin - 10, yPosition);
      yPosition += 8;

      // Certificate ID
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Certificate ID:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(entry.certificateId || 'N/A', margin + 28, yPosition);
      yPosition += 5;

      // Submitted date
      pdf.setFont('helvetica', 'bold');
      pdf.text('Submitted:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatDate(entry.submittedAt), margin + 22, yPosition);
      yPosition += 5;

      // Approved date
      pdf.setFont('helvetica', 'bold');
      pdf.text('Approved:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatDate(entry.approvedAt || ''), margin + 22, yPosition);
      yPosition += 5;

      // Blockchain Tx
      if (entry.blockchainTxHash) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Blockchain Tx:', margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(37, 99, 235);
        pdf.text(truncateHash(entry.blockchainTxHash), margin + 28, yPosition);
        pdf.setTextColor(60, 60, 60);
        yPosition += 5;
      }

      // Approvers
      if (entry.approvers && entry.approvers.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Approvers (${entry.approvers.length}):`, margin, yPosition);
        yPosition += 5;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        entry.approvers.forEach((approver, idx) => {
          if (yPosition > pageHeight - 30) {
            pdf.addPage();
            pdf.setDrawColor(0, 84, 64);
            pdf.setLineWidth(1.5);
            pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
            pdf.setLineWidth(0.5);
            pdf.rect(12, 12, pageWidth - 24, pageHeight - 24);
            yPosition = 30;
          }
          pdf.text(`  ${idx + 1}. ${approver.approverName}`, margin + 5, yPosition);
          yPosition += 4;
          pdf.setTextColor(100, 100, 100);
          pdf.text(`     Wallet: ${truncateHash(approver.approverWallet)}`, margin + 5, yPosition);
          yPosition += 4;
          pdf.text(`     Date: ${formatDate(approver.approvalDate)}`, margin + 5, yPosition);
          pdf.setTextColor(60, 60, 60);
          yPosition += 5;
        });
      }

      // Divider between entries
      if (i < timeline.length - 1) {
        yPosition += 3;
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.3);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 8;
      }
    }

    // ==================== FOOTER ====================
    const footerY = pageHeight - 20;
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`© ${new Date().getFullYear()} RCV - Regulatory Compliance Verification. All rights reserved.`, pageWidth / 2, footerY, { align: 'center' });

    // Generate blob and download
    const pdfBlob = pdf.output('blob');
    const filename = `Timeline-${productId}-${Date.now()}.pdf`;
    this.downloadPDF(pdfBlob, filename);
  }
}
