import React from 'react';
import { motion } from 'framer-motion';

const DEPTH = {
  raised: 'clay-panel',
  deep: 'clay-panel-deep',
  inset: 'clay-inset',
};

export default function ClayPanel({
  depth = 'raised',
  className = '',
  children,
  enter = false,
  delay = 0,
  ...rest
}) {
  const cls = `${DEPTH[depth] || DEPTH.raised} ${className}`;

  if (!enter) {
    return (
      <div className={cls} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={cls}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut', delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
