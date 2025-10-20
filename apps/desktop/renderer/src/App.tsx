import { useEffect, useRef } from "react";

export default function App() {
  const unSubs = useRef<(() => void)[]>([]);
  useEffect(() => {
    console.log(window.app);
    window.app.invoke("add", 2, 3).then((result) => {
      console.log("Result of add:", result);
    });
  }, []);
  return (
    <div>
      <h1>Hello</h1>
      <button
        onClick={async () => {
          const unuSub = window.app.on("ping", (e, data) => {
            console.log(e, data);
          });
          unSubs.current.push(unuSub);
        }}
      >
        Add
      </button>
      <button
        onClick={() => {
          const unuSub = unSubs.current.pop();
          if (unuSub) {
            unuSub();
          }
        }}
      >
        Unsub
      </button>
      <button
        onClick={() => {
          for (const unuSub of unSubs.current) {
            unuSub();
          }
          unSubs.current = [];
        }}
      >
        unsubAll
      </button>
      <button
        onClick={() => {
          window.app.off("ping");
        }}
      >
        Off all
      </button>
    </div>
  );
}
