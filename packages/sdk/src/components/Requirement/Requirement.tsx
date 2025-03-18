import { Xmark } from "../Xmark";
import { Checkmark } from "../Checkmark";
import React, { useEffect, useState } from "react";

interface RequirementProps {
  value: string;
  requirement: {
    validator: (value: string) => boolean;
    text: string;
  };
}

export const Requirement: React.FC<RequirementProps> = ({ value, requirement }) => {
  const [isValid, setIsValid] = useState<boolean | undefined>();

  useEffect(() => {
    setIsValid(requirement.validator(value));
  }, [value, requirement]);

  return (
    <div className='requirement'>
      {isValid ? <Checkmark /> : <Xmark />}
      
      <p className={isValid ? 'valid' : 'invalid'}>
        {requirement.text}
      </p>
    </div>
  );
};