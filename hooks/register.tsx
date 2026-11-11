import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { MasterStatus } from '../types'

const status = atom({ plugin: 'prompt-master', key: 'status' } as const, 'idle' as MasterStatus)
const original = atom({ plugin: 'prompt-master', key: 'original' } as const, null as string | null)
const message = atom({ plugin: 'prompt-master', key: 'message' } as const, null as string | null)
const rough = atom({ plugin: 'prompt-master', key: 'rough' } as const, '')
const result = atom({ plugin: 'prompt-master', key: 'result' } as const, null as string | null)

const PANE = 'prompt-master'

const SYSTEM = `You are Prompt Master, an expert prompt engineer. The user gives you a rough prompt they are about to send to an AI coding/assistant agent. Rewrite it into a better prompt.

Rules:
- Keep the user's intent, scope and every concrete detail (names, paths, numbers, code, URLs). Never invent requirements, facts or files.
- Make it clear and specific: state the goal first, then relevant context, constraints, and what a good result looks like (deliverable / acceptance criteria).
- Fix spelling and grammar; remove filler and ambiguity. Use short bullet points only when they help.
- Keep it proportionate: a one-line ask stays short. Don't pad.
- Write it in the user's voice (first person, addressed to the assistant), in the same language as the original.
- If something essential is unknown, add a brief line asking the assistant to state its assumptions rather than guessing silently.

Output ONLY the rewritten prompt text. No preamble, no quotes, no code fences, no commentary.`

function clean(text: string): string {
  let t = text.trim()
  const fenced = /^```[a-zA-Z]*\n([\s\S]*?)\n```$/.exec(t)
  if (fenced?.[1]) t = fenced[1].trim()
  return t
}

/**
 * Rewrites `draft`; the result is kept for the pane and, with `fill`, put in
 * the prompt box over the draft (Undo restores it).
 */
async function master($: EngineInterface, draft: string, fill: boolean): Promise<string> {
  const text = draft.trim()
  if (!text) {
    $.ui.toast('Prompt Master: type a rough prompt first')
    await update($, message, () => 'Type a rough prompt first.')
    return 'Nothing to rewrite: type a rough prompt first (or /prompt-master <your rough prompt>).'
  }
  if ((await read($, status)) === 'working') return 'Prompt Master is already working.'

  await update($, status, () => 'working')
  await update($, message, () => 'Rewriting…')
  $.ui.status('✨ Prompt Master: rewriting…')

  const r = await $.model.complete({
    model: 'sonnet',
    system: SYSTEM,
    prompt: `Rough prompt to rewrite:\n<rough_prompt>\n${text}\n</rough_prompt>`,
    maxTokens: 2048,
    effort: 'low',
    timeoutMs: 60000,
  })
  $.ui.status(undefined)

  if (!r.isAnswered || !clean(r.text)) {
    const why = r.isAnswered ? 'empty reply' : r.reason
    await update($, status, () => 'error')
    await update($, message, () => `Rewrite failed (${why}). Your draft is unchanged.`)
    $.ui.toast(`Prompt Master: rewrite failed (${why})`)
    return `Rewrite failed (${why}).`
  }

  const better = clean(r.text)
  await update($, result, () => better)
  await update($, status, () => 'done')

  if (fill) {
    const filled = await $.prompt.fill({ text: better, mode: 'replace' })
    if (filled.isFilled) {
      await update($, original, () => draft)
      await update($, message, () => 'Rewritten. Review it, then press Enter to send.')
      $.ui.toast('✨ Prompt rewritten. Review and send')
      return `✨ Rewritten and placed in your prompt box:\n\n${better}`
    }
  }
  await update($, message, () => 'Rewritten. Send it, or put it in your prompt box.')
  return `✨ Improved prompt:\n\n${better}`
}

