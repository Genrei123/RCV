/**
 * Valid Philippine mobile network prefixes (first 3 digits after country code)
 * These prefixes are based on Philippine mobile network operators
 * Updated as of March 2025
 * Source: https://www.globeorsmart.com/blog/march-2025-complete-list-of-mobile-network-prefixes.asp
 */
const VALID_PH_PREFIXES = [
  // Smart Communications
  "813",
  "900",
  "908",
  "911",
  "913",
  "914",
  "919",
  "920",
  "921",
  "922",
  "923",
  "924",
  "925",
  "928",
  "929",
  "931",
  "932",
  "933",
  "934",
  "939",
  "940",
  "941",
  "942",
  "943",
  "944",
  "946",
  "947",
  "949",
  "951",
  "952",
  "961",
  "962",
  "963",
  "964",
  "968",
  "969",
  "970",
  "971",
  "973",
  "974",
  "980",
  "981",
  "982",
  "985",
  "990",
  "998",
  "999",

  // Globe Telecoms & Touch Mobile
  "817",
  "904",
  "905",
  "906",
  "915",
  "916",
  "917",
  "926",
  "927",
  "935",
  "936",
  "937",
  "945",
  "953",
  "954",
  "955",
  "956",
  "957",
  "958",
  "959",
  "965",
  "966",
  "967",
  "975",
  "976",
  "977",
  "978",
  "979",
  "995",
  "996",
  "997",

  // Talk 'n Text (mostly on Smart network)
  "907",
  "909",
  "910",
  "912",
  "918",
  "930",
  "938",
  "948",
  "950",
  "989",

  // Sun Cellular
  "972",

  // DITO Telecommunity
  "895",
  "896",
  "897",
  "898",
  "991",
  "992",
  "993",
  "994",

  // 4-digit prefixes (Globe)
  "9253",
  "9255",
  "9256",
  "9257",
  "9258",
];

/**
 * Validates if a phone number prefix is valid for Philippines
 * @param phoneNumber - The phone number (10 digits with leading 0, without +63 prefix)
 * @returns true if prefix is valid, false otherwise
 */
export const isValidPhilippineMobilePrefix = (phoneNumber: string): boolean => {
  if (!phoneNumber || phoneNumber.length < 4) {
    return false;
  }

  // Extract the prefix (skip the leading 0, take next 3 digits)
  // e.g., "0913" -> "913"
  const prefix = phoneNumber.substring(1, 4);
  return VALID_PH_PREFIXES.includes(prefix);
};

/**
 * Validates a Philippine phone number
 * @param phoneNumber - The phone number (10 digits with leading 0, without +63 prefix)
 * @returns Object with isValid boolean and error message if invalid
 */
export const validatePhilippinePhoneNumber = (
  phoneNumber: string
): { isValid: boolean; error?: string } => {
  // Check if it's exactly 10 digits
  if (!/^\d{10}$/.test(phoneNumber)) {
    return { isValid: false, error: "Phone number must be 10 digits" };
  }

  // Check if prefix is valid
  if (!isValidPhilippineMobilePrefix(phoneNumber)) {
    return {
      isValid: false,
      error: "Invalid Philippine mobile network prefix",
    };
  }

  return { isValid: true };
};

/**
 * Formats phone number with +63 prefix
 * @param phoneNumber - The phone number (10 digits with leading 0)
 * @returns Formatted phone number with +63 prefix (removes leading 0)
 */
export const formatPhoneNumberForDatabase = (phoneNumber: string): string => {
  // Remove any non-digits and ensure it's 10 digits
  const digits = phoneNumber.replace(/\D/g, "").slice(-10);
  // Remove leading 0 and add +63 prefix
  if (digits.length === 10) {
    return `+63${digits.substring(1)}`;
  }
  return phoneNumber;
};

/**
 * Extracts 10 digits from a phone number (with leading 0, removes +63 prefix if present)
 * @param phoneNumber - The phone number (with or without +63 prefix)
 * @returns Only the 10 digits with leading 0
 */
export const extractPhoneNumberDigits = (phoneNumber: string): string => {
  const digits = phoneNumber.replace(/\D/g, "").slice(-10);
  // Ensure it starts with 0
  if (digits.length === 9) {
    return `0${digits}`;
  }
  return digits;
};
