import { WindowFrame } from './shell'
import { Playground } from './playground'
import './styles/app.css'

/** App root: the core shell with the playground mounted inside. */
export default function App() {
  return (
    <WindowFrame title="Electron React App">
      <Playground />
    </WindowFrame>
  )
}
