/**
 * Copyright (c) 2019, Chris Oakman
 * Copyright (c) 2019, Justin Fagnani
 * Released under the MIT license
 * https://github.com/justinfagnani/chessboard-element/blob/master/LICENSE.md
 */
import { LitElement } from 'lit-element';
import { PositionObject, Position, Piece } from './chess-utils.js';
export { fenToObj, objToFen } from './chess-utils.js';
export { renderPiece as renderWikipediaSVGPiece } from './wikipedia-pieces-svg.js';
export declare type AnimationSpeed = 'fast' | 'slow' | number;
export declare type SquareColor = 'black' | 'white';
export declare type Offset = {
    top: number;
    left: number;
};
export declare type Location = string;
export declare type Action = OffBoardAction | 'drop';
export declare type OffBoardAction = 'trash' | 'snapback';
export declare type Animation = {
    type: 'move';
    source: string;
    destination: string;
    piece: string;
    square?: undefined;
} | {
    type: 'move-start';
    source: string;
    destination: string;
    piece: string;
    square?: undefined;
} | {
    type: 'add';
    square: string;
    piece: string;
} | {
    type: 'clear';
    square: string;
    piece: string;
} | {
    type: 'add-start';
    square: string;
    piece: string;
};
declare global {
    interface ImportMeta {
        url: string;
    }
    interface HTMLElementTagNameMap {
        'chess-board': ChessBoardElement;
    }
}
export declare type RenderPieceFunction = (piece: Piece, container: Element) => void;
/**
 * A custom element that renders an interactive chess board.
 *
 * @fires mouseover-square - Fired when the cursor is over a square
 *     The event's `detail` object has the following properties:
 *       * `square`: the square that was entered
 *       * `piece`: the piece on that square (or `false` if there is no piece)
 *       * `position`: the current position
 *       * `orientation`: the current orientation.
 *
 *     Note that `mouseover-square` will *not* fire during piece drag and drop.
 *     Use `drag-move` instead.
 *
 * @fires mouseout-square - Fired when the cursor exits a square
 *     The event's `detail` object has the following properties:
 *       `square`: the square that was left
 *       `piece`: the piece on that square (or `false` if there is no piece)
 *       `position`: the current position
 *       `orientation`: the current orientation.
 *
 *     Note that `mouseout-square` will *not* fire during piece drag and drop.
 *     Use `drag-move` instead.
 *
 * @fires snapback-end - Fired when the snapback animation is complete when
 *     pieces are dropped off the board.
 *     The event's `detail` object has the following properties:
 *       * `piece`: the dragged piece
 *       * `square`: the square the piece returned to
 *       * `position`: the current position
 *       * `orientation`: the current orientation.
 *
 * @fires snap-end - Fired when a piece completes a snap animation
 *     The event's `detail` object has the following properties:
 *       * `source`: the source of the dragged piece
 *       * `square`: the target of the dragged piece
 *       * `piece`: the dragged piece
 *
 * @fires drag-start - Fired when a piece is picked up
 *     The event's `detail` object has the following properties:
 *       * `source`: the source of the piece
 *       * `piece`: the piece
 *       * `position`: the current position on the board
 *       * `orientation`: the current orientation.
 *
 *     The drag action is prevented if the listener calls `event.preventDefault()`.
 *
 * @fires drag-move - Fired when a user-initiated drag moves
 *     The event's `detail` object has the following properties:
 *       * `newLocation`: the new location of the piece
 *       * `oldLocation`: the old location of the piece
 *       * `source`: the source of the dragged piece
 *       * `piece`: the piece
 *       * `position`: the current position on the board
 *       * `orientation`: the current orientation.
 *
 * @fires drop - Fired when a user-initiated drag ends
 *     The event's `detail` object has the following properties:
 *       * `source`: the source of the dragged piece
 *       * `target`: the target of the dragged piece
 *       * `piece`: the piece
 *       * `newPosition`: the new position once the piece drops
 *       * `oldPosition`: the old position before the piece was picked up
 *       * `orientation`: the current orientation.
 *       * `setAction(action)`: a function to call to change the default action.
 *         If `'snapback'` is passed to `setAction`, the piece will return to it's source square.
 *         If `'trash'` is passed to `setAction`, the piece will be removed.
 *
 * @fires move-end - Fired when a piece move completes
 *    The event's `detail` object has the following properties:
 *      * `oldPosition`: the old position
 *      * `newPosition`: the new position
 *
 * @fires change - Fired when the board position changes
 *     The event's `detail` property has two properties:
 *       * `value`: the new position
 *       * `oldValue`: the old position
 *
 *     **Warning**: do *not* call any position-changing methods in your event
 *     listener or you may cause an infinite loop. Position-changing methods
 *     are: `clear()`, `move()`, `position()`, and `start()`.
 *
 * @fires error - Fired in the case of invalid attributes.
 *
 * @cssprop [--light-color=#f0d9b5] - The background for white squares and text color for black squares
 * @cssprop [--dark-color=#b58863] - The background for black squares and text color for white squares
 * @cssprop [--highlight-color=yellow] - The highlight color
 *
 * @csspart board - The chess board
 * @csspart square - A square on the board
 * @csspart piece - A chess piece
 * @csspart spare-pieces - The spare piece container
 * @csspart dragged-piece - The currently dragged piece
 * @csspart white - A white square
 * @csspart black - A black square
 * @csspart highlight - A highlighted square
 * @csspart notation - The square location labels
 * @csspart alpha - The alpha (column) labels
 * @csspart numeric - The numeric (row) labels
 */
