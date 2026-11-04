import { render } from 'preact'
import App from './App.jsx'
import ErrorBoundary from './ui/ErrorBoundary.jsx'
import { init, upgradeThumbs } from './store.js'
import './styles.css'

init().finally(() => {
  render(<ErrorBoundary><App /></ErrorBoundary>, document.getElementById('app'))
  setTimeout(upgradeThumbs, 1500)
})
