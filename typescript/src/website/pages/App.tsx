import { useState } from "preact/hooks";
import { pages } from ".";

export function App() {
    const [page, setPage] = useState<keyof typeof pages | null>(null);
    if (page) {
        return pages[page].component();
    }
    return <div>
        <p>{page}</p>
        {
            Object.entries(pages).map(([name, page]) => (
                <div style={{ cursor: "pointer" }} onClick={() => {
                    setPage(name);
                }}>{page.name}</div>
            ))
        }
    </div>
}
