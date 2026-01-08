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
 * @param phoneNumber - The phone number (10 digits with leading 0, with or without +63 prefix)
 * @returns Object with isValid boolean and error message if invalid
 */
export const validatePhilippinePhoneNumber = (
  phoneNumber: string
): { isValid: boolean; error?: string } => {
  // Extract only digits
  const digitsOnly = phoneNumber.replace(/\D/g, "");

  // Check if it's exactly 10 or 12 digits (10 digits + 63 prefix)
  let tenDigitNumber = digitsOnly;

  if (digitsOnly.length === 12 && digitsOnly.startsWith("63")) {
    // Remove +63 prefix (first 2 digits)
    tenDigitNumber = digitsOnly.substring(2);
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith("63")) {
    // Handle case where user typed 63 instead of +63
    tenDigitNumber = digitsOnly.substring(2);
  } else if (digitsOnly.length !== 10) {
    return { isValid: false, error: "Phone number must be 10 digits" };
  }

  // Check if prefix is valid
  if (!isValidPhilippineMobilePrefix(`0${tenDigitNumber.substring(0, 9)}`)) {
    return {
      isValid: false,
      error: "Invalid Philippine mobile network prefix",
    };
  }

  return { isValid: true };
};

/**
 * Formats phone number with +63 prefix
 * @param phoneNumber - The phone number (10 digits, can start with 9 or 0)
 * @returns Formatted phone number with +63 prefix (removes leading 0 if present)
 */
export const formatPhoneNumberForDatabase = (phoneNumber: string): string => {
  // Remove any non-digits
  const digits = phoneNumber.replace(/\D/g, "");

  // Handle different cases
  if (digits.length === 10) {
    // If it starts with 0, remove it: 0999... -> +63999...
    // If it starts with 9, keep it: 9999... -> +63999...
    if (digits.startsWith("0")) {
      return `+63${digits.substring(1)}`;
    } else {
      // No leading 0, just add +63
      return `+63${digits}`;
    }
  }

  // Fallback for other cases
  return phoneNumber;
};

/**
 * Extracts and displays phone number digits (removes +63 prefix if present)
 * For display in input field: shows just the 10 digits after +63
 * @param phoneNumber - The phone number (with or without +63 prefix, partial or complete)
 * @returns The digits to display in the input field (without +63 prefix, no leading 0)
 */
export const extractPhoneNumberDigits = (phoneNumber: string): string => {
  if (!phoneNumber) {
    return "";
  }

  const digitsOnly = phoneNumber.replace(/\D/g, "");

  // If it's 12 digits and starts with 63 (the +63 prefix in digit form)
  // e.g., "+639994961369" -> "639994961369" (12 digits) -> return "9994961369"
  if (digitsOnly.length === 12 && digitsOnly.startsWith("63")) {
    return digitsOnly.substring(2);
  }

  // If it's 11 digits and starts with 63 (user typed 63 without +)
  // e.g., "6399949613" (11 digits) - shouldn't happen but handle it
  if (digitsOnly.length === 11 && digitsOnly.startsWith("63")) {
    return digitsOnly.substring(2);
  }

  // For any other case (partial input during typing), just return the digits
  return digitsOnly;
};

/**
 * Formats phone number with dashes for display: 9994961370 -> 999-496-1370
 * @param phoneNumber - Plain 10 digits (without +63 prefix and dashes)
 * @returns Formatted phone number with dashes in format XXX-XXX-XXXX
 */
export const formatPhoneNumberForDisplay = (phoneNumber: string): string => {
  // Remove any non-digits first
  const digitsOnly = phoneNumber.replace(/\D/g, "");

  // Only format if it has 10 digits
  if (digitsOnly.length === 0) {
    return "";
  }
  if (digitsOnly.length <= 3) {
    return digitsOnly;
  }
  if (digitsOnly.length <= 6) {
    return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
  }
  // Format as XXX-XXX-XXXX
  return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(
    3,
    6
  )}-${digitsOnly.slice(6, 10)}`;
};
