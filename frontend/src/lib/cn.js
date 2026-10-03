import clsx from 'clsx'

/** Join class names conditionally: cn('a', isOn && 'b') */
export const cn = (...args) => clsx(...args)
