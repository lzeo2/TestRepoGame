
/** @enum {string} */
const Suits = {
    Diamonds: '♦',
    Clubs: '♣',
    Hearts: '♥',
    Spades: '♠',
}

/** @enum {string} */
const colors = {
    Red: "Red",
    Black: "Black",
}

const suitColor = (suit) => {
    switch (Suits[suit]) {
        case Suits.Diamonds:
        case Suits.Hearts:
            return colors.Red
        case Suits.Clubs:
        case Suits.Spades:
            return colors.Black
        default:
            return null
    }
}

const oppositeColor = (suit) => {
    switch (Suits[suit]) {
        case Suits.Diamonds:
        case Suits.Hearts:
            return colors.Black
        case Suits.Clubs:
        case Suits.Spades:
            return colors.Red
        default:
            return null
    }
}

/** @enum {number} */
const Ranks = {
    Ace: 1,
    Jack: 11,
    Queen: 12,
    King: 13,
}

function canPutInCell(cell) {
    if (cell.length > 0) {
        return false
    }
    return true
}

function canPutOntoFoundation(foundation, card) {
    const top = foundation.at(-1)
    if (top) {
        if (top.Suit() !== card.Suit() || top.Rank() + 1 !== card.Rank()) {
            return false
        }
    } else if (card.Rank() !== Ranks.Ace) {
        return false
    }
    return true
}

function canPutOntoCascade(cascade, card) {
    const top = cascade.at(-1)
    if (top) {
        if (suitColor(top.Suit()) === suitColor(card.Suit())) {
            return false
        }
        if (top.Rank() !== card.Rank() + 1) {
            return false
        }
    }
    return true
}

function makeGameData(deck) {
    return {
        cells: [[], [], [], []],
        foundations: [[], [], [], []],
        cascades: distribute([[], [], [], [], [], [], [], []], deck),
    }
}

function makeHistory() {
    const history = []
    return {
        Restore,
        Snapshot,
        Length: () => history.length,
    }

    function Restore(to) {
        if (history.length <= 1) {
            return false
        }
        const prev = history.pop()
        to.cells = prev.cells
        to.foundations = prev.foundations
        to.cascades = prev.cascades
        return true
    }

    function Snapshot(of) {
        const copyCards = (cards) => [...cards]
        const copyStack = (src) => [...src.map(copyCards)]
        history.push({
            cells: copyStack(of.cells),
            foundations: copyStack(of.foundations),
            cascades: copyStack(of.cascades),
        })
    }
}

function distribute(cascades, deck) {
    for (let c = 0; !deck.Empty(); c = (c + 1) % cascades.length) {
        cascades[c].push(deck.Take())
    }
    return cascades
}

function checkedMove(dst, src, canPut, onMoving) {
    if (!dst || !src) {
        return false
    }

    const card = src.at(-1)
    if (!canPut(dst, card)) {
        return false
    }

    onMoving()
    dst.push(src.pop())
    return true
}

function moveFromCell(data, onMoving, src) {
    const { cells, cascades, foundations } = data

    const cell = cells[src.cell]
    const put = (stacks, canPut) =>
        stacks.some((dst) => checkedMove(dst, cell, canPut, onMoving))

    return put(foundations, canPutOntoFoundation) ||
        put(cascades.filter(c => c.length > 0), canPutOntoCascade) ||
        put(cascades.filter(c => c.length === 0), canPutOntoCascade)
}

function moveFromCascade(data, onMoving, src) {
    const { cells, cascades, foundations } = data

    const cascadeNum = parseInt(src.cascade)
    const cascade = cascades[cascadeNum]
    if (cascade.length - 1 !== parseInt(src.index)) {
        // TODO: improve automatic move
        return false
    }

    const put = (stacks, canPut) =>
        stacks.some((dst) => checkedMove(dst, cascade, canPut, onMoving))

    const
        leftCascades = cascades.slice(0, cascadeNum),
        rightCascades = cascades.slice(cascadeNum + 1)

    const top = cascade.at(-1).Rank()
    if (top === Ranks.King && cascade.length > 1) {
        if (put(foundations, canPutOntoFoundation) ||
            put(rightCascades.filter(c => c.length === 0), canPutOntoCascade) ||
            put(leftCascades.filter(c => c.length === 0), canPutOntoCascade)) {
            return true
        }
    }

    return put(foundations, canPutOntoFoundation) ||
        put(rightCascades.filter(c => c.length > 0), canPutOntoCascade) ||
        put(cells, canPutInCell) ||
        put(leftCascades, canPutOntoCascade) ||
        put(rightCascades.filter(c => c.length === 0), canPutOntoCascade)
}

