import React, { useState, useEffect, useRef } from 'react';
import { getFieldOptions, addFieldOption, deleteFieldOption } from '../utils/jcrStorage';
import './ComboboxWithHistory.css';

/**
 * ComboboxWithHistory - A smart dropdown that remembers and suggests previous values
 * Features:
 * - Shows history of previously entered values
 * - Allows free text input for new values
 * - Auto-saves new values to history
 * - Allows deletion of individual history items
 * - Searchable/filterable
 */
const ComboboxWithHistory = ({
  fieldId,
  value,
  onChange,
  placeholder = 'Type or select...',
  label,
  required = false,
  disabled = false,
  type = 'text', // 'text', 'number', 'date'
}) => {
  const [options, setOptions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Load saved options on mount
  useEffect(() => {
    if (type === 'text' || type === 'number') {
      const savedOptions = getFieldOptions(fieldId);
      setOptions(savedOptions);
    }
  }, [fieldId, type]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on current input
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes((value || '').toLowerCase())
  );

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    if (type === 'text' || type === 'number') {
      setIsOpen(true);
      setHighlightedIndex(-1);
    }
  };

  const handleInputBlur = () => {
    // Delay to allow option click to register
    setTimeout(() => {
      // Auto-save new value if it's not empty and not already in options
      if (value && value.trim() && type === 'text') {
        const trimmed = value.trim();
        const exists = options.some(
          opt => opt.toLowerCase() === trimmed.toLowerCase()
        );
        if (!exists) {
          const updated = addFieldOption(fieldId, trimmed);
          setOptions(updated);
        }
      }
    }, 200);
  };

  const handleOptionSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleDeleteOption = (e, optionToDelete) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${optionToDelete}" from history?`)) {
      const updated = deleteFieldOption(fieldId, optionToDelete);
      setOptions(updated);
      
      // If the deleted option was the current value, clear it
      if (value === optionToDelete) {
        onChange('');
      }
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
        } else {
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  // For date inputs, render a simple date input
  if (type === 'date') {
    return (
      <div className="combobox-wrapper">
        {label && (
          <label className="combobox-label">
            {label}
            {required && <span className="required-star">*</span>}
          </label>
        )}
        <input
          type="date"
          value={value || ''}
          onChange={handleInputChange}
          disabled={disabled}
          required={required}
          className="combobox-input date-input"
        />
      </div>
    );
  }

  // For number inputs, render number input with optional dropdown
  if (type === 'number') {
    return (
      <div className="combobox-wrapper">
        {label && (
          <label className="combobox-label">
            {label}
            {required && <span className="required-star">*</span>}
          </label>
        )}
        <input
          ref={inputRef}
          type="number"
          value={value || ''}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="combobox-input"
        />
      </div>
    );
  }

  // Text input with full dropdown history
  return (
    <div className="combobox-wrapper">
      {label && (
        <label className="combobox-label">
          {label}
          {required && <span className="required-star">*</span>}
        </label>
      )}
      <div className="combobox-container">
        <input
          ref={inputRef}
          type="text"
          value={value || ''}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="combobox-input"
          autoComplete="off"
        />
        
        {isOpen && filteredOptions.length > 0 && (
          <div ref={dropdownRef} className="combobox-dropdown">
            <div className="dropdown-header">Recent Values</div>
            {filteredOptions.map((option, index) => (
              <div
                key={option}
                className={`dropdown-option ${
                  index === highlightedIndex ? 'highlighted' : ''
                }`}
                onClick={() => handleOptionSelect(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <span className="option-text">{option}</span>
                <button
                  className="option-delete"
                  onClick={(e) => handleDeleteOption(e, option)}
                  title="Delete this option"
                  tabIndex="-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComboboxWithHistory;
