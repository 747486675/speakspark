import { describe, it, expect } from 'vitest'
import { usePracticeMachine } from './usePracticeMachine'
import { DEEP_RESEARCH_ID, offTheCuffCategories } from '../data/topics'

/**
 * Drive the machine to a committed selection, which is the precondition
 * `canStartTimer` enforces before any timer phase can begin.
 */
function withSelection(m: ReturnType<typeof usePracticeMachine>) {
  m.beginSpin()
  m.settleSpin()
  return m
}

describe('initial state', () => {
  it('starts off-the-cuff, idle, not spinning, with nothing committed', () => {
    const m = usePracticeMachine()
    expect(m.state.mode).toBe('off-the-cuff')
    expect(m.state.timerPhase).toBe('idle')
    expect(m.state.isSpinning).toBe(false)
    expect(m.state.selectedTopic).toBeNull()
  })

  it('seeds a displayed topic consistent with its index', () => {
    const m = usePracticeMachine()
    expect(m.topics.value).toContain(m.state.displayedTopic)
    expect(m.topics.value[m.state.displayedIndex]).toBe(m.state.displayedTopic)
  })

  it('cannot start a timer before a topic is committed', () => {
    const m = usePracticeMachine()
    expect(m.canStartTimer.value).toBe(false)
  })
})

describe('spin lifecycle', () => {
  it('clears any prior selection when a spin begins', () => {
    const m = withSelection(usePracticeMachine())
    expect(m.state.selectedTopic).not.toBeNull()
    m.beginSpin()
    expect(m.state.selectedTopic).toBeNull()
    expect(m.state.isSpinning).toBe(true)
  })

  it('commits the displayed topic on settle', () => {
    const m = usePracticeMachine()
    m.beginSpin()
    m.settleSpin()
    expect(m.state.isSpinning).toBe(false)
    expect(m.state.selectedTopic).toBe(m.state.displayedTopic)
    expect(m.canStartTimer.value).toBe(true)
  })

  it('lands on an explicit final topic and syncs the index', () => {
    const m = usePracticeMachine()
    const target = m.topics.value[3]
    m.beginSpin()
    m.settleSpin(target)
    expect(m.state.selectedTopic).toBe(target)
    expect(m.state.displayedIndex).toBe(3)
  })

  it('ignores a final topic that is not in the active list', () => {
    const m = usePracticeMachine()
    m.beginSpin()
    m.settleSpin('not-a-real-topic')
    expect(m.topics.value).toContain(m.state.selectedTopic)
  })

  it('advances to a different index while spinning', () => {
    const m = usePracticeMachine()
    m.beginSpin()
    const before = m.state.displayedIndex
    const beforeTopic = m.topics.value[before]
    // 选一个不同的 topic 推进
    const next = m.topics.value.find((t) => t !== beforeTopic) ?? m.topics.value[0]
    m.advanceTo(next, 120)
    expect(m.state.displayedIndex).not.toBe(before)
    expect(m.state.displayedTopic).toBe(next)
    expect(m.state.topicRevision).toBeGreaterThan(0)
    expect(m.state.tickMs).toBe(120)
  })

  it('refuses to begin a spin while one is already running', () => {
    const m = usePracticeMachine()
    m.beginSpin()
    const idx = m.state.displayedIndex
    m.beginSpin()
    expect(m.state.displayedIndex).toBe(idx)
  })
})

describe('off-the-cuff timer phases', () => {
  it('goes straight to speech, then done', () => {
    const m = withSelection(usePracticeMachine())
    m.startSpeech()
    expect(m.state.timerPhase).toBe('speech')
    m.finishSpeech()
    expect(m.state.timerPhase).toBe('done')
  })

  it('does not expose the research phase in this mode', () => {
    const m = withSelection(usePracticeMachine())
    m.startResearch()
    expect(m.state.timerPhase).toBe('idle')
  })
})

describe('deep-research timer phases', () => {
  function deepWithSelection() {
    const m = usePracticeMachine()
    m.setMode('deep-research')
    return withSelection(m)
  }

  it('steps research -> ready -> speech -> done', () => {
    const m = deepWithSelection()
    m.startResearch()
    expect(m.state.timerPhase).toBe('research')
    m.finishResearch()
    expect(m.state.timerPhase).toBe('ready')
    m.startSpeechFromReady()
    expect(m.state.timerPhase).toBe('speech')
    m.finishSpeech()
    expect(m.state.timerPhase).toBe('done')
  })

  it('does not use the off-the-cuff speech entry point', () => {
    const m = deepWithSelection()
    m.startSpeech()
    expect(m.state.timerPhase).toBe('idle')
  })

  it('ignores out-of-order transitions', () => {
    const m = deepWithSelection()
    m.finishResearch()
    expect(m.state.timerPhase).toBe('idle')
    m.startSpeechFromReady()
    expect(m.state.timerPhase).toBe('idle')
    m.finishSpeech()
    expect(m.state.timerPhase).toBe('idle')
  })
})

describe('closeTimer', () => {
  it('returns to idle from any phase but keeps the selection', () => {
    const m = withSelection(usePracticeMachine())
    const topic = m.state.selectedTopic
    m.startSpeech()
    m.closeTimer()
    expect(m.state.timerPhase).toBe('idle')
    expect(m.state.selectedTopic).toBe(topic)
  })
})

describe('mode and category', () => {
  it('switches the active topic bank with the mode', () => {
    const m = usePracticeMachine()
    m.setMode('deep-research')
    expect(m.state.categoryId).toBe(DEEP_RESEARCH_ID)
    expect(m.topics.value).toContain(m.state.displayedTopic)
  })

  it('restores the last ordinary category when leaving deep-research', () => {
    const m = usePracticeMachine()
    const target = offTheCuffCategories[2].id
    m.setCategory(target)
    m.setMode('deep-research')
    m.setMode('off-the-cuff')
    expect(m.state.categoryId).toBe(target)
  })

  it('drops a committed selection when the topic bank changes', () => {
    const m = withSelection(usePracticeMachine())
    m.setCategory(offTheCuffCategories[1].id)
    expect(m.state.selectedTopic).toBeNull()
    expect(m.canStartTimer.value).toBe(false)
  })

  it('refuses the deep-research bank via setCategory', () => {
    const m = usePracticeMachine()
    m.setCategory(DEEP_RESEARCH_ID)
    expect(m.state.categoryId).not.toBe(DEEP_RESEARCH_ID)
  })

  it('locks mode and category while a timer is running', () => {
    const m = withSelection(usePracticeMachine())
    m.startSpeech()
    expect(m.controlsLocked.value).toBe(true)
    m.setMode('deep-research')
    m.setCategory(offTheCuffCategories[3].id)
    expect(m.state.mode).toBe('off-the-cuff')
    expect(m.state.categoryId).toBe(offTheCuffCategories[0].id)
  })
})
