export function validateEmail(email) {
  if (!email.trim()) return "Email is required";
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email.trim())) return "Enter a valid email address";
  return null;
}

export function validatePassword(password) {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Include at least one uppercase letter";
  if (!/[0-9]/.test(password)) return "Include at least one number";
  return null;
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
