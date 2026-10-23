export {}

declare global {
   interface Window {
      desktop: {
         platform: NodeJS.Platform
         minimize: () => Promise<void>
         toggleMaximize: () => Promise<boolean>
         close: () => Promise<void>
         isMaximized: () => Promise<boolean>
         onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void
      }
   }
}
