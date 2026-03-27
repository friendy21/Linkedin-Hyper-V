import React from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hover = false,
  className,
  ...props
}) => {
  // Use framer-motion if hover is enabled for that premium feel
  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 300 }}
        className={cn(
          'glass-card rounded-2xl overflow-hidden cursor-pointer group',
          className
        )}
        {...(props as any)}
      >
        {/* Subtle glow effect on hover via pseudo-elements is also possible, but keeping it simple */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <div className="relative z-10">{children}</div>
      </motion.div>
    );
  }

  return (
    <div
      className={cn(
        'glass-card rounded-2xl overflow-hidden relative',
        className
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
};