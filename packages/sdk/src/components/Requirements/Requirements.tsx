import '../../style.css';
import { Requirement } from '../Requirement';
import React, { useCallback, useEffect } from 'react';

interface RequirementType {
  validator: (value: string) => boolean;
  text: string;
}

interface RequirementsProps {
  value: string;
  requirements: RequirementType[];
  onValidChange: (isValid: boolean) => void;
}

export const Requirements: React.FC<RequirementsProps> = ({
  value,
  requirements,
  onValidChange,
}) => {
  const validChangeCb = useCallback(() => onValidChange(requirements.every(r => r.validator(value))), [value, requirements, onValidChange]);

  useEffect(() => {
    validChangeCb();
  }, [value, requirements, validChangeCb]);

  return (
    <>
      {requirements.map((r, index) => (
        <Requirement
          key={index}
          value={value}
          requirement={r}
        />
      ))}
    </>
  );
};