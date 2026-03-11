import React from 'react';
import '../styles/global/global.css';

/**
 * A controlled checkbox component that ensures proper React behavior
 */
export const ControlledCheckbox = ({ 
  checked = false, 
  onChange, 
  label, 
  name,
  className = '',
  disabled = false,
  ...props 
}) => {
  // Default handler if none provided
  const handleChange = onChange || (() => {});
  
  return (
    <div className={`checkbox-container ${className}`}>
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        {...props}
      />
      {label && <label htmlFor={name}>{label}</label>}
    </div>
  );
};

/**
 * A toggle switch component with proper React handlers
 */
export const ToggleSwitch = ({
  checked = false,
  onChange,
  label,
  name,
  className = '',
  disabled = false,
  ...props
}) => {
  // Default handler if none provided
  const handleChange = onChange || (() => {});
  
  return (
    <div className={`toggle-switch-container ${className}`}>
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          {...props}
        />
        <span className="toggle-slider"></span>
      </label>
      {label && <span className="toggle-label">{label}</span>}
    </div>
  );
};
