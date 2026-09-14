/**
 * JCR Field History Storage Utility
 * Manages persistent dropdown options for common JCR fields
 */

const JCR_STORAGE_PREFIX = 'jcr_field_options_';

/**
 * Get saved options for a specific field
 * @param {string} fieldId - Unique field identifier
 * @returns {Array<string>} Array of saved option values
 */
export const getFieldOptions = (fieldId) => {
  try {
    const key = `${JCR_STORAGE_PREFIX}${fieldId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error(`Error reading options for field ${fieldId}:`, error);
    return [];
  }
};

/**
 * Save a new option to field's history (avoid duplicates)
 * @param {string} fieldId - Unique field identifier
 * @param {string} value - New value to add
 * @returns {Array<string>} Updated options array
 */
export const addFieldOption = (fieldId, value) => {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return getFieldOptions(fieldId);
  }

  try {
    const key = `${JCR_STORAGE_PREFIX}${fieldId}`;
    const existing = getFieldOptions(fieldId);
    
    // Check if value already exists (case-insensitive)
    const trimmedValue = value.trim();
    const valueExists = existing.some(
      opt => opt.toLowerCase() === trimmedValue.toLowerCase()
    );

    if (valueExists) {
      return existing;
    }

    // Add new value to the beginning (most recent first)
    const updated = [trimmedValue, ...existing];
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error(`Error adding option for field ${fieldId}:`, error);
    return getFieldOptions(fieldId);
  }
};

/**
 * Delete an option from field's history
 * @param {string} fieldId - Unique field identifier
 * @param {string} value - Value to remove
 * @returns {Array<string>} Updated options array
 */
export const deleteFieldOption = (fieldId, value) => {
  try {
    const key = `${JCR_STORAGE_PREFIX}${fieldId}`;
    const existing = getFieldOptions(fieldId);
    const updated = existing.filter(opt => opt !== value);
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error(`Error deleting option for field ${fieldId}:`, error);
    return getFieldOptions(fieldId);
  }
};

/**
 * Clear all options for a specific field
 * @param {string} fieldId - Unique field identifier
 */
export const clearFieldOptions = (fieldId) => {
  try {
    const key = `${JCR_STORAGE_PREFIX}${fieldId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error clearing options for field ${fieldId}:`, error);
  }
};

/**
 * Clear all JCR field options (nuclear option)
 */
export const clearAllJCROptions = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(JCR_STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing all JCR options:', error);
  }
};

/**
 * Save JCR draft form data
 * @param {string} draftId - Unique draft identifier
 * @param {Object} formData - Form state to save
 */
export const saveJCRDraft = (draftId, formData) => {
  try {
    const key = `jcr_draft_${draftId}`;
    const draft = {
      data: formData,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(draft));
    return true;
  } catch (error) {
    console.error('Error saving JCR draft:', error);
    return false;
  }
};

/**
 * Load JCR draft form data
 * @param {string} draftId - Unique draft identifier
 * @returns {Object|null} Draft data or null if not found
 */
export const loadJCRDraft = (draftId) => {
  try {
    const key = `jcr_draft_${draftId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error loading JCR draft:', error);
    return null;
  }
};

/**
 * Get all saved JCR drafts
 * @returns {Array<Object>} Array of draft metadata
 */
export const getAllJCRDrafts = () => {
  try {
    const keys = Object.keys(localStorage);
    const drafts = [];
    
    keys.forEach(key => {
      if (key.startsWith('jcr_draft_')) {
        try {
          const draft = JSON.parse(localStorage.getItem(key));
          drafts.push({
            id: key.replace('jcr_draft_', ''),
            savedAt: draft.savedAt,
            preview: draft.data?.workOrderNo || 'Untitled',
          });
        } catch (e) {
          // Skip invalid drafts
        }
      }
    });
    
    // Sort by saved date, most recent first
    return drafts.sort((a, b) => 
      new Date(b.savedAt) - new Date(a.savedAt)
    );
  } catch (error) {
    console.error('Error getting JCR drafts:', error);
    return [];
  }
};

/**
 * Delete a JCR draft
 * @param {string} draftId - Unique draft identifier
 */
export const deleteJCRDraft = (draftId) => {
  try {
    const key = `jcr_draft_${draftId}`;
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error deleting JCR draft:', error);
    return false;
  }
};
