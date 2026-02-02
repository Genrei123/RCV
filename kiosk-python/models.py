"""
Data Models for RCV Kiosk
"""
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List

@dataclass
class CertificateData:
    """Certificate information from QR code"""
    certificate_id: str
    product_name: str
    company_name: str
    issue_date: str
    expiry_date: str
    status: str  # "valid", "expired", "revoked"
    pdf_url: Optional[str] = None
    certificate_type: str = "company"
    block_index: Optional[int] = None
    block_hash: Optional[str] = None
    pdf_hash: Optional[str] = None
    additional_info: Dict[str, Any] = None
    entity_data: Dict[str, Any] = None
    approvers: List[Dict[str, Any]] = None
    transaction_hash: Optional[str] = None
    verified_at: Optional[str] = None
    version: str = "1.0"

@dataclass
class ProductData:
    """Product information from scan"""
    product_name: str
    brand: str
    batch_number: str
    manufacture_date: str
    expiry_date: str
    is_authentic: bool
    confidence_score: float
    lto_number: Optional[str] = None
    cfpr_number: Optional[str] = None
    manufacturer: Optional[str] = None
    source: str = "unknown"
    warnings: List[str] = field(default_factory=list)
