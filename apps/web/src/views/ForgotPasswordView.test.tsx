import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ForgotPasswordView } from './ForgotPasswordView.js';

describe('ForgotPasswordView', () => {
  it('renders form', () => {
    render(
      <MemoryRouter>
        <ForgotPasswordView />
      </MemoryRouter>,
    );
    expect(screen.getByText('Forgot password')).toBeInTheDocument();
  });
});
