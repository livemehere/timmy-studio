import { useEffect, useRef, useState } from "react";
import type { CancellablePromise } from "@timmy-studio/electron-utils/ipc";

export default function App() {
  const unSubs = useRef<(() => void)[]>([]);
  const [taskStatus, setTaskStatus] = useState<string>("idle");
  const cancelTaskRef = useRef<CancellablePromise<string> | null>(null);

  useEffect(() => {
    console.log(window.app);
    // Type-safe invoke: 파라미터 타입과 리턴 타입이 자동으로 추론됨
    // result는 자동으로 number 타입으로 추론됨
    window.app.invoke("add", 2, 3).then((result) => {
      console.log("Result of add:", result);
    });
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>IPC Examples</h1>

      <section style={{ marginBottom: "20px" }}>
        <h2>Basic Invoke</h2>
        <button
          onClick={() => {
            window.app.invoke("hello").then((result) => {
              console.log("Result of hello:", result);
            });
          }}
        >
          Say Hello
        </button>
      </section>

      <section style={{ marginBottom: "20px" }}>
        <h2>Batch Invoke</h2>
        <button
          onClick={async () => {
            // Batch invoke - 여러 요청을 한 번에!
            const [sum, product] = await window.app.batchInvoke([
              { channel: "add", args: [10, 20] },
              { channel: "multiply", args: [5, 6] },
            ] as const);

            console.log("Batch results:");
            console.log("Sum (10 + 20):", sum); // 30
            console.log("Product (5 * 6):", product); // 30
            alert(`Sum: ${sum}, Product: ${product}`);
          }}
        >
          Execute Batch Request
        </button>
      </section>

      <section style={{ marginBottom: "20px" }}>
        <h2>Cancellable Task</h2>
        <p>Status: {taskStatus}</p>
        <button
          onClick={async () => {
            setTaskStatus("running...");
            try {
              // Cancellable invoke - 취소 가능한 요청
              const promise = window.app.cancellableInvoke("longTask", 5000);
              cancelTaskRef.current = promise;

              const result = await promise;
              setTaskStatus(`completed: ${result}`);
              console.log("Long task result:", result);
            } catch (error) {
              if (error instanceof Error && error.message === "CANCELLED") {
                setTaskStatus("cancelled by user");
              } else {
                setTaskStatus(`error: ${error}`);
              }
            } finally {
              cancelTaskRef.current = null;
            }
          }}
          disabled={taskStatus === "running..."}
        >
          Start Long Task (5s)
        </button>
        <button
          onClick={() => {
            if (cancelTaskRef.current) {
              cancelTaskRef.current.cancel();
            }
          }}
          disabled={taskStatus !== "running..."}
        >
          Cancel Task
        </button>
      </section>

      <section style={{ marginBottom: "20px" }}>
        <h2>Event Listeners</h2>
        <button
          onClick={async () => {
            const unSub = window.app.on("ping", (timestamp) => {
              console.log("Ping received:", timestamp);
            });
            unSubs.current.push(unSub);
          }}
        >
          Subscribe to Ping
        </button>
        <button
          onClick={() => {
            const unSub = unSubs.current.pop();
            if (unSub) {
              unSub();
            }
          }}
        >
          Unsubscribe Last
        </button>
        <button
          onClick={() => {
            for (const unSub of unSubs.current) {
              unSub();
            }
            unSubs.current = [];
          }}
        >
          Unsubscribe All
        </button>
        <button
          onClick={() => {
            window.app.off("ping");
          }}
        >
          Off All Ping Listeners
        </button>
      </section>
    </div>
  );
}
