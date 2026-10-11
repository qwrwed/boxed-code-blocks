export type Segment =
  | { kind: 'prose'; text: string }
  | { kind: 'code'; source: string; language?: string }
  | { kind: 'quote'; segments: Segment[] }

const OPEN = /^(\s*)(`{3,}|~{3,})\s*([^\s`]*)[^`]*$/
const QUOTED = /^\s{0,3}>/

export const hasCode = (segments: Segment[]): boolean =>
  segments.some(s => s.kind === 'code' || (s.kind === 'quote' && hasCode(s.segments)))

// Splits markdown into prose, fenced code blocks, and quotes that hold a fenced code block.
// An unclosed fence runs to the end. A quote with no fence stays prose.
export function split(text: string): Segment[] {
  const lines = text.split('\n')
  const out: Segment[] = []
  let prose: string[] = []

  const flushProse = () => {
    const joined = prose.join('\n')
    if (joined.trim() !== '') out.push({ kind: 'prose', text: joined.replace(/^\n+|\n+$/g, '') })
    prose = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''

    if (QUOTED.test(line)) {
      let j = i
      const quoted: string[] = []
      for (; j < lines.length && QUOTED.test(lines[j] ?? ''); j++) {
        quoted.push((lines[j] ?? '').replace(/^\s{0,3}> ?/, ''))
      }
      const inner = split(quoted.join('\n'))
      if (hasCode(inner)) {
        flushProse()
        out.push({ kind: 'quote', segments: inner })
      } else {
        prose.push(...lines.slice(i, j))
      }
      i = j - 1
      continue
    }

    const m = OPEN.exec(line)
    if (!m) {
      prose.push(line)
      continue
    }
    const indent = m[1] ?? ''
    const fence = m[2] ?? '```'
    const info = m[3] ?? ''
    const close = new RegExp(`^\\s*${fence[0] === '`' ? '`' : '~'}{${fence.length},}\\s*$`)
    const body: string[] = []
    let j = i + 1
    for (; j < lines.length; j++) {
      const inner = lines[j] ?? ''
      if (close.test(inner)) break
      body.push(inner.startsWith(indent) ? inner.slice(indent.length) : inner.trimStart())
    }
    flushProse()
    out.push({ kind: 'code', source: body.join('\n'), language: info || undefined })
    i = j
  }
  flushProse()
  return out
}