function automove(data, history, src) {
    const onMoving = () => history.Snapshot(data)
    if (src.cell) {
        if (!moveFromCell(data, onMoving, src)) {
            return false
        }
    } else if (src.cascade) {
        if (!moveFromCascade(data, onMoving, src)) {
            return false
        }
    } else {
        return false
    }
    return true
}

function move(data, history, dst, src) {
    const { cells, cascades } = data
    const onMoving = () => history.Snapshot(data)
    if (src.cell) {
        const cell = cells[src.cell]
        if (!checkedMove(cascades[dst.cascade], cell, canPutOntoCascade, onMoving)) {
            return false
        }
    } else {
        const cascade = cascades[src.cascade]
        if (cascade.length - 1 !== parseInt(src.index)) {
            // TODO: improve automatic move
            return false
        }
        if (dst.cell) {
            if (!checkedMove(cells[dst.cell], cascade, canPutInCell, onMoving)) {
                return false
            }
        } else if (dst.cascade) {
            if (!checkedMove(cascades[dst.cascade], cascade, canPutOntoCascade, onMoving)) {
                return false
            }
        } else {
            return false
        }
    }
    return true
}

// easymove tries to move a card. It finds the lowest ranked card amongst all
// top cards in cascades and cells. For each card at that rank, it will try to
// move it to a Foundation. If there is a card of the opposite color with a
// lower rank, it will not move to the Foundation.
function easymove(data, history) {
    const tops = [...data.cells, ...data.cascades]
        .filter(s => s.length > 0)
        .map(s => ({ location: s, card: s.at(-1) }))
        .sort((a, b) => a.card.Rank() - b.card.Rank())
    const minRank = tops[0].card.Rank()
    const mins = tops.filter(x => x.card.Rank() === minRank)

    const minBySuit = {
        Diamonds: 1,
        Clubs: 1,
        Hearts: 1,
        Spades: 1,
    }
    for (const foundation of data.foundations) {
        const top = foundation.at(-1)
        if (!top) {
            continue
        }
        minBySuit[top.Suit()] = top.Rank()
    }
    const minByColor = {
        [colors.Red]: Math.min(minBySuit.Diamonds, minBySuit.Hearts),
        [colors.Black]: Math.min(minBySuit.Clubs, minBySuit.Spades),
    }

    const onMoving = () => history.Snapshot(data)
    for (const min of mins) {
        // Check to see if there is a lower card of the opposite color still
        // in play. If there is, don't move the min card.
        // [r] [b] [r] [x]
        // (3) (2) (2)    <- don't automove the r-3 because b-2 isn't on Fnd
        const opposite = oppositeColor(min.card.Suit())
        if (min.card.Rank() > minByColor[opposite] + 1) {
            console.debug("easymove skipped", min.card.Rank(), ">", minByColor[opposite] + 1, opposite)
            continue
        }
        for (const foundation of data.foundations) {
            if (checkedMove(foundation, min.location, canPutOntoFoundation, onMoving)) {
                return true
            }
        }
    }
    return false
}


/**
 * Player lost when there are no moves:
 *   cascade -> cascade
 *   cascade -> cell
 *   cascade -> foundation
 *   cell -> foundation
 *   cell -> cascade
 */
function lost(data, history) {
    const { cells, foundations, cascades } = data
    const onMoving = () => history.Snapshot(data)

    // Try to move from cascade
    for (let i = 0; i < cascades.length; i++) {
        const src = cascades[i]
        if (src.length === 0) {
            continue
        }
        // Try to move from cascade to cascade
        for (let j = 0; j < cascades.length; j++) {
            if (i === j) {
                continue
            }
            if (checkedMove(cascades[j], src, canPutOntoCascade, onMoving)) {
                history.Restore(data)
                return false
            }
        }
        // Try to move from cascade to cell
        for (let j = 0; j < cells.length; j++) {
            if (checkedMove(cells[j], src, canPutInCell, onMoving)) {
                history.Restore(data)
                return false
            }
        }
        // Try to move from cascade to foundation
        for (let j = 0; j < foundations.length; j++) {
            if (checkedMove(foundations[j], src, canPutOntoFoundation, onMoving)) {
                history.Restore(data)
                return false
            }
        }
    }

    // Try to move from cell
    for (let i = 0; i < cells.length; i++) {
        const src = cells[i]
        if (src.length === 0) {
            continue
        }
        // Try to move from cell to foundation
        for (let j = 0; j < foundations.length; j++) {
            if (checkedMove(foundations[j], src, canPutOntoFoundation, onMoving)) {
                history.Restore(data)
                return false
            }
        }
        // Try to move from cell to cascade
        for (let j = 0; j < cascades.length; j++) {
            if (checkedMove(cascades[j], src, canPutOntoCascade, onMoving)) {
                history.Restore(data)
                return false
            }
        }
    }

    return true
}

