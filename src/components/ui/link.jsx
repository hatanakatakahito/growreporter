import * as Headless from '@headlessui/react'
import React, { forwardRef } from 'react'
import { Link as RouterLink } from 'react-router-dom'

export const Link = forwardRef(function Link({ href, ...props }, ref) {
  // Internal links use React Router
  if (href && href.startsWith('/')) {
    return (
      <Headless.DataInteractive>
        <RouterLink to={href} {...props} ref={ref} />
      </Headless.DataInteractive>
    )
  }

  // External links or anchor-only use <a>
  return (
    <Headless.DataInteractive>
      <a href={href} {...props} ref={ref} />
    </Headless.DataInteractive>
  )
})
