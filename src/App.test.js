import { render, screen } from '@testing-library/react';
import App from './App';

test('renders welcome banner', () => {
  render(<App />);
  const bannerElement = screen.getByText(/مرحباً/i);
  expect(bannerElement).toBeInTheDocument();
});
