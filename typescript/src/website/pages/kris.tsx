import { runTests } from "../../physics/algorithms/test/algorithms.test";


export function KrisPage() {
    runTests().then(() => {
        console.log("DONE");
    }).catch(e => {
        console.error("Error running perf tests", e);
    });

    return (<div>
        <p>Kris</p>
    </div>);
}
