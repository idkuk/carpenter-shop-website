import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FaTrash, FaShoppingCart } from 'react-icons/fa';
import { useOrders } from '../context/OrderContext';
import { toast } from 'react-toastify';
import './Cart.css';

const Cart = () => {
    const { cart, removeFromCart, clearCart } = useCart();
    const { user } = useAuth();
    const { createOrder } = useOrders();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const isStaff = user?.role === 'admin' || user?.role === 'employee';

    if (isStaff) {
        return (
            <div className="cart-container empty-cart">
                <h2>Cart is available for customers only</h2>
                <p>Use Orders and Inventory from your dashboard.</p>
                <Link to="/dashboard">Go to Dashboard</Link>
            </div>
        );
    }

    const handleCheckout = async () => {
        if (!user) {
            toast.warn('Please login to checkout');
            navigate('/login');
            return;
        }

        if (cart.length === 0) return;

        setLoading(true);
        try {
            const orderTitle = `Special Order (${cart.length} items)`;
            const description = cart.map(item => `${item.name} (${item.category}): ${item.price}`).join('\n\n');

            const parsePrice = (priceStr) => {
                if (!priceStr || typeof priceStr !== 'string') return 0;
                const matches = priceStr.match(/\d+/g);
                return matches ? parseInt(matches[0], 10) : 0;
            };
            const totalBudget = cart.reduce((sum, item) => sum + parsePrice(item.price), 0);

            const deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
            const serviceImages = cart
                .map(item => item.image)
                .filter(Boolean);
            const uniqueImages = [...new Set(serviceImages)];

            const payload = new FormData();
            payload.append('title', orderTitle);
            payload.append('description', description);
            payload.append('category', 'mixed');
            payload.append('budget', String(totalBudget));
            payload.append('status', 'pending');
            payload.append('deadline', deadline);
            if (uniqueImages.length > 0) {
                payload.append('images', JSON.stringify(uniqueImages));
            }

            const result = await createOrder(payload);

            if (result.success) {
                toast.success('Order placed successfully!');
                clearCart();
                const orderId = result.data?.order?._id || result.data?.order?.id;
                if (orderId) {
                    navigate(`/orders/${orderId}`);
                } else {
                    navigate('/orders');
                }
            } else {
                toast.error(result.error || 'Failed to place order');
            }
        } catch (err) {
            toast.error(err.message || 'Checkout failed');
        } finally {
            setLoading(false);
        }
    };

    if (cart.length === 0) {
        return (
            <div className="cart-container empty-cart">
                <FaShoppingCart size={64} style={{ color: 'var(--text-light)', marginBottom: '20px' }} />
                <h2>Your Cart is Empty</h2>
                <p>Browse our services and add items to your cart.</p>
                <Link to="/services">View Services</Link>
            </div>
        );
    }

    return (
        <div className="cart-container">
            <h1>Shopping Cart</h1>
            <ul className="cart-items">
                {cart.map((item) => (
                    <li key={item._id} className="cart-item">
                        {item.image && <img src={item.image} alt={item.name} className="cart-item-image" />}
                        <div className="cart-item-details">
                            <h3>{item.name}</h3>
                            <p>{item.category}</p>
                            <p>{item.price}</p>
                        </div>
                        <div className="cart-item-actions">
                            <button onClick={() => removeFromCart(item._id)} className="remove-btn">
                                <FaTrash />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
            <div className="cart-summary">
                <button onClick={handleCheckout} className="checkout-btn" disabled={loading}>
                    {loading ? 'Processing...' : 'Checkout (Create Order)'}
                </button>
            </div>
        </div>
    );
};

export default Cart;
