declare module 'sonner' {
  import * as React from 'react'

  export interface ToasterProps {
    position?:
      | 'top-left'
      | 'top-center'
      | 'top-right'
      | 'bottom-left'
      | 'bottom-center'
      | 'bottom-right'
    richColors?: boolean
    closeButton?: boolean
    duration?: number
  }

  export const Toaster: React.FC<ToasterProps>

  export type ToastOptions = {
    description?: string
    duration?: number
  }

  export function toast(message: string, options?: ToastOptions): void
  export namespace toast {
    function success(message: string, options?: ToastOptions): void
    function error(message: string, options?: ToastOptions): void
    function info(message: string, options?: ToastOptions): void
    function warning(message: string, options?: ToastOptions): void
  }
}


