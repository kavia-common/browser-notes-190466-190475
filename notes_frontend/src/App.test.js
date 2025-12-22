import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Browser Notes header', () => {
  render(<App />);
  const header = screen.getByText(/Browser Notes/i);
  expect(header).toBeInTheDocument();
});
