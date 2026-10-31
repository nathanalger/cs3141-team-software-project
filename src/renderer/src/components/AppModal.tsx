import { Box, Modal, Typography } from '@mui/joy';
import type { ReactNode } from 'react';

const AppModal = ({
   open,
   onClose,
   title,
   children,
   actions,
}: {
   open: boolean;
   onClose: () => void;
   title: string;
   children: ReactNode;
   actions?: ReactNode;
}) => (
   <Modal open={open} onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Box
         sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            width: 'min(100%, 440px)',
            p: 3,
            borderRadius: 8,
            border: (t) => `1px solid ${t.palette.divider}`,
            bgcolor: (t) => t.palette.background.popup,
            outline: 'none',
         }}
      >
         <Typography level="h3">{title}</Typography>
         <Box>{children}</Box>
         {actions && <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>{actions}</Box>}
      </Box>
   </Modal>
);

export default AppModal;
