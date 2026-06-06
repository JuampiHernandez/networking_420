import type { NavOperations, ShortcutOptions } from '@slidev/types'
import { defineShortcutsSetup } from '@slidev/types'

export default defineShortcutsSetup((_nav: NavOperations, base: ShortcutOptions[]) => {
  return base.filter(s => s.name !== 'goto')
})
