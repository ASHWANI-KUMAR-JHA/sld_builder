// Authentication utility.
//
// Login is validated in two layers:
//   1. Supabase `app_users` table (managed via the User Manager). Users must
//      be active to sign in. Passwords are compared as SHA-256 hashes.
//   2. A small set of built-in admin accounts kept in code as a fallback so
//      the app is always accessible even before any users are created.

import { findUserByEmail, sha256 } from './users';

// Pre-computed SHA-256 hashes of built-in admin credentials.
// These hashes are irreversible - the plain text cannot be recovered from them.
const VALID_USERS = [
  {
    name: 'Admin',
    email: 'admin@gmail.com',
    passwordHash: 'fbad0e70cef1547f1cbc981f29f660b54f0176c4b86c5bc744bca282b05f7933',
  },
  {
    name: 'Sunfeed Solution',
    email: 'info.sunfeedsolution@gmail.com',
    passwordHash: 'fbad0e70cef1547f1cbc981f29f660b54f0176c4b86c5bc744bca282b05f7933',
  },
  {
    name: 'Paramvir Rana',
    email: 'paramvirrana17@gmail.com',
    passwordHash: 'e7eeb080a170d3445660ac5dfa4ec6cc2857eb30c0fdd9b3deadf7e53b1a0daf',
  },
];

// Is this one of the built-in admin accounts? Built-in admins are not stored
// in the Supabase table, so status checks must always allow them.
export function isBuiltInAdmin(email) {
  const e = String(email || '').toLowerCase();
  return VALID_USERS.some((u) => u.email.toLowerCase() === e);
}

// Validate credentials. Returns the matched user's public profile
// ({ name, email }) on success, or null on failure.
export async function validateCredentials(email, password) {
  const passwordHash = await sha256(password);

  // 1. Try the Supabase-managed users first.
  try {
    const user = await findUserByEmail(email);
    if (user && user.password_hash === passwordHash) {
      if (user.is_active === false) {
        const err = new Error('This account is inactive. Please contact an administrator.');
        err.code = 'INACTIVE';
        throw err;
      }
      return { name: user.name, email: user.email };
    }
  } catch (err) {
    // Propagate the "inactive account" case so the UI can show it.
    if (err.code === 'INACTIVE') throw err;
    // Otherwise (e.g. table missing / offline) fall through to built-in admins.
    console.warn('Supabase user lookup failed, falling back to built-in accounts:', err.message);
  }

  // 2. Fall back to the built-in admin accounts.
  const admin = VALID_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === passwordHash
  );
  return admin ? { name: admin.name, email: admin.email } : null;
}

// Session management
const SESSION_KEY = 'solar-plan-auth-session';
const SESSION_DURATION = 6 * 60 * 60 * 1000; // 6 hours

export function setSession(user) {
  // Accept either a string email (legacy) or a { name, email } object.
  const profile = typeof user === 'string' ? { name: '', email: user } : user;
  const session = {
    name: profile.name || '',
    email: profile.email,
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

export function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  return { name: session.name || '', email: session.email };
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated() {
  return getSession() !== null;
}
