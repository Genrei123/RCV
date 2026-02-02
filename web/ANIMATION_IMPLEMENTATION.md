# Landing Page Scroll Animation Implementation

## Overview
Added comprehensive scroll-triggered animations to the RCV landing page using the Intersection Observer API. All cards and content sections now animate into view as users scroll.

## What Was Added

### 1. **Custom Intersection Observer Hook** (`src/hooks/useIntersectionObserver.ts`)
- Created `useIntersectionObserver` hook to detect when elements enter the viewport
- Features:
  - `threshold`: Controls when animation triggers (0.1 = when 10% visible)
  - `rootMargin`: Buffer zone around viewport
  - `triggerOnce`: Animation triggers only once by default
  - Returns `ref` for DOM attachment and `isVisible` for conditional rendering

### 2. **CSS Animation Keyframes** (added to `src/index.css`)
Five animation styles:
- **fadeInUp**: Element slides up 30px while fading in (0.6s)
- **fadeInLeft**: Element slides left 30px while fading in (0.6s)
- **fadeInRight**: Element slides right 30px while fading in (0.6s)
- **scaleIn**: Element scales from 0.95 to 1 while fading in (0.6s)
- **slideDown**: Element slides down 20px while fading in (0.6s)

Animation delay utilities for staggered effects:
- `.delay-0` to `.delay-500` (in 100ms increments)

### 3. **Applied Animations Across Landing Page**

#### Features Section
- Cards animate with alternating directions
- Odd cards: fadeInLeft
- Even cards: fadeInRight
- Staggered delay: 0.1s increment per card

#### Mission Section (Objectives)
- Cards animate with scaleIn effect
- Staggered delay: 0.15s increment per card

#### Video Section
- Video animates with fadeInLeft
- Infographic card animates with fadeInRight

#### About Section (Highlights)
- Each highlight item animates with fadeInLeft
- Staggered delay: 0.1s increment

#### Featured Blog Posts
- Blog cards animate with fadeInUp
- Staggered delay: 0.12s increment per card

#### CTA Section
- Call-to-action animates with fadeInUp

## Technical Implementation

### Hook Usage Pattern
```tsx
const { ref, isVisible } = useIntersectionObserver({ threshold: 0.2 });
return (
  <div
    ref={ref}
    className={isVisible ? 'animate-fade-in-left' : 'opacity-0'}
    style={{ animationDelay: `${index * 0.1}s` }}
  >
    {/* Content */}
  </div>
);
```

### Key Features
- **Progressive Enhancement**: Falls back to opacity: 0 until visible
- **Immediate Trigger**: Animation starts when element enters viewport
- **Staggered Timing**: Multiple cards in a section animate sequentially
- **Smooth Performance**: Uses passive event listeners and CSS animations (GPU accelerated)
- **Accessibility**: No impact on screen readers or keyboard navigation

## Browser Support
- Works in all modern browsers that support:
  - Intersection Observer API
  - CSS animations
  - React hooks

## Animation Timings
- Base animation duration: 0.6s
- Easing function: ease-out (natural deceleration)
- Stagger between cards: 0.1s - 0.15s
- Threshold (visibility): 10% - 30% of element in viewport

## Files Modified
1. `src/hooks/useIntersectionObserver.ts` - NEW
2. `src/pages/LandingPage.tsx` - Added intersection observer usage to 6 sections
3. `src/index.css` - Added animation keyframes and delay utilities

## Result
Landing page now has smooth, professional scroll animations that:
- Draw user attention to key sections
- Create visual depth and hierarchy
- Provide visual feedback during scrolling
- Enhance overall user experience
