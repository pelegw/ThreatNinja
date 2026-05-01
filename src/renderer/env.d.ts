type LLMCompleteParams = { url: string; headers: Record<string, string>; body: string }
type LLMCompleteResult = { ok: boolean; status: number; data: unknown }
type LLMStreamResult = { ok: boolean; status: number }

interface ElectronAPI {
  saveGraph: (payload: string, filePath?: string) => Promise<{ cancelled: boolean; filePath?: string }>
  loadGraph: () => Promise<{ cancelled: boolean; content?: string; filePath?: string }>
  windowMinimize: () => void
  windowMaximize: () => void
  windowClose: () => void
  saveSettings: (json: string) => Promise<void>
  loadSettings: () => Promise<string | null>
  llmComplete: (params: LLMCompleteParams) => Promise<LLMCompleteResult>
  llmStream: (
    params: LLMCompleteParams,
    onChunk: (chunk: string) => void
  ) => Promise<LLMStreamResult>
  openExternal: (url: string) => Promise<{ ok: boolean; error?: string }>
}

interface Window {
  electronAPI: ElectronAPI
}
