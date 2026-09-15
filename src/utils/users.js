import { supabase } from './supabase';

// Table name in Supabase. Run supabase_users_table.sql to create it.
export const USERS_TABLE = 'app_users';

// Compute SHA-256 hash of a string using the Web Crypto API.
// Passwords are only ever stored/compared as these irreversible hashes.
export async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Fetch all app users, newest first.
export async function fetchUsers() {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Check whether a user is currently allowed to act (exists and is active).
// Returns { exists, active }. Used to block stale sessions of users who were
// later deactivated or deleted. Throws if the lookup itself fails (offline /
// table missing) so callers can decide how to handle that separately.
export async function getUserStatusByEmail(email) {
  const user = await findUserByEmail(email);
  return {
    exists: !!user,
    active: !!user && user.is_active !== false,
  };
}

// Look up a single active user by email (used at login).
export async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('*')
    .ilike('email', email.trim())
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

// Create a new user. `password` is hashed before it leaves the browser.
export async function createUser({ name, email, phone, password, isActive = true }) {
  const password_hash = await sha256(password);
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      password_hash,
      is_active: isActive,
    })
    .select();
  if (error) throw error;
  return data?.[0] || null;
}

// Update editable profile fields (name, email, phone, active status).
export async function updateUser(id, { name, email, phone, isActive }) {
  const payload = {};
  if (name !== undefined) payload.name = name.trim();
  if (email !== undefined) payload.email = email.trim().toLowerCase();
  if (phone !== undefined) payload.phone = phone?.trim() || null;
  if (isActive !== undefined) payload.is_active = isActive;

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update(payload)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data?.[0] || null;
}

// Reset (change) a user's password.
export async function resetPassword(id, newPassword) {
  const password_hash = await sha256(newPassword);
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update({ password_hash })
    .eq('id', id)
    .select();
  if (error) throw error;
  return data?.[0] || null;
}

// Toggle / set a user's active status.
export async function setUserActive(id, isActive) {
  return updateUser(id, { isActive });
}

export async function deleteUser(id) {
  const { error } = await supabase.from(USERS_TABLE).delete().eq('id', id);
  if (error) throw error;
}
