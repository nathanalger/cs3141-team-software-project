import { Box } from '@mui/joy';
import CookieButton from '../components/CookieButton';
import Inbox from '@mui/icons-material/Inbox';
import Settings from '@mui/icons-material/Settings';
import Person from '@mui/icons-material/Person';
import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
   { slug: '/inbox', label: 'Inbox', icon: <Inbox /> },
   { slug: '/accounts', label: 'Accounts', icon: <Person /> },
   { slug: '/settings', label: 'Settings', icon: <Settings /> },
];

const isSlugActive = (pathname: string, slug: string) => pathname === slug || pathname.startsWith(`${slug}/`);

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
               color={isSlugActive(location.pathname, slug) ? 'primary' : 'neutral'}
               sx={{
                  bgcolor: (t) =>
                     isSlugActive(location.pathname, slug)
                        ? `color-mix(in srgb, ${t.palette.primary[500]} 20%, transparent)`
                        : 'transparent',
                  WebkitAppRegion: 'no-drag',
                  transition: 'background-color 80ms ease-in-out',
               }}
            >
               {label}
            </CookieButton>
         ))}
      </Box>
   );
};

export default NavBar;
