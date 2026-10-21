import { Box } from '@mui/joy';
import CookieButton from '../components/CookieButton';
import Inbox from '@mui/icons-material/Inbox';
import Settings from '@mui/icons-material/Settings';
import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
   { slug: '/', label: 'Inbox', icon: <Inbox /> },
   { slug: '/settings', label: 'Settings', icon: <Settings /> },
];

const NavBar = () => {
   const location = useLocation();
   const navigate = useNavigate();

   return (
      <Box
         sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            height: '100%',
            px: 2,
            gap: 1,
         }}
      >
         {navItems.map(({ slug, label, icon }) => (
            <CookieButton
               key={slug}
               icon={icon}
               onClick={() => navigate(slug)}
               color={location.pathname === slug ? 'primary' : 'neutral'}
               sx={{
                  bgcolor: (t) =>
                     location.pathname === slug
                        ? `color-mix(in srgb, ${t.palette.primary[500]} 20%, transparent)`
                        : undefined,
                  WebkitAppRegion: 'no-drag',
               }}
            >
               {label}
            </CookieButton>
         ))}
      </Box>
   );
};

export default NavBar;
