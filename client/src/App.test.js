import { render, screen } from '@testing-library/react';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { OrderProvider } from './context/OrderContext';
import { ThemeProvider } from './context/ThemeContext';
import { CartProvider } from './context/CartContext';

test('renders navigation brand', () => {
  render(
    <ThemeProvider>
      <AuthProvider>
        <OrderProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </OrderProvider>
      </AuthProvider>
    </ThemeProvider>
  );
  const linkElement = screen.getByRole('link', { name: /carpenter shop/i });
  expect(linkElement).toBeInTheDocument();
});
