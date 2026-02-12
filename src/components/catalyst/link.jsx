/**
 * Catalyst Link component integrated with React Router
 */

import * as Headless from '@headlessui/react'
import React, { forwardRef } from 'react'
import { Link as RouterLink } from 'react-router-dom'

export const Link = forwardRef(function Link({ href, to, ...props }, ref) {
  // Use React Router Link for internal navigation
  const linkTo = to || href
  
  return (
    <Headless.DataInteractive>
      <RouterLink to={linkTo} {...props} ref={ref} />
    </Headless.DataInteractive>
  )
})
