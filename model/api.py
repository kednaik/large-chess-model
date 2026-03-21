import torch
import torch.nn as nn
import chess
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)



# ==========================================
# 2. MODEL 2: VIT DUAL
# ==========================================
VOCAB_VIT = {
    'EMPTY': 0, 'P': 1, 'N': 2, 'B': 3, 'R': 4, 'Q': 5, 'K': 6,
    'p': 7, 'n': 8, 'b': 9, 'r': 10, 'q': 11, 'k': 12,
    '[W_WIN]': 13, '[B_WIN]': 14, '[DRAW]': 15,
    '[INIT]': 16, '[W_MOVE]': 17, '[B_MOVE]': 18,
    '[W_KSC]': 19, '[W_QSC]': 20, '[B_KSC]': 21, '[B_QSC]': 22,
    '[NO_CASTLE]': 23,
    '[EP_A]': 24, '[EP_B]': 25, '[EP_C]': 26, '[EP_D]': 27, 
    '[EP_E]': 28, '[EP_F]': 29, '[EP_G]': 30, '[EP_H]': 31, '[EP_NONE]': 32,
    '[ELO_0]': 33, '[ELO_1]': 34, '[ELO_2]': 35, '[ELO_3]': 36, '[ELO_4]': 37,
    '[ELO_5]': 38, '[ELO_6]': 39, '[ELO_7]': 40, '[ELO_8]': 41, '[ELO_9]': 42,
    '[PAD]': 43, '[MASK]': 44
}

class ViTChessHybrid(nn.Module):
    def __init__(self, d_model=256, nhead=8, num_layers=8, dropout=0.1):
        super().__init__()
        self.d_model = d_model
        self.vocab_size = len(VOCAB_VIT)

        self.meta_embedding = nn.Embedding(self.vocab_size, d_model)
        self.meta_pos_encoding = nn.Parameter(torch.randn(1, 9, d_model))

        self.board_embedding = nn.Embedding(self.vocab_size, d_model)
        self.pos_embed_2d = nn.Parameter(torch.randn(1, 64, d_model))

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model, nhead=nhead, batch_first=True, dropout=dropout
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)

        self.policy_head = nn.Linear(d_model, self.vocab_size)
        self.value_head = nn.Sequential(
            nn.Linear(d_model * 73, 256),
            nn.ReLU(),
            nn.Linear(256, 1),
            nn.Tanh()
        )

    def forward(self, x):
        batch_size = x.size(0)
        meta_tokens = x[:, :9]
        meta_emb = self.meta_embedding(meta_tokens) + self.meta_pos_encoding

        board_tokens = x[:, 9:]
        board_emb = self.board_embedding(board_tokens) + self.pos_embed_2d

        full_seq = torch.cat([meta_emb, board_emb], dim=1)
        latent = self.transformer(full_seq)

        board_latent = latent[:, 9:, :] 
        policy_logits = self.policy_head(board_latent)

        flat_latent = latent.reshape(batch_size, -1)
        value_score = self.value_head(flat_latent)
        return policy_logits, value_score



def encode_state_vit(board, win_token, white_elo_str, black_elo_str):
    def get_elo_token(elo_str):
        try:
            elo = int(elo_str)
            if elo < 1000: return VOCAB_VIT['[ELO_0]']
            if elo >= 2600: return VOCAB_VIT['[ELO_9]']
            return VOCAB_VIT[f'[ELO_{(elo - 1000) // 200 + 1}]']
        except: 
            return VOCAB_VIT['[ELO_4]']

    w_elo = get_elo_token(white_elo_str)
    b_elo = get_elo_token(black_elo_str)
    
    seq = [win_token, w_elo, b_elo]
    
    if board.fullmove_number == 1 and board.turn == chess.WHITE:
        seq.append(VOCAB_VIT['[INIT]'])
    else:
        seq.append(VOCAB_VIT['[W_MOVE]'] if board.turn == chess.WHITE else VOCAB_VIT['[B_MOVE]'])
        
    NC = VOCAB_VIT['[NO_CASTLE]']
    seq.append(VOCAB_VIT['[W_KSC]'] if board.has_kingside_castling_rights(chess.WHITE) else NC)
    seq.append(VOCAB_VIT['[W_QSC]'] if board.has_queenside_castling_rights(chess.WHITE) else NC)
    seq.append(VOCAB_VIT['[B_KSC]'] if board.has_kingside_castling_rights(chess.BLACK) else NC)
    seq.append(VOCAB_VIT['[B_QSC]'] if board.has_queenside_castling_rights(chess.BLACK) else NC)
    
    ep = board.ep_square
    seq.append(VOCAB_VIT[f'[EP_{chess.square_name(ep)[0].upper()}]'] if ep else VOCAB_VIT['[EP_NONE]'])
    
    for s in chess.SQUARES:
        p = board.piece_at(s)
        seq.append(VOCAB_VIT[p.symbol()] if p else VOCAB_VIT['EMPTY'])
        
    return seq

