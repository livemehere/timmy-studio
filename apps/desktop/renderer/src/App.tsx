import { useEffect, useRef } from 'react';

export default function App() {
  const unSubs = useRef<(() => void)[]>([]);

  useEffect(() => {
    // Type-safe invoke: 파라미터 타입과 리턴 타입이 자동으로 추론됨
    // result는 자동으로 number 타입으로 추론됨
    window.app.invoke('add', 2, 3).then((result) => {
      console.log('Result of add:', result);
    });
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>IPC Examples</h1>

      <section style={{ marginBottom: '20px' }}>
        <h2>Basic Invoke</h2>
        <button
          onClick={() => {
            window.app.invoke('hello').then((result) => {
              console.log('Result of hello:', result);
            });
          }}
        >
          Say Hello
        </button>
      </section>

      <section style={{ marginBottom: '20px' }}>
        <h2>Event Listeners</h2>
        <button
          onClick={async () => {
            const unSub = window.app.on('ping', (timestamp) => {
              console.log('Ping received:', timestamp);
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
            window.app.off('ping');
          }}
        >
          Off All Ping Listeners
        </button>
      </section>
    </div>
  );
}
