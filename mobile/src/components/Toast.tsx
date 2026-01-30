/**
 * Toast/Snackbar Component
 * Provides feedback messages to users with auto-dismiss functionality
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import {
  X,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

type ToastType = "success" | "error" | "warning" | "info";
type ToastPosition = "top" | "bottom";

interface ToastConfig {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  position?: ToastPosition;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextType {
  show: (config: Omit<ToastConfig, "id">) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  hide: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

// Individual Toast component
interface ToastItemProps {
  toast: ToastConfig;
  onHide: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onHide }) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide
    const timer = setTimeout(() => {
      handleHide();
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleHide = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: toast.position === "bottom" ? 100 : -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide(toast.id);
    });
  };

  const getIcon = () => {
    const iconSize = 20;
    const iconColor = "#FFFFFF";
    switch (toast.type) {
      case "success":
        return <CheckCircle size={iconSize} color={iconColor} />;
      case "error":
        return <AlertCircle size={iconSize} color={iconColor} />;
      case "warning":
        return <AlertTriangle size={iconSize} color={iconColor} />;
      case "info":
        return <Info size={iconSize} color={iconColor} />;
    }
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        styles[toast.type],
        toast.position === "bottom" ? styles.bottomToast : styles.topToast,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.iconContainer}>{getIcon()}</View>
      <Text style={styles.message} numberOfLines={2}>
        {toast.message}
      </Text>
      {toast.action && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            toast.action?.onPress();
            handleHide();
          }}
        >
          <Text style={styles.actionText}>{toast.action.label}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.closeButton} onPress={handleHide}>
        <X size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Toast Provider
interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);
  const idCounter = useRef(0);

  const show = useCallback((config: Omit<ToastConfig, "id">) => {
    const id = `toast-${++idCounter.current}`;
    setToasts((prev) => [...prev, { ...config, id }]);
  }, []);

  const hide = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (message: string, duration?: number) => {
      show({ type: "success", message, duration });
    },
    [show],
  );

  const error = useCallback(
    (message: string, duration?: number) => {
      show({ type: "error", message, duration });
    },
    [show],
  );

  const warning = useCallback(
    (message: string, duration?: number) => {
      show({ type: "warning", message, duration });
    },
    [show],
  );

  const info = useCallback(
    (message: string, duration?: number) => {
      show({ type: "info", message, duration });
    },
    [show],
  );

  return (
    <ToastContext.Provider
      value={{ show, success, error, warning, info, hide }}
    >
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onHide={hide} />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    pointerEvents: "box-none",
  },
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  topToast: {
    top: 60,
  },
  bottomToast: {
    bottom: 100,
  },
  iconContainer: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  actionButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 6,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
  // Type styles
  success: {
    backgroundColor: "#4CAF50",
  },
  error: {
    backgroundColor: "#F44336",
  },
  warning: {
    backgroundColor: "#FF9800",
  },
  info: {
    backgroundColor: "#2196F3",
  },
});

export default ToastProvider;
