import { ref, watch, nextTick, type Ref } from 'vue'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Trap focus inside `container` while `active` is true. On activation it focuses
 * the first focusable element; on deactivation it restores focus to whatever was
 * focused before. Tab / Shift+Tab wrap within the container.
 */
export function useFocusTrap(container: Ref<HTMLElement | null>, active: Ref<boolean>) {
  const previouslyFocused = ref<HTMLElement | null>(null)

  function focusables(): HTMLElement[] {
    const el = container.value
    if (!el) return []
    return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (n) => n.offsetParent !== null || n === document.activeElement,
    )
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return
    const items = focusables()
    if (items.length === 0) {
      e.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const activeEl = document.activeElement as HTMLElement | null

    if (e.shiftKey && activeEl === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && activeEl === last) {
      e.preventDefault()
      first.focus()
    }
  }

  watch(active, async (isActive) => {
    if (isActive) {
      previouslyFocused.value = document.activeElement as HTMLElement | null
      document.addEventListener('keydown', onKeydown, true)
      await nextTick()
      focusables()[0]?.focus()
    } else {
      document.removeEventListener('keydown', onKeydown, true)
      previouslyFocused.value?.focus()
      previouslyFocused.value = null
    }
  })
}
