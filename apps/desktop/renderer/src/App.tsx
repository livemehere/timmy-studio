import { useEffect, useRef } from "react";

export default function App() {
  const unSubs = useRef<(() => void)[]>([]);
  useEffect(() => {
    console.log(window.app);
    // Type-safe invoke: 파라미터 타입과 리턴 타입이 자동으로 추론됨
    // result는 자동으로 number 타입으로 추론됨
    window.app.invoke("add", 2, 3).then((result) => {
      console.log("Result of add:", result);
    });
  }, []);
  return (
    <div>
      <h1>Hello</h1>
      <button
        onClick={() => {
          window.app.invoke("hello").then((result) => {
            console.log("Result of hello:", result);
          });
        }}
      >
        hello
      </button>
      <button
        onClick={async () => {
          // Type-safe on: timestamp는 자동으로 string 타입으로 추론됨
          const unuSub = window.app.on("ping", (timestamp) => {
            console.log(timestamp);
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
