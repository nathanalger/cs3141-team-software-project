import { FormatBold, FormatItalic, FormatUnderlined } from '@mui/icons-material';
import { Box, IconButton, Sheet, Typography } from '@mui/joy';
import { $generateHtmlFromNodes } from '@lexical/html';
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { $getRoot, defineExtension, FORMAT_TEXT_COMMAND, type EditorState, type LexicalEditor } from 'lexical';
import { useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

type EmailEditorProps = {
   onChange: (text: string, html: string) => void;
};

const formats = [
   { label: 'Bold', format: 'bold' as const, icon: <FormatBold /> },
   { label: 'Italic', format: 'italic' as const, icon: <FormatItalic /> },
   { label: 'Underline', format: 'underline' as const, icon: <FormatUnderlined /> },
];

const emailEditorExtension = defineExtension({
   name: 'EmailComposer',
});

const EditorToolbar = () => {
   const [editor] = useLexicalComposerContext();

   return (
      <Box
         role="toolbar"
         aria-label="Text formatting"
         sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.75,
            bgcolor: 'background.level1',
            borderBottom: '1px solid',
            borderColor: 'divider',
         }}
      >
         {formats.map(({ label, format, icon }) => (
            <IconButton
               key={format}
               type="button"
               size="sm"
               variant="plain"
               color="neutral"
               aria-label={label}
               title={label}
               onMouseDown={(event) => event.preventDefault()}
               onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)}
            >
               {icon}
            </IconButton>
         ))}
      </Box>
   );
};

const EditorChangePlugin = ({ onChange }: { onChange: EmailEditorProps['onChange'] }) => {
   const handleChange = useCallback(
      (editorState: EditorState, editor: LexicalEditor) => {
         editorState.read(() => {
            onChange($getRoot().getTextContent(), $generateHtmlFromNodes(editor));
         });
      },
      [onChange],
   );

   return <OnChangePlugin onChange={handleChange} />;
};

const EmailEditor = ({ onChange }: EmailEditorProps) => {
   return (
      <LexicalExtensionComposer extension={emailEditorExtension} contentEditable={null}>
         <Sheet
            variant="outlined"
            sx={{
               overflow: 'hidden',
               borderColor: 'neutral.outlinedBorder',
               borderRadius: 'sm',
               bgcolor: 'background.surface',
               transition: 'border-color 120ms ease, box-shadow 120ms ease',
               '&:focus-within': {
                  borderColor: 'primary.500',
                  boxShadow: '0 0 0 2px var(--joy-palette-primary-100)',
               },
            }}
         >
            <EditorToolbar />
            <Box
               sx={{
                  position: 'relative',
                  px: 1.5,
                  py: 1.25,
                  minHeight: 230,
                  '& [contenteditable="true"]': {
                     minHeight: 200,
                     outline: 'none',
                     color: 'text.primary',
                     fontFamily: 'inherit',
                     fontSize: 'var(--joy-fontSize-md)',
                     lineHeight: 'var(--joy-lineHeight-md)',
                     overflowWrap: 'anywhere',
                     '& p': { my: 0, mb: 1 },
                     '& p:last-child': { mb: 0 },
                  },
               }}
            >
               <RichTextPlugin
                  contentEditable={
                     <ContentEditable
                        aria-label="Message body"
                        placeholder={null}
                        className="email-editor-content"
                     />
                  }
                  placeholder={
                     <Typography
                        level="body-md"
                        color="neutral"
                        sx={{
                           position: 'absolute',
                           top: 10,
                           left: 12,
                           pointerEvents: 'none',
                           opacity: 0.65,
                        }}
                     >
                        Write your message...
                     </Typography>
                  }
                  ErrorBoundary={LexicalErrorBoundary}
               />
               <HistoryPlugin />
               <EditorChangePlugin onChange={onChange} />
            </Box>
         </Sheet>
      </LexicalExtensionComposer>
   );
};

export default EmailEditor;
