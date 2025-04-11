import { useState, useEffect, useRef } from 'react';

interface AnimationOptions {
  duration?: number;
  initialValue?: number;
  easing?: 'linear' | 'easeInOut' | 'easeIn' | 'easeOut';
}

interface AnimationObjectOptions {
  duration?: number;
  initialValue?: any;
  easing?: 'linear' | 'easeInOut' | 'easeIn' | 'easeOut';
}

// Simple easing functions
const easingFunctions = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
};

/**
 * Custom hook for animating a number value over time
 * @param targetValue The value to animate to
 * @param options Animation options (duration, initialValue, easing)
 * @returns The current animated value
 */
export function useMicroAnimation(
  targetValue: number,
  options: AnimationOptions = {}
): number {
  const {
    duration = 500,
    initialValue,
    easing = 'easeOut'
  } = options;
  
  const [value, setValue] = useState<number>(initialValue !== undefined ? initialValue : targetValue);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const startValueRef = useRef<number>(value);
  const targetValueRef = useRef<number>(targetValue);
  
  // Reset animation when target value changes
  useEffect(() => {
    // Skip animation if initial render or no significant change
    if (
      Math.abs(targetValue - value) < 0.1 ||
      (initialValue !== undefined && Math.abs(targetValue - initialValue) < 0.1)
    ) {
      setValue(targetValue);
      return;
    }
    
    startValueRef.current = value;
    targetValueRef.current = targetValue;
    startTimeRef.current = null;
    
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    
    // Animation frame loop
    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFunctions[easing](progress);
      
      const currentValue = startValueRef.current + (targetValueRef.current - startValueRef.current) * easedProgress;
      setValue(currentValue);
      
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    
    frameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [targetValue, duration, easing]);
  
  return value;
}

/**
 * Custom hook for animating multiple numeric properties of an object
 * @param targetObject Object with numeric values to animate
 * @param options Animation options (duration, initialValue, easing)
 * @returns The current animated object
 */
export function useMicroAnimationObject<T extends Record<string, number>>(
  targetObject: T,
  options: AnimationObjectOptions = {}
): T {
  const {
    duration = 500,
    initialValue,
    easing = 'easeOut'
  } = options;
  
  // Initialize state with either initialValue or targetObject
  const [animatedObject, setAnimatedObject] = useState<T>(
    initialValue as T || { ...targetObject }
  );
  
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const startValuesRef = useRef<Record<string, number>>({ ...animatedObject });
  const targetValuesRef = useRef<Record<string, number>>({ ...targetObject });
  const isAnimatingRef = useRef<boolean>(false);
  
  // Update animation when target values change
  useEffect(() => {
    // Check if there's any significant change to animate
    let hasSignificantChange = false;
    Object.keys(targetObject).forEach(key => {
      if (Math.abs(targetObject[key] - (animatedObject[key] || 0)) > 0.1) {
        hasSignificantChange = true;
      }
    });
    
    if (!hasSignificantChange) {
      setAnimatedObject({ ...targetObject });
      return;
    }
    
    // Set starting and target values
    startValuesRef.current = { ...animatedObject };
    targetValuesRef.current = { ...targetObject };
    startTimeRef.current = null;
    isAnimatingRef.current = true;
    
    // Cancel any existing animation
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    
    // Animation frame loop
    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFunctions[easing](progress);
      
      const newValues = { ...animatedObject };
      
      Object.keys(targetValuesRef.current).forEach(key => {
        const start = startValuesRef.current[key] || 0;
        const target = targetValuesRef.current[key];
        newValues[key as keyof T] = start + (target - start) * easedProgress as any;
      });
      
      setAnimatedObject(newValues as T);
      
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        isAnimatingRef.current = false;
      }
    };
    
    frameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [targetObject, duration, easing]);
  
  return animatedObject;
}