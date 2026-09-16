export const easeOutExpo = [0.16, 1, 0.3, 1] as const;
export const revealVariants = {
  hidden: { opacity: 0, y: 26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: easeOutExpo },
  },
};
export const staggerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};
