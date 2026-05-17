import { Scene, PointerEventTypes, AbstractMesh, Color3 } from '@babylonjs/core';
import { GameEngine } from './GameEngine';
import { BoardRenderer } from './BoardRenderer';
import { PieceRenderer } from './PieceRenderer';
import { AssetManager } from './AssetManager';
import { EffectManager } from './EffectManager';
import { SoundManager } from './SoundManager';
import { useGameStore } from '../stores/gameStore';
import { ChessAI } from '../ai/ChessAI';

export class GameManager {
  private engine: GameEngine;
  private board: BoardRenderer;
  private pieces: PieceRenderer;
  private assets: AssetManager;
  private effects: EffectManager;
  private sounds: SoundManager;
  private ai: ChessAI;
  private gameStore = useGameStore();
  private isAnimating = false;

  constructor(engine: GameEngine) {
    this.engine = engine;
    this.board = new BoardRenderer(engine.getScene());
    this.assets = new AssetManager(engine.getScene());
    this.pieces = new PieceRenderer(engine.getScene(), this.assets);
    this.effects = new EffectManager(engine.getScene());
    this.sounds = new SoundManager(engine.getScene());
    this.ai = new ChessAI();

    this.setupInteraction();
    this.initModels();
  }

  private async initModels() {
    try {
      this.engine.rotateCameraForSide(this.gameStore.playerColor);

      // Load all 6 individual piece GLBs in parallel
      await this.assets.loadAllPieces();

      this.syncBoard();

      if (this.gameStore.playerColor === 'b' && this.gameStore.status.turn === 'w') {
        setTimeout(() => this.handleAIMove(), 1000);
      }
    } catch (e) {
      console.warn('Failed to load piece models, falling back to primitives', e);
      this.syncBoard();
    }
  }

