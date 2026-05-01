import { useState, useCallback, useRef } from 'react'
import type { LLMSettings, LLMMessage } from '../llm/llm'
import { createLLMClient } from '../llm/llm'
import type { Graph } from '../model/graph'
import { startInterviewStreaming, continueInterviewStreaming } from '../llm/interview'

type UseInterviewOptions = {
  settings: LLMSettings
  graphRef: { readonly current: Graph }
  onError: (msg: string) => void
}

export const useInterview = ({ settings, graphRef, onError }: UseInterviewOptions) => {
  const [messages, setMessages] = useState<LLMMessage[]>([])
  const [isInterviewing, setIsInterviewing] = useState(false)
  const [showInterview, setShowInterview] = useState(false)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const appendChunk = useCallback((chunk: string) => {
    setMessages(prev => {
      const last = prev[prev.length - 1]!
      return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
    })
  }, [])

  const startStreaming = useCallback(async () => {
    setIsInterviewing(true)
    setMessages([
      { role: 'user', content: '' },
      { role: 'assistant', content: '' }
    ])
    try {
      const result = await startInterviewStreaming(
        createLLMClient(settings),
        graphRef.current,
        appendChunk,
        settings.interviewPrompt
      )
      setMessages(result)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Interview failed')
      setShowInterview(false)
      setMessages([])
    } finally {
      setIsInterviewing(false)
    }
  }, [settings, graphRef, onError, appendChunk])

  const open = useCallback(async () => {
    setShowInterview(true)
    if (messagesRef.current.length > 0) return
    await startStreaming()
  }, [startStreaming])

  const send = useCallback(async (answer: string) => {
    const history = messagesRef.current
    setIsInterviewing(true)
    setMessages(prev => [
      ...prev,
      { role: 'user', content: answer },
      { role: 'assistant', content: '' }
    ])
    try {
      const updated = await continueInterviewStreaming(
        createLLMClient(settings),
        history,
        answer,
        appendChunk,
        settings.interviewPrompt
      )
      setMessages(updated)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Interview failed')
    } finally {
      setIsInterviewing(false)
    }
  }, [settings, onError, appendChunk])

  const restart = useCallback(async () => {
    await startStreaming()
  }, [startStreaming])

  const close = useCallback(() => {
    setShowInterview(false)
  }, [])

  return {
    messages,
    messagesRef,
    isInterviewing,
    showInterview,
    open,
    send,
    restart,
    close,
    setMessages,
  }
}
