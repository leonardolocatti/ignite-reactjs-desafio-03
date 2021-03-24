import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      let updatedCart = cart;

      const productAlreadyExists = cart.find(product => product.id === productId);

      if (productAlreadyExists) {
        const { data: stock } = await api.get<Stock>(`stock/${productId}`);

        if (stock.amount > productAlreadyExists.amount) {
          updatedCart = updatedCart.map(product => {
            if (product.id === productId) {
              return {
                ...product,
                amount: product.amount + 1,
              };
            }
  
            return product;
          });
        } else {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
      } else {
        const { data: product } = await api.get<Product>(`products/${productId}`);

        updatedCart = [...updatedCart, { ...product, amount: 1 }];
      }

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.find(product => product.id === productId);

      if (!productExists) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const updatedCart = cart.filter(product => product.id !== productId);

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productExists = cart.find(product => product.id === productId);

      if (!productExists || amount < 1) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cart.map(product => {
        if (product.id === productId) {
          return {
            ...product,
            amount
          };
        }

        return product;
      });

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
