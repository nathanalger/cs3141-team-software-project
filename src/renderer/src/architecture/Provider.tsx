import { CssBaseline, CssVarsProvider, extendTheme } from '@mui/joy'
import type { ReactNode } from 'react'

const theme = extendTheme({
   colorSchemes: {
      light: {
         palette: {
            // light palette customizations
            // etc color and stuff
         },
      },
      dark: {
         palette: {
            // dark palette customizations
         },
      },
   },
})

const Provider = ({ children }: { children: ReactNode }) => {
   return (
      <CssVarsProvider theme={theme} defaultMode="system">
         <CssBaseline />
         {children}
      </CssVarsProvider>
   )
}

export default Provider
