import { Help, Contacts, FormatPaint, Person, Inbox, Settings } from '@mui/icons-material';
import { Box, Button } from '@mui/joy';
import { useEffect, useState } from 'react';
import { NAV_THICKNESS } from './MainWrapper';
import { useLocation, useNavigate } from 'react-router-dom';

const SIDEBAR_EXPANDED_WIDTH = 220;

/**
 * These are samples, this doesnt do anything right now
 */
const InboxSidebarItems = {
   slug: '/inbox',
   items: [
      {
         slug: '/inbox',
         label: 'Inbox',
         icon: <Inbox />,
      },
      {
         slug: '/inbox/contacts',
         label: 'Contacts',
         icon: <Contacts />,
      },
      {
         slug: '/inbox/help',
         label: 'Help',
         icon: <Help />,
      },
   ],
};

const SettingsSidebarItems = {
   slug: '/settings',
   items: [
      {
         slug: '/settings',
         label: 'All Settings',
         icon: <Settings />,
      },
      {
         slug: '/settings/personalization',
         label: 'Personalization',
         icon: <FormatPaint />,
      },
      {
         slug: '/settings/accounts',
         label: 'Accounts',
         icon: <Person />,
      },
   ],
};

const collection = [InboxSidebarItems, SettingsSidebarItems];

const FunctionBar = () => {
   const location = useLocation();
   const navigate = useNavigate();

   const activeCollection = collection.findLast(
      (item) => location.pathname === item.slug || location.pathname.startsWith(`${item.slug}/`),
   );
   const [displayedCollection, setDisplayedCollection] = useState(() => activeCollection ?? InboxSidebarItems);
   const [isVisible, setIsVisible] = useState(true);

   useEffect(() => {
      if (!activeCollection || activeCollection.slug === displayedCollection.slug) return;

      // This is generally a bad idea, but I like how it looks.
      // - Nathan

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVisible(false);
      const timeoutId = window.setTimeout(() => {
         setDisplayedCollection(activeCollection);
         setIsVisible(true);
      }, 80);

      return () => window.clearTimeout(timeoutId);
   }, [activeCollection, displayedCollection.slug]);

   return (
      <Box
         className="left-sidebar"
         sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            width: NAV_THICKNESS,
            flexShrink: 0,
            overflow: 'hidden',
            py: 1,
            transition: 'width 180ms ease',
            '&:hover, &:focus-within': {
               width: SIDEBAR_EXPANDED_WIDTH,
            },
         }}
      >
         <Box
            sx={{
               display: 'flex',
               flexDirection: 'column',
               gap: 1,
               opacity: isVisible ? 1 : 0,
               transition: 'opacity 120ms ease',
               pointerEvents: isVisible ? 'auto' : 'none',
            }}
         >
            {displayedCollection.items.map(({ slug, label, icon }) => {
               const isActive = location.pathname === slug;

               return (
                  <Button
                     key={slug}
                     startDecorator={icon}
                     variant="plain"
                     color={isActive ? 'primary' : 'neutral'}
                     onClick={() => navigate(slug)}
                     sx={{
                        justifyContent: 'flex-start',
                        flexShrink: 0,
                        borderRadius: 0,
                        minHeight: 44,
                        px: 1.5 + 0.7,
                        whiteSpace: 'nowrap',
                        bgcolor: (t) =>
                           isActive ? `color-mix(in srgb, ${t.palette.primary[500]} 20%, transparent)` : undefined,
                     }}
                  >
                     <Box
                        component="span"
                        sx={{
                           opacity: 0,
                           transition: 'opacity 120ms ease',
                           '.left-sidebar:hover &': {
                              opacity: 1,
                           },
                           '.left-sidebar:focus-within &': {
                              opacity: 1,
                           },
                        }}
                     >
                        {label}
                     </Box>
                  </Button>
               );
            })}
         </Box>
      </Box>
   );
};

export default FunctionBar;
