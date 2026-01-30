/**
 * Splash Screen Component
 * Animated logo splash screen shown on app launch
 */
import React, { useEffect, useRef } from "react";
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  Text,
} from "react-native";

const { width, height } = Dimensions.get("window");

interface SplashScreenProps {
  onAnimationComplete?: () => void;
  duration?: number;
}

const SplashScreen: React.FC<SplashScreenProps> = ({
  onAnimationComplete,
  duration = 2500,
}) => {
  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Logo entrance animation
    const logoAnimation = Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]);

    // Text entrance animation (delayed)
    const textAnimation = Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(textTranslateY, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]);

    // Fade out animation
    const fadeOutAnimation = Animated.timing(containerOpacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    });

    // Run animations in sequence
    Animated.sequence([
      logoAnimation,
      Animated.delay(200),
      textAnimation,
      Animated.delay(duration - 1700), // Adjust based on total duration
      fadeOutAnimation,
    ]).start(() => {
      onAnimationComplete?.();
    });
  }, [duration, onAnimationComplete]);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      {/* Background gradient effect */}
      <View style={styles.backgroundOverlay} />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: logoScale }],
            opacity: logoOpacity,
          },
        ]}
      >
        <Image
          source={require("../../assets/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* App Name */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        <Text style={styles.appName}>Nevan Handicraft</Text>
        <Text style={styles.tagline}>Handcrafted with Love</Text>
      </Animated.View>

      {/* Loading indicator */}
      <View style={styles.loadingContainer}>
        <LoadingDots />
      </View>
    </Animated.View>
  );
};

// Animated loading dots component
const LoadingDots: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      );
    };

    Animated.parallel([
      animateDot(dot1, 0),
      animateDot(dot2, 200),
      animateDot(dot3, 400),
    ]).start();
  }, []);

  const dotStyle = (animValue: Animated.Value) => ({
    opacity: animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        scale: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.2],
        }),
      },
    ],
  });

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[styles.dot, dotStyle(dot1)]} />
      <Animated.View style={[styles.dot, dotStyle(dot2)]} />
      <Animated.View style={[styles.dot, dotStyle(dot3)]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width,
    height,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  backgroundOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFAFA",
  },
  logoContainer: {
    width: 150,
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    shadowColor: "#FF9999",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  logo: {
    width: 120,
    height: 120,
  },
  textContainer: {
    marginTop: 32,
    alignItems: "center",
  },
  appName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#4A4A4A",
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: "#FF9999",
    marginTop: 8,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    position: "absolute",
    bottom: 80,
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF9999",
    marginHorizontal: 4,
  },
});

export default SplashScreen;