/**
 * @param {() => void} onNewGame
 * @param {{game: string}} [params = {}]
 */
function Play(renderer, onNewGame, params = {}) {
    function validGameID() {
        const requiredSize = 52
        if (!params.game) {
            return false
        }
        if (new Set(params.game.split('')).size !== requiredSize) {
            return false
        }
        return true
    }

    const started = Date.now()
    let ended = null

    const deck = validGameID() ? Deck(params.game) : Deck()
    const deckID = deck.ID()
    const history = makeHistory()
    const data = makeGameData(deck)
    const game = {
        Cells: () => data.cells,
        Foundations: () => data.foundations,
        Cascades: () => data.cascades,
        Over: () => {
            const isOver = [...data.cascades, ...data.cells].every(c => c.length === 0)
            if (isOver && ended === null) {
                ended = Date.now()
            }
            return isOver
        },
        Lost: () => lost(data, history),

        Automove: (src) => automove(data, history, src) && game.Render(),
        Easymove: () => easymove(data, history) && game.Render(),
        Move: (dst, src) => move(data, history, dst, src) && game.Render(),
        NewGame: () => Play(renderer, onNewGame),
        Render: () => renderer.Render(game),
        Undo: () => history.Restore(data) && game.Render(),

        ID: () => deckID,

        MoveCount: () => history.Length() - 1,
        StartedAt: () => started,
        EndedAt: () => ended,
    }
    history.Snapshot(data)
    setTimeout(() => {
        onNewGame(game)
        game.Render()
    }, 1)
    return game
}

const Card = function (/** @type Suits */suit, /** @type Ranks */rank) {
    if (rank < Ranks.Ace || rank > Ranks.King) {
        throw new Error(`rank is out of bounds: ${rank}`)
    }
    if (!Suits[suit]) {
        throw new Error(`unknown suit: ${suit}`)
    }
    return {
        Suit: () => suit,
        Rank: () => rank,
    }
}

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 * @see https://stackoverflow.com/a/6274381
 */
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const Deck = function (encodedDeck) {
    const cards = []

    if (encodedDeck === undefined) {
        for (const suit in Suits) {
            for (let rank = Ranks.Ace; rank <= Ranks.King; rank++) {
                cards.push(Card(suit, rank))
            }
        }
        shuffle(cards)
    } else {
        for (const letter of encodedDeck) {
            const card = decode(letter)
            if (!card) {
                console.error("Invalid Deck encoding", letter, encodedDeck)
                return Deck()
            }
            cards.push(card)
        }
    }

    return {
        ID: () => cards.map(encode).join(''),
        Shuffle: () => shuffle(cards),
        Take: () => cards.shift(),
        Empty: () => cards.length === 0,
    }
}

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
const suitNames = Object.keys(Suits)
const numCardsInSuit = Ranks.King

function decode(letter) {
    const pos = alphabet.indexOf(letter)
    if (pos === -1) {
        return null
    }
    const
        suit = suitNames[Math.floor(pos / numCardsInSuit)],
        rank = (pos % numCardsInSuit) + 1
    return Card(suit, rank)
}

function encode(card) {
    const suitNumber = suitNames.indexOf(card.Suit())
    const rankOffset = card.Rank() - 1
    const pos = suitNumber * numCardsInSuit + rankOffset
    return alphabet[pos]
}

const RandomDeck = () => Deck()
const OrderedDeck = () => Deck(alphabet)


const namedRanks = Object.fromEntries(
    Object.entries(Ranks).map(a => a.reverse())
)

function renderCard(card) {
    const rankText = namedRanks[card.Rank()]
        ? namedRanks[card.Rank()][0]
        : `${card.Rank()}`
    const suitText = Suits[card.Suit()]
    return `
            <span class="${card.Suit()}">
                <span class=suit>${suitText}</span>
                <span class=rank>${rankText}</span>
            </span>
        `
}

function renderCells(cells) {
    return `<div class=cells>${cells.map(renderCell).join('')}</div>`

    function renderCell(cell, index) {
        const card = cell.at(-1)
        return !card
            ? `<div class="empty cell" tabindex=0 data-cell="${index}"></div>`
            : `
                    <div class=cell>
                        <div class=card tabindex=0 data-cell="${index}">
                            ${renderCard(card)}
                        </div>
                    </div>
                `
    }
}

