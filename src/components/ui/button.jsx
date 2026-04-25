import * as Headless from '@headlessui/react'
import clsx from 'clsx'
import React, { forwardRef } from 'react'
import { Link } from './link'

/**
 * GrowReporter ボタンレギュレーション
 * 詳細: docs/UI_BUTTON_REGULATION.md
 *
 * 使い方:
 *   <Button variant="primary">保存</Button>
 *   <Button variant="ai" size="lg">AI分析を生成</Button>
 *   <Button variant="upgrade">ビジネスプランに申し込む</Button>
 *
 * variant: primary | secondary | ghost | success | danger | ai | upgrade
 * size:    sm | md (default) | lg
 * pill:    true で rounded-full（角丸の代わりに完全円形）
 *
 * 後方互換: 既存の color="blue" / outline / plain も引き続き動作する（順次 variant へ移行）。
 */

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-2.5 text-sm gap-2',
}

const variantClasses = {
  primary: [
    'bg-primary text-white',
    'hover:bg-opacity-90',
    'shadow-sm',
  ],
  secondary: [
    'bg-white text-dark border border-stroke',
    'hover:bg-gray-50',
    'dark:bg-dark-2 dark:text-white dark:border-dark-3 dark:hover:bg-dark-3',
  ],
  ghost: [
    'bg-transparent text-body-color',
    'hover:bg-gray-100 hover:text-dark',
    'dark:hover:bg-dark-3 dark:hover:text-white',
  ],
  success: [
    'bg-green-600 text-white',
    'hover:bg-green-700',
    'shadow-sm',
  ],
  danger: [
    'bg-red-600 text-white',
    'hover:bg-red-700',
    'shadow-sm',
  ],
  'danger-outline': [
    'bg-white text-red-600 border border-red-200',
    'hover:bg-red-50',
    'dark:bg-dark-2 dark:border-red-900/40 dark:hover:bg-red-900/20',
  ],
  ai: [
    'bg-gradient-ai text-white',
    'hover:bg-gradient-ai-hover',
    'shadow-md hover:shadow-lg transition-all',
  ],
  upgrade: [
    'bg-gradient-business text-white',
    'hover:bg-gradient-business-hover',
    'shadow-md hover:shadow-lg transition-all',
  ],
}

