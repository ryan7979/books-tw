import { render } from 'preact'
import './index.css'
import { App } from './app.jsx'
import { DICTIONARY } from './utils/dictionary.js'

document.title = DICTIONARY.siteTitle
render(<App />, document.getElementById('app'))
