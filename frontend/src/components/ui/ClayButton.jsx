import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const VARIANTS = {
  primary: 'clay-btn clay-btn-primary',
  success: 'clay-btn clay-btn-success',
  danger: 'clay-btn clay-btn-danger',
  ghost: 'clay-btn clay-btn-ghost',
  tab: 'clay-btn clay-btn-tab',
  'tab-active': 'clay-btn clay-btn-tab-active',
};

const SPRING = { stiffness: 320, damping: 22, mass: 0.6 };

/**
 * Cursor attraction for .magnetic buttons — springy pull toward pointer.
 */
function useMagnetic(enabled, { strength = 0.42, radius = 100 } = {}) {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, SPRING);
  const y = useSpring(my, SPRING);

  const onPointerMove = (e) => {
    if (!enabled || !ref.current || ref.current.disabled) return;
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) {
      mx.set(0);
      my.set(0);
      el.classList.remove('is-magnetic-active');
      return;
    }
    const pull = (1 - dist / radius) * strength;
    mx.set(dx * pull);
    my.set(dy * pull);
    el.classList.add('is-magnetic-active');
  };

  const onPointerLeave = () => {
    mx.set(0);
    my.set(0);
    ref.current?.classList.remove('is-magnetic-active');
  };

  return { ref, x, y, onPointerMove, onPointerLeave };
}

export default function ClayButton({
  variant = 'ghost',
  className = '',
  children,
  disabled,
  type = 'button',
  magnetic = false,
  magneticStrength,
  magneticRadius,
  onPointerMove,
  onPointerLeave,
  ...rest
}) {
  const active = !!magnetic && !disabled;
  const mag = useMagnetic(active, {
    strength: magneticStrength,
    radius: magneticRadius,
  });

  const pulseShadow =
    variant === 'danger'
      ? [
          '0 3px 0 #7a1520, 0 6px 12px rgba(0,0,0,0.32), 0 0 0 rgba(230,57,70,0)',
          '0 3px 0 #7a1520, 0 8px 18px rgba(0,0,0,0.38), 0 0 22px rgba(230,57,70,0.45)',
          '0 3px 0 #7a1520, 0 6px 12px rgba(0,0,0,0.32), 0 0 0 rgba(230,57,70,0)',
        ]
      : variant === 'success'
        ? [
            '0 3px 0 #145e56, 0 6px 12px rgba(0,0,0,0.32), 0 0 0 rgba(42,157,143,0)',
            '0 3px 0 #145e56, 0 8px 18px rgba(0,0,0,0.38), 0 0 22px rgba(42,157,143,0.4)',
            '0 3px 0 #145e56, 0 6px 12px rgba(0,0,0,0.32), 0 0 0 rgba(42,157,143,0)',
          ]
        : [
            '0 3px 0 #8a4314, 0 6px 12px rgba(0,0,0,0.32), 0 0 0 rgba(244,162,97,0)',
            '0 3px 0 #8a4314, 0 8px 18px rgba(0,0,0,0.38), 0 0 22px rgba(244,162,97,0.4)',
            '0 3px 0 #8a4314, 0 6px 12px rgba(0,0,0,0.32), 0 0 0 rgba(244,162,97,0)',
          ];

  return (
    <motion.button
      ref={mag.ref}
      type={type}
      disabled={disabled}
      className={`${VARIANTS[variant] || VARIANTS.ghost}${magnetic ? ' magnetic' : ''} ${className}`}
      style={active ? { x: mag.x, y: mag.y } : undefined}
      animate={
        active
          ? {
              scale: [1, 1.035, 1],
              boxShadow: pulseShadow,
            }
          : undefined
      }
      transition={
        active
          ? {
              scale: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
              boxShadow: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
            }
          : { duration: 0.08, ease: 'easeOut' }
      }
      whileHover={disabled ? undefined : active ? { scale: 1.06 } : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      onPointerMove={(e) => {
        mag.onPointerMove(e);
        onPointerMove?.(e);
      }}
      onPointerLeave={(e) => {
        mag.onPointerLeave(e);
        onPointerLeave?.(e);
      }}
      {...rest}
    >
      {magnetic ? (
        <>
          <motion.span
            className="magnetic-sheen"
            aria-hidden
            animate={{ x: ['-120%', '140%'] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.8 }}
          />
          <span className="magnetic-label relative z-[1] inline-flex items-center justify-center gap-2">
            {children}
          </span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}
