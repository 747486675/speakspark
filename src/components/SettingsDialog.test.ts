import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsDialog from './SettingsDialog.vue'

const baseProps = {
  open: false,
  speechSeconds: 60,
  researchSeconds: 600,
  muted: false,
}

let addSpy: MockInstance<Parameters<Document['addEventListener']>, void>
let removeSpy: MockInstance<Parameters<Document['removeEventListener']>, void>

beforeEach(() => {
  addSpy = vi.spyOn(document, 'addEventListener')
  removeSpy = vi.spyOn(document, 'removeEventListener')
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

function keydownListenerCount(spy: typeof addSpy) {
  return spy.mock.calls.filter((c) => c[0] === 'keydown').length
}

describe('SettingsDialog', () => {
  it('renders nothing while closed', () => {
    mount(SettingsDialog, { props: baseProps })
    expect(document.querySelector('.dialog__panel')).toBeNull()
  })

  it('teleports the dialog to <body>, not inside the component tree', async () => {
    const wrapper = mount(SettingsDialog, { props: baseProps })
    await wrapper.setProps({ open: true })

    const root = document.querySelector('.dialog')
    expect(root).not.toBeNull()
    expect(root!.parentElement).toBe(document.body)
    // A fixed-position overlay must not sit inside the app's layout container,
    // where a future transform/filter would break its containing block.
    expect(wrapper.element.contains(root!)).toBe(false)
  })

  it('activates the focus trap when it opens', async () => {
    const wrapper = mount(SettingsDialog, { props: baseProps })
    expect(keydownListenerCount(addSpy)).toBe(0)

    await wrapper.setProps({ open: true })

    // Regression guard: `ref(props.open)` snapshots the initial value, so the
    // trap's watcher never fired and this stayed at 0.
    expect(keydownListenerCount(addSpy)).toBe(1)
  })

  it('tears the focus trap down again when it closes', async () => {
    const wrapper = mount(SettingsDialog, { props: baseProps })
    await wrapper.setProps({ open: true })
    await wrapper.setProps({ open: false })
    expect(keydownListenerCount(removeSpy)).toBe(1)
  })

  it('emits close on Escape', async () => {
    const wrapper = mount(SettingsDialog, { props: baseProps })
    await wrapper.setProps({ open: true })

    const root = document.querySelector('.dialog') as HTMLElement
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits close when the scrim is clicked', async () => {
    const wrapper = mount(SettingsDialog, { props: baseProps })
    await wrapper.setProps({ open: true })

    const scrim = document.querySelector('.dialog__scrim') as HTMLElement
    scrim.click()

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits the muted toggle', async () => {
    const wrapper = mount(SettingsDialog, { props: baseProps })
    await wrapper.setProps({ open: true })

    const box = document.querySelector('input[type="checkbox"]') as HTMLInputElement
    box.checked = true
    box.dispatchEvent(new Event('change'))

    expect(wrapper.emitted('update-muted')).toEqual([[true]])
  })
})
