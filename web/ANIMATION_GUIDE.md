# Landing Page Animation Guide

## Section-by-Section Animation Breakdown

### 1. Hero Carousel 🎬
**Current State**: Scroll-based scale and opacity (already existed)
- Scales down from 1 to 0.9
- Opacity fades from 1 to 0.7
- Border radius increases on scroll

---

### 2. Features Section ✨
**Animation**: Alternating Slide + Fade
```
Card 1: ← FadeInLeft (moves from left)
Card 2: → FadeInRight (moves from right)
Card 3: ← FadeInLeft
Card 4: → FadeInRight
Card 5: ← FadeInLeft
Card 6: → FadeInRight
```
- **Timing**: 0.6s per card
- **Stagger**: 0.1s between cards
- **Total Duration**: ~1.2 seconds for all cards

---

### 3. Video Section + Infographic 🎥
**Animation**: Dual Slide
```
Video: ← FadeInLeft
Card:  → FadeInRight
```
- **Timing**: 0.6s each
- **Synchronized**: Both start at similar times

---

### 4. About Section (Highlights) ✅
**Animation**: Progressive Left Slide
```
✓ Blockchain-secured certificates  ← Slide in
✓ Real-time verification            ← Slide in (delayed)
✓ Comprehensive analytics           ← Slide in (delayed)
✓ Regulatory compliance tracking    ← Slide in (delayed)
```
- **Timing**: 0.6s per item
- **Stagger**: 0.1s between items

---

### 5. Mission Section (Objectives) 🎯
**Animation**: Growth/Scale Effect
```
Card 1: ⬆ ScaleIn (grows from center)
Card 2: ⬆ ScaleIn (grows from center, delayed)
Card 3: ⬆ ScaleIn (grows from center, delayed)
Card 4: ⬆ ScaleIn (grows from center, delayed)
```
- **Timing**: 0.6s per card
- **Stagger**: 0.15s between cards
- **Effect**: Professional, impactful appearance

---

### 6. Featured Blog Posts 📝
**Animation**: Upward Fade
```
Blog 1: ↑ FadeInUp
Blog 2: ↑ FadeInUp (delayed)
Blog 3: ↑ FadeInUp (delayed)
```
- **Timing**: 0.6s per card
- **Stagger**: 0.12s between cards
- **Total Duration**: ~0.9 seconds

---

### 7. CTA Section (Call-to-Action) 🚀
**Animation**: Upward Fade
```
"Ready to Get Started?" ↑ FadeInUp
```
- **Timing**: 0.6s
- **Effect**: Draws attention to primary action

---

## Animation Properties Summary

| Property | Value |
|----------|-------|
| Duration | 0.6 seconds |
| Easing | ease-out |
| Trigger Point | 10-30% visible in viewport |
| Trigger Once | ✓ (animates only on first view) |
| GPU Accelerated | ✓ (uses CSS transforms) |

## Translation Distances

| Animation | Movement |
|-----------|----------|
| fadeInLeft | 30px from left |
| fadeInRight | 30px from right |
| fadeInUp | 30px from bottom |
| slideDown | 20px from top |
| scaleIn | 0.95 → 1.0 scale |

## Responsive Behavior

All animations work seamlessly across devices:
- **Desktop**: Full animation experience
- **Tablet**: Animations trigger at appropriate scroll positions
- **Mobile**: Optimized timing for slower scroll speeds

## Performance Considerations

✓ Uses CSS animations (GPU accelerated)
✓ Passive event listeners for scroll
✓ Intersection Observer (performant viewport detection)
✓ No layout thrashing
✓ Smooth 60fps animations

## Customization Guide

To modify animations, edit:
1. **Animation duration**: Change `0.6s` in `@keyframes` to desired value
2. **Stagger amount**: Modify `index * 0.1` to different increment
3. **Translation distance**: Change `translateX(30px)` values in keyframes
4. **Easing function**: Replace `ease-out` with `ease-in-out`, `cubic-bezier()`, etc.
