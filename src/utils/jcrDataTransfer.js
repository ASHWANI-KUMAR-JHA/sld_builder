/**
 * JCR Data Transfer Utility
 * Handles temporary storage for transferring installation data to JCR
 */

const JCR_TRANSFER_KEY = 'jcr_pending_import';

/**
 * Store installation data for JCR import
 * @param {Array} installations - Array of installation records to import
 */
export const storePendingJCRImport = (installations) => {
  try {
    const data = {
      installations,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(JCR_TRANSFER_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to store JCR import data:', error);
    return false;
  }
};

/**
 * Retrieve and clear pending JCR import data
 * @returns {Array|null} Array of installations or null if none pending
 */
export const getPendingJCRImport = () => {
  try {
    const stored = localStorage.getItem(JCR_TRANSFER_KEY);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    
    // Clear after retrieval
    localStorage.removeItem(JCR_TRANSFER_KEY);
    
    // Check if data is not too old (within 1 hour)
    const timestamp = new Date(data.timestamp);
    const now = new Date();
    const hourInMs = 60 * 60 * 1000;
    
    if (now - timestamp > hourInMs) {
      console.warn('JCR import data expired (>1 hour old)');
      return null;
    }
    
    return data.installations || null;
  } catch (error) {
    console.error('Failed to retrieve JCR import data:', error);
    return null;
  }
};

/**
 * Check if there's pending JCR import data
 * @returns {boolean}
 */
export const hasPendingJCRImport = () => {
  try {
    const stored = localStorage.getItem(JCR_TRANSFER_KEY);
    return !!stored;
  } catch (error) {
    return false;
  }
};

/**
 * Clear pending JCR import data
 */
export const clearPendingJCRImport = () => {
  try {
    localStorage.removeItem(JCR_TRANSFER_KEY);
  } catch (error) {
    console.error('Failed to clear JCR import data:', error);
  }
};
