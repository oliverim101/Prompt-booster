import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'prompt-master',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 10 },
} as const

test('the button rewrites the draft in place, and Undo restores it', async ($, on) => {
  let box = 'fix login bug pls its broken'
  let asked = ''
  on('prompt.read', () => ({ value: { text: box, cursor: box.length } }))
  on('prompt.fill', (_, e) => {
    box = e.text
    return { isFilled: true }
  })
  on('model.complete', (_, e) => {
    asked = e.prompt
    return {
      value: {
        isAnswered: true,
        text: 'Please fix the login bug.',
        usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      },
    }
  })
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))

  for (const surface of ['terminal', 'desktop'] as const) {
    box = 'fix login bug pls its broken'
    const ui = await $.ui.mount({ ...BAND, surface })
    await ui.press({ key: 'master' })
    expect(asked).toContain('fix login bug pls its broken')
    expect(box).toBe('Please fix the login bug.')

    await ui.press({ key: 'undo' })
    expect(box).toBe('fix login bug pls its broken')
    await ui.unmount()
  }
})

test('a failed rewrite leaves the draft alone', async ($, on) => {
  let box = 'rough'
  on('prompt.read', () => ({ value: { text: box, cursor: 0 } }))
  on('prompt.fill', (_, e) => {
    box = e.text
    return { isFilled: true }
  })
  on('model.complete', () => ({
    value: {
      isAnswered: false,
      reason: 'empty-reply',
      usage: { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    },
  }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'master' })
  expect(box).toBe('rough')
  expect((await ui.find({ type: 'Text', text: /failed/ }))?.text).toContain('unchanged')
  await ui.unmount()
})

const PANE = {
  plugin: 'prompt-master',
  component: 'Pane',
  requestId: 'prompt-master',
  props: {
    title: '✨ Prompt Master',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

test('the pane rewrites what was typed in it and sends it, on mobile too', async ($, on) => {
  let sent = ''
  on('prompt.read', () => ({ value: { text: '', cursor: 0 } }))
  on('model.complete', (_, e) => ({
    value: {
      isAnswered: true,
      text: e.prompt.includes('make it fast') ? 'Please speed up the page load.' : '?',
      usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    },
  }))
  on('prompt.submit', (_, e) => {
    sent = e.text
    return { text: e.text }
  })
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))

  for (const surface of ['mobile', 'desktop'] as const) {
    sent = ''
    const ui = await $.ui.mount({ ...PANE, surface })
    await ui.input({ key: 'rough', text: 'make it fast' })
    expect((await ui.find({ type: 'Text', text: /speed up/ }))?.text).toBe('Please speed up the page load.')
    await ui.press({ key: 'send' })
    expect(sent).toBe('Please speed up the page load.')
    await ui.unmount()
  }
})
