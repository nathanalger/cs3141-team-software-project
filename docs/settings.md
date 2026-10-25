# Adding settings

Settings are declared in `src/types/settings.ts`. The schema supplies category and
subcategory navigation, setting labels and descriptions, default values, and the
type information used by both the Settings page and persistence validation.

## Add a setting

Add the setting to the appropriate subcategory's `settings` array in
`SETTINGS_SCHEMA`:

```ts
{
   name: 'show-sender',
   displayName: 'Show sender name',
   description: 'Show the sender name in each inbox row.',
   type: 'boolean',
   defaultValue: true,
}
```

Setting names should be kebab-case and unique within their subcategory. The
category, subcategory, and setting names form the persisted key. For example,
the key above is `inbox.message-list.show-sender`.

The built-in setting types are:

- `boolean`: use `defaultValue: true` or `false`; rendered as a switch.
- `text`: use a string `defaultValue`; an optional `placeholder` is supported.
- `color`: use a `#RRGGBB` string `defaultValue`; values must start with `#`
  and contain exactly six hexadecimal digits. Invalid input resets to the
  default color.
- `number`: use a numeric `defaultValue`; optional `min`, `max`, and `step`
  constraints are supported and validated before saving.

The Settings page automatically renders the control and persists changes.
To make a preference affect application behavior, read it through
`useSettings()` in the relevant component:

```tsx
import { getSettingKey } from '../../../types/settings';
import { useSettings } from '../hooks/useSettings';

const { values } = useSettings();
const showSender = values[getSettingKey('inbox', 'message-list', 'show-sender')] !== false;
```

Use the default as a fallback when reading a value so the component behaves
correctly while settings are loading or when rendered without the provider.
The `SettingsProvider` loads and persists values through Electron. Do not write
to `settings.json` from the renderer.

## Add a subcategory

Add a `SettingsSubcategory` object to the desired category's `subcategories`
array. Give it a stable `name`, user-facing `displayName`, `description`, and a
`settings` array. The Settings overview links to it using the
`/settings/{category}#{subcategory}` URL. The category page uses that hash to
scroll to and highlight the matching section.

## Add a category

Add a `SettingsCategory` to `SETTINGS_SCHEMA` with a stable `name`,
`displayName`, `description`, an icon identifier, and its subcategories.
Category routes are generated from the schema at `/settings/{category}`.

The icon identifier must be one of the values in `SettingsCategory['icon']`.
To add a new icon identifier, extend that union in `src/types/settings.ts` and
add its icon component to the category icon mapping in
`src/renderer/src/architecture/FunctionBar.tsx`. Existing categories are
automatically added to the function bar and the settings overview.

## Add a setting type

Adding a new value type requires more than adding it to the schema:

1. Extend `SettingValue` and add a corresponding setting definition in
   `src/types/settings.ts`.
2. Add a control and appropriate validation in `SettingControl` in
   `src/renderer/src/pages/Settings.tsx`.
3. Update value validation and persistence in `src/main/settings.ts`.
4. Use the new value from the relevant application component.

Keep settings values serializable as JSON. The main process only accepts keys
present in `SETTINGS_SCHEMA` and validates their values before persisting them
in the Electron user-data `settings.json` file.

The Appearance > Theme category contains the application primary color
preference. The active Joy theme uses that valid hex value for the primary
palette in light and dark mode. Invalid or missing values fall back to
`DEFAULT_PRIMARY_COLOR` (`#0B6BCB`).
