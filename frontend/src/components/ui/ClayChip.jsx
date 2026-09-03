import React from 'react';
import { motion } from 'framer-motion';

export default function ClayChip({
  label,
  value,
  icon,
  valueClass = 'text-clay-accent',
  className = '',
}) {
  return (
    <div
      className={`clay-chip px-3.5 py-1.5 flex items-center gap-1.5 text-xs font-bold text-clay-muted shrink-0 ${className}`}
    >
      {icon}
      {label && (
        <span className="font-heading uppercase tracking-wider text-[10px]">{label}</span>
      )}
      {value !== undefined && (
        <motion.strong
          key={String(value)}
          className={`font-heading text-sm ${valueClass}`}
          initial={{ opacity: 0.65 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {value}
        </motion.strong>
      )}
    </div>
  );
}
