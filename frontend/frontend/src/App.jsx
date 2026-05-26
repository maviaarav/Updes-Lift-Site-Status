import { useState } from "react";
import "./App.css";
import SkeletonCard from "./skeleton";

function App() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("idle");
  const [finalText, setFinalText] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const [ocrFailed, setOcrFailed] = useState(false);
  const [finalStageFailed, setFinalStageFailed] = useState(false);

  const dedupeRepeatedLines = (text) => {
    if (!text) return "";
    const lines = text.split(/\r?\n/);
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // skip duplicate consecutive lines
      if (out.length && out[out.length - 1] === line) continue;
      // skip repeated Message: headers after the first
      if (line.trim() === "Message:" && out.some((l) => l.trim() === "Message:")) continue;
      out.push(line);
    }
    // trim leading/trailing blank lines and return
    return out.join('\n').replace(/^(\s*\n)+|(...\s*$)/g, '').trim();
  };

  const renderResultText = (text) =>
    text.split(/(❌ Failed|❌ Error|\bfalse\b)/g).map((part, index) => {
      if (part === "❌ Failed" || part === "❌ Error") {
        return (
          <span key={index} className="result-failed">
            {part}
          </span>
        );
      }

      if (part === "false") {
        return (
          <span key={index} className="result-false">
            {part}
          </span>
        );
      }

      return part;
    });

  const runAutomation = async () => {
    try {
      setLoading(true);
      setResult("");

      const response = await fetch( 
        "https://lift-site-status.vercel.app/run-automation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error("Backend request failed");
      }

      const data = await response.json();

      const resultText = `\nMessage:\n${data.output || data.message || "No message provided."}\n`;
      const cleaned = dedupeRepeatedLines(resultText);

      setResult(cleaned);
      setStatus(data.success ? "success" : "error");

      const final = (data.output || data.message || "").toString();
      const cleanedFinal = dedupeRepeatedLines(final);
      setFinalText(cleanedFinal);
      const ok = cleanedFinal.includes("Website working correctly");
      // detect OCR / maximum retries / many false flags
      const badOcr = /Maximum retries reached/i.test(cleanedFinal) || (/login:\s*false/i.test(cleanedFinal) && /pageAppears:\s*false/i.test(cleanedFinal));
      const finalStageFail = cleanedFinal.includes("Login page is working but final page did not load");

      setOcrFailed(badOcr);
      setFinalStageFailed(finalStageFail);
      setCelebrate(ok && !badOcr && !finalStageFail);
      if (ok && !badOcr && !finalStageFail) setCelebrateKey((k) => k + 1);
    } catch (err) {
      console.log(err);

      const errText = `❌ Error\n\n${err.message}`;
      setResult(dedupeRepeatedLines(`\n${errText}\n`));
      setStatus("error");
      setFinalText(dedupeRepeatedLines(err.message || "Error"));
      setCelebrate(false);
      setOcrFailed(false);
      setFinalStageFailed(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home">
      <div className="container">
        <h1>Is it working right now?</h1>

        <p>
          Just press the button to check whether the website is working.
        </p>

        <button onClick={runAutomation} className="btn">
          Check
          <span className="arrow">→</span>
        </button>

        <p className="note">(It may take a few seconds.)</p>
      </div>

      <div className="resultContainer">
        {loading ? (
          <SkeletonCard />
        ) : (
          result && (
            <pre
              className={`result ${
                status === "success"
                  ? "result-success"
                  : status === "error"
                  ? "result-error"
                  : ""
              }`}
            >
              {renderResultText(result)}
            </pre>
          )
        )}
      </div>
      {/* Final output block (marked area) */}
      <div className="finalArea">
        <div className={`final-block ${celebrate ? 'final-success' : ''}`} key={celebrateKey}>
          {celebrate ? (
            <>
              <div className="happy">
                <span className="emoji" aria-hidden>🎉</span>
                <div className="success-content">
                  <div className="final-text">Website working correctly</div>
                  <button
                    type="button"
                    className="login-link link-button"
                    onClick={() => window.open("https://updeslift.org/Account/login", "_blank", "noopener,noreferrer")}
                  >
                    Visit the site
                  </button>
                </div>
              </div>
              <div className="confetti" aria-hidden>
                {Array.from({ length: 14 }).map((_, i) => (
                  <span
                    className="confetti-piece"
                    key={i}
                    style={{ left: `${(i + 1) * 6}%`, backgroundColor: ['#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA'][i % 5] }}
                  />
                ))}
              </div>
            </>
          ) : finalStageFailed ? (
            <div className="final-stage-failed">
              <div className="sad-final-emoji">😔</div>
              <div className="final-text">Login page is working but final page did not load</div>
              <div className="sad-animation" aria-hidden></div>
            </div>
          ) : ocrFailed ? (
            <div className="ocr-failed">
              <div className="sad-emoji" aria-hidden>😕</div>
              <div className="final-text">Bad OCR result — please try again</div>
              <button className="retry-btn" onClick={runAutomation} disabled={loading}>Try again</button>
            </div>
          ) : (
            <div className="final-text only-text">{finalText || 'No final message yet.'}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;