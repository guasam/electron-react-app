import { app } from 'electron'
import { defineModule, query } from '../init'

/** App-level info. Core chrome (not part of the strippable demo). */
export const appModule = defineModule({
  version: query(() => app.getVersion()),
})
