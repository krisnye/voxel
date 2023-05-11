import { useState } from 'preact/hooks'
import preactLogo from '../assets/preact.svg'
import viteLogo from '/vite.svg'
import './App.css'

export function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1>Voxel Simulation</h1>
      <div class="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
    </>
  )
}
