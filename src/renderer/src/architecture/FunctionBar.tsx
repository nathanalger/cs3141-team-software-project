import { Help, Contacts, FormatPaint, Person, Inbox, Settings, BugReport } from '@mui/icons-material';
import { Box, Button } from '@mui/joy';
import { useEffect, useState } from 'react';
import { NAV_THICKNESS } from './MainWrapper';
import { useLocation, useNavigate } from 'react-router-dom';
import { SETTINGS_SCHEMA } from '../../../types/settings';
import type { ReactNode } from 'react';

const SIDEBAR_EXPANDED_WIDTH = 220;
type SidebarItem = {
   slug: string;
   label: string;
   icon: ReactNode;
   children?: { slug: string; label: string }[];
};

/**
 * These are samples, this doesnt do anything right now
 */
const InboxSidebarItems: { slug: string; items: SidebarItem[] } = {
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

const SettingsSidebarItems: { slug: string; items: SidebarItem[] } = {
   slug: '/settings',
   items: [
      {
         slug: '/settings',
         label: 'All Settings',
         icon: <Settings />,
      },
      ...SETTINGS_SCHEMA.map((category) => ({
         slug: `/settings/${category.name}`,
         label: category.displayName,
         icon:
            category.icon === 'inbox' ? (
               <Inbox />
            ) : category.icon === 'palette' ? (
               <FormatPaint />
            ) : category.icon === 'person' ? (
               <Person />
            ) : category.icon === 'debug' ? (
               <BugReport />
            ) : (
               <Settings />
            ),
         children: category.subcategories.map((subcategory) => ({
            slug: `/settings/${category.name}/${subcategory.name}`,
            label: subcategory.displayName,
         })),
      })),
   ],
};

const AccountSidebarItems: { slug: string; items: SidebarItem[] } = {
   slug: '/accounts',
   items: [
      {
         slug: '/accounts',
         label: 'Test account setup',
         icon: <Person />,
      },
   ],
};

const collection = [InboxSidebarItems, AccountSidebarItems, SettingsSidebarItems];

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
            {displayedCollection.items.flatMap(({ slug, label, icon, children }) => {
               const isActive = location.pathname === slug;

               const isExpanded = children?.length && location.pathname.startsWith(`${slug}/`);
               return [
                  <Button
                     key={slug}
                     startDecorator={icon}
                     variant="plain"
                     color={isActive || isExpanded ? 'primary' : 'neutral'}
                     onClick={() => navigate(slug)}
                     sx={{
                        justifyContent: 'flex-start',
                        flexShrink: 0,
                        borderRadius: 0,
                        minHeight: 44,
                        px: 2.95,
                        whiteSpace: 'nowrap',
                        bgcolor: (t) =>
                           isActive || isExpanded
                              ? `color-mix(in srgb, ${t.palette.primary[500]} 20%, transparent)`
                              : undefined,
                     }}
                  >
                     <Box
                        component="span"
                        sx={{
                           opacity: 0,
                           transition: 'opacity 120ms ease',
                           '.left-sidebar:hover &': { opacity: 1 },
                           '.left-sidebar:focus-within &': { opacity: 1 },
                        }}
                     >
                        {label}
                     </Box>
                  </Button>,
                  ...(isExpanded
                     ? children.map((child) => (
                          <Button
                             key={child.slug}
                             variant="plain"
                             color={location.pathname === child.slug ? 'primary' : 'neutral'}
                             onClick={() => navigate(child.slug)}
                             sx={{
                                justifyContent: 'flex-start',
                                flexShrink: 0,
                                borderRadius: 0,
                                minHeight: 38,
                                pl: 6,
                                whiteSpace: 'nowrap',
                             }}
                          >
                             <Box
                                component="span"
                                sx={{
                                   opacity: 0,
                                   transition: 'opacity 120ms ease',
                                   '.left-sidebar:hover &': { opacity: 1 },
                                   '.left-sidebar:focus-within &': { opacity: 1 },
                                }}
                             >
                                {child.label}
                             </Box>
                          </Button>
                       ))
                     : []),
               ];
            })}
         </Box>
      </Box>
   );
};

export default FunctionBar;
