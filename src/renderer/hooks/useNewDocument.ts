import { useCallback } from 'react'

type ShowMessageBoxOpts = {
  message: string
  detail?: string
  buttons: string[]
  defaultId?: number
}

type Options = {
  isDirty: boolean
  onSave: () => Promise<void>
  onReset: () => void
  showMessageBox: (opts: ShowMessageBoxOpts) => Promise<number>
}

const SAVE = 0
const CANCEL = 2

export const useNewDocument = ({ isDirty, onSave, onReset, showMessageBox }: Options) => {
  const handleNew = useCallback(async () => {
    if (!isDirty) {
      onReset()
      return
    }
    const choice = await showMessageBox({
      message: 'You have unsaved changes',
      detail: 'Do you want to save before creating a new document?',
      buttons: ['Save', 'Discard', 'Cancel'],
      defaultId: SAVE,
    })
    if (choice === CANCEL) return
    if (choice === SAVE) await onSave()
    onReset()
  }, [isDirty, onSave, onReset, showMessageBox])

  return { handleNew }
}
