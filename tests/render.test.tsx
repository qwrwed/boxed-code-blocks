import { expect, test } from 'claude-code/testing'

const REPLY = 'Before the block.\n\n```text\nline one\n  line two\n```\n\nAfter the block.'

const message = (text: string) => ({
  plugin: 'boxed-code-blocks',
  component: 'AssistantMessage' as const,
  requestId: 'msg-1',
  props: { text, isFirstOfReply: true },
})

test('terminal: a fenced block is drawn by the engine renderer inside a bordered Box, prose as Markdown', async $ => {
  const ui = await $.ui.mount({ ...message(REPLY), surface: 'terminal' })
  const boxes = await ui.findAll({ type: 'Box' })
  expect(boxes.some(b => b.props.borderStyle === 'single')).toBe(true)
  const texts = (await ui.findAll({ type: 'Markdown' })).map(p => p.props.text)
  expect(texts).toEqual(['Before the block.', '```text\nline one\n  line two\n```', 'After the block.'])
  await ui.unmount()
})

test('terminal: each box has its own copy button, which copies the source with no border', async ($, on) => {
  const copied: string[] = []
  on('ui.copy', (_, e) => {
    copied.push(e.text)
    return { value: { isCopied: true } }
  })
  on('ui.toast', () => ({ value: undefined }))
  const two = `${REPLY}\n\n\`\`\`bash\necho "second"\n\`\`\``
  const ui = await $.ui.mount({ ...message(two), surface: 'terminal' })
  expect(await ui.findAll({ type: 'Button' })).toHaveLength(2)
  await ui.press({ key: 'copy:0' })
  await ui.press({ key: 'copy:1' })
  expect(copied).toEqual(['line one\n  line two', 'echo "second"'])
  await ui.unmount()
})

test('terminal: a fenced block inside a quote is boxed too, drawn quoted', async $ => {
  const quoted = '> Quoted text.\n>\n> ```bash\n> echo "hi"\n> ```'
  const ui = await $.ui.mount({ ...message(quoted), surface: 'terminal' })
  const texts = (await ui.findAll({ type: 'Markdown' })).map(p => p.props.text)
  expect(texts).toContain('> Quoted text.')
  expect(texts).toContain('> ```bash\n> echo "hi"\n> ```')
  await ui.unmount()
})

test('terminal: a reply with no fence is left to the engine', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text key="engine">engine</Text>
  })
  const ui = await $.ui.mount({ ...message('Plain reply.'), surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: 'engine' })).toBeDefined()
  expect(await ui.find({ type: 'Box' })).toBeUndefined()
  await ui.unmount()
})

test('vscode: replies are left to the engine', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text key="engine">engine</Text>
  })
  const ui = await $.ui.mount({ ...message(REPLY), surface: 'vscode' })
  expect(await ui.find({ type: 'Text', text: 'engine' })).toBeDefined()
  expect(await ui.find({ type: 'Box' })).toBeUndefined()
  await ui.unmount()
})
