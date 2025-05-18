// Terminal.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function Terminal() {
  const [log, setLog] = useState([]);
  const [input, setInput] = useState("");
  const [booting, setBooting] = useState(true);
  const [currentLevel, setCurrentLevel] = useState(0);
  const terminalRef = useRef();
  const bootedOnceRef = useRef(false);
  const typingDelay = 50; // ms per character

  useEffect(() => {
    axios.post("/start", { level: 0 });
  }, []);

  useEffect(() => {
    if (bootedOnceRef.current) return;
    bootedOnceRef.current = true;

    const bootSequence = [
      "Booting Hacker Terminal v3.2...",
      "Establishing secure link...",
      "Initializing AI adversary...",
      "🧠 AI defense system active.",
      "Type your first command below to begin."
    ];

    let i = 0;

    const typeLine = () => {
      if (i < bootSequence.length) {
        const line = bootSequence[i];
        let typed = "";
        let j = 0;
        const interval = setInterval(() => {
          typed += line[j];
          setLog((prev) => [...prev.slice(0, -1), typed + "|"]);
          j++;
          if (j === line.length) {
            clearInterval(interval);
            setLog((prev) => [...prev.slice(0, -1), line]);
            i++;
            typeLine();
          }
        }, typingDelay);
      } else {
        setBooting(false);
      }
    };

    setLog([""]);
    typeLine();
  }, []);

  useEffect(() => {
    const terminal = terminalRef.current;
    const isAtBottom = terminal.scrollHeight - terminal.scrollTop <= terminal.clientHeight + 100;
    if (isAtBottom) {
      setTimeout(() => {
        terminal.scrollTo({ top: terminal.scrollHeight, behavior: "smooth" });
      }, 100);
    }
  }, [log, input]);

  const getColor = (line) => {
    if (!line || typeof line !== "string") return "#f8f8f2";
    if (line.includes("✅")) return "lime";
    if (line.includes("❌")) return "#ff5555";
    if (line.includes("⚠️")) return "#ffff66";
    if (line.includes("💀")) return "#ff4444";
    if (line.includes("🎉") || line.includes("🎯")) return "#66d9ef";
    if (line.includes("🔒")) return "#ffaa00";
    if (line.includes("🔁")) return "#ff00ff"; // mutation flicker
    return "#f8f8f2";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendCommand();
  };

  const sendCommand = async () => {
    if (!input.trim()) return;
    const newLog = [`> ${input}`];
    const cmd = input.toLowerCase();

    if (cmd === "list") {
      try {
        const res = await axios.get("/levels");
        const levels = res.data;
        newLog.push("📋 Available Missions:");
        levels.forEach((level) => {
          if (level.locked) {
            newLog.push(`🔒 ${level.index} - ${level.name}`);
          } else if (level.completed) {
            newLog.push(`✅ ${level.index} - ${level.name} [COMPLETED]`);
          } else {
            newLog.push(`🧠 ${level.index} - ${level.name}`);
          }
        });
      } catch {
        newLog.push("⚠️ Failed to load mission list.");
      }
      setLog((prev) => [...prev, ...newLog]);
      setInput("");
      return;
    }

    if (cmd.startsWith("load ")) {
      const levelIndex = parseInt(input.split(" ")[1]);
      if (!isNaN(levelIndex)) {
        try {
          const res = await axios.post("/start", { level: levelIndex });
          const { message, briefing, objective } = res.data;
          if (briefing && objective) {
            setCurrentLevel(levelIndex);
            newLog.push(`🧠 ${message}`);
            newLog.push(`📜 Briefing: ${briefing}`);
            newLog.push(`🎯 Objective: ${objective}`);
          } else {
            newLog.push(`⚠️ ${message}`);
          }
        } catch {
          newLog.push("⚠️ Failed to load mission.");
        }
        setLog((prev) => [...prev, ...newLog]);
        setInput("");
        return;
      }
    }

    try {
      const response = await axios.post("/action", { tool: input });
      const { result, ai_response, ai_mutation, score, status } = response.data;
      if (result) newLog.push(result);
      if (ai_response) newLog.push(`🧠 ${ai_response}`);
      if (ai_mutation) newLog.push(`🔁 ${ai_mutation}`);
      if (status === "win" || status === "lose") {
        newLog.push(`🎯 Final Score: ${score}`);
        newLog.push(`🧠 Type 'load <index>' to continue or 'list' to view missions.`);
      }
    } catch {
      newLog.push("⚠️ Server error. Try again.");
    }

    setLog((prev) => [...prev, ...newLog]);
    setInput("");
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      width: "100vw",
      backgroundColor: "#0d0d0d",
      fontFamily: "monospace",
      color: "#0f0",
      overflow: "hidden"
    }}>
      <div
        ref={terminalRef}
        style={{
          flexGrow: 1,
          padding: "1rem",
          backgroundColor: "#1a1a1a",
          overflowY: "auto",
          whiteSpace: "pre-wrap"
        }}
      >
        {log.map((line, i) => (
          <div key={i} style={{ color: getColor(line), marginBottom: "4px" }}>{line}</div>
        ))}

        {!booting && (
          <div>
            <span style={{ color: "#0f0" }}>&gt; </span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#0f0",
                fontFamily: "monospace",
                fontSize: "1rem",
                width: "90%"
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Terminal;
