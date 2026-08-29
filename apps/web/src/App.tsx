import { useState } from "react";

export default function App() {
  const [showContent, setShowContent] = useState(false);

  return (
    <main className="app">
      <button type="button" onClick={() => setShowContent((value) => !value)}>
        Click me!
      </button>
      {showContent ? <p>React: Hello, Web!</p> : null}
    </main>
  );
}
