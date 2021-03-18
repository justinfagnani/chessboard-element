/**
 * Copyright (c) 2019, Chris Oakman
 * Copyright (c) 2019, Justin Fagnani
 * Released under the MIT license
 * https://github.com/justinfagnani/chessboard-element/blob/master/LICENSE.md
 */
export declare type Piece = string;
export declare type PositionObject = {
    [square: string]: Piece | undefined;
};
export declare type Position = PositionObject | 'start' | string;
export declare const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
export declare const COLUMNS: string[];
export declare const whitePieces: string[];
export declare const blackPieces: string[];
export declare const getSquareColor: (square: string) => "white" | "black";
export declare const validSquare: (square: unknown) => square is string;
export declare const validMove: (move: unknown) => move is string;
export declare const validPieceCode: (code: unknown) => code is string;
export declare const validFen: (fen: unknown) => fen is string;
export declare const validPositionObject: (pos: unknown) => pos is PositionObject;
export declare const fenToObj: (fen: string) => false | PositionObject;
export declare const START_POSITION: PositionObject;
export declare const objToFen: (obj: PositionObject) => string | false;
export declare const normalizePozition: (position: Position | null) => PositionObject;
export declare const findClosestPiece: (position: PositionObject, piece: string, square: string) => string | false;
export declare const calculatePositionFromMoves: (position: PositionObject, moves: {
    [from: string]: string;
}) => any;
//# sourceMappingURL=chess-utils.d.ts.map