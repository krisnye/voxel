import { pages } from ".";
import useHashState from "../hooks/useHashState";

export function App() {
    const [page, setPage] = useHashState(undefined);
    console.log(page)
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
