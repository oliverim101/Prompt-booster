export type MasterStatus = 'idle' | 'working' | 'done' | 'error'

declare module 'claude-code' {
  interface PluginState {
    'prompt-master': {
      status: MasterStatus
      /** The draft as it was before the last rewrite, for Undo. */
      original: string | null
      message: string | null
      /** The rough prompt typed in the pane. */
      rough: string
      /** The last rewrite, shown in the pane. */
      result: string | null
    }
  }
}