function openPane($: EngineInterface) {
  return $.ui.open({ id: PANE, title: '✨ Prompt Master' })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'prompt-master',
      description: 'Rewrite a rough prompt into a better one: /prompt-master <rough prompt>, or your current draft',
    })
    void openPane($)
    return next(e)
  })

  on('command.run', { command: 'prompt-master' }, async ($, e) => {
    void openPane($)
    const typed = e.args.trim()
    if (typed) {
      await update($, rough, () => typed)
      return { text: await master($, typed, false) }
    }
    const box = await $.prompt.read()
    return { text: await master($, box.text, true) }
  })

  // After sending, reset the band.
  on('prompt.submit', async ($, e, next) => {
    if ((await read($, status)) !== 'working') {
      await update($, status, () => 'idle')
      await update($, message, () => null)
      await update($, original, () => null)
    }
    return next(e)
  })

  // The pane: works on every surface, including the mobile and web apps' Mods sheet.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Input, Text } = $.ui.resolve(e)
    const s = await read($, status)
    const typed = await read($, rough)
    const better = await read($, result)
    const note = await read($, message)

    const rewrite = async (value?: string) => {
      let text = (value ?? (await read($, rough))).trim()
      if (value !== undefined) await update($, rough, () => value)
      if (!text) text = (await $.prompt.read()).text
      await master($, text, false)
    }
    const send = async () => {
      if (better === null) return
      await $.prompt.submit({ text: better })
      await update($, rough, () => '')
      await update($, result, () => null)
    }
    const use = async () => {
      if (better === null) return
      const { isFilled } = await $.prompt.fill({ text: better, mode: 'replace' })
      await update($, message, () =>
        isFilled ? 'Placed in your prompt box.' : 'Could not reach the prompt box here: use Send instead.',
      )
    }
    const clear = async () => {
      await update($, rough, () => '')
      await update($, result, () => null)
      await update($, message, () => null)
    }

    return (
      <Box flexDirection="column" gap={1}>
        <Input
          key="rough"
          label="Rough prompt"
          placeholder="Type your rough prompt here…"
          rows={4}
          value={typed}
          submitLabel="rewrite"
          onInput={value => update($, rough, () => value)}
          onSubmit={value => rewrite(value)}
        />
        <Box flexDirection="row" gap={1}>
          <Button
            key="rewrite"
            variant="primary"
            label={s === 'working' ? '✨ Rewriting…' : '✨ Prompt Master'}
            onPress={() => rewrite()}
          />
          {better !== null && <Button key="clear" label="Clear" dimColor onPress={clear} />}
        </Box>
        {note !== null && <Text dimColor>{note}</Text>}
        {better !== null && (
          <Box flexDirection="column" gap={1}>
            <Text bold>Improved prompt</Text>
            <Text>{better}</Text>
            <Box flexDirection="row" gap={1}>
              <Button key="send" variant="primary" label="Send it" onPress={send} />
              <Button key="use" label="Put in prompt box" onPress={use} />
            </Box>
          </Box>
        )}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || e.props.isWorking) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const s = await read($, status)
    const note = await read($, message)
    const before = await read($, original)

    const run = async () => {
      const { text } = await $.prompt.read()
      await master($, text, true)
    }
    const undo = async () => {
      if (before === null) return
      await $.prompt.fill({ text: before, mode: 'replace' })
      await update($, original, () => null)
      await update($, status, () => 'idle')
      await update($, message, () => 'Restored your original draft.')
    }

    return (
      <Box flexDirection="row" gap={1}>
        <Button
          key="master"
          variant="primary"
          label={s === 'working' ? '✨ Rewriting…' : '✨ Prompt Master'}
          hotkey="p"
          onPress={run}
        />
        {before !== null && s === 'done' && (
          <Button key="undo" label="Undo" hotkey="u" dimColor onPress={undo} />
        )}
        <Text dimColor>{note ?? 'Type a rough prompt, then click to rewrite it'}</Text>
      </Box>
    )
  })
}