  private setupInteraction() {
    const scene = this.engine.getScene();

    scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
        if (pointerInfo.pickInfo?.hit && pointerInfo.pickInfo.pickedMesh) {
          this.handlePick(pointerInfo.pickInfo.pickedMesh as Mesh);
        }
      }
    });
  }

  private async handlePick(mesh: AbstractMesh) {
    if (this.isAnimating) return;

    const metadata = mesh.metadata;
    if (!metadata) return;

    let targetSquare = metadata.squareName;
    // A mesh is a piece if it has metadata.type (set in createPiece)
    // Child meshes of a piece inherit metadata via the parent root
    let targetPiece: AbstractMesh | null = metadata.type ? mesh : null;

    // If we clicked a board square or a child mesh with no type, check if a piece sits there
    if (!targetPiece) {
      // Walk up to find a parent with metadata.type
      let node = mesh.parent;
      while (node) {
        if ((node as AbstractMesh).metadata?.type) {
          targetPiece = node as AbstractMesh;
          targetSquare = targetPiece.metadata.squareName;
          break;
        }
        node = node.parent;
      }
    }

    if (!targetPiece && metadata.squareName) {
      const pieceOnSquare = this.findPieceMeshAt(metadata.squareName);
      if (pieceOnSquare && pieceOnSquare.metadata.color === this.gameStore.status.turn) {
        targetPiece = pieceOnSquare;
      }
    }

    if (targetPiece && targetPiece.metadata.color === this.gameStore.playerColor && this.gameStore.isMyTurn) {
      this.gameStore.selectSquare(targetPiece.metadata.squareName);
      this.highlightValidMoves();
      return;
    }

    if (this.gameStore.selectedSquare && targetSquare) {
      await this.tryMove(targetSquare);
    }
  }

  private async tryMove(toSquare: string) {
    const fromSquare = this.gameStore.selectedSquare!;
    const move = { from: fromSquare, to: toSquare };

    const validMove = this.gameStore.validMoves.find(m => m.to === toSquare);

    if (validMove) {
      this.isAnimating = true;
      const result = await this.gameStore.makeMove(move);
      if (result) {
        const pieceMesh = this.findPieceMeshAt(fromSquare);
        if (pieceMesh) {
          if (validMove.captured) {
            this.sounds.playSound('capture');
            await this.playCinematicAttack(fromSquare, toSquare, validMove.captured);
          } else {
            this.sounds.playSound('move');
            await this.pieces.movePiece(pieceMesh.name, this.parseSquare(toSquare).row, this.parseSquare(toSquare).col);
          }
        }
      }
      this.isAnimating = false;
      // Use incremental sync to avoid full rebuild
      this.syncBoard();

      if (!this.gameStore.isMultiplayer && !this.gameStore.isMyTurn && !this.gameStore.status.isGameOver) {
        setTimeout(() => this.handleAIMove(), 800);
      }
    }

    this.clearHighlights();
  }

  private async playCinematicAttack(from: string, to: string, capturedType: string) {
    const attacker = this.findPieceMeshAt(from);
    const target = this.findPieceMeshAt(to);

    if (!attacker || !target) return;

    const targetPos = target.position.clone();

    this.engine.focusCameraOn(targetPos);
    this.pieces.playAttackAnimation(attacker.name);

    await new Promise(resolve => setTimeout(resolve, 800));

    this.effects.createMagicExplosion(targetPos);
    this.sounds.playSound('capture');

    await this.pieces.capturePiece(target.name);

    const toSquare = this.parseSquare(to);
    await this.pieces.movePiece(attacker.name, toSquare.row, toSquare.col);

    await new Promise(resolve => setTimeout(resolve, 800));
  }

  public syncBoard() {
    if (this.isAnimating) return;
    const boardState = this.gameStore.game.getBoard();
    this.pieces.syncBoardIncremental(boardState);
  }

  /** Full reset — clears all pieces and rebuilds from scratch */
  public resetBoard() {
    this.pieces.clearPieces();
    this.syncBoard();
  }

  private highlightValidMoves() {
    this.clearHighlights();

    if (this.gameStore.selectedSquare) {
      const pieceMesh = this.findPieceMeshAt(this.gameStore.selectedSquare);
      if (pieceMesh) this.pieces.highlightPiece(pieceMesh.name);

      const from = this.parseSquare(this.gameStore.selectedSquare);
      this.board.highlightSquare(from.row, from.col, new Color3(0, 0.5, 1));

      for (const move of this.gameStore.validMoves) {
        const to = this.parseSquare(move.to);
        if (move.captured) {
          this.board.highlightSquare(to.row, to.col, new Color3(1, 0, 0));
        } else {
          this.board.highlightSquare(to.row, to.col, new Color3(0, 1, 0));
        }
      }
    }
  }

  private clearHighlights() {
    this.board.clearHighlights();
    this.pieces.clearSelection();
  }

  private parseSquare(square: string) {
    const files = 'abcdefgh';
    const col = files.indexOf(square[0]);
    const row = parseInt(square[1]) - 1;
    return { row, col };
  }

  public async handleAIMove() {
    if (this.gameStore.status.isGameOver) return;
    if (this.gameStore.isMyTurn) return;

    const bestMoveStr = this.ai.getBestMove(this.gameStore.game.getFEN());
    if (!bestMoveStr) return;

    const moves = this.gameStore.game.getAllValidMoves();
    const move = moves.find(m => m.san === bestMoveStr || m.lan === bestMoveStr || (m.from + m.to) === bestMoveStr);

    if (!move) {
      console.warn('AI returned a move that we couldn\'t parse:', bestMoveStr);
      return;
    }

    this.gameStore.selectSquare(move.from);
    this.highlightValidMoves();

    await new Promise(resolve => setTimeout(resolve, 800));
    await this.tryMove(move.to);
  }

  private findPieceMeshAt(squareName: string): AbstractMesh | null {
    return this.pieces.getPieceAt(squareName);
  }

  private getSquareName(row: number, col: number): string {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    return `${files[col]}${row + 1}`;
  }
}
