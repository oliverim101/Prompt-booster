import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { MasterStatus } from '../types'

const status = atom({ plugin: 'prompt-master', key: 'status' } as const, 'idle' as MasterStatus)
const original = atom({ plugin: 'prompt-master', key: 'original' } as const, null as string | null)
const message = atom({ plugin: 'prompt-master', key: 'message' } as const, null as string | null)

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

/** Rewrites `draft` and puts the result in the prompt box. */
async function master($: EngineInterface, draft: string): Promise<string> {
  const rough = draft.trim()
  if (!rough) {
    $.ui.toast('Prompt Master: type a rough prompt first')
    return 'Nothing to rewrite: type a rough prompt first.'
  }
  if ((await read($, status)) === 'working') return 'Prompt Master is already working.'

  await update($, status, () => 'working')
  await update($, message, () => null)
  $.ui.status('✨ Prompt Master: rewriting…')

  const r = await $.model.complete({
    model: 'sonnet',
    system: SYSTEM,
    prompt: `Rough prompt to rewrite:\n<rough_prompt>\n${rough}\n</rough_prompt>`,
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
  await update($, original, () => draft)
  const filled = await $.prompt.fill({ text: better, mode: 'replace' })
  await update($, status, () => 'done')
  if (!filled.isFilled) {
    await update($, message, () => 'Could not place the rewrite in the prompt box.')
    return `Here is the improved prompt:\n\n${better}`
  }
  await update($, message, () => 'Rewritten. Review it, then press Enter to send.')
  $.ui.toast('✨ Prompt rewritten. Review and send')
  return 'Prompt rewritten and placed in your prompt box. Review it, then send.'
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'prompt-master',
      description: 'Rewrite your rough prompt into a better one (uses the text after the command, or your current draft)',
    })
    return next(e)
  })

  on('command.run', { command: 'prompt-master' }, async $ => {
    const box = await $.prompt.read()
    const text = await master($, box.text)
    return { text }
  })

  // After sending, reset the band.
  on('prompt.submit', async ($, e, next) => {
    await update($, status, () => 'idle')
    await update($, message, () => null)
    await update($, original, () => null)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || e.props.isWorking) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const s = await read($, status)
    const note = await read($, message)
    const before = await read($, original)

    const run = async () => {
      const { text } = await $.prompt.read()
      await master($, text)
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
