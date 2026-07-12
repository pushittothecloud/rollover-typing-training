import { EditorContent, useEditor } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import { motion, AnimatePresence } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useAppStore } from '../../state/appStore'

export function WritingEditor() {
  const addTextlet = useAppStore((state) => state.addTextlet)
  const activePrompt = useAppStore((state) => state.activePrompt)
  const clearPrompt = useAppStore((state) => state.clearPrompt)
  const [selectedSnippet, setSelectedSnippet] = useState('')
  const [promptResponse, setPromptResponse] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder:
          'Start writing in silence. Highlight any sentence to detach it into a textlet.',
      }),
    ],
    content: '<p></p>',
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none min-h-[48vh] px-4 py-5 text-[1.04rem] leading-8 text-stone-100 outline-none',
      },
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      const { from, to } = currentEditor.state.selection
      const text = currentEditor.state.doc.textBetween(from, to, ' ')
      setSelectedSnippet(text.trim())
    },
  })

  const promptReady = useMemo(() => promptResponse.trim().length >= 20, [promptResponse])

  if (!editor) {
    return null
  }

  const detachSelection = () => {
    if (!selectedSnippet) {
      return
    }

    addTextlet(selectedSnippet)
    editor.chain().focus().deleteSelection().run()
    setSelectedSnippet('')
  }

  return (
    <div className="relative h-full rounded-2xl border border-stone-700/70 bg-stone-900/80 shadow-2xl shadow-black/30">
      <AnimatePresence>
        {selectedSnippet && (
          <motion.button
            type="button"
            onClick={detachSelection}
            className="absolute right-4 top-4 z-10 rounded-md border border-amber-500/60 bg-amber-500/15 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-amber-100"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Detach selection
          </motion.button>
        )}
      </AnimatePresence>

      <EditorContent editor={editor} />

      <AnimatePresence>
        {activePrompt && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="absolute bottom-4 left-4 right-4 rounded-xl border border-amber-400/45 bg-black/70 p-4 backdrop-blur"
          >
            <p className="text-sm text-amber-50">{activePrompt}</p>
            <textarea
              value={promptResponse}
              onChange={(event) => setPromptResponse(event.target.value)}
              className="mt-3 h-20 w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none focus:border-amber-400"
              placeholder="Type your constrained response to unlock and continue..."
            />
            <button
              type="button"
              disabled={!promptReady}
              onClick={() => {
                clearPrompt()
                setPromptResponse('')
              }}
              className="mt-2 rounded-md border border-amber-500/50 bg-amber-500/15 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-amber-100 disabled:opacity-45"
            >
              Continue drafting
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
