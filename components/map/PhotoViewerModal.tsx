import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleMapsPhoto } from '../../types/googleMapsData';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

interface PhotoViewerModalProps {
  visible: boolean;
  photos: GoogleMapsPhoto[];
  initialIndex: number;
  placeId?: string;
  getPhotoUrl: (photoReference: string, placeId?: string) => string | null;
  photoUris?: { [index: number]: string | any }; // Optional bundled assets (require() results) for first 2 photos
  onClose: () => void;
}

interface ZoomableImageProps {
  source: any; // Can be { uri: string } or require() result
  width: number;
  height: number;
  onZoomChange?: (isZoomed: boolean) => void;
  onError?: () => void; // Callback when image fails to load
  showPlaceholderOnError?: boolean; // Show placeholder instead of logging error
}

// Separate component for zoomable image to isolate gesture state
function ZoomableImage({ source, width, height, onZoomChange, onError, showPlaceholderOnError }: ZoomableImageProps) {
  const [hasError, setHasError] = useState(false);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const MIN_SCALE = 1;
  const MAX_SCALE = 4;
  const ZOOM_TARGET = 2.5;

  // Reset zoom and error state when image changes
  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    setHasError(false);
  }, [source]);

  const clampTranslation = (value: number, currentScale: number, dimension: number) => {
    'worklet';
    const maxTranslate = (dimension * (currentScale - 1)) / 2;
    return Math.min(Math.max(value, -maxTranslate), maxTranslate);
  };

  const resetZoom = () => {
    'worklet';
    scale.value = withTiming(1, { duration: 200 });
    translateX.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(0, { duration: 200 });
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    if (onZoomChange) {
      runOnJS(onZoomChange)(false);
    }
  };

  // Double tap to zoom in/out
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(300)
    .onEnd((event) => {
      if (scale.value > 1.1) {
        // Zoomed in - reset to 1x
        resetZoom();
      } else {
        // Zoom to target at tap point
        const focalX = event.x - width / 2;
        const focalY = event.y - height / 2;
        
        // Calculate translation to center on tap point
        const newTranslateX = -focalX * (ZOOM_TARGET - 1);
        const newTranslateY = -focalY * (ZOOM_TARGET - 1);
        
        scale.value = withTiming(ZOOM_TARGET, { duration: 200 });
        translateX.value = withTiming(
          clampTranslation(newTranslateX, ZOOM_TARGET, width), 
          { duration: 200 }
        );
        translateY.value = withTiming(
          clampTranslation(newTranslateY, ZOOM_TARGET, height), 
          { duration: 200 }
        );
        savedScale.value = ZOOM_TARGET;
        savedTranslateX.value = clampTranslation(newTranslateX, ZOOM_TARGET, width);
        savedTranslateY.value = clampTranslation(newTranslateY, ZOOM_TARGET, height);
        
        if (onZoomChange) {
          runOnJS(onZoomChange)(true);
        }
      }
    });

  // Pinch to zoom
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const newScale = Math.min(Math.max(savedScale.value * event.scale, MIN_SCALE * 0.5), MAX_SCALE);
      scale.value = newScale;
      
      if (onZoomChange) {
        runOnJS(onZoomChange)(newScale > 1.1);
      }
    })
    .onEnd(() => {
      // Clamp scale to valid range
      let finalScale = scale.value;
      if (finalScale < MIN_SCALE) {
        finalScale = MIN_SCALE;
        scale.value = withTiming(MIN_SCALE, { duration: 150 });
      }
      
      savedScale.value = finalScale;
      
      // Clamp translation
      savedTranslateX.value = clampTranslation(translateX.value, finalScale, width);
      savedTranslateY.value = clampTranslation(translateY.value, finalScale, height);
      translateX.value = withTiming(savedTranslateX.value, { duration: 150 });
      translateY.value = withTiming(savedTranslateY.value, { duration: 150 });
      
      if (onZoomChange) {
        runOnJS(onZoomChange)(finalScale > 1.1);
      }
    });

  // Combine gestures - just pinch and double-tap
  // No pan gesture - when zoomed, pinch handles movement, when not zoomed, FlatList handles swipes
  const composedGesture = Gesture.Race(
    doubleTapGesture,
    pinchGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Show placeholder if error occurred and showPlaceholderOnError is true
  if (hasError && showPlaceholderOnError) {
    return (
      <View style={[styles.imageContainer, { width, height }]}>
        <View style={styles.placeholder}>
          <Ionicons name="image-outline" size={64} color="#666" />
          <Text style={styles.placeholderText}>Photo unavailable</Text>
        </View>
      </View>
    );
  }

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.imageContainer, { width, height }]}>
        <Animated.Image
          source={source}
          style={[styles.image, { width, height }, animatedStyle]}
          resizeMode="contain"
          onError={() => {
            setHasError(true);
            // Call onError callback if provided
            if (onError) {
              onError();
            }
          }}
        />
      </Animated.View>
    </GestureDetector>
  );
}

