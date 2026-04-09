import React from "react";
import COUNTRY_CODES from "../countryCodes";

export default function PhoneInput({ value = "", onChange, placeholder = "XXXXXXXXXX" }) {
  // Strip wa.me prefix if present, then normalize to +countrycodenumber
  const normalized = value.startsWith("https://wa.me/")
    ? "+" + value.replace("https://wa.me/", "")
    : value;

  const matched = COUNTRY_CODES.find((c) => normalized.startsWith(c.code));
  const dialCode = matched?.code || "+20";
  const localNumber = matched ? normalized.slice(dialCode.length) : normalized;

  const handleCodeChange = (e) => {
    onChange(e.target.value + localNumber);
  };

  const handleNumberChange = (e) => {
    let num = e.target.value.replace(/\D/g, "");

    // Strip leading zeros (trunk prefix e.g. 0 before 1xxxxxxxx in Egypt)
    num = num.replace(/^0+/, "");

    // Strip if user typed the country code digits at the start
    // e.g. "+20" → "20", if num starts with "20" strip it
    const codeDigits = dialCode.replace(/^\+/, "");
    if (num.startsWith(codeDigits)) {
      num = num.slice(codeDigits.length);
      // Strip any leading zero that may follow the country code
      num = num.replace(/^0+/, "");
    }

    onChange(dialCode + num);
  };

  return (
    <div className="phone-input-wrap" dir="ltr">
      <select
        className="country-code-select"
        value={dialCode}
        onChange={handleCodeChange}
      >
        {COUNTRY_CODES.map((c) => (
          <option key={c.code + c.name} value={c.code}>
            {c.flag} {c.code}
          </option>
        ))}
      </select>
      <input
        className="phone-local-input"
        type="tel"
        inputMode="numeric"
        placeholder={placeholder}
        value={localNumber}
        onChange={handleNumberChange}
      />
    </div>
  );
}