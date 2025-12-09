import React, { useState, useEffect, useRef } from "react";

/* ===================== INLINE CSS ===================== */
const styles = {
  page: { minHeight: "100vh", background: "#f4f7ff", padding: "20px" },
  container: {
    maxWidth: "1300px",
    margin: "0 auto",
    fontFamily: "Arial",
  },

  header: {
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "15px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "15px",
  },

  card: {
    background: "white",
    padding: "15px",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },

  label: { fontSize: "14px", marginBottom: "6px", display: "block" },

  textarea: {
    width: "100%",
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },

  row: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "10px",
    flexWrap: "wrap",
  },

  input: {
    padding: "6px",
    width: "70px",
    border: "1px solid #ccc",
    borderRadius: "5px",
  },

  button: {
    padding: "7px 14px",
    borderRadius: "6px",
    border: "none",
    color: "white",
    cursor: "pointer",
  },

  blue: { background: "#2563eb" },
  green: { background: "#22c55e" },
  red: { background: "#ef4444" },
  gray: { background: "#9ca3af" },

  summaryBox: {
    background: "#eef2ff",
    padding: "12px",
    borderRadius: "8px",
    marginTop: "10px",
  },

  miniBox: {
    background: "white",
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    marginTop: "8px",
  },

  tableCard: {
    background: "white",
    padding: "15px",
    borderRadius: "8px",
    marginTop: "15px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    overflowX: "auto",
  },

  table: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },

  th: {
    background: "#4f46e5",
    color: "white",
    padding: "6px",
    border: "1px solid #ddd",
  },

  td: {
    border: "1px solid #ddd",
    padding: "6px",
    textAlign: "center",
  },

  box: {
    border: "1px solid #ccc",
    width: "36px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  hit: { color: "green", fontWeight: "bold" },
  fault: { color: "red", fontWeight: "bold" },
};

