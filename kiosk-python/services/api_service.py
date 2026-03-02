"""
RCV API Service - Handles all backend API communications
"""
import requests
from typing import Optional, Dict, Any
from urllib.parse import urljoin
from config import APIConfig

class RCVApiService:
    """Service to communicate with RCV Backend API"""
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or APIConfig.BASE_URL
        self.timeout = APIConfig.TIMEOUT
    
    def _construct_firebase_pdf_url(self, certificate_id: str) -> str:
        """Construct Firebase Storage URL for a certificate PDF"""
        if certificate_id.startswith("CERT-PROD-"):
            cert_type = "product"
        elif certificate_id.startswith("CERT-COMP-"):
            cert_type = "company"
        else:
            cert_type = "product"
        
        file_path = f"certificates/{cert_type}/{certificate_id}.pdf"
        encoded_path = file_path.replace("/", "%2F")
        
        return f"https://firebasestorage.googleapis.com/v0/b/{APIConfig.FIREBASE_BUCKET}/o/{encoded_path}?alt=media"
    
    def _make_request(self, method: str, endpoint: str, data: dict = None, params: dict = None) -> dict:
        """Make HTTP request to API"""
        url = urljoin(self.base_url + '/', endpoint.lstrip('/'))
        
        try:
            if method == 'GET':
                response = requests.get(url, params=params, timeout=self.timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, timeout=self.timeout)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.ConnectionError:
            return {"success": False, "error": "connection_error", "message": "Cannot connect to server"}
        except requests.exceptions.Timeout:
            return {"success": False, "error": "timeout", "message": "Request timed out"}
        except requests.exceptions.HTTPError as e:
            return {
                "success": False,
                "error": "http_error",
                "message": f"HTTP {e.response.status_code}: {e.response.reason}"
            }
        except Exception as e:
            return {"success": False, "error": "unknown", "message": str(e)}
    
    # ============ Certificate Blockchain API ============
    
    def get_certificate_by_id(self, certificate_id: str) -> dict:
        """Get certificate details from blockchain"""
        return self._make_request('GET', f'/certificate-blockchain/certificate/{certificate_id}')
    
    def get_certificate_pdf_url(self, certificate_id: str) -> dict:
        """Get certificate PDF URL from Firebase Storage"""
        result = self._make_request('GET', f'/certificate-blockchain/pdf/{certificate_id}')
        
        if result.get("success") and result.get("certificate", {}).get("pdfUrl"):
            return result
        
        # Fallback: construct URL directly
        pdf_url = self._construct_firebase_pdf_url(certificate_id)
        return {
            "success": True,
            "message": "PDF URL constructed from certificate ID",
            "certificate": {
                "certificateId": certificate_id,
                "pdfUrl": pdf_url
            }
        }
    
    def verify_certificate_pdf(self, certificate_id: str, pdf_hash: str) -> dict:
        """Verify certificate PDF hash against blockchain"""
        return self._make_request('POST', '/certificate-blockchain/verify', {
            'certificateId': certificate_id,
            'pdfHash': pdf_hash
        })
    
    def get_blockchain_stats(self) -> dict:
        """Get certificate blockchain statistics"""
        return self._make_request('GET', '/certificate-blockchain/stats')
    
    # ============ Product Scan API ============
    
    def scan_product_ocr(self, ocr_text: str, front_image_url: str = None, back_image_url: str = None) -> dict:
        """Process OCR text with AI to extract product information"""
        data = {'blockOfText': ocr_text}
        if front_image_url:
            data['frontImageUrl'] = front_image_url
        if back_image_url:
            data['backImageUrl'] = back_image_url
        
        return self._make_request('POST', '/scan/scanProduct', data)
    
    def search_product(self, product_name: str = None, lto_number: str = None, 
                       cfpr_number: str = None, brand_name: str = None,
                       manufacturer: str = None) -> dict:
        """Search for product in database and official registry"""
        data = {}
        if product_name:
            data['productName'] = product_name
        if lto_number:
            data['ltoNumber'] = lto_number
        if cfpr_number:
            data['cfprNumber'] = cfpr_number
        if brand_name:
            data['brandName'] = brand_name
        if manufacturer:
            data['manufacturer'] = manufacturer
        
        return self._make_request('POST', '/scan/searchProduct', data)
    
    # ============ Kiosk Report API ============
    
    def submit_kiosk_report(self, report_data: dict) -> dict:
        """Submit a product compliance report from the kiosk machine
        POST /api/v1/kiosk-report/report (public endpoint, no auth)"""
        return self._make_request('POST', '/kiosk-report/report', report_data)
    
    # ============ Health Check ============
    
    def health_check(self) -> dict:
        """Check if API is accessible"""
        try:
            # Use root endpoint which returns: {"success": true, "message": "Yaaaay! You have hit the API root."}
            # Remove /api/v1 from base_url and hit root
            root_url = self.base_url.replace('/api/v1', '')
            response = requests.get(root_url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            return {"success": data.get('success', False), "online": True, **data}
        except Exception as e:
            return {"success": False, "online": False, "error": str(e)}
