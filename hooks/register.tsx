import type { Register } from 'claude-code'

import { hasCode, split } from './split'
import type { Segment } from './split'

export const register: Register = on => {
  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => {
    if (e.surface !== 'terminal') return next(e)

    const segments = split(e.props.text)
    if (!hasCode(segments)) return next(e)

    const { Box, Button, Markdown, Text } = $.ui.resolve(e)

    // Each code box's copy button, numbered in reply order so every Button has its own key.
    let boxCount = 0

    // Code drawn by the engine's own markdown renderer, so its colours follow the terminal
    // theme. Inside a quote it is drawn quoted (italic), and the renderer's own bars are
    // shifted out of the box's clipped area. A copy button sits on the top border and puts
    // the block's source on the clipboard as written, with no border or padding.
    const codeBox = (s: { source: string; language?: string }, depth = 0) => {
      const prefix = '> '.repeat(depth)
      const fence = ['```' + (s.language ?? ''), ...s.source.split('\n'), '```'].map(l => prefix + l).join('\n')
      const key = `copy:${boxCount++}`
      return (
        <Box flexGrow={1}>
          <Box borderStyle="single" borderColor="inactive" paddingX={1} flexGrow={1}>
            <Box overflow="hidden" flexGrow={1}>
              <Box marginLeft={-2 * depth} flexGrow={1}>
                <Markdown text={fence} />
              </Box>
            </Box>
          </Box>
          <Box position="absolute" top={0} right={2}>
            <Button
              key={key}
              label="copy"
              plain
              dimColor
              onPress={async press => {
                const result = await $.ui.copy({ text: s.source, surface: press.surface })
                $.ui.toast(result.isCopied ? 'Copied code block' : `Copy failed: ${result.reason}`)
              }}
            />
          </Box>
        </Box>
      )
    }

    // Quote bars drawn by the engine's own quote rendering, one per row, clipped to the
    // bar and its space so they match the bars beside quoted prose. The renderer drops a
    // final blank row, so one extra is asked for and the box clips to `rows`.
    const bars = (rows: number, depth: number) => (
      <Box width={2 * depth} height={rows} flexShrink={0} overflow="hidden">
        <Markdown text={Array.from({ length: rows + 1 }, () => `${'> '.repeat(depth)} `).join('\\\n')} />
      </Box>
    )

    // Rows a code box takes: its source lines, wrapped to the room left, plus two border rows.
    const codeRows = (source: string, depth: number) => {
      const room = Math.max(1, (e.viewport?.columns ?? 80) - 2 - 2 * depth - 4)
      return source.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / room)), 0) + 2
    }

    // Inside a quote, prose goes back to the engine's own quote drawing (bar and italics),
    // and a code block gets the same box as outside, behind the same bar.
    const quoted = (inner: Segment[], depth: number): JSX.Element => (
      <Box flexDirection="column">
        {inner.flatMap((s, i) => {
          const spacer = i > 0 ? [bars(1, depth)] : []
          if (s.kind === 'prose') {
            const prefix = '> '.repeat(depth)
            return [...spacer, <Markdown text={s.text.split('\n').map(l => prefix + l).join('\n')} />]
          }
          if (s.kind === 'code') {
            return [
              ...spacer,
              <Box flexDirection="row">
                {bars(codeRows(s.source, depth), depth)}
                <Box flexGrow={1}>{codeBox(s, depth)}</Box>
              </Box>,
            ]
          }
          return [...spacer, quoted(s.segments, depth + 1)]
        })}
      </Box>
    )

    // The engine's own row: a two-column gutter holding the reply's opening bullet.
    return (
      <Box flexDirection="row">
        <Box width={2} flexShrink={0}>
          <Text color="text">{e.props.isFirstOfReply ? '●' : ' '}</Text>
        </Box>
        <Box flexDirection="column" gap={1} flexGrow={1}>
          {segments.map(s =>
            s.kind === 'prose' ? <Markdown text={s.text} /> : s.kind === 'code' ? codeBox(s) : quoted(s.segments, 1),
          )}
        </Box>
      </Box>
    )
  })
}
