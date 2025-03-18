import { Requirements } from '../components/Requirements/Requirements';
import React, { useState } from 'react';
import './styles.css';
export default {
  title: 'Example/Requirements',
  component: Requirements,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {
    value: 'Test Value',
    requirements: [
      {
        validator: (value) => value.length > 0,
        text: 'Must have a value',
      },
      {
        validator: (value) => value.length < 10,
        text: 'Must be less than 10 characters',
      },
    ],
    onValidChange: () => {},
  },
};

export const RequirementsWithHooks = () => {
  const [valid,  setValid] = useState(false);
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const passwordRequirements = [
    {
      text: 'Must be at least 8 characters',
      validator: val => val.length >= 8,
    },
    {
      text: 'Must contain at least one number',
      validator: val => /\d/g.test(val),
    },
    {
      text: 'Must contain at least one lower-case letter',
      validator: val => /[a-z]/g.test(val),
    },
    {
      text: 'Must contain at least one upper-case letter',
      validator: val => /[A-Z]/g.test(val),
    }
  ];

  return (
    <div className='form'>
      <h1>Signup</h1>

      <Requirements
        value={password}
        requirements={passwordRequirements}
        onValidChange={isValid => setValid(isValid)}
      />

      <input placeholder='Username' value={username} onChange={e => setUsername(e.target.value)} />
      <input placeholder='Password' type='password' value={password} onChange={e => setPassword(e.target.value)} />

      <button disabled={!valid || !username}>Sign Up</button>
    </div>
  );
}