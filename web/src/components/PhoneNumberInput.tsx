import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  validatePhilippinePhoneNumber,
} from "@/utils/phoneValidation";

interface PhoneNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  placeholder?: string;
}

export function PhoneNumberInput({
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  label = "Phone Number",
  required = true,
  placeholder = "9991113333",
}: PhoneNumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;

    // Remove all non-digit characters
    let numericValue = inputValue.replace(/\D/g, "");

    // If user typed +63 prefix, remove it (first 2 digits)
    if (numericValue.startsWith("63") && numericValue.length > 10) {
      numericValue = numericValue.substring(2);
    }

    // Take only first 10 digits
    numericValue = numericValue.slice(0, 10);

    onChange(numericValue);
  };

  const handleBlur = () => {
    // Validate on blur
    if (value && value.length === 10) {
      const phoneValidation = validatePhilippinePhoneNumber(`0${value}`);
      if (phoneValidation.isValid) {
        // Valid - validation will be handled by parent component
      }
    }

    onBlur?.();
  };

  // Unified design for all variants
  return (
    <div>
      <Label htmlFor="phoneNumber">
        {label}
        {required && " *"}
      </Label>
      <div className="relative mt-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-semibold">
          +63
        </span>
        <Input
          id="phoneNumber"
          placeholder={placeholder}
          maxLength={10}
          className={`pl-12 h-11 ${error ? "border-red-500" : ""}`}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
        />
      </div>
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
}
