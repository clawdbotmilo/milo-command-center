'use client'

import { useMemo } from 'react'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

/**
 * Simple markdown renderer supporting basic formatting:
 * - Headings (#, ##, ###)
 * - Bold (**text**)
 * - Italic (*text* or _text_)
 * - Inline code (`code`)
 * - Code blocks (```...```)
 * - Unordered lists (-, *)
 * - Ordered lists (1., 2.)
 * - Checkboxes (- [ ] or - [x])
 * - Links ([text](url))
 */
function parseMarkdown(markdown: string): string {
  // Store code blocks temporarily to prevent processing inside them
  const codeBlocks: string[] = []
  let processed = markdown

  // Extract code blocks
  processed = processed.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const index = codeBlocks.length
    const escapedCode = escapeHtml(code.trim())
    codeBlocks.push(
      `<pre class="bg-gray-800 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm my-3"><code class="language-${lang || 'text'}">${escapedCode}</code></pre>`
    )
    return `__CODE_BLOCK_${index}__`
  })

  // Extract inline code
  const inlineCode: string[] = []
  processed = processed.replace(/`([^`]+)`/g, (_, code) => {
    const index = inlineCode.length
    inlineCode.push(
      `<code class="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">${escapeHtml(code)}</code>`
    )
    return `__INLINE_CODE_${index}__`
  })

  // Split into lines for block-level processing
  const lines = processed.split('\n')
  const outputLines: string[] = []
  let inList = false
  let listType: 'ul' | 'ol' | null = null

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // Headings
    if (line.match(/^### /)) {
      closeList()
      const text = processInline(line.slice(4))
      outputLines.push(`<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">${text}</h3>`)
      continue
    }
    if (line.match(/^## /)) {
      closeList()
      const text = processInline(line.slice(3))
      outputLines.push(`<h2 class="text-xl font-bold text-gray-900 mt-6 mb-3 pb-2 border-b border-gray-200">${text}</h2>`)
      continue
    }
    if (line.match(/^# /)) {
      closeList()
      const text = processInline(line.slice(2))
      outputLines.push(`<h1 class="text-2xl font-bold text-gray-900 mt-6 mb-4">${text}</h1>`)
      continue
    }

    // Checkbox items
    const checkboxMatch = line.match(/^(\s*)[-*]\s*\[([ x])\]\s*(.*)/)
    if (checkboxMatch) {
      if (!inList || listType !== 'ul') {
        closeList()
        outputLines.push('<ul class="space-y-1 my-2">')
        inList = true
        listType = 'ul'
      }
      const [, indent, checked, text] = checkboxMatch
      const isChecked = checked === 'x'
      const indentLevel = Math.floor(indent.length / 2)
      const ml = indentLevel > 0 ? `ml-${indentLevel * 4}` : ''
      outputLines.push(
        `<li class="flex items-start gap-2 ${ml}">` +
        `<span class="${isChecked ? 'text-green-600' : 'text-gray-400'}">${isChecked ? '☑' : '☐'}</span>` +
        `<span class="${isChecked ? 'text-gray-500 line-through' : 'text-gray-700'}">${processInline(text)}</span>` +
        `</li>`
      )
      continue
    }

    // Unordered list items
    const ulMatch = line.match(/^(\s*)[-*]\s+(.*)/)
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        closeList()
        outputLines.push('<ul class="list-disc list-inside space-y-1 my-2 text-gray-700">')
        inList = true
        listType = 'ul'
      }
      const [, indent, text] = ulMatch
      const indentLevel = Math.floor(indent.length / 2)
      const ml = indentLevel > 0 ? `ml-${indentLevel * 4}` : ''
      outputLines.push(`<li class="${ml}">${processInline(text)}</li>`)
      continue
    }

    // Ordered list items
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/)
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        closeList()
        outputLines.push('<ol class="list-decimal list-inside space-y-1 my-2 text-gray-700">')
        inList = true
        listType = 'ol'
      }
      const [, indent, , text] = olMatch
      const indentLevel = Math.floor(indent.length / 2)
      const ml = indentLevel > 0 ? `ml-${indentLevel * 4}` : ''
      outputLines.push(`<li class="${ml}">${processInline(text)}</li>`)
      continue
    }

    // Empty line or paragraph
    if (line.trim() === '') {
      closeList()
      outputLines.push('')
    } else {
      closeList()
      outputLines.push(`<p class="text-gray-700 my-2">${processInline(line)}</p>`)
    }
  }

  closeList()

  function closeList() {
    if (inList) {
      outputLines.push(listType === 'ul' ? '</ul>' : '</ol>')
      inList = false
      listType = null
    }
  }

  // Join and restore code blocks
  let result = outputLines.join('\n')

  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    result = result.replace(`__CODE_BLOCK_${i}__`, block)
  })

  // Restore inline code
  inlineCode.forEach((code, i) => {
    result = result.replace(`__INLINE_CODE_${i}__`, code)
  })

  return result
}

/**
 * Process inline elements: bold, italic, links
 */
function processInline(text: string): string {
  // Links [text](url)
  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>'
  )

  // Bold **text** or __text__
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
  text = text.replace(/__([^_]+)__/g, '<strong class="font-semibold text-gray-900">$1</strong>')

  // Italic *text* or _text_ (not inside words)
  text = text.replace(/(?<![a-zA-Z])\*([^*]+)\*(?![a-zA-Z])/g, '<em class="italic">$1</em>')
  text = text.replace(/(?<![a-zA-Z])_([^_]+)_(?![a-zA-Z])/g, '<em class="italic">$1</em>')

  return text
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  const html = useMemo(() => parseMarkdown(content), [content])

  return (
    <div
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