const styles = {
  base: [
    // Base
    'relative isolate inline-flex items-center justify-center font-semibold',
    'transition-colors',
    // Focus
    'focus:not-data-focus:outline-hidden data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-primary',
    // Disabled
    'data-disabled:opacity-50 data-disabled:cursor-not-allowed disabled:opacity-50 disabled:cursor-not-allowed',
    // Icon (catalyst 流の data-slot=icon でアイコン用余白を自動調整)
    '*:data-[slot=icon]:-mx-0.5 *:data-[slot=icon]:my-0.5 *:data-[slot=icon]:size-4 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:self-center forced-colors:[--btn-icon:ButtonText] forced-colors:data-hover:[--btn-icon:ButtonText]',
  ],
  // ----- 後方互換（既存 color/outline/plain 用、これまでどおり Catalyst スタイル） -----
  legacyBase: [
    'relative isolate inline-flex items-baseline justify-center gap-x-2 rounded-lg border text-base/6 font-semibold',
    'px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)] sm:text-sm/6',
    'focus:not-data-focus:outline-hidden data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-blue-500',
    'data-disabled:opacity-50',
    '*:data-[slot=icon]:-mx-0.5 *:data-[slot=icon]:my-0.5 *:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:self-center *:data-[slot=icon]:text-(--btn-icon) sm:*:data-[slot=icon]:my-1 sm:*:data-[slot=icon]:size-4 forced-colors:[--btn-icon:ButtonText] forced-colors:data-hover:[--btn-icon:ButtonText]',
  ],
  solid: [
    'border-transparent bg-(--btn-bg)',
    'data-active:brightness-90 data-hover:brightness-95',
  ],
  outline: [
    'border-zinc-950/10 text-zinc-950 data-active:bg-zinc-950/2.5 data-hover:bg-zinc-950/2.5',
    'dark:border-white/15 dark:text-white dark:[--btn-bg:transparent] dark:data-active:bg-white/5 dark:data-hover:bg-white/5',
    '[--btn-icon:var(--color-zinc-500)] data-active:[--btn-icon:var(--color-zinc-700)] data-hover:[--btn-icon:var(--color-zinc-700)] dark:data-active:[--btn-icon:var(--color-zinc-400)] dark:data-hover:[--btn-icon:var(--color-zinc-400)]',
  ],
  plain: [
    'border-transparent text-zinc-950 data-active:bg-zinc-950/5 data-hover:bg-zinc-950/5',
    'dark:text-white dark:data-active:bg-white/10 dark:data-hover:bg-white/10',
    '[--btn-icon:var(--color-zinc-500)] data-active:[--btn-icon:var(--color-zinc-700)] data-hover:[--btn-icon:var(--color-zinc-700)] dark:[--btn-icon:var(--color-zinc-500)] dark:data-active:[--btn-icon:var(--color-zinc-400)] dark:data-hover:[--btn-icon:var(--color-zinc-400)]',
  ],
  colors: {
    'dark/zinc': [
      'text-white [--btn-bg:var(--color-zinc-900)]',
      'dark:text-white dark:[--btn-bg:var(--color-zinc-600)]',
      '[--btn-icon:var(--color-zinc-400)] data-active:[--btn-icon:var(--color-zinc-300)] data-hover:[--btn-icon:var(--color-zinc-300)]',
    ],
    light: [
      'text-zinc-950 [--btn-bg:white]',
      'dark:text-white dark:[--btn-bg:var(--color-zinc-800)]',
      '[--btn-icon:var(--color-zinc-500)] data-active:[--btn-icon:var(--color-zinc-700)] data-hover:[--btn-icon:var(--color-zinc-700)] dark:[--btn-icon:var(--color-zinc-500)] dark:data-active:[--btn-icon:var(--color-zinc-400)] dark:data-hover:[--btn-icon:var(--color-zinc-400)]',
    ],
    'dark/white': [
      'text-white [--btn-bg:var(--color-zinc-900)]',
      'dark:text-zinc-950 dark:[--btn-bg:white]',
      '[--btn-icon:var(--color-zinc-400)] data-active:[--btn-icon:var(--color-zinc-300)] data-hover:[--btn-icon:var(--color-zinc-300)] dark:[--btn-icon:var(--color-zinc-500)] dark:data-active:[--btn-icon:var(--color-zinc-400)] dark:data-hover:[--btn-icon:var(--color-zinc-400)]',
    ],
    dark: [
      'text-white [--btn-bg:var(--color-zinc-900)]',
      'dark:[--btn-bg:var(--color-zinc-800)]',
      '[--btn-icon:var(--color-zinc-400)] data-active:[--btn-icon:var(--color-zinc-300)] data-hover:[--btn-icon:var(--color-zinc-300)]',
    ],
    white: [
      'text-zinc-950 [--btn-bg:white]',
      '[--btn-icon:var(--color-zinc-400)] data-active:[--btn-icon:var(--color-zinc-500)] data-hover:[--btn-icon:var(--color-zinc-500)]',
    ],
    zinc: [
      'text-white [--btn-bg:var(--color-zinc-600)]',
      '[--btn-icon:var(--color-zinc-400)] data-active:[--btn-icon:var(--color-zinc-300)] data-hover:[--btn-icon:var(--color-zinc-300)]',
    ],
    indigo: [
      'text-white [--btn-bg:var(--color-indigo-500)]',
      '[--btn-icon:var(--color-indigo-300)] data-active:[--btn-icon:var(--color-indigo-200)] data-hover:[--btn-icon:var(--color-indigo-200)]',
    ],
    cyan: [
      'text-cyan-950 [--btn-bg:var(--color-cyan-300)]',
      '[--btn-icon:var(--color-cyan-500)]',
    ],
    red: [
      'text-white [--btn-bg:var(--color-red-600)]',
      '[--btn-icon:var(--color-red-300)] data-active:[--btn-icon:var(--color-red-200)] data-hover:[--btn-icon:var(--color-red-200)]',
    ],
    orange: [
      'text-white [--btn-bg:var(--color-orange-500)]',
      '[--btn-icon:var(--color-orange-300)] data-active:[--btn-icon:var(--color-orange-200)] data-hover:[--btn-icon:var(--color-orange-200)]',
    ],
    amber: [
      'text-amber-950 [--btn-bg:var(--color-amber-400)]',
      '[--btn-icon:var(--color-amber-600)]',
    ],
    yellow: [
      'text-yellow-950 [--btn-bg:var(--color-yellow-300)]',
      '[--btn-icon:var(--color-yellow-600)] data-active:[--btn-icon:var(--color-yellow-700)] data-hover:[--btn-icon:var(--color-yellow-700)]',
    ],
    lime: [
      'text-lime-950 [--btn-bg:var(--color-lime-300)]',
      '[--btn-icon:var(--color-lime-600)] data-active:[--btn-icon:var(--color-lime-700)] data-hover:[--btn-icon:var(--color-lime-700)]',
    ],
    green: [
      'text-white [--btn-bg:var(--color-green-600)]',
      '[--btn-icon:var(--color-white)]/60 data-active:[--btn-icon:var(--color-white)]/80 data-hover:[--btn-icon:var(--color-white)]/80',
    ],
    emerald: [
      'text-white [--btn-bg:var(--color-emerald-600)]',
      '[--btn-icon:var(--color-white)]/60 data-active:[--btn-icon:var(--color-white)]/80 data-hover:[--btn-icon:var(--color-white)]/80',
    ],
    teal: [
      'text-white [--btn-bg:var(--color-teal-600)]',
      '[--btn-icon:var(--color-white)]/60 data-active:[--btn-icon:var(--color-white)]/80 data-hover:[--btn-icon:var(--color-white)]/80',
    ],
    sky: [
      'text-white [--btn-bg:var(--color-sky-500)]',
      '[--btn-icon:var(--color-white)]/60 data-active:[--btn-icon:var(--color-white)]/80 data-hover:[--btn-icon:var(--color-white)]/80',
    ],
    blue: [
      'text-white [--btn-bg:var(--color-blue-600)]',
      '[--btn-icon:var(--color-blue-400)] data-active:[--btn-icon:var(--color-blue-300)] data-hover:[--btn-icon:var(--color-blue-300)]',
    ],
    violet: [
      'text-white [--btn-bg:var(--color-violet-500)]',
      '[--btn-icon:var(--color-violet-300)] data-active:[--btn-icon:var(--color-violet-200)] data-hover:[--btn-icon:var(--color-violet-200)]',
    ],
    purple: [
      'text-white [--btn-bg:var(--color-purple-500)]',
      '[--btn-icon:var(--color-purple-300)] data-active:[--btn-icon:var(--color-purple-200)] data-hover:[--btn-icon:var(--color-purple-200)]',
    ],
    fuchsia: [
      'text-white [--btn-bg:var(--color-fuchsia-500)]',
      '[--btn-icon:var(--color-fuchsia-300)] data-active:[--btn-icon:var(--color-fuchsia-200)] data-hover:[--btn-icon:var(--color-fuchsia-200)]',
    ],
    pink: [
      'text-white [--btn-bg:var(--color-pink-500)]',
      '[--btn-icon:var(--color-pink-300)] data-active:[--btn-icon:var(--color-pink-200)] data-hover:[--btn-icon:var(--color-pink-200)]',
    ],
    rose: [
      'text-white [--btn-bg:var(--color-rose-500)]',
      '[--btn-icon:var(--color-rose-300)] data-active:[--btn-icon:var(--color-rose-200)] data-hover:[--btn-icon:var(--color-rose-200)]',
    ],
  },
}