export declare class ChessBoardElement extends LitElement {
    static styles: import("lit-element").CSSResult;
    /**
     * The current position of the board, as a `PositionObject`. This property may
     * be set externally, but only to valid `PositionObject`s. The value is copied
     * before being applied to the board. Changes to the position object are not
     * reflected in th rendering.
     *
     * To set the position using FEN, or a keyword like `'start'`, or to use
     * animations, use the `setPosition` method.
     */
    get position(): PositionObject;
    set position(v: PositionObject);
    /**
     * Used to indicate whether click-to-move is in process
     */
    clickMove: boolean;
    /**
     * Whether to show the board notation.
     */
    hideNotation: boolean;
    /**
     * Whether to show the board notation. This is always the inverse of
     * `hideNotation`, which reflects the `hide-notation` attribute.
     *
     * @default true
     */
    get showNotation(): boolean;
    set showNotation(v: boolean);
    /**
     * The orientation of the board. `'white'` for the white player at the bottom,
     * `'black'` for the black player at the bottom.
     */
    orientation: SquareColor;
    /**
     * If `true`, pieces on the board are draggable to other squares.
     */
    draggablePieces: boolean;
    /**
     * If `'snapback'`, pieces dropped off the board will return to their original
     * square. If `'trash'`, pieces dropped off the board will be removed from the
     * board.
     *
     * This property has no effect when `draggable` is `false`.
     */
    dropOffBoard: OffBoardAction;
    /**
     * A template string or function used to determine the source of piece images,
     * used by the default `renderPiece` function, which renders an `<img>`
     * element.
     *
     * If `pieceTheme` is a string, the pattern {piece} will be replaced by the
     * piece code. The result should be an an `<img>` source.
     *
     * If `pieceTheme` is a function the first argument is the piece code. The
     * function should return an `<img>` source.
     */
    pieceTheme?: string | ((piece: string) => string);
    /**
     * A function that renders DOM for a piece to a container element. This
     * function can render any elements and text, including SVG.
     *
     * The default value renders an SVG image of the piece, unless the
     * `pieceTheme` property is set, then it uses `pieceTheme` to get the URL for
     * an `<img>` element.
     *
     * @default Function
     */
    renderPiece?: RenderPieceFunction;
    /**
     * Animation speed for when pieces move between squares or from spare pieces
     * to the board.
     */
    moveSpeed: AnimationSpeed;
    /**
     * Animation speed for when pieces that were dropped outside the board return
     * to their original square.
     */
    snapbackSpeed: AnimationSpeed;
    /**
     * Animation speed for when pieces \"snap\" to a square when dropped.
     */
    snapSpeed: AnimationSpeed;
    /**
     * Animation speed for when pieces are removed.
     */
    trashSpeed: AnimationSpeed;
    /**
     * Animation speed for when pieces appear on a square.
     *
     * Note that the "appear" animation only occurs when `sparePieces` is `false`.
     */
    appearSpeed: AnimationSpeed;
    /**
     * If `true`, the board will have spare pieces that can be dropped onto the
     * board. If `sparePieces` is set to `true`, `draggablePieces` gets set to
     * `true` as well.
     */
    sparePieces: boolean;
    private _draggedPieceElement;
    private _highlightedSquares;
    private _animations;
    private _currentPosition;
    private _dragState?;
    private get _squareSize();
    private _getSquareElement;
    private _getSparePieceElement;
    render(): import("lit-element").TemplateResult;
    private _renderSparePieces;
    private _renderDraggedPiece;
    private _renderBoard;
    _renderPiece(piece: Piece | undefined, styles: Partial<CSSStyleDeclaration>, isDragSource?: boolean, id?: string, part?: string): {};
    private _getAnimationStyles;
    private _mousedownSquare;
    private _mousedownSparePiece;
    private _mouseenterSquare;
    private _mouseleaveSquare;
    private _mousemoveWindow;
    private _mouseupWindow;
    private _touchstartSquare;
    private _touchstartSparePiece;
    private _touchmoveWindow;
    private _touchendWindow;
    /**
     * Sets the position of the board.
     *
     * @param useAnimation If `true`, animate to the new position. If `false`,
     *   show the new position instantly.
     */
    setPosition(position: Position, useAnimation?: boolean): void;
    /**
     * Returns the current position as a FEN string.
     */
    fen(): string | false;
    /**
     * Sets the board to the start position.
     *
     * @param useAnimation If `true`, animate to the new position. If `false`,
     *   show the new position instantly.
     */
    start(useAnimation?: boolean): void;
    /**
     * Removes all the pieces on the board. If `useAnimation` is `false`, removes
     * pieces instantly.
     *
     * This is shorthand for `setPosition({})`.
     *
     * @param useAnimation If `true`, animate to the new position. If `false`,
     *   show the new position instantly.
     */
    clear(useAnimation?: boolean): void;
    /**
     * Executes one or more moves on the board.
     *
     * Moves are strings the form of "e2-e4", "f6-d5", etc., Pass `false` as an
     * argument to disable animation.
     */
    move(...args: Array<string | false>): any;
    /**
     * Flip the orientation.
     */
    flip(): void;
    /**
     * Recalculates board and square sizes based on the parent element and redraws
     * the board accordingly.
     */
    resize(): void;
    firstUpdated(): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private _setCurrentPosition;
    private _isXYOnSquare;
    private _highlightSquare;
    private _snapbackDraggedPiece;
    private _trashDraggedPiece;
    private _dropDraggedPieceOnSquare;
    private _beginDraggingPiece;
    private _updateDraggedPiece;
    private _stopDraggedPiece;
    private _calculateAnimations;
    private _doAnimations;
    private _error;
}
//# sourceMappingURL=chessboard-element.d.ts.map