import { useEffect, useState } from 'react'
import clsx, { type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function plural(n: number, one: string, many = one + 's'): string {
  return `${n} ${n === 1 ? one : many}`
}

/** Lower-case only the first letter, so dates and names keep their capitals. */
export function lc(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s
}

/** True below the given width. Split view and the sidebar need room. */
export function useNarrow(px = 1000): boolean {
  const q = `(max-width: ${px - 1}px)`
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setNarrow(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [q])
  return narrow
}
