import { useState } from 'react';
import { calculateLoD } from './utils/calculations';
import './App.css';

function App() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<{ lod: number; mean: number; sd: number } | null>(null);
  const [error, setError] = useState('');

  const handleCalculate = () => {
    setError('');
    const dataPoints = input
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== '')
      .map(Number);

    if (dataPoints.some(isNaN)) {
      setError('Please enter valid numbers separated by commas.');
      setResults(null);
      return;
    }

    if (dataPoints.length < 2) {
      setError('Please enter at least two data points for standard deviation calculation.');
      setResults(null);
      return;
    }

    const res = calculateLoD(dataPoints);
    setResults(res);
  };

  return (
    <div className="container">
      <h1>Diagnostic Assay LoD Calculator</h1>
      <p>Enter your blank data points separated by commas (e.g., 0.1, 0.12, 0.09, 0.11)</p>
      
      <div className="input-group">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. 0.1, 0.12, 0.09, 0.11"
          rows={4}
        />
        <button onClick={handleCalculate}>Calculate Limit of Detection</button>
      </div>

      {error && <p className="error">{error}</p>}

      {results && (
        <div className="results">
          <h2>Results</h2>
          <div className="result-grid">
            <div className="result-item">
              <label>Mean of Blanks:</label>
              <span>{results.mean.toFixed(4)}</span>
            </div>
            <div className="result-item">
              <label>Std. Deviation:</label>
              <span>{results.sd.toFixed(4)}</span>
            </div>
            <div className="result-item highlight">
              <label>Limit of Detection (LoD):</label>
              <span>{results.lod.toFixed(4)}</span>
            </div>
          </div>
          <p className="formula-note">Formula used: LoD = Mean + 3 × SD</p>
        </div>
      )}
    </div>
  );
}

export default App;
