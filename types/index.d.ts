export type MasterStatus = 'idle' | 'working' | 'done' | 'error'

declare module 'claude-code' {
  interface PluginState {
    'prompt-master': {
      status: MasterStatus
      /** The draft as it was before the last rewrite, for Undo. */
      original: string | null
      message: string | null
    }
  }
}
