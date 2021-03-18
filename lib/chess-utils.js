/**
 * Copyright (c) 2019, Chris Oakman
 * Copyright (c) 2019, Justin Fagnani
 * Released under the MIT license
 * https://github.com/justinfagnani/chessboard-element/blob/master/LICENSE.md
 */
import { isString, deepCopy } from './utils.js';
const RUN_ASSERTS = true;
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
export const COLUMNS = 'abcdefgh'.split('');
export const whitePieces = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP'];
export const blackPieces = ['bK', 'bQ', 'bR', 'bB', 'bN', 'bP'];
export const getSquareColor = (square) => square.charCodeAt(0) % 2 ^ square.charCodeAt(1) % 2 ? 'white' : 'black';
export const validSquare = (square) => {
    return isString(square) && square.search(/^[a-h][1-8]$/) !== -1;
};
export const validMove = (move) => {
    // move should be a string
    if (!isString(move))
        return false;
    // move should be in the form of "e2-e4", "f6-d5"
    const squares = move.split('-');
    if (squares.length !== 2)
        return false;
    return validSquare(squares[0]) && validSquare(squares[1]);
};
if (RUN_ASSERTS) {
    console.assert(validSquare('a1'));
    console.assert(validSquare('e2'));
    console.assert(!validSquare('D2'));
    console.assert(!validSquare('g9'));
    console.assert(!validSquare('a'));
    console.assert(!validSquare(true));
    console.assert(!validSquare(null));
    console.assert(!validSquare({}));
}
export const validPieceCode = (code) => {
    return isString(code) && code.search(/^[bw][KQRNBP]$/) !== -1;
};
if (RUN_ASSERTS) {
    console.assert(validPieceCode('bP'));
    console.assert(validPieceCode('bK'));
    console.assert(validPieceCode('wK'));
    console.assert(validPieceCode('wR'));
    console.assert(!validPieceCode('WR'));
    console.assert(!validPieceCode('Wr'));
    console.assert(!validPieceCode('a'));
    console.assert(!validPieceCode(true));
    console.assert(!validPieceCode(null));
    console.assert(!validPieceCode({}));
}
const squeezeFenEmptySquares = (fen) => {
    return fen
        .replace(/11111111/g, '8')
        .replace(/1111111/g, '7')
        .replace(/111111/g, '6')
        .replace(/11111/g, '5')
        .replace(/1111/g, '4')
        .replace(/111/g, '3')
        .replace(/11/g, '2');
};
const expandFenEmptySquares = (fen) => {
    return fen
        .replace(/8/g, '11111111')
        .replace(/7/g, '1111111')
        .replace(/6/g, '111111')
        .replace(/5/g, '11111')
        .replace(/4/g, '1111')
        .replace(/3/g, '111')
        .replace(/2/g, '11');
};
export const validFen = (fen) => {
    if (!isString(fen))
        return false;
    // cut off any move, castling, etc info from the end
    // we're only interested in position information
    fen = fen.replace(/ .+$/, '');
    // expand the empty square numbers to just 1s
    fen = expandFenEmptySquares(fen);
    // FEN should be 8 sections separated by slashes
    const chunks = fen.split('/');
    if (chunks.length !== 8)
        return false;
    // check each section
    for (let i = 0; i < 8; i++) {
        if (chunks[i].length !== 8 || chunks[i].search(/[^kqrnbpKQRNBP1]/) !== -1) {
            return false;
        }
    }
    return true;
};
if (RUN_ASSERTS) {
    console.assert(validFen(START_FEN));
    console.assert(validFen('8/8/8/8/8/8/8/8'));
    console.assert(validFen('r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R'));
    console.assert(validFen('3r3r/1p4pp/2nb1k2/pP3p2/8/PB2PN2/p4PPP/R4RK1 b - - 0 1'));
    console.assert(!validFen('3r3z/1p4pp/2nb1k2/pP3p2/8/PB2PN2/p4PPP/R4RK1 b - - 0 1'));
    console.assert(!validFen('anbqkbnr/8/8/8/8/8/PPPPPPPP/8'));
    console.assert(!validFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/'));
    console.assert(!validFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBN'));
    console.assert(!validFen('888888/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'));
    console.assert(!validFen('888888/pppppppp/74/8/8/8/PPPPPPPP/RNBQKBNR'));
    console.assert(!validFen({}));
}
export const validPositionObject = (pos) => {
    if (typeof pos !== 'object' || pos === null) {
        return false;
    }
    for (const [square, piece] of Object.entries(pos)) {
        if (!validSquare(square) || !validPieceCode(piece)) {
            return false;
        }
    }
    return true;
};
if (RUN_ASSERTS) {
    // console.assert(validPositionObject(START_POSITION));
    console.assert(validPositionObject({}));
    console.assert(validPositionObject({ e2: 'wP' }));
    console.assert(validPositionObject({ e2: 'wP', d2: 'wP' }));
    console.assert(!validPositionObject({ e2: 'BP' }));
    console.assert(!validPositionObject({ y2: 'wP' }));
    console.assert(!validPositionObject(null));
    console.assert(!validPositionObject(undefined));
    console.assert(!validPositionObject(1));
    console.assert(!validPositionObject('start'));
    console.assert(!validPositionObject(START_FEN));
}
// convert FEN piece code to bP, wK, etc
const fenToPieceCode = (piece) => {
    // black piece
    if (piece.toLowerCase() === piece) {
        return 'b' + piece.toUpperCase();
    }
    // white piece
    return 'w' + piece.toUpperCase();
};
// convert bP, wK, etc code to FEN structure
const pieceCodeToFen = (piece) => {
    const pieceCodeLetters = piece.split('');
    // white piece
    if (pieceCodeLetters[0] === 'w') {
        return pieceCodeLetters[1].toUpperCase();
    }
    // black piece
    return pieceCodeLetters[1].toLowerCase();
};
// convert FEN string to position object
// returns false if the FEN string is invalid
export const fenToObj = (fen) => {
    if (!validFen(fen))
        return false;
    // cut off any move, castling, etc info from the end
    // we're only interested in position information
    fen = fen.replace(/ .+$/, '');
    const rows = fen.split('/');
    const position = {};
    let currentRow = 8;
    for (let i = 0; i < 8; i++) {
        const row = rows[i].split('');
        let colIdx = 0;
        // loop through each character in the FEN section
        for (let j = 0; j < row.length; j++) {
            // number / empty squares
            if (row[j].search(/[1-8]/) !== -1) {
                const numEmptySquares = parseInt(row[j], 10);
                colIdx = colIdx + numEmptySquares;
            }
            else {
                // piece
                const square = COLUMNS[colIdx] + currentRow;
                position[square] = fenToPieceCode(row[j]);
                colIdx = colIdx + 1;
            }
        }
        currentRow = currentRow - 1;
    }
    return position;
};
export const START_POSITION = fenToObj(START_FEN);
// position object to FEN string
// returns false if the obj is not a valid position object
export const objToFen = (obj) => {
    if (!validPositionObject(obj))
        return false;
    let fen = '';
    let currentRow = 8;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const square = COLUMNS[j] + currentRow;
            // piece exists
            if (obj.hasOwnProperty(square)) {
                fen = fen + pieceCodeToFen(obj[square]);
            }
            else {
                // empty space
                fen = fen + '1';
            }
        }
        if (i !== 7) {
            fen = fen + '/';
        }
        currentRow = currentRow - 1;
    }
    // squeeze the empty numbers together
    fen = squeezeFenEmptySquares(fen);
    return fen;
};
if (RUN_ASSERTS) {
    console.assert(objToFen(START_POSITION) === START_FEN);
    console.assert(objToFen({}) === '8/8/8/8/8/8/8/8');
    console.assert(objToFen({ a2: 'wP', b2: 'bP' }) === '8/8/8/8/8/8/Pp6/8');
}
export const normalizePozition = (position) => {
    if (position == null) {
        return {};
    }
    // start position
    if (isString(position) && position.toLowerCase() === 'start') {
        position = deepCopy(START_POSITION);
    }
    // convert FEN to position object
    if (validFen(position)) {
        position = fenToObj(position);
    }
    return position;
};
// returns the distance between two squares
const squareDistance = (squareA, squareB) => {
    const squareAArray = squareA.split('');
    const squareAx = COLUMNS.indexOf(squareAArray[0]) + 1;
    const squareAy = parseInt(squareAArray[1], 10);
    const squareBArray = squareB.split('');
    const squareBx = COLUMNS.indexOf(squareBArray[0]) + 1;
    const squareBy = parseInt(squareBArray[1], 10);
    const xDelta = Math.abs(squareAx - squareBx);
    const yDelta = Math.abs(squareAy - squareBy);
    if (xDelta >= yDelta)
        return xDelta;
    return yDelta;
};
// returns an array of closest squares from square
const createRadius = (square) => {
    const squares = [];
    // calculate distance of all squares
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const s = COLUMNS[i] + (j + 1);
            // skip the square we're starting from
            if (square === s)
                continue;
            squares.push({
                square: s,
                distance: squareDistance(square, s),
            });
        }
    }
    // sort by distance
    squares.sort(function (a, b) {
        return a.distance - b.distance;
    });
    // just return the square code
    const surroundingSquares = [];
    for (let i = 0; i < squares.length; i++) {
        surroundingSquares.push(squares[i].square);
    }
    return surroundingSquares;
};
// returns the square of the closest instance of piece
// returns false if no instance of piece is found in position
export const findClosestPiece = (position, piece, square) => {
    // create array of closest squares from square
    const closestSquares = createRadius(square);
    // search through the position in order of distance for the piece
    for (let i = 0; i < closestSquares.length; i++) {
        const s = closestSquares[i];
        if (position.hasOwnProperty(s) && position[s] === piece) {
            return s;
        }
    }
    return false;
};
// given a position and a set of moves, return a new position
// with the moves executed
export const calculatePositionFromMoves = (position, moves) => {
    const newPosition = deepCopy(position);
    for (const i in moves) {
        if (!moves.hasOwnProperty(i))
            continue;
        // skip the move if the position doesn't have a piece on the source square
        if (!newPosition.hasOwnProperty(i))
            continue;
        const piece = newPosition[i];
        delete newPosition[i];
        newPosition[moves[i]] = piece;
    }
    return newPosition;
};
// TODO: add some asserts here for calculatePositionFromMoves
//# sourceMappingURL=chess-utils.js.map