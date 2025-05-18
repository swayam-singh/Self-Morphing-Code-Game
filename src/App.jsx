import React from 'react';
import Terminal from './components/terminal';

function App() {
  return (
    <div>
      <h1 style={{
        textAlign: 'center',
        color: 'lime',
        fontFamily: 'monospace',
        backgroundColor: '#000',
        height: '100%',
        width: '100%',
        padding: '1rem',
        borderBottom: '2px solid lime'
      }}>
        🧠 Hacker Puzzle Game
      </h1>
      <Terminal />
    </div>
  );
}

export default App;
