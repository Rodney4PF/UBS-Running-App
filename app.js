function init() {
  const startScreen = document.getElementById("start-screen");
  const startButton = document.getElementById("start-button");
  if (!startScreen || !startButton) return;
  startButton.addEventListener("click", () => {
    startScreen.style.display = "none";
    startGame();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

function startGame() {
  const container = document.getElementById("game-container");
  ReactDOM.createRoot(container).render(<SavingsRunner />);
}

function SavingsRunner() {
  const [playerX, setPlayerX] = React.useState(50);
  const [coins, setCoins] = React.useState([]);
  const [obstacles, setObstacles] = React.useState([]);
  const [score, setScore] = React.useState(0);
  const [gameOver, setGameOver] = React.useState(false);

  React.useEffect(() => {
    if (gameOver) return;
    const coinInterval = setInterval(() => {
      setCoins((prev) => [...prev, { x: Math.random() * 90, y: 0 }]);
    }, 1300);
    return () => clearInterval(coinInterval);
  }, [gameOver]);

  const generatePositions = React.useCallback((count, minGapPct) => {
    const positions = [];
    let attempts = 0;
    while (positions.length < count && attempts < 50) {
      attempts++;
      const candidate = Math.random() * 90;
      if (positions.every((p) => Math.abs(p - candidate) >= minGapPct)) {
        positions.push(candidate);
      }
    }
    while (positions.length < count) positions.push(Math.random() * 90);
    return positions;
  }, []);

  React.useEffect(() => {
    if (gameOver) return;
    const obstacleDelay = Math.max(500, 2000 - score * 12);
    const obstacleCount =
      1 +
      (score > 25 ? 1 : 0) +
      (score > 60 ? 1 : 0) +
      (score > 100 ? 1 : 0) +
      (score > 150 ? 1 : 0);
    const interval = setInterval(() => {
      const xs = generatePositions(obstacleCount, 12);
      setObstacles((prev) => [...prev, ...xs.map((x) => ({ x, y: 0 }))]);
    }, obstacleDelay);
    return () => clearInterval(interval);
  }, [gameOver, score, generatePositions]);

  React.useEffect(() => {
    if (gameOver) return;
    let animationFrame;
    const moveObjects = () => {
      const speed = 1.0 + Math.min(2.0, score / 50);
      setCoins((prev) =>
        prev.map((c) => ({ ...c, y: c.y + speed })).filter((c) => c.y < 100)
      );
      setObstacles((prev) =>
        prev.map((o) => ({ ...o, y: o.y + speed })).filter((o) => o.y < 100)
      );
      animationFrame = requestAnimationFrame(moveObjects);
    };
    animationFrame = requestAnimationFrame(moveObjects);
    return () => cancelAnimationFrame(animationFrame);
  }, [gameOver, score]);

  React.useEffect(() => {
    const W = 300; // container width in px
    const H = 500; // container height in px
    const playerSize = 32;
    const objSize = 24;
    const playerCx = (playerX / 100) * W;
    const playerCy = H - 20 - playerSize / 2; // bottom:20px

    const halfP = playerSize / 2;
    const halfO = objSize / 2;

    // Coin collection
    coins.forEach((c) => {
      const coinCx = (c.x / 100) * W + halfO; // left% + half size
      const coinCy = (c.y / 100) * H + halfO; // top% + half size
      const overlapX = Math.abs(coinCx - playerCx) < halfP + halfO;
      const overlapY = Math.abs(coinCy - playerCy) < halfP + halfO;
      if (overlapX && overlapY) {
        setScore((s) => s + 10);
        setCoins((prev) => prev.filter((coin) => coin !== c));
      }
    });

    // Obstacle collision
    obstacles.forEach((o) => {
      const oCx = (o.x / 100) * W + halfO;
      const oCy = (o.y / 100) * H + halfO;
      const overlapX = Math.abs(oCx - playerCx) < halfP + halfO;
      const overlapY = Math.abs(oCy - playerCy) < halfP + halfO;
      if (overlapX && overlapY) {
        setGameOver(true);
      }
    });
  }, [coins, obstacles, playerX]);

  React.useEffect(() => {
    if (gameOver) return;
    let leftPressed = false;
    let rightPressed = false;
    let shiftPressed = false;
    let rafId;

    const handleKeyDown = (e) => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") leftPressed = true;
      if (k === "ArrowRight" || k === "d" || k === "D") rightPressed = true;
      if (k === "Shift") shiftPressed = true;
    };

    const handleKeyUp = (e) => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") leftPressed = false;
      if (k === "ArrowRight" || k === "d" || k === "D") rightPressed = false;
      if (k === "Shift") shiftPressed = false;
    };

    const move = () => {
      setPlayerX((x) => {
        const base = 3.2 + Math.min(2.0, score / 50);
        const boost = shiftPressed ? 1.35 : 1.0;
        const step = base * boost;
        let newX = x;
        if (leftPressed && !rightPressed) newX = Math.max(0, x - step);
        if (rightPressed && !leftPressed) newX = Math.min(90, x + step);
        return newX;
      });
      rafId = requestAnimationFrame(move);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    rafId = requestAnimationFrame(move);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [gameOver, score]);

  return (
    <div>
      <div className="game-container">
        <div className="player" style={{ left: `${playerX}%` }}></div>
        {coins.map((c, i) => (
          <div key={i} className="coin" style={{ left: `${c.x}%`, top: `${c.y}%` }}></div>
        ))}
        {obstacles.map((o, i) => (
          <div key={i} className="obstacle" style={{ left: `${o.x}%`, top: `${o.y}%` }}></div>
        ))}
        {gameOver && (
          <div className="overlay">
            <h2>Game Over!</h2>
            <p>Du hast {score} KeyClub Punkte gewonnen 🎉</p>
            <button
              onClick={() => {
                setScore(0);
                setCoins([]);
                setObstacles([]);
                setGameOver(false);
              }}
            >
              Nochmal spielen
            </button>
          </div>
        )}
      </div>
      <div className="score-board">Score: {score} CHF</div>
    </div>
  );
}
