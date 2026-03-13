import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import type { Square, Move } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Settings, RefreshCw, Cpu, User } from 'lucide-react';
import './index.css';

function App() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [history, setHistory] = useState<Move[]>([]);
  
  // Settings State
  const [whiteElo, setWhiteElo] = useState('2600');
  const [blackElo, setBlackElo] = useState('2600');
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [gameMode, setGameMode] = useState<'player_vs_ai' | 'player_vs_player' | 'ai_vs_ai'>('player_vs_ai');
  const [pendingGameMode, setPendingGameMode] = useState<'player_vs_ai' | 'player_vs_player' | 'ai_vs_ai' | null>(null);

  function onDrop(sourceSquare: string, targetSquare: string, piece: string) {
    try {
      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn());
      const moveResult = gameCopy.move({
        from: sourceSquare as Square,
        to: targetSquare as Square,
        promotion: piece[1].toLowerCase() ?? 'q'
      });
      
      if (moveResult) {
        setGame(gameCopy);
        setFen(gameCopy.fen());
        setHistory(gameCopy.history({ verbose: true }) as Move[]);
        return true;
      }
    } catch {
      // Invalid move caught by chess.js
      return false;
    }
    return false;
  }

  function resetGame() {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setHistory([]);
    setIsBotThinking(false);
  }

  // --- Auto-play Logic based on Game Mode ---
  useEffect(() => {
    if (game.isGameOver() || isBotThinking) return;

    let timeoutId: NodeJS.Timeout;

    if (gameMode === 'player_vs_ai' && game.turn() === 'b') {
      // AI plays Black with 2 second delay
      timeoutId = setTimeout(() => {
        requestBotMove('v1');
      }, 2000);
    } else if (gameMode === 'ai_vs_ai') {
      // AI plays both sides with 5 second delay (ViT is White, V1 is Black)
      timeoutId = setTimeout(() => {
        requestBotMove(game.turn() === 'w' ? 'vit' : 'v1');
      }, 5000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fen, gameMode, isBotThinking, game]);

  // Handle Engine Request calling the PyTorch API
  async function requestBotMove(modelVersion: 'v1' | 'vit' = 'v1') {
    if (game.isGameOver()) return;
    
    setIsBotThinking(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fen: game.fen(),
          whiteElo: whiteElo,
          blackElo: blackElo,
          modelVersion: modelVersion
        })
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${await response.text()}`);
      }
      
      const data = await response.json();
      
      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn());
      
      // The API gives us 'move_uci' (e.g., e2e4)
      gameCopy.move(data.move_uci);
      
      setGame(gameCopy);
      setFen(gameCopy.fen());
      setHistory(gameCopy.history({ verbose: true }) as Move[]);
      
    } catch (error) {
      console.error("Failed to fetch move from API:", error);
      alert("Error contacting the chess AI engine. Make sure the python API is running!");
    } finally {
      setIsBotThinking(false);
    }
  }

  // Format move history nicely for the sidebar
  const renderHistory = () => {
    const rows = [];
    for (let i = 0; i < history.length; i += 2) {
      const whiteMove = history[i];
      const blackMove = history[i + 1];
      
      rows.push(
        <div key={i} className="move-history" style={{ display: 'grid', gridTemplateColumns: '2rem 1fr 1fr' }}>
          <div className="move-number">{Math.floor(i / 2) + 1}.</div>
          <div className="move-san">{whiteMove.san}</div>
          <div className="move-san">{blackMove ? blackMove.san : ''}</div>
        </div>
      );
    }
    return rows;
  };

  return (
    <div className="app-container">
      {/* LEFT: The Board Area */}
      <div className="board-column">
        {/* Top Player (Black) */}
        <div className="player-info">
          <div className="player-name">
            <div className="player-avatar">
              {gameMode === 'player_vs_player' ? <User size={18} /> : <Cpu size={18} />}
            </div>
            {gameMode === 'player_vs_player' ? 'Player 2 (Black)' : gameMode === 'ai_vs_ai' ? `AiChessEngine-V1 (${blackElo})` : `AiChessEngine (${blackElo})`}
          </div>
          {isBotThinking && game.turn() === 'b' && <span style={{ color: 'var(--accent-color)' }}>Thinking...</span>}
        </div>

        {/* The Board - isolated with no padding or siblings affecting coordinates */}
        <Chessboard 
          id="BasicBoard"
          position={fen} 
          onPieceDrop={onDrop}
          arePiecesDraggable={
            !isBotThinking && 
            !game.isGameOver() && 
            (gameMode === 'player_vs_player' || (gameMode === 'player_vs_ai' && game.turn() === 'w'))
          }
          customDarkSquareStyle={{ backgroundColor: '#2e3545' }}
          customLightSquareStyle={{ backgroundColor: '#e2e8f0' }}
          customBoardStyle={{
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        />

        {/* Bottom Player (White) */}
        <div className="player-info">
          <div className="player-name">
            <div className="player-avatar">
              {gameMode === 'ai_vs_ai' ? <Cpu size={18} /> : <User size={18} />}
            </div>
            {gameMode === 'ai_vs_ai' ? `AiChessEngine-ViT (${whiteElo})` : `You (${whiteElo})`}
          </div>
          {isBotThinking && game.turn() === 'w' && <span style={{ color: 'var(--accent-color)' }}>Thinking...</span>}
        </div>
      </div>

      {/* RIGHT: Controls & Settings */}
      <section className="controls-section glass-panel">
        <div className="panel-header">
          <h2 className="panel-title"><Settings size={20} /> Model Configuration</h2>
        </div>
        
        <div className="panel-content">
          <div className="form-group">
            <label className="form-label">Target ELO (White)</label>
            <select 
              className="form-select" 
              value={whiteElo} 
              onChange={(e) => setWhiteElo(e.target.value)}
            >
              <option value="1200">[ELO_1] 1200 - Beginner</option>
              <option value="1600">[ELO_3] 1600 - Intermediate</option>
              <option value="2000">[ELO_5] 2000 - Expert</option>
              <option value="2600">[ELO_8] 2600 - Grandmaster</option>
              <option value="2800">[ELO_9] 2800+ Super GM</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Target ELO (Black)</label>
            <select 
              className="form-select" 
              value={blackElo} 
              onChange={(e) => setBlackElo(e.target.value)}
            >
              <option value="1200">[ELO_1] 1200 - Beginner</option>
              <option value="1600">[ELO_3] 1600 - Intermediate</option>
              <option value="2000">[ELO_5] 2000 - Expert</option>
              <option value="2600">[ELO_8] 2600 - Grandmaster</option>
              <option value="2800">[ELO_9] 2800+ Super GM</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Game Mode</label>
            <select 
              className="form-select" 
              value={gameMode} 
              onChange={(e) => {
                const newMode = e.target.value as 'player_vs_ai' | 'player_vs_player' | 'ai_vs_ai';
                if (gameMode !== newMode) {
                  // Trigger custom confirmation dialog instead of window.confirm
                  setPendingGameMode(newMode);
                }
              }}
            >
              <option value="player_vs_ai">1. Player vs AI</option>
              <option value="player_vs_player">2. Player vs Player</option>
              <option value="ai_vs_ai">3. AI vs AI</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={resetGame} style={{ flex: 1 }}>
              <RefreshCw size={18} /> Restart Game
            </button>
          </div>

        </div>

        {/* Game Status & History */}
        <div className="panel-header" style={{ borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
          <h2 className="panel-title">Match History</h2>
        </div>
        <div className="panel-content">
          {game.isGameOver() && (
            <div className="game-status">
              Game Over! {
                game.isCheckmate() ? 'Checkmate' : 
                game.isDraw() ? 'Draw' : 
                game.isStalemate() ? 'Stalemate' : ''
              }
            </div>
          )}
          
          <div className="history-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {history.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>
                No moves played yet.
              </div>
            ) : renderHistory()}
          </div>
        </div>
      </section>

      {/* Custom Confirmation Dialog Overlay */}
      {pendingGameMode && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          backgroundColor: 'rgba(10, 15, 30, 0.75)', backdropFilter: 'blur(16px)' 
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #1e253c 0%, #151a2a 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            padding: '40px',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            transform: 'translateY(-2vh)',
            display: 'flex',
            flexDirection: 'column',
            gap: '32px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '0 0 16px 0', color: '#ffffff', letterSpacing: '-0.02em' }}>
                Change Mode
              </h3>
              <p style={{ margin: 0, color: '#a0aec0', fontSize: '1.05rem', lineHeight: '1.6' }}>
                You are switching game modes. Would you like to reset the board and start fresh, or continue playing from the current position?
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button 
                style={{
                  padding: '16px', borderRadius: '14px', border: 'none',
                  background: 'linear-gradient(to right, #3b82f6, #2563eb)',
                  color: 'white', fontSize: '1.05rem', fontWeight: '600',
                  cursor: 'pointer', boxShadow: '0 8px 20px -6px rgba(37, 99, 235, 0.6)',
                  transition: 'all 0.2s ease', outline: 'none'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                onClick={() => {
                  setGameMode(pendingGameMode);
                  resetGame();
                  setPendingGameMode(null);
                }}
              >
                Reset Board
              </button>
              <button 
                style={{
                  padding: '16px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(255, 255, 255, 0.05)', color: 'white', 
                  fontSize: '1.05rem', fontWeight: '600', cursor: 'pointer',
                  transition: 'all 0.2s ease', outline: 'none'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onClick={() => {
                  setGameMode(pendingGameMode);
                  setPendingGameMode(null);
                }}
              >
                Continue Playing
              </button>
              <button 
                style={{
                  padding: '12px', borderRadius: '14px', border: 'none', background: 'transparent',
                  color: '#94a3b8', fontSize: '1rem', fontWeight: '500', cursor: 'pointer',
                  transition: 'color 0.2s ease', marginTop: '4px'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                onClick={() => setPendingGameMode(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