/* ===================== MAIN COMPONENT ===================== */
export default function PageReplacementSimulator() {
  const [framesCount, setFramesCount] = useState(3);
  const [refString, setRefString] = useState("7,0,1,2,0,3,0,4,2,3,0,3,2");
  const [speed, setSpeed] = useState(500);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [results, setResults] = useState(null);
  const timerRef = useRef();
  const canvasRef = useRef();

  const parseRef = () =>
    refString
      .split(/[,\s]+/)
      .map(Number)
      .filter((n) => !isNaN(n));

  /* ===================== ALGORITHMS ===================== */
  const fifo = (pages, cap) => {
    let f = [],
      q = [],
      hits = 0,
      faults = 0,
      t = [];
    pages.forEach((p) => {
      if (f.includes(p)) {
        hits++;
        t.push({ frames: [...f], fault: false });
      } else {
        faults++;
        if (f.length < cap) {
          f.push(p);
          q.push(p);
        } else {
          f[f.indexOf(q.shift())] = p;
          q.push(p);
        }
        t.push({ frames: [...f], fault: true });
      }
    });
    return { timeline: t, hits, faults };
  };

  const lru = (pages, cap) => {
    let f = [],
      rec = {},
      hits = 0,
      faults = 0,
      t = [];
    pages.forEach((p, i) => {
      if (f.includes(p)) {
        hits++;
        rec[p] = i;
        t.push({ frames: [...f], fault: false });
      } else {
        faults++;
        if (f.length < cap) f.push(p);
        else {
          let v = f.reduce((a, b) => (rec[a] < rec[b] ? a : b));
          f[f.indexOf(v)] = p;
        }
        rec[p] = i;
        t.push({ frames: [...f], fault: true });
      }
    });
    return { timeline: t, hits, faults };
  };

  const optimal = (pages, cap) => {
    let f = [],
      hits = 0,
      faults = 0,
      t = [];
    pages.forEach((p, i) => {
      if (f.includes(p)) {
        hits++;
        t.push({ frames: [...f], fault: false });
      } else {
        faults++;
        if (f.length < cap) f.push(p);
        else {
          let idx = f.map((x) => pages.slice(i + 1).indexOf(x));
          let r = idx.includes(-1)
            ? idx.indexOf(-1)
            : idx.indexOf(Math.max(...idx));
          f[r] = p;
        }
        t.push({ frames: [...f], fault: true });
      }
    });
    return { timeline: t, hits, faults };
  };

  const compute = () => {
    const p = parseRef();
    setResults({
      fifo: fifo(p, framesCount),
      lru: lru(p, framesCount),
      optimal: optimal(p, framesCount),
    });
    setStep(0);
  };

  /* ===================== PLAY ANIMATION ===================== */
  useEffect(() => {
    if (playing && results) {
      timerRef.current = setInterval(() => {
        setStep((s) => Math.min(s + 1, parseRef().length - 1));
      }, speed);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, speed, results]);

  /* ===================== GRAPH ===================== */
  useEffect(() => {
    if (!results) return;
    const ctx = canvasRef.current.getContext("2d");
    const data = [
      results.fifo.faults,
      results.lru.faults,
      results.optimal.faults,
    ];

    ctx.clearRect(0, 0, 400, 250);
    const labels = ["FIFO", "LRU", "Optimal"];

    data.forEach((v, i) => {
      ctx.fillStyle = "#4f46e5";
      ctx.fillRect(70 + i * 100, 230 - v * 10, 50, v * 10);
      ctx.fillStyle = "black";
      ctx.fillText(labels[i], 70 + i * 100, 245);
      ctx.fillText(v, 85 + i * 100, 225 - v * 10);
    });
  }, [results]);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          Page Replacement Algorithm Simulator — FIFO / LRU / Optimal

        </div>

        {/* ===================== TOP GRID ===================== */}
        <div style={styles.grid}>
          {/* LEFT PANEL */}
          <div style={styles.card}>
            <label style={styles.label}>
              Reference string (comma or space separated)
            </label>
            <textarea
              style={styles.textarea}
              value={refString}
              onChange={(e) => setRefString(e.target.value)}
            />

            <div style={styles.row}>
              Frames:
              <input
                type="number"
                value={framesCount}
                style={styles.input}
                onChange={(e) => setFramesCount(Number(e.target.value))}
              />
              Speed (ms):
              <input
                type="range"
                min="100"
                max="1500"
                value={speed}
                onChange={(e) => setSpeed(+e.target.value)}
              />
            </div>

            <div style={styles.row}>
              <button
                style={{ ...styles.button, ...styles.blue }}
                onClick={compute}
              >
                Compute
              </button>
              <button
                style={{ ...styles.button, ...styles.green }}
                onClick={() => setPlaying(!playing)}
              >
                {playing ? "Pause" : "Play"}
              </button>
              <button
                style={{ ...styles.button, ...styles.gray }}
                onClick={() => setStep(Math.max(step - 1, 0))}
              >
                ◀
              </button>
              <button
                style={{ ...styles.button, ...styles.gray }}
                onClick={() => setStep(step + 1)}
              >
                ▶
              </button>
              <button
                style={{ ...styles.button, ...styles.red }}
                onClick={() => setStep(0)}
              >
                Reset
              </button>
            </div>
          </div>

          {/* RIGHT SUMMARY */}
          <div style={styles.card}>
            <b>Summary Metrics</b>
            {results && (
              <>
                <div style={styles.summaryBox}>
                  Frames: {framesCount}
                  <br />
                  Length: {parseRef().length}
                  <br />
                  Step: {step + 1}/{parseRef().length}
                </div>

                {["fifo", "lru", "optimal"].map((k) => (
                  <div key={k} style={styles.miniBox}>
                    <b>{k.toUpperCase()}</b>
                    <br />
                    Faults: {results[k].faults}
                    <br />
                    Hits: {results[k].hits}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ===================== TIMELINE TABLE ===================== */}
        {results && (
          <div style={styles.tableCard}>
            <h3>Timeline (visual frames)</h3>

            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Step</th>
                  <th style={styles.th}>Page</th>
                  <th style={styles.th}>FIFO</th>
                  <th style={styles.th}>LRU</th>
                  <th style={styles.th}>Optimal</th>
                </tr>
              </thead>
              <tbody>
                {parseRef().map((p, i) => (
                  <tr key={i}>
                    <td style={styles.td}>{i}</td>
                    <td style={styles.td}>{p}</td>

                    {["fifo", "lru", "optimal"].map((k) => (
                      <td style={styles.td} key={k}>
                        <div style={{ display: "flex", gap: "4px" }}>
                          {Array.from({ length: framesCount }).map((_, idx) => (
                            <div key={idx} style={styles.box}>
                              {results[k].timeline[i].frames[idx] ?? "-"}
                            </div>
                          ))}
                        </div>
                        {results[k].timeline[i].fault ? (
                          <span style={styles.fault}>Fault</span>
                        ) : (
                          <span style={styles.hit}>Hit</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <br />
            <h3>Fault Comparison Graph</h3>
            <canvas ref={canvasRef} width="400" height="260" />
          </div>
        )}
        <div style={{ marginTop: "20px", fontSize: "12px", color: "gray" }}>
  Commit 3: UI minor update
</div>

      </div>
    </div>
  );
}
