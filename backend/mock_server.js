const http = require('http');

const port = 8000;

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: "Stroke Risk Detection System API (Zero-Dep Mock) is running" }));
    return;
  }

  if (req.url === '/predict' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const prob = Math.random();
      let risk_level = "Low";
      if (prob > 0.6) risk_level = "High";
      else if (prob > 0.3) risk_level = "Moderate";

      const explanation = [
        { feature: "age", contribution: 0.15 },
        { feature: "hypertension", contribution: 0.10 },
        { feature: "avg_glucose_level", contribution: -0.05 }
      ];

      const adviceMap = {
        "Low": "Your risk level is low. Continue maintaining a healthy lifestyle, regular exercise, and a balanced diet to keep it this way.",
        "Moderate": "You have a moderate risk factors. We recommend scheduling a routine check-up with your doctor to discuss preventive heart health measures.",
        "High": "URGENT: Your risk level is high. Please consult a healthcare professional immediately for a full cardiovascular assessment."
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        risk_probability: prob,
        risk_level: risk_level,
        advice: adviceMap[risk_level],
        explanation: explanation,
        is_mock: true,
        note: "Using zero-dependency Node.js mock server while Python AI Engine initializes."
      }));
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(port, () => {
  console.log(`Mock server (Zero-Dep) listening at http://localhost:${port}`);
});
