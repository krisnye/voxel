import { render } from 'preact'
import { App } from './components/App.tsx'
import './index.css'

render(<App />, document.getElementById('app') as HTMLElement)
