import { pages } from ".";
import { useLocalStorage } from "../hooks/useLocalStorage";

export function App() {
    const [page, setPage] = useLocalStorage<keyof typeof pages | null>("page", null);
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
