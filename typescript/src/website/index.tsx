import { render } from "preact"
import { App } from "./components/App"

import "./index.css"
import "./utils.css"
import "./theme.css"

render( <App />, document.getElementById( "app" ) as HTMLElement )
