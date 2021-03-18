/**
 * Copyright (c) 2019, Chris Oakman
 * Copyright (c) 2019, Justin Fagnani
 * Released under the MIT license
 * https://github.com/justinfagnani/chessboard-element/blob/master/LICENSE.md
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { customElement, property, LitElement, html, query } from 'lit-element';
import { render, directive, removeNodes } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map.js';
import { ifDefined } from 'lit-html/directives/if-defined.js';
import { nothing } from 'lit-html';
import { deepCopy, interpolateTemplate, isString, isFunction } from './utils.js';
import { styles } from './chessboard-styles.js';
import { objToFen, findClosestPiece, calculatePositionFromMoves, validMove, validSquare, validPositionObject, COLUMNS, normalizePozition, getSquareColor, blackPieces, whitePieces, } from './chess-utils.js';
import { renderPiece as renderWikipediaSVGPiece } from './wikipedia-pieces-svg.js';
export { fenToObj, objToFen } from './chess-utils.js';
export { renderPiece as renderWikipediaSVGPiece } from './wikipedia-pieces-svg.js';
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
// default animation speeds
const DEFAULT_APPEAR_SPEED = 200;
const DEFAULT_MOVE_SPEED = 200;
const DEFAULT_SNAPBACK_SPEED = 60;
const DEFAULT_SNAP_SPEED = 30;
const DEFAULT_TRASH_SPEED = 100;
// ---------------------------------------------------------------------------
// Predicates
// ---------------------------------------------------------------------------
function assertIsDragging(dragState) {
    if ((dragState === null || dragState === void 0 ? void 0 : dragState.state) !== 'dragging') {
        throw new Error(`unexpected drag state ${JSON.stringify(dragState)}`);
    }
}
const speedToMS = (speed) => {
    if (typeof speed === 'number') {
        return speed;
    }
    if (speed === 'fast') {
        return 200;
    }
    if (speed === 'slow') {
        return 600;
    }
    return parseInt(speed, 10);
};
const squareId = (square) => `square-${square}`;
const sparePieceId = (piece) => `spare-piece-${piece}`;
const renderPieceDirective = directive((piece, renderPiece) => (part) => {
    if (isFunction(renderPiece)) {
        renderPiece(piece, part.committer.element);
    }
    else {
        removeNodes(part.committer.element, part.committer.element.firstChild);
    }
});
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
let ChessBoardElement = class ChessBoardElement extends LitElement {
    constructor() {
        super(...arguments);
        /**
         * Used to indicate whether click-to-move is in process
         */
        this.clickMove = false;
        /**
         * Whether to show the board notation.
         */
        this.hideNotation = false;
        /**
         * The orientation of the board. `'white'` for the white player at the bottom,
         * `'black'` for the black player at the bottom.
         */
        this.orientation = 'white';
        /**
         * If `true`, pieces on the board are draggable to other squares.
         */
        this.draggablePieces = false;
        /**
         * If `'snapback'`, pieces dropped off the board will return to their original
         * square. If `'trash'`, pieces dropped off the board will be removed from the
         * board.
         *
         * This property has no effect when `draggable` is `false`.
         */
        this.dropOffBoard = 'snapback';
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
        this.renderPiece = (piece, container) => {
            let pieceImage = undefined;
            if (isString(this.pieceTheme)) {
                pieceImage = interpolateTemplate(this.pieceTheme, { piece: piece });
            }
            else if (isFunction(this.pieceTheme)) {
                pieceImage = this.pieceTheme(piece);
            }
            if (pieceImage === undefined) {
                renderWikipediaSVGPiece(piece, container);
            }
            else {
                render(html `<img class="piece-image" src=${pieceImage} />`, container);
            }
        };
        /**
         * Animation speed for when pieces move between squares or from spare pieces
         * to the board.
         */
        this.moveSpeed = DEFAULT_MOVE_SPEED;
        /**
         * Animation speed for when pieces that were dropped outside the board return
         * to their original square.
         */
        this.snapbackSpeed = DEFAULT_SNAPBACK_SPEED;
        /**
         * Animation speed for when pieces \"snap\" to a square when dropped.
         */
        this.snapSpeed = DEFAULT_SNAP_SPEED;
        /**
         * Animation speed for when pieces are removed.
         */
        this.trashSpeed = DEFAULT_TRASH_SPEED;
        /**
         * Animation speed for when pieces appear on a square.
         *
         * Note that the "appear" animation only occurs when `sparePieces` is `false`.
         */
        this.appearSpeed = DEFAULT_APPEAR_SPEED;
        /**
         * If `true`, the board will have spare pieces that can be dropped onto the
         * board. If `sparePieces` is set to `true`, `draggablePieces` gets set to
         * `true` as well.
         */
        this.sparePieces = false;
        this._highlightedSquares = new Set();
        this._animations = new Map();
        this._currentPosition = {};
        this._mousemoveWindow = (e) => {
            var _a;
            if (((_a = this._dragState) === null || _a === void 0 ? void 0 : _a.state) === 'dragging') {
                this._updateDraggedPiece(e.clientX, e.clientY);
            }
        };
        this._mouseupWindow = (e) => {
            var _a;
            // do nothing if we are not dragging a piece
            if (!(((_a = this._dragState) === null || _a === void 0 ? void 0 : _a.state) === 'dragging')) {
                return;
            }
            // get the location
            const location = this._isXYOnSquare(e.clientX, e.clientY);
            this._stopDraggedPiece(location);
        };
        this._touchmoveWindow = (e) => {
            var _a;
            // do nothing if we are not dragging a piece
            if (!(((_a = this._dragState) === null || _a === void 0 ? void 0 : _a.state) === 'dragging')) {
                return;
            }
            // prevent screen from scrolling
            e.preventDefault();
            const touch = e.changedTouches[0];
            this._updateDraggedPiece(touch.clientX, touch.clientY);
        };
        this._touchendWindow = (e) => {
            var _a;
            // do nothing if we are not dragging a piece
            if (!(((_a = this._dragState) === null || _a === void 0 ? void 0 : _a.state) === 'dragging')) {
                return;
            }
            // get the location
            const location = this._isXYOnSquare(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            this._stopDraggedPiece(location);
        };
    }
    /**
     * The current position of the board, as a `PositionObject`. This property may
     * be set externally, but only to valid `PositionObject`s. The value is copied
     * before being applied to the board. Changes to the position object are not
     * reflected in th rendering.
     *
     * To set the position using FEN, or a keyword like `'start'`, or to use
     * animations, use the `setPosition` method.
     */
    get position() {
        return this._currentPosition;
    }
    set position(v) {
        const oldValue = this._currentPosition;
        this._setCurrentPosition(v);
        this.requestUpdate('position', oldValue);
    }
    /**
     * Whether to show the board notation. This is always the inverse of
     * `hideNotation`, which reflects the `hide-notation` attribute.
     *
     * @default true
     */
    get showNotation() {
        return !this.hideNotation;
    }
    set showNotation(v) {
        this.hideNotation = !v;
    }
    get _squareSize() {
        // Note: this isn't cached, but is called during user interactions, so we
        // have a bit of time to use under RAIL guidelines.
        return this.offsetWidth / 8;
    }
    _getSquareElement(square) {
        return this.shadowRoot.getElementById(squareId(square));
    }
    _getSparePieceElement(piece) {
        return this.shadowRoot.getElementById(sparePieceId(piece));
    }
    // -------------------------------------------------------------------------
    // DOM Building
    // -------------------------------------------------------------------------
    render() {
        return html `
      <div part="spare-pieces">
        ${this._renderSparePieces(this.orientation === 'white' ? 'black' : 'white')}
      </div>
      ${this._renderBoard()}
      <div part="spare-pieces">
        ${this._renderSparePieces(this.orientation === 'white' ? 'white' : 'black')}
      </div>
      <div
        id="dragged-pieces"
        style=${styleMap({
            width: `${this._squareSize}px`,
            height: `${this._squareSize}px`,
        })}
      >
        ${this._renderDraggedPiece()}
      </div>
    `;
    }
    _renderSparePieces(color) {
        if (!this.sparePieces) {
            return nothing;
        }
        const pieces = color === 'black' ? blackPieces : whitePieces;
        // The empty <div>s below are placeholders to get the shelf to line up with
        // the board's grid. Another option would be to try to use the same grid,
        // either with a single container, or subgrid/display:contents when those
        // are available.
        return html `
      <div></div>
      ${pieces.map((p) => html `
            <div
              id="spare-${p}"
              @mousedown=${this._mousedownSparePiece}
              @touchstart=${this._touchstartSparePiece}
            >
              ${this._renderPiece(p, {}, false, sparePieceId(p))}
            </div>
          `)}
      <div></div>
    `;
    }
    _renderDraggedPiece() {
        var _a, _b;
        const styles = {
            height: `${this._squareSize}px`,
            width: `${this._squareSize}px`,
        };
        const dragState = this._dragState;
        if (dragState !== undefined) {
            styles.display = 'block';
            const rect = this.getBoundingClientRect();
            if (dragState.state === 'dragging') {
                const { x, y } = dragState;
                Object.assign(styles, {
                    top: `${y - rect.top - this._squareSize / 2}px`,
                    left: `${x - rect.left - this._squareSize / 2}px`,
                });
            }
            else if (dragState.state === 'snapback') {
                const { source } = dragState;
                const square = this._getSquareElement(source);
                const squareRect = square.getBoundingClientRect();
                Object.assign(styles, {
                    transitionProperty: 'top, left',
                    transitionDuration: `${speedToMS(this.snapbackSpeed)}ms`,
                    top: `${squareRect.top - rect.top}px`,
                    left: `${squareRect.left - rect.left}px`,
                });
            }
            else if (dragState.state === 'trash') {
                const { x, y } = dragState;
                Object.assign(styles, {
                    transitionProperty: 'opacity',
                    transitionDuration: `${speedToMS(this.trashSpeed)}ms`,
                    opacity: '0',
                    top: `${y - rect.top - this._squareSize / 2}px`,
                    left: `${x - rect.left - this._squareSize / 2}px`,
                });
            }
            else if (dragState.state === 'snap') {
                const square = this._getSquareElement(dragState.location);
                const squareRect = square.getBoundingClientRect();
                Object.assign(styles, {
                    transitionProperty: 'top, left',
                    transitionDuration: `${speedToMS(this.snapSpeed)}ms`,
                    top: `${squareRect.top - rect.top}px`,
                    left: `${squareRect.left - rect.left}px`,
                });
            }
        }
        return this._renderPiece((_b = (_a = this._dragState) === null || _a === void 0 ? void 0 : _a.piece) !== null && _b !== void 0 ? _b : '', styles, false, undefined, 'dragged-piece');
    }
    _renderBoard() {
        var _a;
        const squares = [];
        const isFlipped = this.orientation === 'black';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const file = COLUMNS[isFlipped ? 7 - col : col];
                const rank = isFlipped ? row + 1 : 8 - row;
                const square = `${file}${rank}`;
                const squareColor = getSquareColor(square);
                let piece = this._currentPosition[square];
                const isDragSource = square === ((_a = this._dragState) === null || _a === void 0 ? void 0 : _a.source);
                const animation = this._animations.get(square);
                const highlight = isDragSource || this._highlightedSquares.has(square)
                    ? 'highlight'
                    : '';
                const pieceStyles = this._getAnimationStyles(piece, animation);
                if (!piece && (animation === null || animation === void 0 ? void 0 : animation.type) === 'clear') {
                    // Preserve the piece until the animation is complete
                    piece = animation.piece;
                }
                squares.push(html `
          <div
            class="square"
            id=${squareId(square)}
            data-square=${square}
            part="square ${square} ${squareColor} ${highlight}"
            @mousedown=${this._mousedownSquare}
            @mouseenter=${this._mouseenterSquare}
            @mouseleave=${this._mouseleaveSquare}
            @touchstart=${this._touchstartSquare}
          >
            ${this.showNotation && row === 7
                    ? html `<div part="notation alpha">${file}</div>`
                    : nothing}
            ${this.showNotation && col === 0
                    ? html `<div part="notation numeric">${rank}</div>`
                    : nothing}
            ${this._renderPiece(piece, pieceStyles, isDragSource)}
          </div>
        `);
            }
        }
        const styles = {
            width: this._squareSize * 8 + 'px',
            height: this._squareSize * 8 + 'px',
        };
        return html `<div part="board" style=${styleMap(styles)}>${squares}</div>`;
    }
    _renderPiece(piece, styles, isDragSource, id, part) {
        if (piece === undefined) {
            return nothing;
        }
        const style = Object.assign({ opacity: '1', transitionProperty: '', transitionDuration: '0ms' }, styles);
        if (isDragSource || piece === '') {
            style.display = 'none';
        }
        if (piece === '') {
            return nothing;
        }
        if (!isFunction(this.renderPiece)) {
            this._error(8272, 'invalid renderPiece.');
        }
        return html `
      <div
        id=${ifDefined(id)}
        part="piece ${part !== null && part !== void 0 ? part : ''}"
        piece=${piece}
        style=${styleMap(style)}
        ...=${renderPieceDirective(piece, this.renderPiece)}
      ></div>
    `;
    }
    _getAnimationStyles(piece, animation) {
        if (animation) {
            if (piece &&
                (animation.type === 'move-start' ||
                    (animation.type === 'add-start' && this.draggablePieces))) {
                // Position the moved piece absolutely at the source
                const srcSquare = animation.type === 'move-start'
                    ? this._getSquareElement(animation.source)
                    : this._getSparePieceElement(piece);
                const destSquare = animation.type === 'move-start'
                    ? this._getSquareElement(animation.destination)
                    : this._getSquareElement(animation.square);
                const srcSquareRect = srcSquare.getBoundingClientRect();
                const destSquareRect = destSquare.getBoundingClientRect();
                return {
                    position: 'absolute',
                    left: `${srcSquareRect.left - destSquareRect.left}px`,
                    top: `${srcSquareRect.top - destSquareRect.top}px`,
                    width: `${this._squareSize}px`,
                    height: `${this._squareSize}px`,
                };
            }
            if (piece &&
                (animation.type === 'move' ||
                    (animation.type === 'add' && this.draggablePieces))) {
                // Transition the moved piece to the destination
                return {
                    position: 'absolute',
                    transitionProperty: 'top, left',
                    transitionDuration: `${speedToMS(this.moveSpeed)}ms`,
                    top: `0`,
                    left: `0`,
                    width: `${this._squareSize}px`,
                    height: `${this._squareSize}px`,
                };
            }
            if (!piece && animation.type === 'clear') {
                // Preserve and transition a removed piece to opacity 0
                piece = animation.piece;
                return {
                    transitionProperty: 'opacity',
                    transitionDuration: `${speedToMS(this.trashSpeed)}ms`,
                    opacity: '0',
                };
            }
            if (piece && animation.type === 'add-start') {
                // Initialize an added piece to opacity 0
                return {
                    opacity: '0',
                };
            }
            if (piece && animation.type === 'add') {
                // Transition an added piece to opacity 1
                return {
                    transitionProperty: 'opacity',
                    transitionDuration: `${speedToMS(this.appearSpeed)}ms`,
                };
            }
        }
        return {};
    }
    // -------------------------------------------------------------------------
    // Event Listeners
    // -------------------------------------------------------------------------
    _mousedownSquare(e) {
        e.preventDefault();
        // do nothing if we're not draggable. sparePieces implies draggable
        if (!this.draggablePieces && !this.sparePieces) {
            return;
        }
        // do nothing if there is no piece on this square
        const squareEl = e.currentTarget;
        const square = squareEl.getAttribute('data-square');
        if (square === null) {
            return;
        }
        if (!this._currentPosition.hasOwnProperty(square)) {
            return;
        }
        this._beginDraggingPiece(square, this._currentPosition[square], e.clientX, e.clientY);
    }
    _mousedownSparePiece(e) {
        e.preventDefault();
        // do nothing if sparePieces is not enabled
        if (!this.sparePieces) {
            return;
        }
        const sparePieceContainerEl = e.currentTarget;
        const pieceEl = sparePieceContainerEl.querySelector('[part~=piece]');
        const piece = pieceEl.getAttribute('piece');
        this._beginDraggingPiece('spare', piece, e.clientX, e.clientY);
    }
    _mouseenterSquare(e) {
        // do not fire this event if we are dragging a piece
        // NOTE: this should never happen, but it's a safeguard
        if (this._dragState !== undefined) {
            return;
        }
        // get the square
        const square = e.currentTarget.getAttribute('data-square');
        // NOTE: this should never happen; defensive
        if (!validSquare(square)) {
            return;
        }
        // get the piece on this square
        let piece = false;
        if (this._currentPosition.hasOwnProperty(square)) {
            piece = this._currentPosition[square];
        }
        this.dispatchEvent(new CustomEvent('mouseover-square', {
            bubbles: true,
            detail: {
                square,
                piece,
                position: deepCopy(this._currentPosition),
                orientation: this.orientation,
            },
        }));
    }
    _mouseleaveSquare(e) {
        // do not fire this event if we are dragging a piece
        // NOTE: this should never happen, but it's a safeguard
        if (this._dragState !== undefined) {
            return;
        }
        // get the square
        const square = e.currentTarget.getAttribute('data-square');
        // NOTE: this should never happen; defensive
        if (!validSquare(square)) {
            return;
        }
        // get the piece on this square
        let piece = false;
        if (this._currentPosition.hasOwnProperty(square)) {
            piece = this._currentPosition[square];
        }
        // execute their function
        this.dispatchEvent(new CustomEvent('mouseout-square', {
            bubbles: true,
            detail: {
                square,
                piece,
                position: deepCopy(this._currentPosition),
                orientation: this.orientation,
            },
        }));
    }
    _touchstartSquare(e) {
        // do nothing if we're not draggable. sparePieces implies draggable
        if (!this.draggablePieces && !this.sparePieces) {
            return;
        }
        // do nothing if there is no piece on this square
        const squareEl = e.target.closest('[data-square]');
        const square = squareEl.getAttribute('data-square');
        if (!validSquare(square)) {
            return;
        }
        if (!this._currentPosition.hasOwnProperty(square)) {
            return;
        }
        e.preventDefault();
        this._beginDraggingPiece(square, this._currentPosition[square], e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }
    _touchstartSparePiece(e) {
        // do nothing if sparePieces is not enabled
        if (!this.sparePieces)
            return;
        const pieceEl = e.target.closest('[piece]');
        const piece = pieceEl.getAttribute('piece');
        e.preventDefault();
        this._beginDraggingPiece('spare', piece, e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Sets the position of the board.
     *
     * @param useAnimation If `true`, animate to the new position. If `false`,
     *   show the new position instantly.
     */
    setPosition(position, useAnimation = true) {
        position = normalizePozition(position);
        // validate position object
        if (!validPositionObject(position)) {
            throw this._error(6482, 'Invalid value passed to the position method.', position);
        }
        if (useAnimation) {
            // start the animations
            const animations = this._calculateAnimations(this._currentPosition, position);
            this._doAnimations(animations, this._currentPosition, position);
        }
        this._setCurrentPosition(position);
        this.requestUpdate();
    }
    /**
     * Returns the current position as a FEN string.
     */
    fen() {
        return objToFen(this._currentPosition);
    }
    /**
     * Sets the board to the start position.
     *
     * @param useAnimation If `true`, animate to the new position. If `false`,
     *   show the new position instantly.
     */
    start(useAnimation) {
        this.setPosition('start', useAnimation);
    }
    /**
     * Removes all the pieces on the board. If `useAnimation` is `false`, removes
     * pieces instantly.
     *
     * This is shorthand for `setPosition({})`.
     *
     * @param useAnimation If `true`, animate to the new position. If `false`,
     *   show the new position instantly.
     */
    clear(useAnimation) {
        this.setPosition({}, useAnimation);
    }
    /**
     * Executes one or more moves on the board.
     *
     * Moves are strings the form of "e2-e4", "f6-d5", etc., Pass `false` as an
     * argument to disable animation.
     */
    move(...args) {
        let useAnimation = true;
        // collect the moves into an object
        const moves = {};
        for (const arg of args) {
            // any "false" to this function means no animations
            if (arg === false) {
                useAnimation = false;
                continue;
            }
            // skip invalid arguments
            if (!validMove(arg)) {
                this._error(2826, 'Invalid move passed to the move method.', arg);
                continue;
            }
            const [from, to] = arg.split('-');
            moves[from] = to;
        }
        // calculate position from moves
        const newPos = calculatePositionFromMoves(this._currentPosition, moves);
        // update the board
        this.setPosition(newPos, useAnimation);
        // return the new position object
        return newPos;
    }
    /**
     * Flip the orientation.
     */
    flip() {
        this.orientation = this.orientation === 'white' ? 'black' : 'white';
    }
    /**
     * Recalculates board and square sizes based on the parent element and redraws
     * the board accordingly.
     */
    resize() {
        this.requestUpdate();
    }
    // -------------------------------------------------------------------------
    // Lifecycle Callbacks
    // -------------------------------------------------------------------------
    firstUpdated() {
        // We need to re-render to read the size of the container
        this.requestUpdate();
        if (window.ResizeObserver !== undefined) {
            new ResizeObserver(() => {
                this.resize();
            }).observe(this);
        }
    }
    connectedCallback() {
        super.connectedCallback();
        window.addEventListener('mousemove', this._mousemoveWindow);
        window.addEventListener('mouseup', this._mouseupWindow);
        window.addEventListener('touchmove', this._touchmoveWindow, {
            passive: false,
        });
        window.addEventListener('touchend', this._touchendWindow, {
            passive: false,
        });
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('mousemove', this._mousemoveWindow);
        window.removeEventListener('mouseup', this._mouseupWindow);
        window.removeEventListener('touchmove', this._touchmoveWindow);
        window.removeEventListener('touchend', this._touchendWindow);
    }
    // -------------------------------------------------------------------------
    // Control Flow
    // -------------------------------------------------------------------------
    _setCurrentPosition(position) {
        const oldPos = deepCopy(this._currentPosition);
        const newPos = deepCopy(position);
        const oldFen = objToFen(oldPos);
        const newFen = objToFen(newPos);
        // do nothing if no change in position
        if (oldFen === newFen)
            return;
        // Fire change event
        this.dispatchEvent(new CustomEvent('change', {
            bubbles: true,
            detail: {
                value: newPos,
                oldValue: oldPos,
            },
        }));
        // update state
        this._currentPosition = position;
    }
    _isXYOnSquare(x, y) {
        // TODO: test that this works with the polyfill
        const elements = this.shadowRoot.elementsFromPoint(x, y);
        const squareEl = elements.find((e) => e.classList.contains('square'));
        const square = squareEl === undefined
            ? 'offboard'
            : squareEl.getAttribute('data-square');
        return square;
    }
    _highlightSquare(square, value = true) {
        if (value) {
            this._highlightedSquares.add(square);
        }
        else {
            this._highlightedSquares.delete(square);
        }
        this.requestUpdate('_highlightedSquares');
    }
    async _snapbackDraggedPiece() {
        assertIsDragging(this._dragState);
        const { source, piece } = this._dragState;
        // there is no "snapback" for spare pieces
        if (source === 'spare') {
            return this._trashDraggedPiece();
        }
        this._dragState = {
            state: 'snapback',
            piece,
            source,
        };
        // Wait for a paint
        this.requestUpdate();
        await new Promise((resolve) => setTimeout(resolve, 0));
        return new Promise((resolve) => {
            const transitionComplete = () => {
                this._draggedPieceElement.removeEventListener('transitionend', transitionComplete);
                resolve();
                this.dispatchEvent(new CustomEvent('snapback-end', {
                    bubbles: true,
                    detail: {
                        piece: piece,
                        square: source,
                        position: deepCopy(this._currentPosition),
                        orientation: this.orientation,
                    },
                }));
            };
            this._draggedPieceElement.addEventListener('transitionend', transitionComplete);
        });
    }
    async _trashDraggedPiece() {
        assertIsDragging(this._dragState);
        const { source, piece } = this._dragState;
        // remove the source piece
        const newPosition = deepCopy(this._currentPosition);
        delete newPosition[source];
        this._setCurrentPosition(newPosition);
        this._dragState = {
            state: 'trash',
            piece,
            x: this._dragState.x,
            y: this._dragState.y,
            source: this._dragState.source,
        };
        // Wait for a paint
        this.requestUpdate();
        await new Promise((resolve) => setTimeout(resolve, 0));
        return new Promise((resolve) => {
            const transitionComplete = () => {
                this._draggedPieceElement.removeEventListener('transitionend', transitionComplete);
                resolve();
            };
            this._draggedPieceElement.addEventListener('transitionend', transitionComplete);
        });
    }
    async _dropDraggedPieceOnSquare(square) {
        assertIsDragging(this._dragState);
        const { source, piece } = this._dragState;
        // if destination is same as source, piece stays picked up and is dropped at the next clicked square.
        if (this.clickMove === false) {
            if (square === source) {
                this.clickMove = true;
                return;
            }
        }
        this.clickMove = false;
        // update position
        const newPosition = deepCopy(this._currentPosition);
        delete newPosition[source];
        newPosition[square] = piece;
        this._setCurrentPosition(newPosition);
        this._dragState = {
            state: 'snap',
            piece,
            location: square,
            source: square,
        };
        // Wait for a paint
        this.requestUpdate();
        await new Promise((resolve) => setTimeout(resolve, 0));
        return new Promise((resolve) => {
            const transitionComplete = () => {
                this._draggedPieceElement.removeEventListener('transitionend', transitionComplete);
                resolve();
                // Fire the snap-end event
                this.dispatchEvent(new CustomEvent('snap-end', {
                    bubbles: true,
                    detail: {
                        source,
                        square,
                        piece,
                    },
                }));
            };
            this._draggedPieceElement.addEventListener('transitionend', transitionComplete);
        });
    }
    _beginDraggingPiece(source, piece, x, y) {
        // Fire cancalable drag-start event
        const event = new CustomEvent('drag-start', {
            bubbles: true,
            cancelable: true,
            detail: {
                source,
                piece,
                position: deepCopy(this._currentPosition),
                orientation: this.orientation,
            },
        });
        this.dispatchEvent(event);
        if (event.defaultPrevented) {
            return;
        }
        // set state
        this._dragState = {
            state: 'dragging',
            x,
            y,
            piece,
            // if the piece came from spare pieces, location is offboard
            location: source === 'spare' ? 'offboard' : source,
            source,
        };
        this.requestUpdate();
    }
    _updateDraggedPiece(x, y) {
        assertIsDragging(this._dragState);
        // put the dragged piece over the mouse cursor
        this._dragState.x = x;
        this._dragState.y = y;
        this.requestUpdate();
        const location = this._isXYOnSquare(x, y);
        // do nothing more if the location has not changed
        if (location === this._dragState.location) {
            return;
        }
        // remove highlight from previous square
        if (validSquare(this._dragState.location)) {
            this._highlightSquare(this._dragState.location, false);
        }
        // add highlight to new square
        if (validSquare(location)) {
            this._highlightSquare(location);
        }
        this.dispatchEvent(new CustomEvent('drag-move', {
            bubbles: true,
            detail: {
                newLocation: location,
                oldLocation: this._dragState.location,
                source: this._dragState.source,
                piece: this._dragState.piece,
                position: deepCopy(this._currentPosition),
                orientation: this.orientation,
            },
        }));
        // update state
        this._dragState.location = location;
    }
    async _stopDraggedPiece(location) {
        assertIsDragging(this._dragState);
        const { source, piece } = this._dragState;
        // determine what the action should be
        let action = 'drop';
        if (location === 'offboard') {
            action = this.dropOffBoard === 'trash' ? 'trash' : 'snapback';
            this.clickMove = false;
        }
        else {
            if (this.clickMove == false) {
                // pick up spare piece and put it down on next clicked square
                this.clickMove = true;
                return;
            }
            else {
                // drop piece back on its origin square
                this.clickMove = false;
            }
        }
        const newPosition = deepCopy(this._currentPosition);
        const oldPosition = deepCopy(this._currentPosition);
        // source piece is a spare piece and position is on the board
        if (source === 'spare' && validSquare(location)) {
            // add the piece to the board
            newPosition[location] = piece;
        }
        // source piece was on the board
        if (validSquare(source)) {
            // remove the piece from the board
            delete newPosition[source];
            // new position is on the board
            if (validSquare(location)) {
                // move the piece
                newPosition[location] = piece;
            }
        }
        // Fire the drop event
        // Listeners can potentially change the drop action
        const dropEvent = new CustomEvent('drop', {
            bubbles: true,
            detail: {
                source,
                target: location,
                piece,
                newPosition,
                oldPosition,
                orientation: this.orientation,
                setAction(a) {
                    action = a;
                },
            },
        });
        this.dispatchEvent(dropEvent);
        this._highlightedSquares.clear();
        // do it!
        if (action === 'snapback') {
            await this._snapbackDraggedPiece();
        }
        else if (action === 'trash') {
            await this._trashDraggedPiece();
        }
        else if (action === 'drop') {
            await this._dropDraggedPieceOnSquare(location);
        }
        // clear state
        this._dragState = undefined;
        // Render the final non-dragging state
        this.requestUpdate();
    }
    // -------------------------------------------------------------------------
    // Animations
    // -------------------------------------------------------------------------
    // calculate an array of animations that need to happen in order to get
    // from pos1 to pos2
    _calculateAnimations(pos1, pos2) {
        // make copies of both
        pos1 = deepCopy(pos1);
        pos2 = deepCopy(pos2);
        const animations = [];
        const squaresMovedTo = {};
        // remove pieces that are the same in both positions
        for (const i in pos2) {
            if (!pos2.hasOwnProperty(i))
                continue;
            if (pos1.hasOwnProperty(i) && pos1[i] === pos2[i]) {
                delete pos1[i];
                delete pos2[i];
            }
        }
        // find all the "move" animations
        for (const i in pos2) {
            if (!pos2.hasOwnProperty(i))
                continue;
            const closestPiece = findClosestPiece(pos1, pos2[i], i);
            if (closestPiece) {
                animations.push({
                    type: 'move',
                    source: closestPiece,
                    destination: i,
                    piece: pos2[i],
                });
                delete pos1[closestPiece];
                delete pos2[i];
                squaresMovedTo[i] = true;
            }
        }
        // "add" animations
        for (const i in pos2) {
            if (!pos2.hasOwnProperty(i)) {
                continue;
            }
            animations.push({
                type: 'add',
                square: i,
                piece: pos2[i],
            });
            delete pos2[i];
        }
        // "clear" animations
        for (const i in pos1) {
            if (!pos1.hasOwnProperty(i))
                continue;
            // do not clear a piece if it is on a square that is the result
            // of a "move", ie: a piece capture
            if (squaresMovedTo.hasOwnProperty(i))
                continue;
            animations.push({
                type: 'clear',
                square: i,
                piece: pos1[i],
            });
            delete pos1[i];
        }
        return animations;
    }
    // execute an array of animations
    async _doAnimations(animations, oldPos, newPos) {
        if (animations.length === 0) {
            return;
        }
        let numFinished = 0;
        const transitionEndListener = () => {
            numFinished++;
            if (numFinished === animations.length) {
                this.shadowRoot.removeEventListener('transitionend', transitionEndListener);
                this._animations.clear();
                this.requestUpdate();
                this.dispatchEvent(new CustomEvent('move-end', {
                    bubbles: true,
                    detail: {
                        oldPosition: deepCopy(oldPos),
                        newPosition: deepCopy(newPos),
                    },
                }));
            }
        };
        this.shadowRoot.addEventListener('transitionend', transitionEndListener);
        // Render once with added pieces at opacity 0
        this._animations.clear();
        for (const animation of animations) {
            if (animation.type === 'add' || animation.type === 'add-start') {
                this._animations.set(animation.square, Object.assign(Object.assign({}, animation), { type: 'add-start' }));
            }
            else if (animation.type === 'move' || animation.type === 'move-start') {
                this._animations.set(animation.destination, Object.assign(Object.assign({}, animation), { type: 'move-start' }));
            }
            else {
                this._animations.set(animation.square, animation);
            }
        }
        // Wait for a paint
        this.requestUpdate();
        await new Promise((resolve) => setTimeout(resolve, 0));
        // Render again with the piece at opacity 1 with a transition
        this._animations.clear();
        for (const animation of animations) {
            if (animation.type === 'move' || animation.type === 'move-start') {
                this._animations.set(animation.destination, animation);
            }
            else {
                this._animations.set(animation.square, animation);
            }
        }
        this.requestUpdate();
    }
    // -------------------------------------------------------------------------
    // Validation / Errors
    // -------------------------------------------------------------------------
    _error(code, msg, _obj) {
        const errorText = `Chessboard Error ${code} : ${msg}`;
        this.dispatchEvent(new ErrorEvent('error', {
            message: errorText,
        }));
        return new Error(errorText);
    }
};
ChessBoardElement.styles = styles;
__decorate([
    property({
        converter: (value) => normalizePozition(value),
    })
], ChessBoardElement.prototype, "position", null);
__decorate([
    property({
        attribute: 'click-move',
        type: Boolean,
    })
], ChessBoardElement.prototype, "clickMove", void 0);
__decorate([
    property({
        attribute: 'hide-notation',
        type: Boolean,
    })
], ChessBoardElement.prototype, "hideNotation", void 0);
__decorate([
    property()
], ChessBoardElement.prototype, "orientation", void 0);
__decorate([
    property({
        attribute: 'draggable-pieces',
        type: Boolean,
    })
], ChessBoardElement.prototype, "draggablePieces", void 0);
__decorate([
    property({ attribute: 'drop-off-board' })
], ChessBoardElement.prototype, "dropOffBoard", void 0);
__decorate([
    property({ attribute: 'piece-theme' })
], ChessBoardElement.prototype, "pieceTheme", void 0);
__decorate([
    property({ attribute: false })
], ChessBoardElement.prototype, "renderPiece", void 0);
__decorate([
    property({
        attribute: 'move-speed',
    })
], ChessBoardElement.prototype, "moveSpeed", void 0);
__decorate([
    property({
        attribute: 'snapback-speed',
    })
], ChessBoardElement.prototype, "snapbackSpeed", void 0);
__decorate([
    property({
        attribute: 'snap-speed',
    })
], ChessBoardElement.prototype, "snapSpeed", void 0);
__decorate([
    property({
        attribute: 'trash-speed',
    })
], ChessBoardElement.prototype, "trashSpeed", void 0);
__decorate([
    property({
        attribute: 'appear-speed',
    })
], ChessBoardElement.prototype, "appearSpeed", void 0);
__decorate([
    property({
        attribute: 'spare-pieces',
        type: Boolean,
    })
], ChessBoardElement.prototype, "sparePieces", void 0);
__decorate([
    query('[part~="dragged-piece"]')
], ChessBoardElement.prototype, "_draggedPieceElement", void 0);
ChessBoardElement = __decorate([
    customElement('chess-board')
], ChessBoardElement);
export { ChessBoardElement };
//# sourceMappingURL=chessboard-element.js.map