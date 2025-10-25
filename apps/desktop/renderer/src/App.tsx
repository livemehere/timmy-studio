export default function App() {
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
    </div>
  );
}
