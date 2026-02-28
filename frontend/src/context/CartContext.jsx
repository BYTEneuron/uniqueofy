import { createContext, useContext, useState, useMemo } from 'react'

const CartContext = createContext()

export function CartProvider({ children }) {
  const [cart, setCart] = useState([])

  const addToCart = (service, quantity = 1) => {
    // ... logic remains same, function is recreated but context value will be memoized
    const existingItem = cart.find(item => item.id === service.id)

    if (existingItem) {
      setCart(cart.map(item =>
        item.id === service.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ))
    } else {
      setCart([...cart, { ...service, quantity }])
    } 
  }

  const removeFromCart = (serviceId) => {
    setCart(cart.filter(item => item.id !== serviceId))
  }

  const updateQuantity = (serviceId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(serviceId)
    } else {
      setCart(cart.map(item =>
        item.id === serviceId
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

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
