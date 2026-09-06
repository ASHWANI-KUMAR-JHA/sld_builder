// Authentication utility with secure password hashing
// Credentials are stored as SHA-256 hashes - original passwords never appear in code

// Pre-computed SHA-256 hashes of valid credentials
// These hashes are irreversible - the plain text cannot be recovered from them
const VALID_USERS = [
 {
    email: 'admin@gmail.com',
    // SHA-256 hash of the password (irreversible)
    passwordHash: 'fbad0e70cef1547f1cbc981f29f660b54f0176c4b86c5bc744bca282b05f7933',
  },
   {
    email: 'info.sunfeedsolution@gmail.com',
    // SHA-256 hash of the password (irreversible)
    passwordHash: 'fbad0e70cef1547f1cbc981f29f660b54f0176c4b86c5bc744bca282b05f7933',
  },
     {
    email: 'paramvirrana17@gmail.com',
    // SHA-256 hash of the password (irreversible)
    passwordHash: 'e7eeb080a170d3445660ac5dfa4ec6cc2857eb30c0fdd9b3deadf7e53b1a0daf',
  },
  

];

// Compute SHA-256 hash of a string using Web Crypto API
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate credentials against stored hashes
export async function validateCredentials(email, password) {
  const passwordHash = await sha256(password);
  const user = VALID_USERS.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === passwordHash
  );
  return !!user;
}

// Session management
const SESSION_KEY = 'solar-plan-auth-session';
const SESSION_DURATION = 6 * 60 * 60 * 1000; // 6 hours

export function setSession(email) {
  const session = {
    email,
    timestamp: Date.now(),
    expires: Date.now() + SESSION_DURATION,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession() {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    if (!data) return null;
    const session = JSON.parse(data);
    if (Date.now() > session.expires) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated() {
  return getSession() !== null;
}