function renderFoundations(foundations) {
    return `
            <div class=foundations>
                ${foundations.map(renderFoundation).join('')}
            </div>
        `

    function renderFoundation(cards) {
        const top = cards.at(-1)
        return !top
            ? `<div class="empty foundation"></div>`
            : `<div class=foundation><div class=card>${renderCard(top)}</div></div>`
    }
}

function renderCascades(cascades) {
    return `<ol class="cascades">${cascades.map(render).join('')}</ol>
        `

    function render(cascade, cascadeNum) {
        if (cascade.length === 0) {
            return `
                    <ol class="empty cascade" tabindex=0
                        data-cascade="${cascadeNum}" data-index="0"></ol>
                `
        }

        return `
                <ol class=cascade>
                    ${cascade.map(render).join('')}
                </ol>
            `

        function render(card, cardIndex) {
            return `
                    <li class=card tabindex=0
                        data-cascade="${cascadeNum}" data-index="${cardIndex}"
                    >
                        ${renderCard(card)}
                    </li>
                `
        }
    }
}


function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function renderWinner(won, moves, started, ended) {
    if (!won) {
        return ""
    }

    return `
        <div class=winner>
            <span>You won in ${moves} moves and ${formatTime(ended - started)} time!</span>
            <button class=won-new>New game</button>
        </div>
    `
}

// Banner shown when neither a foundation nor a cascade/cell move exists.
function renderStuck(won, stuck) {
    if (won || !stuck) {
        return ""
    }

    return `
        <div class=stuck role=alert>
            <span>No moves left. Undo a move or start a new game.</span>
            <button class=stuck-new>New game</button>
        </div>
    `
}