export const Button = forwardRef(function Button(
  { variant, size = 'md', pill = false, color, outline, plain, className, children, ...props },
  ref
) {
  let classes

  if (variant) {
    // 新 variant ベース
    const shape = pill ? 'rounded-full' : 'rounded-lg'
    const variantStyle = variantClasses[variant]
    if (!variantStyle) {
      console.warn(`[Button] Unknown variant: ${variant}. Use one of: ${Object.keys(variantClasses).join(', ')}`)
    }
    classes = clsx(
      className,
      styles.base,
      shape,
      sizeClasses[size] || sizeClasses.md,
      variantStyle
    )
  } else {
    // 既存 color/outline/plain（後方互換）
    classes = clsx(
      className,
      styles.legacyBase,
      outline
        ? styles.outline
        : plain
          ? styles.plain
          : clsx(styles.solid, styles.colors[color ?? 'dark/zinc'])
    )
  }

  return typeof props.href === 'string' ? (
    <Link {...props} className={classes} ref={ref}>
      <TouchTarget>{children}</TouchTarget>
    </Link>
  ) : (
    <Headless.Button {...props} className={clsx(classes, 'cursor-default')} ref={ref}>
      <TouchTarget>{children}</TouchTarget>
    </Headless.Button>
  )
})

/**
 * Expand the hit area to at least 44×44px on touch devices
 */
export function TouchTarget({ children }) {
  return (
    <>
      <span
        className="absolute top-1/2 left-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 pointer-fine:hidden"
        aria-hidden="true"
      />
      {children}
    </>
  )
}
