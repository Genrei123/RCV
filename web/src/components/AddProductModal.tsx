import { useEffect, useRef, useState } from "react";
import { X, Package, Hash, Calendar, Building2, Plus, ImagePlus, Camera, Tag, Layers, Wallet, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductService } from "@/services/productService";
import type { CreateProductRequest } from "@/services/productService";
import { CompanyService } from "@/services/companyService";
import { BrandNameService } from "@/services/brandNameService";
import { ProductClassificationService } from "@/services/productClassificationService";
import { FirebaseStorageService } from "@/services/firebaseStorageService";
import { MetaMaskService } from "@/services/metaMaskService";
import { AddCompanyModal } from "@/components/AddCompanyModal";
import { AddBrandNameModal } from "@/components/AddBrandNameModal";
import { AddClassificationModal } from "@/components/AddClassificationModal";
import type { BrandName } from "@/typeorm/entities/brandName.entity";
import type { ProductClassification } from "@/typeorm/entities/productClassification.entity";
import { toast } from "react-toastify";
import { useMetaMask } from "@/contexts/MetaMaskContext";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companies: Array<{ _id: string; name: string }>;
}

export function AddProductModal({
  isOpen,
  onClose,
  onSuccess,
  companies,
}: AddProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    LTONumber: "",
    CFPRNumber: "",
    lotNumber: "",
    brandName: "",
    productName: "",
    productClassification: "",
    productSubClassification: "",
    expirationDate: "",
    dateOfRegistration: new Date().toISOString().split("T")[0],
    companyId: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [companyInputValue, setCompanyInputValue] = useState("");
  const [allCompanies, setAllCompanies] = useState(companies);
  const [companyOptions, setCompanyOptions] = useState(companies);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);
  const companyDropdownRef = useRef<HTMLDivElement | null>(null);
  const hasFetchedAllCompanies = useRef(false);
  const COMPANY_FETCH_LIMIT = 2000;

  // Add Company Modal state
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);

  // Add Brand Name Modal state
  const [showAddBrandNameModal, setShowAddBrandNameModal] = useState(false);
  const [allBrandNames, setAllBrandNames] = useState<BrandName[]>([]);
  const [brandNameOptions, setBrandNameOptions] = useState<BrandName[]>([]);
  const [brandNameInputValue, setBrandNameInputValue] = useState("");
  const [brandNameDropdownOpen, setBrandNameDropdownOpen] = useState(false);
  const [brandNameLoading, setBrandNameLoading] = useState(false);
  const brandNameDropdownRef = useRef<HTMLDivElement | null>(null);
  const hasFetchedBrandNames = useRef(false);
  const [selectedBrandName, setSelectedBrandName] = useState<BrandName | null>(null);

  // Add Classification Modal state
  const [showAddClassificationModal, setShowAddClassificationModal] = useState(false);
  const [classificationParent, setClassificationParent] = useState<ProductClassification | null>(null);
  const [allClassifications, setAllClassifications] = useState<ProductClassification[]>([]);
  const [classificationOptions, setClassificationOptions] = useState<ProductClassification[]>([]);
  const [classificationInputValue, setClassificationInputValue] = useState("");
  const [classificationDropdownOpen, setClassificationDropdownOpen] = useState(false);
  const [classificationLoading, setClassificationLoading] = useState(false);
  const classificationDropdownRef = useRef<HTMLDivElement | null>(null);
  const hasFetchedClassifications = useRef(false);

  // Sub-classification state
  const [selectedClassification, setSelectedClassification] = useState<ProductClassification | null>(null);
  const [selectedSubClassification, setSelectedSubClassification] = useState<ProductClassification | null>(null);
  const [subClassificationOptions, setSubClassificationOptions] = useState<ProductClassification[]>([]);
  const [subClassificationInputValue, setSubClassificationInputValue] = useState("");
  const [subClassificationDropdownOpen, setSubClassificationDropdownOpen] = useState(false);
  const [subClassificationLoading, setSubClassificationLoading] = useState(false);
  const subClassificationDropdownRef = useRef<HTMLDivElement | null>(null);

  // Product Image states
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontImagePreview, setFrontImagePreview] = useState<string>("");
  const [backImagePreview, setBackImagePreview] = useState<string>("");
  const frontImageRef = useRef<HTMLInputElement>(null);
  const backImageRef = useRef<HTMLInputElement>(null);

  // MetaMask context
  const { isConnected: isWalletConnected, isAuthorized: isWalletAuthorized, walletAddress, connect: connectWallet } = useMetaMask();

  useEffect(() => {
    setAllCompanies(companies);
    setCompanyOptions(companies);
  }, [companies]);

  useEffect(() => {
    const query = companyInputValue.trim().toLowerCase();
    if (!query) {
      setCompanyOptions(allCompanies);
      return;
    }
    setCompanyOptions(
      allCompanies.filter((company) =>
        company.name.toLowerCase().includes(query)
      )
    );
  }, [companyInputValue, allCompanies]);

  useEffect(() => {
    if (!companyDropdownOpen || hasFetchedAllCompanies.current) return;

    let isActive = true;
    setCompanyLoading(true);

    CompanyService.getCompaniesPage(1, COMPANY_FETCH_LIMIT)
      .then((response) => {
        if (!isActive) return;
        const fetchedCompanies = response.companies || response.data || [];
        setAllCompanies(fetchedCompanies);
        setCompanyOptions(fetchedCompanies);
        hasFetchedAllCompanies.current = true;
      })
      .catch((error) => {
        if (isActive) {
          console.error("Error fetching companies:", error);
        }
      })
      .finally(() => {
        if (isActive) {
          setCompanyLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [companyDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        companyDropdownRef.current &&
        !companyDropdownRef.current.contains(event.target as Node)
      ) {
        setCompanyDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleCompanyInputChange = (value: string) => {
    setCompanyInputValue(value);
    setCompanyDropdownOpen(true);
    if (formData.companyId) {
      setFormData((prev) => ({ ...prev, companyId: "" }));
    }
    if (errors.companyId) {
      setErrors((prev) => ({ ...prev, companyId: "" }));
    }
  };

  const handleCompanySelect = (company: { _id: string; name: string }) => {
    setFormData((prev) => ({ ...prev, companyId: company._id }));
    setCompanyInputValue(company.name);
    setCompanyDropdownOpen(false);
    if (errors.companyId) {
      setErrors((prev) => ({ ...prev, companyId: "" }));
    }
  };

  // Handle Add Company Modal success - refresh companies list and select the new one
  const handleAddCompanySuccess = async () => {
    // Refresh the companies list
    try {
      const response = await CompanyService.getCompaniesPage(1, COMPANY_FETCH_LIMIT);
      const fetchedCompanies = response.companies || response.data || [];
      setAllCompanies(fetchedCompanies);
      setCompanyOptions(fetchedCompanies);
      
      // Find and select the most recently added company (last in the list by createdAt)
      if (fetchedCompanies.length > 0) {
        // Sort by createdAt descending to get the newest
        const sortedCompanies = [...fetchedCompanies].sort((a: any, b: any) => {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        const newestCompany = sortedCompanies[0];
        if (newestCompany) {
          handleCompanySelect(newestCompany);
          toast.success(`Company "${newestCompany.name}" selected`);
        }
      }
    } catch (error) {
      console.error("Error refreshing companies:", error);
    }
  };

  // ============ Brand Name Handlers ============
  
  // Fetch brand names when dropdown opens
  useEffect(() => {
    if (!brandNameDropdownOpen || hasFetchedBrandNames.current) return;

    let isActive = true;
    setBrandNameLoading(true);

    BrandNameService.getAllBrandNames(1, 500)
      .then((response) => {
        if (!isActive) return;
        const fetchedBrandNames = response.data || [];
        setAllBrandNames(fetchedBrandNames);
        setBrandNameOptions(fetchedBrandNames);
        hasFetchedBrandNames.current = true;
      })
      .catch((error) => {
        if (isActive) {
          console.error("Error fetching brand names:", error);
        }
      })
      .finally(() => {
        if (isActive) {
          setBrandNameLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [brandNameDropdownOpen]);

  // Filter brand names based on input
  useEffect(() => {
    const query = brandNameInputValue.trim().toLowerCase();
    if (!query) {
      setBrandNameOptions(allBrandNames);
      return;
    }
    setBrandNameOptions(
      allBrandNames.filter((bn) => bn.name.toLowerCase().includes(query))
    );
  }, [brandNameInputValue, allBrandNames]);

  // Click outside handler for brand name dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        brandNameDropdownRef.current &&
        !brandNameDropdownRef.current.contains(event.target as Node)
      ) {
        setBrandNameDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleBrandNameInputChange = (value: string) => {
    setBrandNameInputValue(value);
    setFormData((prev) => ({ ...prev, brandName: value }));
    setBrandNameDropdownOpen(true);
    // Clear selected brand name when user types custom value
    setSelectedBrandName(null);
    if (errors.brandName) {
      setErrors((prev) => ({ ...prev, brandName: "" }));
    }
  };

  const handleBrandNameSelect = (brandName: BrandName) => {
    setFormData((prev) => ({ ...prev, brandName: brandName.name }));
    setBrandNameInputValue(brandName.name);
    setSelectedBrandName(brandName);
    setBrandNameDropdownOpen(false);
    if (errors.brandName) {
      setErrors((prev) => ({ ...prev, brandName: "" }));
    }
  };

  const handleAddBrandNameSuccess = async () => {
    try {
      const response = await BrandNameService.getAllBrandNames(1, 500);
      const fetchedBrandNames = response.data || [];
      setAllBrandNames(fetchedBrandNames);
      setBrandNameOptions(fetchedBrandNames);
      
      // Select the newest brand name
      if (fetchedBrandNames.length > 0) {
        const sortedBrandNames = [...fetchedBrandNames].sort((a, b) => {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        const newestBrandName = sortedBrandNames[0];
        if (newestBrandName) {
          handleBrandNameSelect(newestBrandName);
          toast.success(`Brand name "${newestBrandName.name}" selected`);
        }
      }
    } catch (error) {
      console.error("Error refreshing brand names:", error);
    }
  };

  // ============ Classification Handlers ============
  
  // Fetch classifications when dropdown opens
  useEffect(() => {
    if (!classificationDropdownOpen || hasFetchedClassifications.current) return;

    let isActive = true;
    setClassificationLoading(true);

    ProductClassificationService.getAllClassifications(1, 500)
      .then((response) => {
        if (!isActive) return;
        const fetchedClassifications = response.data || [];
        setAllClassifications(fetchedClassifications);
        setClassificationOptions(fetchedClassifications);
        hasFetchedClassifications.current = true;
      })
      .catch((error) => {
        if (isActive) {
          console.error("Error fetching classifications:", error);
        }
      })
      .finally(() => {
        if (isActive) {
          setClassificationLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [classificationDropdownOpen]);

  // Filter classifications based on input
  useEffect(() => {
    const query = classificationInputValue.trim().toLowerCase();
    if (!query) {
      setClassificationOptions(allClassifications);
      return;
    }
    setClassificationOptions(
      allClassifications.filter((c) => c.name.toLowerCase().includes(query))
    );
  }, [classificationInputValue, allClassifications]);

  // Click outside handler for classification dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        classificationDropdownRef.current &&
        !classificationDropdownRef.current.contains(event.target as Node)
      ) {
        setClassificationDropdownOpen(false);
      }
      if (
        subClassificationDropdownRef.current &&
        !subClassificationDropdownRef.current.contains(event.target as Node)
      ) {
        setSubClassificationDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleClassificationInputChange = (value: string) => {
    setClassificationInputValue(value);
    setFormData((prev) => ({ ...prev, productClassification: value }));
    setClassificationDropdownOpen(true);
    // Reset sub-classification when classification changes
    if (selectedClassification) {
      setSelectedClassification(null);
      setSubClassificationOptions([]);
      setSubClassificationInputValue("");
      setFormData((prev) => ({ ...prev, productSubClassification: "" }));
    }
    if (errors.productClassification) {
      setErrors((prev) => ({ ...prev, productClassification: "" }));
    }
  };

  const handleClassificationSelect = async (classification: ProductClassification) => {
    setFormData((prev) => ({ ...prev, productClassification: classification.name }));
    setClassificationInputValue(classification.name);
    setClassificationDropdownOpen(false);
    setSelectedClassification(classification);
    
    // Reset sub-classification
    setSubClassificationInputValue("");
    setFormData((prev) => ({ ...prev, productSubClassification: "" }));
    
    if (errors.productClassification) {
      setErrors((prev) => ({ ...prev, productClassification: "" }));
    }
    
    // Load sub-classifications if available
    if (classification.children && classification.children.length > 0) {
      setSubClassificationOptions(classification.children);
    } else {
      // Try to fetch sub-classifications
      try {
        setSubClassificationLoading(true);
        const response = await ProductClassificationService.getSubClassifications(classification._id);
        setSubClassificationOptions(response.data || []);
      } catch (error) {
        console.error("Error fetching sub-classifications:", error);
        setSubClassificationOptions([]);
      } finally {
        setSubClassificationLoading(false);
      }
    }
  };

  const handleSubClassificationInputChange = (value: string) => {
    setSubClassificationInputValue(value);
    setFormData((prev) => ({ ...prev, productSubClassification: value }));
    setSubClassificationDropdownOpen(true);
    // Clear selected sub-classification when user types custom value
    setSelectedSubClassification(null);
    if (errors.productSubClassification) {
      setErrors((prev) => ({ ...prev, productSubClassification: "" }));
    }
  };

  const handleSubClassificationSelect = (subClassification: ProductClassification) => {
    setFormData((prev) => ({ ...prev, productSubClassification: subClassification.name }));
    setSubClassificationInputValue(subClassification.name);
    setSelectedSubClassification(subClassification);
    setSubClassificationDropdownOpen(false);
    if (errors.productSubClassification) {
      setErrors((prev) => ({ ...prev, productSubClassification: "" }));
    }
  };

  const handleAddClassificationSuccess = async () => {
    try {
      const response = await ProductClassificationService.getAllClassifications(1, 500);
      const fetchedClassifications = response.data || [];
      setAllClassifications(fetchedClassifications);
      setClassificationOptions(fetchedClassifications);
      
      // If we were adding a sub-classification, refresh sub-classifications too
      if (classificationParent && selectedClassification) {
        const subResponse = await ProductClassificationService.getSubClassifications(selectedClassification._id);
        setSubClassificationOptions(subResponse.data || []);
        
        // Select the newest sub-classification
        if (subResponse.data && subResponse.data.length > 0) {
          const sortedSubs = [...subResponse.data].sort((a, b) => {
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          });
          const newestSub = sortedSubs[0];
          if (newestSub) {
            handleSubClassificationSelect(newestSub);
            toast.success(`Sub-classification "${newestSub.name}" selected`);
          }
        }
      } else {
        // Select the newest classification
        if (fetchedClassifications.length > 0) {
          const sortedClassifications = [...fetchedClassifications].sort((a, b) => {
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          });
          const newestClassification = sortedClassifications[0];
          if (newestClassification) {
            handleClassificationSelect(newestClassification);
            toast.success(`Classification "${newestClassification.name}" selected`);
          }
        }
      }
    } catch (error) {
      console.error("Error refreshing classifications:", error);
    }
  };

  // Handle image file selection
  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "front" | "back"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === "front") {
        setFrontImage(file);
        setFrontImagePreview(reader.result as string);
      } else {
        setBackImage(file);
        setBackImagePreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (type: "front" | "back") => {
    if (type === "front") {
      setFrontImage(null);
      setFrontImagePreview("");
      if (frontImageRef.current) frontImageRef.current.value = "";
    } else {
      setBackImage(null);
      setBackImagePreview("");
      if (backImageRef.current) backImageRef.current.value = "";
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.LTONumber.trim()) {
      newErrors.LTONumber = "LTO Number is required";
    }

    if (!formData.CFPRNumber.trim()) {
      newErrors.CFPRNumber = "CFPR Number is required";
    }

    if (!formData.lotNumber.trim()) {
      newErrors.lotNumber = "Lot Number is required";
    }

    if (!formData.brandName.trim()) {
      newErrors.brandName = "Brand Name is required";
    }

    if (!formData.productName.trim()) {
      newErrors.productName = "Product Name is required";
    }

    if (!formData.productClassification.trim()) {
      newErrors.productClassification = "Product Classification is required";
    }

    if (!formData.productSubClassification.trim()) {
      newErrors.productSubClassification =
        "Product Sub-Classification is required";
    }

    if (!formData.expirationDate) {
      newErrors.expirationDate = "Expiration Date is required";
    }

    if (!formData.companyId) {
      newErrors.companyId = "Company is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      // ============ PHASE 1: PREPARE DATA & BLOCKCHAIN (Optional) ============
      // If wallet is connected, we do blockchain first to ensure atomicity
      
      let sepoliaTransactionId: string | undefined;
      
      // Generate hash for blockchain BEFORE creating product
      if (isWalletConnected && isWalletAuthorized && walletAddress) {
        toast.info("Preparing blockchain verification...", { autoClose: 2000 });
        
        // Generate a hash from product data
        const productDataString = JSON.stringify({
          LTONumber: formData.LTONumber,
          CFPRNumber: formData.CFPRNumber,
          lotNumber: formData.lotNumber,
          productName: formData.productName,
          brandName: formData.brandName,
          timestamp: new Date().toISOString()
        });
        
        // Create SHA-256 hash
        const encoder = new TextEncoder();
        const data = encoder.encode(productDataString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const pdfHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        toast.info("Storing certificate on Sepolia blockchain...", { autoClose: 2000 });
        
        const blockchainResult = await MetaMaskService.storeHashOnBlockchain(
          pdfHash,
          `CERT-PROD-${formData.LTONumber}-${Date.now()}`,
          'product',
          formData.productName,
          walletAddress
        );
        
        if (blockchainResult.success && blockchainResult.data) {
          sepoliaTransactionId = blockchainResult.data.txHash;
          toast.success(
            `Blockchain verified! Tx: ${sepoliaTransactionId.slice(0, 10)}...`,
            { autoClose: 3000 }
          );
        } else {
          // Blockchain failed - ask user if they want to continue without it
          const continueWithoutBlockchain = window.confirm(
            "Blockchain storage failed. Do you want to create the product without blockchain verification?\n\n" +
            "Note: The product can be verified on blockchain later."
          );
          
          if (!continueWithoutBlockchain) {
            toast.info("Product creation cancelled");
            setLoading(false);
            return;
          }
        }
      }

      // ============ PHASE 2: UPLOAD IMAGES ============
      let productImageFrontUrl: string | undefined;
      let productImageBackUrl: string | undefined;

      if (frontImage || backImage) {
        toast.info("Uploading product images...", { autoClose: 1500 });
      }

      const timestamp = Date.now();

      if (frontImage) {
        const frontPath = `product-images/${formData.LTONumber.replace(/[^a-zA-Z0-9]/g, '-')}/front-${timestamp}`;
        const response = await FirebaseStorageService.uploadAgentVerificationDocument(frontImage, frontPath);
        productImageFrontUrl = response.downloadUrl;
      }

      if (backImage) {
        const backPath = `product-images/${formData.LTONumber.replace(/[^a-zA-Z0-9]/g, '-')}/back-${timestamp}`;
        const response = await FirebaseStorageService.uploadAgentVerificationDocument(backImage, backPath);
        productImageBackUrl = response.downloadUrl;
      }

      // ============ PHASE 3: CREATE PRODUCT ============
      const productData: CreateProductRequest = {
        LTONumber: formData.LTONumber,
        CFPRNumber: formData.CFPRNumber,
        lotNumber: formData.lotNumber,
        brandName: formData.brandName,
        productName: formData.productName,
        productClassification: formData.productClassification,
        productSubClassification: formData.productSubClassification,
        expirationDate: new Date(formData.expirationDate),
        dateOfRegistration: new Date(formData.dateOfRegistration),
        companyId: formData.companyId,
        productImageFront: productImageFrontUrl,
        productImageBack: productImageBackUrl,
        // Include entity IDs if a managed brand/classification was selected
        brandNameId: selectedBrandName?._id,
        classificationId: selectedClassification?._id,
        subClassificationId: selectedSubClassification?._id,
        // Include Sepolia transaction ID if available
        sepoliaTransactionId,
      };

      const response = await ProductService.addProduct(productData);

      // Show success message
      if (sepoliaTransactionId) {
        toast.success(
          `Product created & verified on blockchain by ${response.registeredBy.name}!`
        );
      } else {
        toast.success(
          `Product created successfully by ${response.registeredBy.name}!`
        );
      }

      console.log("Product registered by:", response.registeredBy);
      if (sepoliaTransactionId) {
        console.log("Blockchain transaction:", sepoliaTransactionId);
      }

      // Reset form
      setFormData({
        LTONumber: "",
        CFPRNumber: "",
        lotNumber: "",
        brandName: "",
        productName: "",
        productClassification: "",
        productSubClassification: "",
        expirationDate: "",
        dateOfRegistration: new Date().toISOString().split("T")[0],
        companyId: "",
      });
      setCompanyInputValue("");
      setCompanyDropdownOpen(false);
      // Reset brand name dropdown
      setBrandNameInputValue("");
      setBrandNameDropdownOpen(false);
      setSelectedBrandName(null);
      // Reset classification dropdowns
      setClassificationInputValue("");
      setClassificationDropdownOpen(false);
      setSelectedClassification(null);
      setSubClassificationInputValue("");
      setSubClassificationDropdownOpen(false);
      setSelectedSubClassification(null);
      setSubClassificationOptions([]);
      // Reset image states
      setFrontImage(null);
      setBackImage(null);
      setFrontImagePreview("");
      setBackImagePreview("");

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error creating product:", error);
      const errorMessage =
        error.message ||
        error.response?.data?.message ||
        "Failed to create product. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        LTONumber: "",
        CFPRNumber: "",
        lotNumber: "",
        brandName: "",
        productName: "",
        productClassification: "",
        productSubClassification: "",
        expirationDate: "",
        dateOfRegistration: new Date().toISOString().split("T")[0],
        companyId: "",
      });
      setCompanyInputValue("");
      setCompanyDropdownOpen(false);
      setBrandNameInputValue("");
      setBrandNameDropdownOpen(false);
      setSelectedBrandName(null);
      setClassificationInputValue("");
      setClassificationDropdownOpen(false);
      setSubClassificationInputValue("");
      setSubClassificationDropdownOpen(false);
      setSelectedClassification(null);
      setSelectedSubClassification(null);
      setSubClassificationOptions([]);
      setFrontImage(null);
      setBackImage(null);
      setFrontImagePreview("");
      setBackImagePreview("");
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 app-bg-primary-soft rounded-lg">
              <Package className="h-5 w-5 app-text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold app-text">Add New Product</h2>
              <p className="text-sm app-text-subtle">
                Register a new product in the system
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:app-bg-neutral rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 app-text-subtle" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* MetaMask Connection Warning */}
            {(!isWalletConnected || !isWalletAuthorized) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-800">
                      {!isWalletConnected 
                        ? "MetaMask Not Connected" 
                        : "Wallet Not Authorized"}
                    </h4>
                    <p className="text-sm text-amber-700 mt-1">
                      {!isWalletConnected 
                        ? "You need to connect your MetaMask wallet to add products. The product certificate will be stored on the Sepolia blockchain for verification."
                        : "Your wallet is connected but not authorized. Please contact an administrator to authorize your wallet address."}
                    </p>
                    {!isWalletConnected && (
                      <Button
                        type="button"
                        onClick={connectWallet}
                        className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                        size="sm"
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        Connect MetaMask
                      </Button>
                    )}
                    {isWalletConnected && !isWalletAuthorized && walletAddress && (
                      <p className="text-xs text-amber-600 mt-2 font-mono">
                        Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Wallet Connected Badge */}
            {isWalletConnected && isWalletAuthorized && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">
                    Wallet Connected & Authorized
                  </span>
                  <span className="text-xs text-green-600 font-mono ml-auto">
                    {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                  </span>
                </div>
              </div>
            )}

            {/* LTO and CFPR Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium app-text-subtle mb-2">
                  LTO Number *
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4" />
                  <Input
                    name="LTONumber"
                    value={formData.LTONumber}
                    onChange={handleChange}
                    placeholder="LTO-12345678"
                    className={`pl-10 ${
                      errors.LTONumber ? "border-[color:var(--app-error)]" : ""
                    }`}
                    disabled={loading}
                  />
                </div>
                {errors.LTONumber && (
                  <p className="app-text-error text-xs mt-1">
                    {errors.LTONumber}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium app-text-subtle mb-2">
                  CFPR Number *
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4" />
                  <Input
                    name="CFPRNumber"
                    value={formData.CFPRNumber}
                    onChange={handleChange}
                    placeholder="CFPR-1234567"
                    className={`pl-10 ${
                      errors.CFPRNumber ? "border-[color:var(--app-error)]" : ""
                    }`}
                    disabled={loading}
                  />
                </div>
                {errors.CFPRNumber && (
                  <p className="app-text-error text-xs mt-1">
                    {errors.CFPRNumber}
                  </p>
                )}
              </div>
            </div>

            {/* Lot Number */}
            <div>
              <label className="block text-sm font-medium app-text-subtle mb-2">
                Lot Number *
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4" />
                <Input
                  name="lotNumber"
                  value={formData.lotNumber}
                  onChange={handleChange}
                  placeholder="Enter lot number"
                  className={`pl-10 ${
                    errors.lotNumber ? "border-[color:var(--app-error)]" : ""
                  }`}
                  disabled={loading}
                />
              </div>
              {errors.lotNumber && (
                <p className="app-text-error text-xs mt-1">
                  {errors.lotNumber}
                </p>
              )}
            </div>

            {/* Brand and Product Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Brand Name - with Add Brand Name button */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium app-text-subtle">
                    Brand Name *
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddBrandNameModal(true)}
                    disabled={loading}
                    className="text-xs h-7 px-2"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Brand
                  </Button>
                </div>
                <div className="relative" ref={brandNameDropdownRef}>
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4 z-10" />
                  <Input
                    type="text"
                    name="brandNameSearch"
                    autoComplete="off"
                    value={brandNameInputValue}
                    onFocus={() => setBrandNameDropdownOpen(true)}
                    onChange={(e) => handleBrandNameInputChange(e.target.value)}
                    placeholder="Search or enter brand name"
                    className={`pl-10 ${
                      errors.brandName ? "border-[color:var(--app-error)]" : ""
                    }`}
                    disabled={loading}
                  />
                  {brandNameDropdownOpen && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {brandNameLoading ? (
                        <div className="p-3 text-sm text-gray-500">
                          Loading brand names...
                        </div>
                      ) : brandNameOptions.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500">
                          <p>{brandNameInputValue ? `No brand names matching "${brandNameInputValue}"` : "No brand names found"}</p>
                          <p className="text-xs mt-1">You can type a custom brand name or add a new one</p>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={() => {
                              setBrandNameDropdownOpen(false);
                              setShowAddBrandNameModal(true);
                            }}
                            className="text-xs p-0 h-auto mt-1"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add a new brand name
                          </Button>
                        </div>
                      ) : (
                        brandNameOptions.map((bn) => (
                          <button
                            key={bn._id}
                            type="button"
                            onClick={() => handleBrandNameSelect(bn)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                              formData.brandName === bn.name ? "bg-gray-100 font-medium" : ""
                            }`}
                          >
                            {bn.name}
                            {bn.productCount !== undefined && (
                              <span className="text-xs text-gray-400 ml-2">({bn.productCount} products)</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {errors.brandName && (
                  <p className="app-text-error text-xs mt-1">{errors.brandName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium app-text-subtle mb-2">
                  Product Name *
                </label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4" />
                  <Input
                    name="productName"
                    value={formData.productName}
                    onChange={handleChange}
                    placeholder="Enter product name"
                    className={`pl-10 ${
                      errors.productName
                        ? "border-[color:var(--app-error)]"
                        : ""
                    }`}
                    disabled={loading}
                  />
                </div>
                {errors.productName && (
                  <p className="app-text-error text-xs mt-1">
                    {errors.productName}
                  </p>
                )}
              </div>
            </div>

            {/* Classifications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Classification - with Add Classification button */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium app-text-subtle">
                    Product Classification *
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setClassificationParent(null);
                      setShowAddClassificationModal(true);
                    }}
                    disabled={loading}
                    className="text-xs h-7 px-2"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="relative" ref={classificationDropdownRef}>
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4 z-10" />
                  <Input
                    type="text"
                    name="classificationSearch"
                    autoComplete="off"
                    value={classificationInputValue}
                    onFocus={() => setClassificationDropdownOpen(true)}
                    onChange={(e) => handleClassificationInputChange(e.target.value)}
                    placeholder="Search or select classification"
                    className={`pl-10 ${
                      errors.productClassification ? "border-[color:var(--app-error)]" : ""
                    }`}
                    disabled={loading}
                  />
                  {classificationDropdownOpen && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {classificationLoading ? (
                        <div className="p-3 text-sm text-gray-500">
                          Loading classifications...
                        </div>
                      ) : classificationOptions.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500">
                          <p>{classificationInputValue ? `No classifications matching "${classificationInputValue}"` : "No classifications found"}</p>
                          <p className="text-xs mt-1">You can type a custom classification or add a new one</p>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={() => {
                              setClassificationDropdownOpen(false);
                              setClassificationParent(null);
                              setShowAddClassificationModal(true);
                            }}
                            className="text-xs p-0 h-auto mt-1"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add a new classification
                          </Button>
                        </div>
                      ) : (
                        classificationOptions.map((c) => (
                          <button
                            key={c._id}
                            type="button"
                            onClick={() => handleClassificationSelect(c)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                              formData.productClassification === c.name ? "bg-gray-100 font-medium" : ""
                            }`}
                          >
                            {c.name}
                            {c.productCount !== undefined && (
                              <span className="text-xs text-gray-400 ml-2">({c.productCount} products)</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {errors.productClassification && (
                  <p className="app-text-error text-xs mt-1">{errors.productClassification}</p>
                )}
              </div>

              {/* Product Sub-Classification - with Add Sub-Classification button */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium app-text-subtle">
                    Product Sub-Classification *
                  </label>
                  {selectedClassification && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setClassificationParent(selectedClassification);
                        setShowAddClassificationModal(true);
                      }}
                      disabled={loading}
                      className="text-xs h-7 px-2"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Sub
                    </Button>
                  )}
                </div>
                <div className="relative" ref={subClassificationDropdownRef}>
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4 z-10" />
                  <Input
                    type="text"
                    name="subClassificationSearch"
                    autoComplete="off"
                    value={subClassificationInputValue}
                    onFocus={() => selectedClassification && setSubClassificationDropdownOpen(true)}
                    onChange={(e) => handleSubClassificationInputChange(e.target.value)}
                    placeholder={selectedClassification ? "Search or select sub-classification" : "Select classification first"}
                    className={`pl-10 ${
                      errors.productSubClassification ? "border-[color:var(--app-error)]" : ""
                    }`}
                    disabled={loading || !selectedClassification}
                  />
                  {subClassificationDropdownOpen && selectedClassification && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {subClassificationLoading ? (
                        <div className="p-3 text-sm text-gray-500">
                          Loading sub-classifications...
                        </div>
                      ) : subClassificationOptions.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500">
                          <p>{subClassificationInputValue ? `No sub-classifications matching "${subClassificationInputValue}"` : `No sub-classifications for "${selectedClassification.name}"`}</p>
                          <p className="text-xs mt-1">You can type a custom sub-classification or add a new one</p>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={() => {
                              setSubClassificationDropdownOpen(false);
                              setClassificationParent(selectedClassification);
                              setShowAddClassificationModal(true);
                            }}
                            className="text-xs p-0 h-auto mt-1"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add a sub-classification
                          </Button>
                        </div>
                      ) : (
                        subClassificationOptions.map((sc) => (
                          <button
                            key={sc._id}
                            type="button"
                            onClick={() => handleSubClassificationSelect(sc)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                              formData.productSubClassification === sc.name ? "bg-gray-100 font-medium" : ""
                            }`}
                          >
                            {sc.name}
                            {sc.productCount !== undefined && (
                              <span className="text-xs text-gray-400 ml-2">({sc.productCount} products)</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {errors.productSubClassification && (
                  <p className="app-text-error text-xs mt-1">
                    {errors.productSubClassification}
                  </p>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium app-text-subtle mb-2">
                  Date of Registration *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4" />
                  <Input
                    type="date"
                    name="dateOfRegistration"
                    value={formData.dateOfRegistration}
                    onChange={handleChange}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium app-text-subtle mb-2">
                  Expiration Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4" />
                  <Input
                    type="date"
                    name="expirationDate"
                    value={formData.expirationDate}
                    onChange={handleChange}
                    className={`pl-10 ${
                      errors.expirationDate
                        ? "border-[color:var(--app-error)]"
                        : ""
                    }`}
                    disabled={loading}
                  />
                </div>
                {errors.expirationDate && (
                  <p className="app-text-error text-xs mt-1">
                    {errors.expirationDate}
                  </p>
                )}
              </div>
            </div>

            {/* Company - with Add Company button */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium app-text-subtle">
                  Company *
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddCompanyModal(true)}
                  disabled={loading}
                  className="text-xs h-7 px-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Company
                </Button>
              </div>
              <div className="relative" ref={companyDropdownRef}>
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4" />
                <Input
                  type="text"
                  name="companySearch"
                  autoComplete="off"
                  value={companyInputValue}
                  onFocus={() => setCompanyDropdownOpen(true)}
                  onChange={(e) => handleCompanyInputChange(e.target.value)}
                  placeholder="Search or select a company"
                  className={`pl-10 ${
                    errors.companyId
                      ? "border-[color:var(--app-error)]"
                      : "app-border-neutral"
                  }`}
                  disabled={loading}
                />
                {companyDropdownOpen && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {companyLoading ? (
                      <div className="p-3 text-sm text-gray-500">
                        Searching companies...
                      </div>
                    ) : companyOptions.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">
                        <p>No companies found</p>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={() => {
                            setCompanyDropdownOpen(false);
                            setShowAddCompanyModal(true);
                          }}
                          className="text-xs p-0 h-auto mt-1"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add a new company
                        </Button>
                      </div>
                    ) : (
                      companyOptions.map((company) => (
                        <button
                          key={company._id}
                          type="button"
                          onClick={() => handleCompanySelect(company)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                            formData.companyId === company._id
                              ? "bg-gray-100 font-medium"
                              : ""
                          }`}
                        >
                          {company.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {errors.companyId && (
                <p className="app-text-error text-xs mt-1">
                  {errors.companyId}
                </p>
              )}
            </div>

            {/* Product Images Section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Camera className="h-4 w-4 app-text-primary" />
                <label className="block text-sm font-medium app-text">
                  Product Images
                </label>
                <span className="text-xs text-gray-400">(Optional)</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Capture the front and back of the product to show how it should look for verification purposes.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Front Image */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">
                    Front Image
                  </label>
                  {frontImagePreview ? (
                    <div className="relative">
                      <img
                        src={frontImagePreview}
                        alt="Product Front Preview"
                        className="w-full h-40 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage("front")}
                        disabled={loading}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => !loading && frontImageRef.current?.click()}
                      className={`border-2 border-dashed border-gray-300 rounded-lg h-40 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors ${
                        loading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <ImagePlus className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Click to upload</p>
                      <p className="text-xs text-gray-400">Front of product</p>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={frontImageRef}
                    onChange={(e) => handleImageChange(e, "front")}
                    accept="image/*"
                    className="hidden"
                    disabled={loading}
                  />
                </div>

                {/* Back Image */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">
                    Back Image
                  </label>
                  {backImagePreview ? (
                    <div className="relative">
                      <img
                        src={backImagePreview}
                        alt="Product Back Preview"
                        className="w-full h-40 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage("back")}
                        disabled={loading}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => !loading && backImageRef.current?.click()}
                      className={`border-2 border-dashed border-gray-300 rounded-lg h-40 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors ${
                        loading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <ImagePlus className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Click to upload</p>
                      <p className="text-xs text-gray-400">Back of product</p>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={backImageRef}
                    onChange={(e) => handleImageChange(e, "back")}
                    accept="image/*"
                    className="hidden"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="app-bg-primary text-white hover:opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || !isWalletConnected || !isWalletAuthorized}
                title={!isWalletConnected ? "Connect MetaMask to create products" : !isWalletAuthorized ? "Wallet not authorized" : ""}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </div>
                ) : (
                  <>
                    <Package className="w-4 h-4 mr-2" />
                    Create Product
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Add Company Modal */}
      <AddCompanyModal
        isOpen={showAddCompanyModal}
        onClose={() => setShowAddCompanyModal(false)}
        onSuccess={handleAddCompanySuccess}
      />

      {/* Add Brand Name Modal */}
      <AddBrandNameModal
        isOpen={showAddBrandNameModal}
        onClose={() => setShowAddBrandNameModal(false)}
        onSuccess={handleAddBrandNameSuccess}
      />

      {/* Add Classification Modal */}
      <AddClassificationModal
        isOpen={showAddClassificationModal}
        onClose={() => {
          setShowAddClassificationModal(false);
          setClassificationParent(null);
        }}
        onSuccess={handleAddClassificationSuccess}
        parentClassification={classificationParent}
      />
    </div>
  );
}
