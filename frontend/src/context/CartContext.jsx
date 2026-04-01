import { createContext, useState, useMemo } from 'react'

// eslint-disable-next-line react-refresh/only-export-components
export const CartContext = createContext()

export function CartProvider({ children }) {
  const [cart, setCart] = useState([])

  const addToCart = (service, quantity = 1) => {
    // ... logic remains same, function is recreated but context value will be memoized
    const existingItem = cart.find(item => item._id === service._id)

    if (existingItem) {
      setCart(prev => prev.map(item =>
        item._id === service._id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ))
    } else {
      setCart(prev => [...prev, { ...service, quantity }])
    } 
  }

  const removeFromCart = (serviceId) => {
    setCart(prev => prev.filter(item => item._id !== serviceId))
  }

  const updateQuantity = (serviceId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(serviceId)
    } else {
      setCart(prev => prev.map(item =>
        item._id === serviceId
          ? { ...item, quantity }
          : item
      ))
    }
  }

  const getServiceCount = () => {
    return cart.length
  }

  const clearCart = () => {
    setCart([])
  }

  const value = useMemo(() => ({
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      getServiceCount,
      clearCart,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [cart])

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

