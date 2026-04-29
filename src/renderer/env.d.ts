type LLMCompleteParams = { url: string; headers: Record<string, string>; body: string }
type LLMCompleteResult = { ok: boolean; status: number; data: unknown }

interface ElectronAPI {
  saveGraph: (payload: string) => Promise<{ cancelled: boolean; filePath?: string }>
  loadGraph: () => Promise<{ cancelled: boolean; content?: string }>
  saveSettings: (json: string) => Promise<void>
  loadSettings: () => Promise<string | null>
  llmComplete: (params: LLMCompleteParams) => Promise<LLMCompleteResult>
}

interface Window {
  electronAPI: ElectronAPI
}
