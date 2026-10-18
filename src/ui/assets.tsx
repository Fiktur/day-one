import { createAvatar } from '@dicebear/core'
import { notionists } from '@dicebear/collection'
import { cn } from '../lib/cn'
import { people } from '../data/people'

// Fluent Emoji 3D (Microsoft, MIT). Bundled so the demo never fetches anything at runtime.
const files = import.meta.glob('../assets/emoji/*.png', { eager: true, import: 'default' }) as Record<string, string>
const EMOJI: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace('.png', ''), url]),
)

export type EmojiName =
  | 'wave' | 'rocket' | 'laptop' | 'party' | 'calendar' | 'key' | 'page' | 'package' | 'sparkles' | 'coffee' | 'trophy'
  | 'shield' | 'bell' | 'heart' | 'sunrise' | 'seedling' | 'office' | 'house' | 'target' | 'megaphone' | 'people'
  | 'hourglass' | 'check' | 'globe' | 'envelope' | 'camera' | 'gear' | 'warning' | 'books' | 'plug' | 'chart'
  | 'magnifier' | 'speech' | 'star' | 'id' | 'smile' | 'handshake'

export function Emoji({ name, size = 32, className, float, wave, delay = 0, alt = '' }: { name: EmojiName; size?: number; className?: string; float?: boolean; wave?: boolean; delay?: number; alt?: string }) {
  const src = EMOJI[name]
  if (!src) return null
  return (
    <img
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      width={size}
      height={size}
      className={cn('pointer-events-none select-none drop-shadow-[0_6px_10px_rgb(17_20_38/0.18)]', float && 'bob', wave && 'wave', className)}
      style={{ width: size, height: size, animationDelay: delay ? `${delay}s` : undefined }}
    />
  )
}

// Illustrated avatars: DiceBear "Notionists" by Zoish (CC0), generated locally from each name.
const cache: Record<string, string> = {}
export function avatarUri(id: string): string {
  if (cache[id]) return cache[id]
  const seed = people[id]?.name ?? id
  cache[id] = createAvatar(notionists, { seed, scale: 110, translateY: 4 }).toDataUri()
  return cache[id]
}

export const TEAM_EMOJI: Record<string, EmojiName> = {
  it: 'laptop', hris: 'gear', screening: 'shield', mobility: 'globe', workplace: 'office', program: 'sparkles', recruiting: 'magnifier',
}

export const STEP_EMOJI: Record<string, EmojiName> = {
  offer: 'party', details: 'id', laptop_choice: 'laptop', consent: 'shield', bg_order: 'shield', bg_complete: 'shield', clearance: 'shield',
  mobility_review: 'globe', permit: 'globe', cohort_seat: 'calendar', wd_prehire: 'page', wd_contacts: 'page', wd_id: 'id', wd_tax: 'page',
  wd_deposit: 'page', wd_conduct: 'books', buddy: 'coffee', board_invite: 'heart', hello: 'camera', wd_hire: 'gear', account: 'key',
  laptop_release: 'package', laptop_prep: 'gear', laptop_ship: 'package', laptop_deliver: 'package', laptop_received: 'laptop',
  badge: 'office', orient_rsvp: 'calendar', first_week: 'calendar', first_work: 'target', activate: 'key', orientation: 'people',
  rtw: 'page', benefits: 'heart', milestone: 'target', checkin30: 'speech', cancel_laptop: 'package', cancel_check: 'shield',
}