export default function PhotoViewerModal({
  visible,
  photos,
  initialIndex,
  placeId,
  getPhotoUrl,
  photoUris,
  onClose,
}: PhotoViewerModalProps) {
  // Maximum number of photos that are preloaded (first 2)
  const MAX_PRELOADED_PHOTOS = 2;
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [isZoomed, setIsZoomed] = useState(false);

  // Update dimensions on orientation change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Reset to initial index when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      // Scroll to initial index after a brief delay
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 100);
    }
  }, [visible, initialIndex]);

  const handleZoomChange = useCallback((zoomed: boolean) => {
    setIsZoomed(zoomed);
  }, []);

  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      if (newIndex !== undefined && newIndex >= 0) {
        setCurrentIndex(newIndex);
        setIsZoomed(false); // Reset zoom when changing photos
      }
    }
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderPhoto = useCallback(({ item, index }: { item: GoogleMapsPhoto; index: number }) => {
    if (!item.photoReference) {
      return (
        <View style={[styles.photoContainer, { width: dimensions.width, height: dimensions.height }]}>
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={64} color="#666" />
            <Text style={styles.placeholderText}>Photo unavailable</Text>
          </View>
        </View>
      );
    }

    // Simple: Try bundled asset first, then generate API URL
    let imageSource: any = null;
    
    // Check for bundled asset (only first 2 photos)
    if (photoUris?.[index]) {
      imageSource = photoUris[index];
    } else if (placeId) {
      // Generate API URL
      const photoUrl = getPhotoUrl(item.photoReference, placeId);
      if (photoUrl) {
        imageSource = { uri: photoUrl };
      }
    }
    
    if (!imageSource) {
      return (
        <View style={[styles.photoContainer, { width: dimensions.width, height: dimensions.height }]}>
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={64} color="#666" />
            <Text style={styles.placeholderText}>Photo unavailable</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.photoContainer, { width: dimensions.width, height: dimensions.height }]}>
        <ZoomableImage
          source={imageSource}
          width={dimensions.width}
          height={dimensions.height}
          onZoomChange={index === currentIndex ? handleZoomChange : undefined}
          showPlaceholderOnError={true}
        />
      </View>
    );
  }, [dimensions, placeId, getPhotoUrl, photoUris, currentIndex, handleZoomChange]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: dimensions.width,
    offset: dimensions.width * index,
    index,
  }), [dimensions.width]);

  if (!visible || photos.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.counterContainer}>
            <Text style={styles.counter}>{currentIndex + 1} / {photos.length}</Text>
          </View>
          <View style={styles.headerButtonPlaceholder} />
        </View>

        {/* Photos FlatList */}
        <FlatList
          ref={flatListRef}
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(_, index) => `photo-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!isZoomed}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={getItemLayout}
          initialScrollIndex={initialIndex}
          removeClippedSubviews={false}
          bounces={false}
          style={styles.flatList}
        />

        {/* Zoom hint */}
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            {isZoomed ? 'Double-tap to reset' : 'Pinch or double-tap to zoom'}
          </Text>
        </View>

        {/* Attribution */}
        {photos[currentIndex]?.attribution && (
          <View style={styles.attribution}>
            <Text style={styles.attributionText} numberOfLines={1}>
              📷 {photos[currentIndex].attribution}
            </Text>
          </View>
        )}

        {/* Dots indicator */}
        {photos.length > 1 && photos.length <= 10 && (
          <View style={styles.dotsContainer}>
            {photos.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 100,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  counterContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  flatList: {
    flex: 1,
  },
  photoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    // Size set dynamically
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
  },
  hintContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 140 : 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  attribution: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  attributionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 24,
  },
});
