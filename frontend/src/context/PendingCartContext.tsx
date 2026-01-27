/**
 * Pending Cart Context
 * Stores product intent when unauthenticated user tries to add to cart
 * Executes the add to cart action after successful login
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

// Types for pending cart action
export interface PendingCartItem {
  productId: string;
  productName: string;
  productImage: string;
  productPrice: number;
  quantity: number;
  variantId?: string;
  variantDetails?: {
    size: string;
    color: string;
    image?: string;
  };
}

interface PendingCartContextType {
  pendingItem: PendingCartItem | null;
  isModalOpen: boolean;
  setPendingItem: (item: PendingCartItem) => void;
  clearPendingItem: () => void;
  openModal: () => void;
  closeModal: () => void;
}

interface PendingCartProviderProps {
  children: ReactNode;
}

const PendingCartContext = createContext<PendingCartContextType | null>(null);

export const usePendingCart = (): PendingCartContextType => {
  const context = useContext(PendingCartContext);
  if (!context) {
    throw new Error("usePendingCart must be used within a PendingCartProvider");
  }
  return context;
};

export const PendingCartProvider = ({
  children,
}: PendingCartProviderProps): React.ReactElement => {
  const [pendingItem, setPendingItemState] = useState<PendingCartItem | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const setPendingItem = useCallback((item: PendingCartItem) => {
    setPendingItemState(item);
    setIsModalOpen(true);
  }, []);

  const clearPendingItem = useCallback(() => {
    setPendingItemState(null);
  }, []);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const value: PendingCartContextType = {
    pendingItem,
    isModalOpen,
    setPendingItem,
    clearPendingItem,
    openModal,
    closeModal,
  };

  return (
    <PendingCartContext.Provider value={value}>
      {children}
    </PendingCartContext.Provider>
  );
};
