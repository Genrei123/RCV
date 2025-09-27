// Test file to verify the data format being sent to backend
// Copy this payload and test it directly with your API

const testProductPayload = {
  "LTONumber": "TEST123456",
  "CFPRNumber": "CFPR789012", 
  "lotNumber": "LOT001",
  "brandName": "Test Brand",
  "productName": "Test Product Name",
  "productClassification": 0,  // 0 = Others
  "productSubClassification": 0, // 0 = Gamecock Feeds  
  "expirationDate": "2024-12-31", // ISO date string
  "dateOfRegistration": "2024-01-15", // ISO date string
  "companyId": "some-company-uuid-here" // Replace with actual company UUID
};

console.log('Test payload to send to POST /api/v1/products:');
console.log(JSON.stringify(testProductPayload, null, 2));

// Curl command to test:
/*
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "LTONumber": "TEST123456",
    "CFPRNumber": "CFPR789012", 
    "lotNumber": "LOT001",
    "brandName": "Test Brand",
    "productName": "Test Product Name",
    "productClassification": 0,
    "productSubClassification": 0,
    "expirationDate": "2024-12-31",
    "dateOfRegistration": "2024-01-15",
    "companyId": "some-company-uuid-here"
  }'
*/

export default testProductPayload;