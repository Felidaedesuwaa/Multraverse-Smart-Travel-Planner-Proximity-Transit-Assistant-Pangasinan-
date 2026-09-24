export function validateEmail(email) {
  if (!email.trim()) return "Email is required";
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email.trim())) return "Enter a valid email address";
  return null;
}

export function validatePassword(password) {
  if (typeof password !== "string" || !password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 72) return "Password must be at most 72 characters";
  if (!/^[A-Za-z0-9_@-]+$/.test(password)) return "Use letters, numbers, _, - or @ only. Spaces and other symbols are not allowed";
  if (!/[A-Z]/.test(password)) return "Include at least one uppercase letter";
  if (!/[0-9]/.test(password)) return "Include at least one number";
  return null;
}

export function normalizeName(value) {
  return typeof value === "string" ? value.normalize("NFC").trim().replace(/\s+/g, " ") : "";
}

export function validateNamePart(value, label, optional = false) {
  if (typeof value !== "string") return `${label} is required`;
  const name = normalizeName(value);
  if (!name) return optional ? null : `${label} is required`;
  if (name.length > 35) return `${label} must be at most 35 characters`;
  if (!/^\p{L}[\p{L}\p{M}]*(?:[ '\u2019-][\p{L}\p{M}]+)*$/u.test(name)) return `${label} can contain letters, spaces, apostrophes and hyphens only`;
  return null;
}

export function registrationFullName(firstName, middleName, surname) {
  const middle = normalizeName(middleName);
  return [normalizeName(firstName), middle ? `${Array.from(middle)[0].toLocaleUpperCase("en")}.` : "", normalizeName(surname)].filter(Boolean).join(" ");
}

export function profileNameFields(user) {
  if (typeof user?.firstName === "string" && typeof user?.surname === "string") {
    return { firstName: user.firstName, middleName: user.middleName || "", surname: user.surname };
  }
  // Legacy accounts only have a full name. Preserve explicit middle initials
  // and let the user review ambiguous multi-word names before saving.
  const parts = normalizeName(user?.name).split(" ").filter(Boolean);
  const initial = parts.findIndex((part, index) => index > 0 && index < parts.length - 1 && /^\p{L}\p{M}*\.$/u.test(part));
  if (initial > 0) return { firstName: parts.slice(0, initial).join(" "), middleName: parts[initial].slice(0, -1), surname: parts.slice(initial + 1).join(" ") };
  return { firstName: parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] || "", middleName: "", surname: parts.length > 1 ? parts.at(-1) : "" };
}

export function validateProfileNames(fields) {
  return {
    firstName: validateNamePart(fields.firstName, "First name"),
    middleName: validateNamePart(fields.middleName, "Middle name", true),
    surname: validateNamePart(fields.surname, "Surname"),
  };
}

export function validateRegistrationEmail(email) {
  if (typeof email !== "string" || !email.trim()) return "Email is required";
  const value = email.trim().toLowerCase();
  const parts = value.split("@");
  const [local, domain] = parts;
  if (value.length > 254 || parts.length !== 2 || !local || local.length > 64 ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) || local.startsWith(".") || local.endsWith(".") || local.includes("..") ||
    !domain || !domain.includes(".") || !domain.split(".").every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) || !/[a-z]/.test(domain.split(".").at(-1))) {
    return "Enter a valid email address, such as juan.delacruz@gmail.com";
  }
  if (["example.com", "example.org", "example.net", "example", "test", "invalid", "localhost"].some(blocked => domain === blocked || domain.endsWith(`.${blocked}`))) {
    return "Use your own email address. Example and test domains are not accepted";
  }
  return null;
}

export function validateRegistration(fields) {
  return {
    firstName: validateNamePart(fields.firstName, "First name"),
    middleName: validateNamePart(fields.middleName ?? "", "Middle name", true),
    surname: validateNamePart(fields.surname, "Surname"),
    email: validateRegistrationEmail(fields.email),
    password: validatePassword(fields.password),
    confirm: validateConfirmPassword(fields.password, fields.confirm),
  };
}

export function validateName(name) {
  if (!name.trim()) return "Full name is required";
  if (name.trim().length < 2) return "Name is too short";
  return null;
}

export function validateConfirmPassword(password, confirm) {
  if (!confirm) return "Please confirm your password";
  if (password !== confirm) return "Passwords do not match";
  return null;
}