def get_best_move_vit(model, board, device, whiteElo, blackElo):
    model.eval()
    win_token = VOCAB_VIT['[W_WIN]'] if board.turn == chess.WHITE else VOCAB_VIT['[B_WIN]']
    input_seq = encode_state_vit(board, win_token, whiteElo, blackElo)
    input_tensor = torch.tensor(input_seq).unsqueeze(0).to(device)
    
    with torch.no_grad():
        policy_logits, _ = model(input_tensor)
        probs = torch.softmax(policy_logits[0], dim=-1) # (64, vocab_size)

    best_move = None
    best_score = -float('inf')
    
    for move in board.legal_moves:
        board.push(move)
        score = 0.0
        for s in chess.SQUARES:
            p = board.piece_at(s)
            target_token = VOCAB_VIT[p.symbol()] if p else VOCAB_VIT['EMPTY']
            score += torch.log(probs[s, target_token] + 1e-9).item()
        board.pop()
        
        if score > best_score:
            best_score = score
            best_move = move
            
    return best_move

# ==========================================
# 3. API SETUP & LOAD WEIGHTS
# ==========================================
device = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")
print(f"Loading Models on device: {device}")

# Load ViT-Hybrid (Dual Head)
model_vit_hybrid = ViTChessHybrid(d_model=256, nhead=8, num_layers=8, dropout=0.1).to(device)
vit_hybrid_path = "../checkpoints/run_20260313_133630/chess_vit_latest.pt"
try:
    ckpt = torch.load(vit_hybrid_path, map_location=device, weights_only=True)
    if isinstance(ckpt, dict) and 'model' in ckpt:
        model_vit_hybrid.load_state_dict(ckpt['model'])
    else:
        model_vit_hybrid.load_state_dict(ckpt)
    model_vit_hybrid.eval()
    print("ViT-Hybrid (Dual) Model loaded successfully!")
except Exception as e:
    print(f"FAILED to load ViT-Hybrid from {vit_hybrid_path}. Error: {e}")


app = FastAPI(title="Multi-Model Chess API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class MoveRequest(BaseModel):
    fen: str
    whiteElo: str = "2600"
    blackElo: str = "2600"
    modelVersion: str = "vit_hybrid"

@app.post("/api/move")
def predict_move(request: MoveRequest):
    logger.info(f"Received move request: FEN={request.fen}, WhiteElo={request.whiteElo}, BlackElo={request.blackElo}")
    try:
        board = chess.Board(request.fen)
    except Exception as e:
        logger.error(f"Invalid FEN provided: {request.fen}. Error: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid FEN: {str(e)}")
        
    if board.is_game_over():
        logger.warning(f"Request for move on completed game: {request.fen}")
        raise HTTPException(status_code=400, detail="Game is already over")
        
    best_move = get_best_move_vit(model_vit_hybrid, board, device, request.whiteElo, request.blackElo)
    
    if best_move is None:
        logger.error(f"Model failed to generate a move for FEN: {request.fen}")
        raise HTTPException(status_code=500, detail="Model could not generate a move")
        
    logger.info(f"Generated move: {board.san(best_move)} ({best_move.uci()})")
        
    return {
        "move_san": board.san(best_move),
        "move_uci": best_move.uci(),
        "fen": request.fen,
        "model_used": request.modelVersion
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
