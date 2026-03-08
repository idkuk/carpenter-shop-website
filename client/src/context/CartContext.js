import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState(() => {
        const savedCart = localStorage.getItem('cart');
        return savedCart ? JSON.parse(savedCart) : [];
    });

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (item) => {
        // Check if item already exists
        const exists = cart.find((i) => i._id === item._id);
        if (exists) {
            toast.info('Item is already in your cart!');
            return;
        }
        setCart((prevCart) => [...prevCart, item]);
        toast.success(`${item.name} added to cart!`);
    };

    const removeFromCart = (itemId) => {
        setCart((prevCart) => prevCart.filter((item) => item._id !== itemId));
        toast.info('Item removed from cart');
    };

    const clearCart = () => {
        setCart([]);
    };

    const cartCount = cart.length;

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, cartCount }}>
            {children}
        </CartContext.Provider>
    );
};
