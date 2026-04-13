import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState([]);

    useEffect(() => {
        const savedCart = localStorage.getItem('procart_items');
        if (savedCart) setCart(JSON.parse(savedCart));
    }, []);

    useEffect(() => {
        localStorage.setItem('procart_items', JSON.stringify(cart));
    }, [cart]);

    // NEW: Accepts selectedVariant so the cart knows exactly what was picked!
    const addToCart = (product, selectedVariant = null) => {
        setCart(prev => {
            // Generate a unique ID combining Product ID + Color + Size
            const cartItemId = selectedVariant 
                ? `${product.id}-${selectedVariant.color}-${selectedVariant.size}` 
                : `${product.id}-default`;

            const existing = prev.find(item => item.cartItemId === cartItemId);
            
            if (existing) {
                return prev.map(item => 
                    item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            
            return [...prev, { 
                ...product, 
                cartItemId: cartItemId, // The unique identifier in the cart
                selectedVariant: selectedVariant, 
                quantity: 1,
                // Override main image with variant image if it exists
                imageUrl: selectedVariant?.variantImageUrl || product.imageUrl
            }];
        });
    };

    // Update removeFromCart to remove by the specific cartItemId
    const removeFromCart = (cartItemId) => {
        setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
    };

    const clearCart = () => setCart([]);

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, cartTotal, cartCount }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);