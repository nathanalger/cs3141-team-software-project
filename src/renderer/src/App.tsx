import { Box, Typography } from '@mui/joy'
import Provider from './architecture/Provider'

function App() {
   return (
      <Provider>
         <Box
            sx={{
               p: 2,
            }}
         >
            <Box
               sx={{
                  p: 2,
                  background: (t) => t.palette.background.surface,
               }}
            >
               <Typography>Light Mode/Dark Mode works (based on system preferences)</Typography>
            </Box>
         </Box>
      </Provider>
   )
}

export default App
