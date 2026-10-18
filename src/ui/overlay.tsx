import * as D from '@radix-ui/react-dialog'
import * as Pop from '@radix-ui/react-popover'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export function Modal({ open, onOpenChange, title, description, children, width = 'max-w-lg', footer }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  width?: string
  footer?: ReactNode
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-[3px] data-[state=open]:animate-fade" />
        <D.Content onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).focus() }} className={cn('fixed left-1/2 top-1/2 z-[61] flex max-h-[88vh] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[24px] border border-line bg-surface shadow-pop focus:outline-none data-[state=open]:animate-pop-center', width)}>
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <D.Title className="font-display text-lg font-bold leading-tight">{title}</D.Title>
              {description && <D.Description className="mt-1 text-[13px] text-muted">{description}</D.Description>}
            </div>
            <D.Close className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-sunken hover:text-ink" aria-label="Close"><X className="h-4 w-4" /></D.Close>
          </div>
          <div className="scroll-thin overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-bg/60 px-5 py-3">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}

export function Sheet({ open, onOpenChange, title, children, side = 'right', width = 'w-[420px]' }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: ReactNode
  children: ReactNode
  side?: 'right' | 'left'
  width?: string
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[60] bg-ink/25 backdrop-blur-[2px] data-[state=open]:animate-fade" />
        <D.Content className={cn('fixed inset-y-0 z-[61] flex max-w-[100vw] flex-col border-line bg-surface shadow-pop focus:outline-none', side === 'right' ? 'right-0 border-l data-[state=open]:animate-slide-in' : 'left-0 border-r', width)}>
          <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
            <D.Title className="font-display text-base font-bold">{title}</D.Title>
            <D.Description className="sr-only">Panel</D.Description>
            <D.Close className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-sunken hover:text-ink" aria-label="Close"><X className="h-4 w-4" /></D.Close>
          </div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}

export function Popover({ trigger, children, align = 'start', className }: { trigger: ReactNode; children: ReactNode; align?: 'start' | 'end' | 'center'; className?: string }) {
  return (
    <Pop.Root>
      <Pop.Trigger asChild>{trigger}</Pop.Trigger>
      <Pop.Portal>
        <Pop.Content align={align} sideOffset={6} className={cn('z-[70] origin-[var(--radix-popover-content-transform-origin)] rounded-2xl border border-line bg-surface p-3 shadow-pop focus:outline-none data-[state=open]:animate-pop-in', className)}>
          {children}
        </Pop.Content>
      </Pop.Portal>
    </Pop.Root>
  )
}

export const PopClose = Pop.Close

export function Dropdown({ trigger, children, align = 'end', className }: { trigger: ReactNode; children: ReactNode; align?: 'start' | 'end' | 'center'; className?: string }) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>{trigger}</Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align={align} sideOffset={6} className={cn('scroll-thin z-[70] max-h-[70vh] min-w-[220px] origin-[var(--radix-dropdown-menu-content-transform-origin)] overflow-y-auto rounded-2xl border border-line bg-surface p-1 shadow-pop data-[state=open]:animate-pop-in', className)}>
          {children}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}

export function DropItem({ children, onSelect, active }: { children: ReactNode; onSelect: () => void; active?: boolean }) {
  return (
    <Menu.Item onSelect={onSelect} className={cn('flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] outline-none data-[highlighted]:bg-sunken', active && 'bg-accent-soft')}>
      {children}
    </Menu.Item>
  )
}

export function DropLabel({ children }: { children: ReactNode }) {
  return <Menu.Label className="px-2 pb-1 pt-2 font-mono text-[10px] uppercase tracking-wider text-faint">{children}</Menu.Label>
}

/** A styled replacement for native <select>, built on the dropdown menu. */
export function Select<T extends string | number>({ value, options, onChange, label, className }: {
  value: T
  options: readonly (readonly [T, ReactNode])[]
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  const current = options.find(([v]) => v === value)
  return (
    <Dropdown
      align="start"
      trigger={
        <button type="button" aria-label={label} className={cn('flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 text-left text-[13px] text-ink shadow-card transition hover:border-accent/40 data-[state=open]:border-accent/50 data-[state=open]:ring-2 data-[state=open]:ring-accent/15', className)}>
          <span className="truncate">{current?.[1]}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
        </button>
      }
    >
      {options.map(([v, l]) => (
        <DropItem key={String(v)} active={v === value} onSelect={() => onChange(v)}>
          <span className="flex-1">{l}</span>
          {v === value && <Check className="h-3.5 w-3.5 text-accent" />}
        </DropItem>
      ))}
    </Dropdown>
  )
}
