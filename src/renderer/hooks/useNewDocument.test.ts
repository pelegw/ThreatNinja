// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNewDocument } from './useNewDocument'

const noop = async (): Promise<void> => {}

const makeShowMessageBox = (response: number) =>
  vi.fn().mockResolvedValue(response)

describe('useNewDocument', () => {
  describe('when document is clean', () => {
    it('resets immediately without showing a dialog', async () => {
      const onReset = vi.fn()
      const showMessageBox = vi.fn()
      const { result } = renderHook(() =>
        useNewDocument({ isDirty: false, onSave: noop, onReset, showMessageBox })
      )
      await act(() => result.current.handleNew())
      expect(onReset).toHaveBeenCalledOnce()
      expect(showMessageBox).not.toHaveBeenCalled()
    })
  })

  describe('when document has unsaved changes', () => {
    it('shows a dialog with Save / Discard / Cancel options', async () => {
      const showMessageBox = makeShowMessageBox(2)
      const { result } = renderHook(() =>
        useNewDocument({ isDirty: true, onSave: noop, onReset: vi.fn(), showMessageBox })
      )
      await act(() => result.current.handleNew())
      expect(showMessageBox).toHaveBeenCalledWith(
        expect.objectContaining({ buttons: expect.arrayContaining(['Save', 'Discard', 'Cancel']) })
      )
    })

    it('saves then resets when user picks Save', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      const onReset = vi.fn()
      const { result } = renderHook(() =>
        useNewDocument({ isDirty: true, onSave, onReset, showMessageBox: makeShowMessageBox(0) })
      )
      await act(() => result.current.handleNew())
      expect(onSave).toHaveBeenCalledOnce()
      expect(onReset).toHaveBeenCalledOnce()
    })

    it('save is called before reset', async () => {
      const order: string[] = []
      const onSave = vi.fn().mockImplementation(async () => { order.push('save') })
      const onReset = vi.fn().mockImplementation(() => { order.push('reset') })
      const { result } = renderHook(() =>
        useNewDocument({ isDirty: true, onSave, onReset, showMessageBox: makeShowMessageBox(0) })
      )
      await act(() => result.current.handleNew())
      expect(order).toEqual(['save', 'reset'])
    })

    it('resets without saving when user picks Discard', async () => {
      const onSave = vi.fn()
      const onReset = vi.fn()
      const { result } = renderHook(() =>
        useNewDocument({ isDirty: true, onSave, onReset, showMessageBox: makeShowMessageBox(1) })
      )
      await act(() => result.current.handleNew())
      expect(onSave).not.toHaveBeenCalled()
      expect(onReset).toHaveBeenCalledOnce()
    })

    it('does nothing when user picks Cancel', async () => {
      const onSave = vi.fn()
      const onReset = vi.fn()
      const { result } = renderHook(() =>
        useNewDocument({ isDirty: true, onSave, onReset, showMessageBox: makeShowMessageBox(2) })
      )
      await act(() => result.current.handleNew())
      expect(onSave).not.toHaveBeenCalled()
      expect(onReset).not.toHaveBeenCalled()
    })
  })
})
