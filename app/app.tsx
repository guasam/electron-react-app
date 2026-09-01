import { WindowFrame } from './shell'
import { Welcome } from './components/welcome'
import './styles/app.css'

/**
 * App root. `<Welcome />` is the starter tour and the only thing here that is meant to go: drop the
 * line and delete `components/welcome`, and this is an empty window with the shell still around it.
 */
export default function App() {
  return (
    <WindowFrame title="Electron React App">
      <Welcome />
    </WindowFrame>
  )
}
