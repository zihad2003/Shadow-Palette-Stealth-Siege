import React from 'react';
import { motion } from 'framer-motion';

const VARIANTS = {
  primary: 'clay-btn clay-btn-primary',
  success: 'clay-btn clay-btn-success',
  danger: 'clay-btn clay-btn-danger',
  ghost: 'clay-btn clay-btn-ghost',
  tab: 'clay-btn clay-btn-tab',
  'tab-active': 'clay-btn clay-btn-tab-active',
};

export default function ClayButton({
  variant = 'ghost',
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      className={`${VARIANTS[variant] || VARIANTS.ghost} ${className}`}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { y: 4 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