function Renderer(dom, onNextFrame, window) {
    dom.quick = true
    dom.picked = {}

    return {
        Render: (game) => onNextFrame(() => renderGame(game)),
    }

    function pick(picked) {
        if (dom.picked.cell) {
            dom.picked.cell.classList.remove("picked")
        }
        if (dom.picked.cascade) {
            dom.picked.cascade.classList.remove("picked")
        }
        if (picked && picked.cell) {
            picked.cell.classList.add("picked")
        }
        if (picked && picked.cascade) {
            picked.cascade.classList.add("picked")
        }
        if (picked) {
            dom.picked = picked
            dom.classList.add("picked")
        } else {
            dom.picked = {}
            dom.classList.remove("picked")
        }
    }
    function hasPick() { return !!dom.picked.cell || !!dom.picked.cascade }

    function renderGame(game) {
        const now = game.EndedAt() || Date.now()
        const stats = `
            <div class=stats>
                <span class=movecount>${game.MoveCount()} moves</span>
                <span class=elapsed>${formatTime(now - game.StartedAt())}</span>
            </div>
        `

        const topRow = `
            <div class=top>
                ${renderFoundations(game.Foundations())}
                <div class=actions>
                    <button class=new>Game</button>
                    <button class=quick>${dom.quick ? "Auto" : "Pick"}</button>
                    <button class=undo ${game.MoveCount() === 0 ? "disabled" : ""}>Undo</button>
                </div>
                ${renderCells(game.Cells())}
            </div>
        `

        const gameDialog = `
            <dialog class=game>
                <p>Start a new deal? Current progress is lost.</p>
                <button class=confirm-new>New game</button>
                <button class=close>Close</button>
            </dialog>
        `

        dom.innerHTML = [
            stats,
            topRow,
            renderCascades(game.Cascades()),
            renderStuck(game.Over(), game.Lost()),
            renderWinner(game.Over(), game.MoveCount(), game.StartedAt(), game.EndedAt()),
            gameDialog,
        ]
            .flatMap(x => x)
            .join("\n")

        const showGameDialog = () => {
            const dialog = dom.querySelector("dialog.game")
            dialog.showModal()
            dialog.querySelector("button.confirm-new").onclick = () => {
                pick()
                game.NewGame()
            }
            dialog.querySelector("button.close").onclick = () => dialog.close()
        }

        // Toolbar button opens the new-game confirmation dialog.
        dom.querySelector("button.new").onclick = showGameDialog

        const wonNew = dom.querySelector("button.won-new")
        if (wonNew) {
            wonNew.onclick = () => {
                pick()
                game.NewGame()
            }
        }
        const stuckNew = dom.querySelector("button.stuck-new")
        if (stuckNew) {
            stuckNew.onclick = () => {
                pick()
                game.NewGame()
            }
        }

        /** @type {HTMLButtonElement} */
        const undo = dom.querySelector("button.undo")
        undo.onclick = (e) => {
            e.preventDefault()
            game.Undo()
            pick()
        }
        undo.classList.toggle("lost", game.Lost())

        const quick = dom.querySelector("button.quick")
        quick.onclick = () => {
            dom.quick = !dom.quick
            pick()
            game.Render(game)
        }

        addOnCellClicks()
        addOnEmptyCellClicks()
        addOnCascadeClicks()
        addOnEmptyCascadeClicks()

        return

        function addOnCellClicks() {
            const cards = dom.querySelectorAll(".cell .card")
            for (const node of cards) {
                node.onclick = () => {
                    if (node === dom.picked.cell || dom.quick) {
                        if (game.Automove(node.dataset)) {
                            setTimeout(() => tryEasymove(100), 100)
                        }
                        pick()
                    } else {
                        pick({ cell: node })
                    }
                }
            }
        }

        function addOnEmptyCellClicks() {
            const nodes = dom.querySelectorAll(".cell.empty")
            for (const node of nodes) {
                node.onclick = () => {
                    if (!dom.picked.cascade) {
                        return
                    }
                    // Move card in another cascade to this cell
                    const src = dom.picked.cascade
                    game.Move(node.dataset, src.dataset)
                    pick()
                }
            }
        }

        function tryEasymove(delay) {
            if (game.Easymove()) {
                setTimeout(() => tryEasymove(delay - 10), Math.max(delay, 0))
            }
        }

        function addOnCascadeClicks() {
            const cards = dom.querySelectorAll(".cascade .card")

            for (const node of cards) {
                node.onclick = () => {
                    if (dom.quick) {
                        handle(node, hasPick() ? dom.picked : { cascade: node })
                    } else if (hasPick()) {
                        handle(node, dom.picked)
                    } else if (node.nextElementSibling) {
                        pick()
                    } else {
                        pick({ cascade: node })
                    }
                }
            }

            return

            function handle(node, picked) {
                if (node === picked.cascade) {
                    if (game.Automove(node.dataset)) {
                        setTimeout(() => tryEasymove(100), 100)
                    }
                    pick()
                } else if (picked.cascade) {
                    // Move card in another cascade to this card
                    const src = picked.cascade
                    game.Move(node.dataset, src.dataset)
                    pick()
                } else if (picked.cell) {
                    // Move card in cell to this card
                    const src = picked.cell
                    game.Move(node.dataset, src.dataset)
                    pick()
                }
            }
        }

        function addOnEmptyCascadeClicks() {
            const nodes = dom.querySelectorAll(".cascade.empty")
            for (const node of nodes) {
                node.onclick = () => {
                    if (!dom.picked) {
                        return
                    }
                    const src = dom.picked.cascade ? dom.picked.cascade : dom.picked.cell
                    game.Move(node.dataset, src.dataset)
                    pick()
                }
            }
        }
    }
}

// Entry point: starts a game in <main>, drives the timer, binds keyboard play.
function App(window) {
    const doc = window.document
    const renderer = Renderer(doc.querySelector("main"), window.requestAnimationFrame, window)
    let game = Play(renderer, (newGame) => { game = newGame })

    setInterval(() => {
        const elapsed = doc.querySelector(".elapsed")
        if (!game || !elapsed) return
        const now = game.EndedAt() || Date.now()
        elapsed.textContent = formatTime(now - game.StartedAt())
    }, 1000)

    function click(sel) {
        const btn = doc.querySelector(sel)
        if (btn && !btn.disabled) btn.click()
    }

    doc.addEventListener("keydown", (e) => {
        if (!game) return
        const active = doc.activeElement
        if (e.key === "Enter" || e.key === " ") {
            if (active && active.tagName === "BUTTON") return // native activation
            if (active && typeof active.onclick === "function") {
                e.preventDefault()
                active.click()
            } else if (e.key === " ") {
                e.preventDefault() // no page scroll during play
            }
            return
        }
        if (e.key === "u" || e.key === "U") click("button.undo")
        else if (e.key === "a" || e.key === "A") click("button.quick")
        else if (e.key === "n" || e.key === "N") click("button.new")
    })
}

// Start-screen wiring.
document.getElementById("playBtn").addEventListener("click", () => {
    document.getElementById("start-screen").remove()
    document.querySelector("main").hidden = false
    App(window)
})
