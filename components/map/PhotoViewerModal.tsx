import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons } from '@expo/vector-icons';
import { GoogleMapsPhoto } from '../../types/googleMapsData';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
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
  onClose: () => void;
  onLoadMorePhotos?: () => void;
  hasLoadedMorePhotos?: boolean;
}

export default function PhotoViewerModal({
  visible,
  photos,
  initialIndex,
  placeId,
  getPhotoUrl,
  onClose,
  onLoadMorePhotos,
  hasLoadedMorePhotos = false,
}: PhotoViewerModalProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // Track screen dimensions and update on orientation change
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const orientationListenerRef = useRef<ScreenOrientation.Subscription | null>(null);
  const isLoadingMoreRef = useRef(false);
  const currentIndexRef = useRef(currentIndex);
  
  // Photo zoom and pan state
  const [resizeMode, setResizeMode] = useState<'contain' | 'cover'>('contain');
  const [isZoomed, setIsZoomed] = useState(false);
  const [orientationLock, setOrientationLock] = useState<'portrait' | 'landscape' | 'unlocked'>('unlocked');
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useRef(1);
  const savedTranslateX = useRef(0);
  const savedTranslateY = useRef(0);
  const wasZoomedRef = useRef(false);
  
  // Update currentIndex when initialIndex changes (when user taps a different photo)
  useEffect(() => {
    if (initialIndex !== currentIndex) {
      setCurrentIndex(initialIndex);
      currentIndexRef.current = initialIndex;
    }
  }, [initialIndex, currentIndex]);
  
  // Keep ref in sync with state
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  
  // Reset zoom/pan when photo changes
  useEffect(() => {
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedScale.current = 1;
    savedTranslateX.current = 0;
    savedTranslateY.current = 0;
    wasZoomedRef.current = false;
    setResizeMode('contain');
    setIsZoomed(false);
  }, [currentIndex, visible]);

  // Handle orientation toggle - cycles between portrait and landscape
  const handleToggleOrientation = async () => {
    try {
      // Get current orientation to determine what to switch to
      const currentOrientation = await ScreenOrientation.getOrientationAsync();
      const currentDimensions = Dimensions.get('window');
      const isCurrentlyLandscape = currentDimensions.width > currentDimensions.height;
      
      console.log('📱 Toggling orientation:', {
        currentOrientation,
        isCurrentlyLandscape,
        currentLock: orientationLock,
        dimensions: currentDimensions
      });
      
      if (orientationLock === 'portrait' || (!orientationLock && !isCurrentlyLandscape)) {
        // Switch to landscape
        console.log('📱 Switching to landscape');
        // First unlock to allow rotation
        try {
          await ScreenOrientation.unlockAsync();
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          console.log('📱 Could not unlock:', e);
        }
        
        try {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
          setOrientationLock('landscape');
          // Force update dimensions after a short delay
          setTimeout(() => {
            const newDims = Dimensions.get('window');
            console.log('📱 Updated dimensions after landscape lock:', newDims);
            setDimensions(newDims);
          }, 200);
        } catch (e) {
          // Try alternative landscape lock
          try {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
            setOrientationLock('landscape');
            setTimeout(() => {
              const newDims = Dimensions.get('window');
              setDimensions(newDims);
            }, 200);
          } catch (e2) {
            console.log('📱 Failed to lock to landscape:', e2);
          }
        }
      } else {
        // Switch to portrait (from landscape or unlocked)
        console.log('📱 Switching to portrait');
        // First unlock to allow rotation
        try {
          await ScreenOrientation.unlockAsync();
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          console.log('📱 Could not unlock:', e);
        }
        
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setOrientationLock('portrait');
        // Force update dimensions after a short delay
        setTimeout(() => {
          const newDims = Dimensions.get('window');
          console.log('📱 Updated dimensions after portrait lock:', newDims);
          setDimensions(newDims);
        }, 200);
      }
    } catch (error) {
      console.log('📱 Error toggling orientation:', error);
    }
  };

  // Apply orientation lock when it changes
  useEffect(() => {
    if (!visible) return;
    
    const applyOrientation = async () => {
      try {
        if (orientationLock === 'portrait') {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          // Update dimensions after locking - check if we need to swap
          setTimeout(() => {
            const currentDims = Dimensions.get('window');
            // If currently landscape, swap dimensions for portrait
            if (currentDims.width > currentDims.height) {
              const portraitDims = { 
                width: currentDims.height, 
                height: currentDims.width,
                scale: currentDims.scale,
                fontScale: currentDims.fontScale
              };
              console.log('📱 Swapping dimensions for portrait:', portraitDims);
              setDimensions(portraitDims);
            } else {
              setDimensions(currentDims);
            }
          }, 200);
        } else if (orientationLock === 'landscape') {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
          // Update dimensions after locking - check if we need to swap
          setTimeout(() => {
            const currentDims = Dimensions.get('window');
            // If currently portrait, swap dimensions for landscape
            if (currentDims.height > currentDims.width) {
              const landscapeDims = { 
                width: currentDims.height, 
                height: currentDims.width,
                scale: currentDims.scale,
                fontScale: currentDims.fontScale
              };
              console.log('📱 Swapping dimensions for landscape:', landscapeDims);
              setDimensions(landscapeDims);
            } else {
              setDimensions(currentDims);
            }
          }, 200);
        } else {
          // Unlocked - allow all orientations
          try {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL);
          } catch (e) {
            await ScreenOrientation.unlockAsync();
          }
        }
      } catch (error) {
        console.log('📱 Error applying orientation lock:', error);
      }
    };
    
    applyOrientation();
  }, [orientationLock, visible]);

  // Allow all orientations when photo viewer is visible, lock to portrait when closed
  useEffect(() => {
    let savedOrientationLock: ScreenOrientation.OrientationLock | null = null;
    
    const handleOrientation = async () => {
      try {
        if (visible) {
          console.log('📱 Photo viewer opened - unlocking orientation');
          
          // Add a small delay to ensure component is fully mounted
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Check current orientation before unlocking
          try {
            const currentOrientation = await ScreenOrientation.getOrientationAsync();
            console.log('📱 Current orientation before unlock:', currentOrientation);
          } catch (e) {
            console.log('📱 Could not get current orientation:', e);
          }
          
          // Save current orientation lock before unlocking
          try {
            savedOrientationLock = await ScreenOrientation.getOrientationLockAsync();
            console.log('📱 Saved orientation lock:', savedOrientationLock);
          } catch (e) {
            console.log('📱 Could not get current orientation lock:', e);
          }
          
          // Allow rotation when photo viewer is open (unless user has manually locked it)
          if (orientationLock === 'unlocked') {
            console.log('📱 Attempting to allow all orientations...');
            try {
              // Try ALL orientations first
              await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL);
              console.log('📱 Locked to ALL orientations');
            } catch (e1) {
              console.log('📱 Failed to lock to ALL, trying unlockAsync:', e1);
              // Fallback to unlock if ALL fails
              try {
                await ScreenOrientation.unlockAsync();
                console.log('📱 Orientation unlocked - rotation should now be allowed');
              } catch (e2) {
                console.log('📱 Failed to unlock orientation:', e2);
              }
            }
          } else {
            // User has manually locked orientation, respect that
            console.log('📱 User has manually locked orientation to:', orientationLock);
            if (orientationLock === 'portrait') {
              await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            } else if (orientationLock === 'landscape') {
              await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
            }
          }
          
          // Double-check by trying to get orientation again
          try {
            const orientationAfterUnlock = await ScreenOrientation.getOrientationAsync();
            console.log('📱 Orientation after unlock:', orientationAfterUnlock);
          } catch (e) {
            console.log('📱 Could not get orientation after unlock:', e);
          }
          
          // Verify unlock worked
          try {
            const lockAfterUnlock = await ScreenOrientation.getOrientationLockAsync();
            console.log('📱 Orientation lock after unlock:', lockAfterUnlock);
          } catch (e) {
            console.log('📱 Could not verify unlock (this is OK if unlocked):', e);
          }
          
          // Remove existing listener if any
          if (orientationListenerRef.current) {
            orientationListenerRef.current.remove();
            orientationListenerRef.current = null;
          }
          
          // Set up a listener to detect orientation changes
          orientationListenerRef.current = ScreenOrientation.addOrientationChangeListener(async (event) => {
            console.log('📱 Orientation changed via expo-screen-orientation:', event.orientationInfo);
            console.log('📱 Full event:', JSON.stringify(event, null, 2));
            // Wait a bit for the system to update dimensions
            await new Promise(resolve => setTimeout(resolve, 150));
            // Update dimensions when orientation changes
            const newDimensions = Dimensions.get('window');
            console.log('📱 Updating dimensions after orientation change:', newDimensions);
            setDimensions(newDimensions);
            // Re-scroll to current photo after orientation change
            if (scrollViewRef.current) {
              setTimeout(() => {
                scrollViewRef.current?.scrollTo({
                  x: currentIndexRef.current * newDimensions.width,
                  animated: false,
                });
              }, 100);
            }
          });
          console.log('📱 Orientation change listener added');
          
          // Also check orientation periodically to see if it changes
          const checkInterval = setInterval(async () => {
            try {
              const current = await ScreenOrientation.getOrientationAsync();
              console.log('📱 Periodic orientation check:', current);
            } catch (e) {
              // Ignore errors
            }
          }, 2000);
          
          // Store interval ID for cleanup
          (orientationListenerRef.current as any).checkInterval = checkInterval;
        } else {
          console.log('📱 Photo viewer closed - locking to portrait');
          // Reset orientation lock state
          setOrientationLock('unlocked');
          // Remove orientation listener if it exists
          if (orientationListenerRef.current) {
            // Clear any check interval
            if ((orientationListenerRef.current as any).checkInterval) {
              clearInterval((orientationListenerRef.current as any).checkInterval);
            }
            orientationListenerRef.current.remove();
            orientationListenerRef.current = null;
            console.log('📱 Orientation listener removed');
          }
          
          // Try to restore previous orientation, or default to portrait
          try {
            if (savedOrientationLock) {
              await ScreenOrientation.lockAsync(savedOrientationLock);
              console.log('📱 Restored saved orientation:', savedOrientationLock);
            } else {
              // Try portrait first, fall back to default if not supported
              await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
              console.log('📱 Locked to PORTRAIT_UP');
            }
          } catch (e) {
            console.log('📱 Portrait lock failed, trying DEFAULT:', e);
            // If portrait isn't supported, try default
            try {
              await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
              console.log('📱 Locked to DEFAULT');
            } catch (e2) {
              console.log('📱 Default lock failed, unlocking:', e2);
              // If all else fails, just unlock - device will use app default
              await ScreenOrientation.unlockAsync();
            }
          }
        }
      } catch (error) {
        console.error('📱 Error managing screen orientation:', error);
      }
    };
    
    handleOrientation();
    
    return () => {
      // Cleanup: remove listener and restore orientation when component unmounts
      if (orientationListenerRef.current) {
        // Clear any check interval
        if ((orientationListenerRef.current as any).checkInterval) {
          clearInterval((orientationListenerRef.current as any).checkInterval);
        }
        orientationListenerRef.current.remove();
        orientationListenerRef.current = null;
        console.log('📱 Cleanup: removed orientation listener');
      }
      if (!visible) {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {
          // Ignore errors on cleanup - device will use app default
        });
      }
    };
  }, [visible]);

  // Listen for orientation changes - only when modal is visible
  useEffect(() => {
    if (!visible) return;
    
    console.log('📱 Setting up Dimensions listener for orientation changes');
    const subscription = Dimensions.addEventListener('change', ({ window, screen }) => {
      console.log('📱 Dimensions changed!', {
        windowWidth: window.width,
        windowHeight: window.height,
        screenWidth: screen.width,
        screenHeight: screen.height,
        isLandscape: window.width > window.height,
        currentIndex: currentIndexRef.current
      });
      // Force update dimensions
      setDimensions(window);
      // Re-scroll to current photo after orientation change
      if (scrollViewRef.current) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            x: currentIndexRef.current * window.width,
            animated: false,
          });
        }, 150);
      }
    });

    return () => {
      console.log('📱 Removing Dimensions listener');
      subscription?.remove();
    };
  }, [visible]);

  useEffect(() => {
    if (visible) {
      // Force refresh dimensions when modal opens
      const currentDimensions = Dimensions.get('window');
      setDimensions(currentDimensions);
      console.log('📱 Modal opened, current dimensions:', currentDimensions);
      
      if (scrollViewRef.current) {
        // Scroll to the selected photo when modal opens
        // Use initialIndex to ensure we scroll to the correct photo that was tapped
        const targetIndex = initialIndex !== undefined ? initialIndex : currentIndex;
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            x: targetIndex * currentDimensions.width,
            animated: false,
          });
        }, 100);
      }
    }
  }, [visible, initialIndex, currentIndex]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / dimensions.width);
    setCurrentIndex(index);
    
    // Auto-load more photos when user reaches the last photo
    if (index === photos.length - 1 && onLoadMorePhotos && !hasLoadedMorePhotos && !isLoadingMoreRef.current) {
      console.log('📸 Reached last photo, auto-loading more...');
      isLoadingMoreRef.current = true;
      onLoadMorePhotos();
      // Reset the flag after a delay to allow for async loading
      setTimeout(() => {
        isLoadingMoreRef.current = false;
      }, 2000);
    }
  };
  
  // Reset loading flag when photos change (new photos loaded)
  useEffect(() => {
    isLoadingMoreRef.current = false;
  }, [photos.length]);

  const handleClose = () => {
    onClose();
  };
  
  // Toggle resize mode function
  const toggleResizeMode = () => {
    setResizeMode(prev => prev === 'contain' ? 'cover' : 'contain');
    // Reset zoom/pan when toggling
    scale.value = withTiming(1);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedScale.current = 1;
    savedTranslateX.current = 0;
    savedTranslateY.current = 0;
  };
  
  // Pinch gesture for zooming
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const newScale = savedScale.current * event.scale;
      // Limit zoom between 1x and 5x
      const clampedScale = Math.max(1, Math.min(5, newScale));
      scale.value = clampedScale;
      // Only update state when crossing threshold to avoid excessive runOnJS calls
      const isNowZoomed = clampedScale > 1.1;
      if (isNowZoomed !== wasZoomedRef.current) {
        wasZoomedRef.current = isNowZoomed;
        runOnJS(setIsZoomed)(isNowZoomed);
      }
    })
    .onEnd(() => {
      savedScale.current = scale.value;
      const isNowZoomed = scale.value > 1.1;
      wasZoomedRef.current = isNowZoomed;
      runOnJS(setIsZoomed)(isNowZoomed);
    });
  
  // Pan gesture for moving zoomed image (only when zoomed)
  // Use activeOffsetY to require vertical movement, allowing pure horizontal swipes to pass through to ScrollView
  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .activeOffsetY([-5, 5]) // Require 5px vertical movement to activate (allows horizontal swipes to ScrollView)
    .onUpdate((event) => {
      // Only allow panning when zoomed in
      if (scale.value > 1.1) {
        translateX.value = savedTranslateX.current + event.translationX;
        translateY.value = savedTranslateY.current + event.translationY;
      }
    })
    .onEnd(() => {
      if (scale.value > 1.1) {
        savedTranslateX.current = translateX.value;
        savedTranslateY.current = translateY.value;
      }
    });
  
  // Tap gesture to toggle resize mode (only when not zoomed)
  const tapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(250)
    .onEnd(() => {
      // Only toggle if not zoomed
      if (scale.value <= 1.1) {
        runOnJS(toggleResizeMode)();
      }
    });
  
  // Combine gestures - only apply pan when zoomed, otherwise let ScrollView handle swipes
  // Use Simultaneous for pinch+pan, Race for tap vs pan
  // Note: panGesture only activates when zoomed (checked in onUpdate), so horizontal swipes pass through to ScrollView
  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Race(tapGesture, panGesture)
  );
  
  // Animated style for the image
  const animatedImageStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  if (!visible || photos.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.photoCounter}>
            {currentIndex + 1} of {photos.length}
          </Text>
          <TouchableOpacity 
            style={styles.orientationButton} 
            onPress={handleToggleOrientation}
          >
            <Ionicons 
              name={orientationLock === 'portrait' ? 'phone-portrait-outline' : orientationLock === 'landscape' ? 'phone-landscape-outline' : 'sync-outline'} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>

        {/* Photo ScrollView */}
        <ScrollView
          key={`scrollview-${dimensions.width}-${dimensions.height}`}
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
          contentContainerStyle={{ width: dimensions.width * photos.length, height: dimensions.height }}
          scrollEnabled={!isZoomed}
        >
          {photos.map((photo, index) => {
            if (!photo.photoReference) return null;
            const photoUrl = getPhotoUrl(photo.photoReference, placeId);

            const photoContent = photoUrl ? (
              <Animated.View 
                key={`photo-wrapper-${index}-${dimensions.width}-${dimensions.height}`}
                style={[styles.photoWrapper, { width: dimensions.width, height: dimensions.height }]}
              >
                <Animated.Image
                  key={`photo-${index}-${dimensions.width}-${dimensions.height}`}
                  source={{ uri: photoUrl }}
                  style={[
                    styles.photo,
                    { width: dimensions.width, height: dimensions.height },
                    index === currentIndex ? animatedImageStyle : {}
                  ]}
                  resizeMode={index === currentIndex ? resizeMode : 'contain'}
                  onError={(error) => {
                    console.error('❌ Full-screen image load error:', {
                      photoUrl: photoUrl.substring(0, 100),
                      error: error.nativeEvent?.error,
                      photoReference: photo.photoReference?.substring(0, 30)
                    });
                  }}
                  onLoad={() => {
                    console.log('✅ Full-screen image loaded successfully');
                  }}
                />
              </Animated.View>
            ) : null;

            return (
              <View 
                key={`photo-container-${index}-${dimensions.width}-${dimensions.height}`} 
                style={[styles.photoContainer, { width: dimensions.width, height: dimensions.height }]}
              >
                {photoUrl && photoContent ? (
                  index === currentIndex ? (
                    <GestureDetector gesture={composedGesture}>
                      {photoContent}
                    </GestureDetector>
                  ) : (
                    photoContent
                  )
                ) : (
                  <View style={styles.placeholderContainer}>
                    <Ionicons name="image-outline" size={64} color="#999" />
                    <Text style={styles.placeholderText}>Photo unavailable</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Footer with attribution */}
        {photos[currentIndex]?.attribution && (
          <View style={styles.footer}>
            <Text style={styles.attribution} numberOfLines={2}>
              Photo by {photos[currentIndex].attribution}
            </Text>
          </View>
        )}

        {/* Dots indicator */}
        {photos.length > 1 && (
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
      </View>
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
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCounter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  orientationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  photoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    // Dimensions will be set dynamically based on orientation
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
    marginTop: 16,
  },
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  attribution: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
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

