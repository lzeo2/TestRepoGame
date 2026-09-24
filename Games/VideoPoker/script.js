/**
 * Video Poker GUI Version
 */

// Game constants
const CARDS = 5;
const CARDSINDECK = 52;
const INITCHIPS = 1000;
const INITMINBET = 10;
const MAX_BET_MULTIPLIER = 5;

// Card suits
const CLUBS = 0;
const DIAMONDS = 1;
const HEARTS = 2;
const SPADES = 3;

// Card values
const TWO = 1;
const THREE = 2;
const FOUR = 3;
const FIVE = 4;
const SIX = 5;
const SEVEN = 6;
const EIGHT = 7;
const NINE = 8;
const TEN = 9;
const JACK = 10;
const QUEEN = 11;
const KING = 12;
const ACE = 13;

// Game variants
const AllAmerican = 0;
const TensOrBetter = 1;
const BonusPoker = 2;
const DoubleBonus = 3;
const DoubleBonusBonus = 4;
const JacksOrBetter = 5;    // default
const JacksOrBetter95 = 6;
const JacksOrBetter86 = 7;
const JacksOrBetter85 = 8;
const JacksOrBetter75 = 9;
const JacksOrBetter65 = 10;

// Hand types
const ROYAL = 0;
const STRFL = 1;
const FOURK = 2;
const FULL = 3;
const FLUSH = 4;
const STR = 5;
const THREEK = 6;
const TWOPAIR = 7;
const PAIR = 8;
const NOTHING = 9;

// Helper for invalid values
const INVALID = 100;

// Game state
let deck = [];
let hand = [];
let shand = []; // sorted hand for evaluation
let game = JacksOrBetter;
let hands = 0; // number of hands played
let score = INITCHIPS;
let score_low = INITCHIPS;
let score_high = INITCHIPS;
let minbet = INITMINBET;
let bet = INITMINBET;
let betmultiplier = 1;
let firstDeal = true; // Whether we're on the first deal or the second
let sessionCelebrated = false; // Session win shown once per game
const SESSION_TARGET = INITCHIPS * 2;

// Game handnames
const handname = [
    "Royal Flush",
    "Straight Flush",
    "Four of a Kind",
    "Full House",
    "Flush",
    "Straight",
    "Three of a Kind",
    "Two Pair",
    "Pair",
    "Nothing"
];

// Default paytable (Jacks or Better)
let paytable = [
    800,    // royal flush: 800
    50,     // straight flush: 50
    25,     // 4 of a kind: 25
    9,      // full house: 9
    6,      // flush: 6
    4,      // straight: 4
    3,      // 3 of a kind: 3
    2,      // two pair: 2
    1,      // jacks or better: 1
    0,      // nothing
];

// Card display mappings
const suitSymbols = ['♣', '♦', '♥', '♠'];
const suitNames = ['clubs', 'diamonds', 'hearts', 'spades'];
const cardValues = ['', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// DOM Elements
const dealButton = document.getElementById('deal-btn');
const scoreDisplay = document.getElementById('score');
const betDisplay = document.getElementById('current-bet');
const gameTypeDisplay = document.getElementById('game-type');
const gameSelect = document.getElementById('game-select');
const handResult = document.getElementById('hand-result');
const increaseBetBtn = document.getElementById('increase-bet');
const decreaseBetBtn = document.getElementById('decrease-bet');
const cardElements = Array.from({ length: CARDS }, (_, i) => document.getElementById(`card${i}`));

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    // Set up event listeners
    dealButton.addEventListener('click', onDealClick);
    increaseBetBtn.addEventListener('click', increaseBet);
    decreaseBetBtn.addEventListener('click', decreaseBet);
    gameSelect.addEventListener('change', changeGameType);
    
    // Set up cards click handlers for holding
    cardElements.forEach((card, index) => {
        card.addEventListener('click', () => toggleHold(index));
    });
    
    // Initialize the deck
    initializeDeck();
    
    // Update the UI
    updateUI();
});

/**
 * Initialize the deck of cards
 */
function initializeDeck() {
    deck = [];
    
    // Create 52 cards
    for (let suit = 0; suit < 4; suit++) {
        for (let value = TWO; value <= ACE; value++) {
            deck.push({
                index: value,
                suit: suit,
                gone: 0
            });
        }
    }
}

/**
 * Deal a new hand or replace non-held cards
 */
function onDealClick() {
    if (firstDeal) {
        // First deal: new hand
        dealNewHand();
        dealButton.textContent = "Draw";
        firstDeal = false;
        
        // Enable card clicking for hold/discard
        cardElements.forEach(card => card.classList.add('flipped'));
    } else {
        // Second deal: replace cards
        replaceDraw();
        dealButton.textContent = "Deal";
        firstDeal = true;
        
        // Disable card clicking until next hand
        cardElements.forEach(card => card.classList.remove('held'));
    }
}

/**
 * Deal a brand new hand
 */
function dealNewHand() {
    // Clear previous hand result
    handResult.textContent = '';
    handResult.classList.remove('visible');
    
    // Reset the held state of all cards
    cardElements.forEach(card => card.classList.remove('held'));
    
    // Deduct bet
    score -= bet;
    updateScoreDisplay();
    
    // Reset deck
    deck.forEach(card => card.gone = 0);
    
    // Empty hand
    hand = [];
    
    // Deal 5 new cards
    for (let i = 0; i < CARDS; i++) {
        // Find a card not already dealt
        let crd;
        for (;;) {
            crd = Math.floor(Math.random() * CARDSINDECK);
            if (deck[crd].gone === 0) break;
        }
        
        // Mark card as dealt
        deck[crd].gone = 1;
        
        // Add to hand
        hand.push(deck[crd]);
        
        // Show card
        displayCard(i, deck[crd]);
    }
}

/**
 * Replace non-held cards on the second deal
 */
function replaceDraw() {
    // For each card that's not held, replace it
    cardElements.forEach((cardElement, i) => {
        if (!cardElement.classList.contains('held')) {
            // Find a card not already dealt
            let crd;
            for (;;) {
                crd = Math.floor(Math.random() * CARDSINDECK);
                if (deck[crd].gone === 0) break;
            }
            
            // Mark card as dealt
            deck[crd].gone = 1;
            
            // Replace card in hand
            hand[i] = deck[crd];
            
            // Update display
            displayCard(i, deck[crd]);
        }
    });
    
    // Recognize hand and update score
    const handType = recognize();
    const reward = paytable[handType] * bet;
    
    score += reward;
    hands++;
    
    // Update min/max score
    if (score < score_low) score_low = score;
    if (score > score_high) score_high = score;
    
    // Show hand result
    handResult.textContent = `${handname[handType]}${reward > 0 ? ` - Win ${reward}!` : ''}`;
    handResult.classList.add('visible');
    
    // Session win: balance doubled from the starting 1000 chips
    if (!sessionCelebrated && score >= SESSION_TARGET) {
        sessionCelebrated = true;
        setTimeout(() => {
            document.getElementById('target-detail').textContent =
                `You grew ${INITCHIPS} chips into ${score}.`;
            document.getElementById('target-screen').classList.remove('hidden');
        }, 700);
    }
    
    // Highlight matching paytable row
    const paytableRows = document.querySelectorAll('.paytable table tr');
    paytableRows.forEach((row, index) => {
        row.classList.remove('active');
        if (index === handType) {
            row.classList.add('active');
        }
    });
    
    // Update score display
    updateScoreDisplay();
    
    // Check for game over
    if (score < minbet) {
        // Try to decrease bet
        while (score < bet && betmultiplier > 1) {
            betmultiplier--;
            bet = betmultiplier * minbet;
        }
        
        if (score < bet) {
            // Game over: out of chips lose state
            setTimeout(() => {
                document.getElementById('bust-detail').textContent =
                    `You ran out of chips after playing ${hands} hands.`;
                document.getElementById('bust-screen').classList.remove('hidden');
            }, 1000);
        } else {
            // Tell the player the bet was reduced (no blocking popup)
            setTimeout(() => {
                handResult.textContent = `Low on chips. Bet reduced to ${bet}.`;
                handResult.classList.add('visible');
                updateBetDisplay();
            }, 1000);
        }
    }
}

/**
 * Toggle a card as held/not held
 */
function toggleHold(index) {
    // Only allow toggling if we're after the first deal
    if (!firstDeal) {
        const card = cardElements[index];
        card.classList.toggle('held');
    }
}

/**
 * Display a card on the screen
 */
function displayCard(index, card) {
    const cardElement = cardElements[index];
    const valueElement = cardElement.querySelector('.card-value');
    const suitElement = cardElement.querySelector('.card-suit');
    
    // Remove previous suit classes
    cardElement.classList.remove('clubs', 'diamonds', 'hearts', 'spades');
    
    // Add appropriate suit class
    cardElement.classList.add(suitNames[card.suit]);
    
    // Set value and suit
    valueElement.textContent = cardValues[card.index];
    suitElement.textContent = suitSymbols[card.suit];
}

/**
 * Increase the bet amount
 */
function increaseBet() {
    if (firstDeal && betmultiplier < MAX_BET_MULTIPLIER) {
        betmultiplier++;
        bet = betmultiplier * minbet;
        updateBetDisplay();
    }
}

/**
 * Decrease the bet amount
 */
function decreaseBet() {
    if (firstDeal && betmultiplier > 1) {
        betmultiplier--;
        bet = betmultiplier * minbet;
        updateBetDisplay();
    }
}

/**
 * Update the bet display
 */
function updateBetDisplay() {
    betDisplay.textContent = bet;
}

/**
 * Update the score display
 */
function updateScoreDisplay() {
    scoreDisplay.textContent = score;
}

/**
 * Changes the game type based on dropdown selection
 */
function changeGameType() {
    const selectedOption = gameSelect.value;
    
    // Set game type based on selection
    switch (selectedOption) {
        case 'jacks-or-better':
            game = JacksOrBetter;
            gameTypeDisplay.textContent = "Jacks or Better";
            break;
        case 'tens-or-better':
            game = TensOrBetter;
            gameTypeDisplay.textContent = "Tens or Better";
            break;
        case 'all-american':
            game = AllAmerican;
            gameTypeDisplay.textContent = "All American";
            break;
        case 'jb95':
            game = JacksOrBetter95;
            gameTypeDisplay.textContent = "9/5 Jacks or Better";
            break;
        case 'jb86':
            game = JacksOrBetter86;
            gameTypeDisplay.textContent = "8/6 Jacks or Better";
            break;
        case 'jb85':
            game = JacksOrBetter85;
            gameTypeDisplay.textContent = "8/5 Jacks or Better";
            break;
        case 'jb75':
            game = JacksOrBetter75;
            gameTypeDisplay.textContent = "7/5 Jacks or Better";
            break;
        case 'jb65':
            game = JacksOrBetter65;
            gameTypeDisplay.textContent = "6/5 Jacks or Better";
            break;
    }
    
    // Update paytable
    setGamePaytable(game);
    
    // Update UI with new game info
    updateUI();
}

/**
 * Set the paytable for the selected game
 */
function setGamePaytable(gameType) {
    // Reset to default
    paytable = [800, 50, 25, 9, 6, 4, 3, 2, 1, 0];
    
    // Adjust based on game type
    switch (gameType) {
        case JacksOrBetter95:
            paytable[FLUSH] = 5;
            break;
        case JacksOrBetter86:
            paytable[FULL] = 8;
            break;
        case JacksOrBetter85:
            paytable[FULL] = 8;
            paytable[FLUSH] = 5;
            break;
        case JacksOrBetter75:
            paytable[FULL] = 7;
            paytable[FLUSH] = 5;
            break;
        case JacksOrBetter65:
            paytable[FULL] = 6;
            paytable[FLUSH] = 5;
            break;
        case AllAmerican:
            paytable[FULL] = 8;
            paytable[FLUSH] = 8;
            paytable[STR] = 8;
            paytable[PAIR] = 1;
            break;
        case TensOrBetter:
            paytable[FULL] = 6;
            paytable[FLUSH] = 5;
            break;
    }
    
    // Update paytable display
    updatePaytableDisplay();
}

/**
 * Update the paytable display on the screen
 */
function updatePaytableDisplay() {
    const paytableRows = document.querySelectorAll('.paytable table tr');
    for (let i = 0; i < paytableRows.length; i++) {
        const cells = paytableRows[i].querySelectorAll('td');
        if (cells.length > 1) {
            cells[1].textContent = paytable[i];
        }
    }
}

/**
 * Updates all UI elements
 */
function updateUI() {
    updateScoreDisplay();
    updateBetDisplay();
    updatePaytableDisplay();
}

/**
 * Reset the game
 */
function resetGame() {
    score = INITCHIPS;
    score_low = INITCHIPS;
    score_high = INITCHIPS;
    hands = 0;
    bet = INITMINBET;
    betmultiplier = 1;
    firstDeal = true;
    sessionCelebrated = false;
    dealButton.textContent = "Deal";

    // Hide every overlay
    document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
    
    // Reset UI
    updateUI();
    handResult.textContent = '';
    handResult.classList.remove('visible');
    
    // Reset the cards
    cardElements.forEach(card => {
        card.classList.remove('flipped', 'held', 'clubs', 'diamonds', 'hearts', 'spades');
        const valueElement = card.querySelector('.card-value');
        const suitElement = card.querySelector('.card-suit');
        valueElement.textContent = '';
        suitElement.textContent = '';
    });
}

// ---- Hand evaluation functions ----

/**
 * Recognition function to determine what type of hand the player has
 */
function recognize() {
    let i, j, f;
    let min = INVALID;
    let tmp = [];
    
    // Make a copy of the hand
    for (i = 0; i < CARDS; i++) {
        tmp[i] = Object.assign({}, hand[i]);
    }
    
    // Sort the hand
    shand = [];
    for (i = 0; i < CARDS; i++) {
        // Find lowest card
        min = INVALID;
        f = -1;
        for (j = 0; j < CARDS; j++) {
            if (tmp[j].index <= min) {
                min = tmp[j].index;
                f = j;
            }
        }
        
        // Add to sorted hand
        shand[i] = Object.assign({}, tmp[f]);
        
        // Mark this card as used
        tmp[f].index = INVALID;
    }
    
    // Check for various hand types
    const fl = flush();
    const st = straight();
    
    if (st && fl && shand[0].index === TEN) return ROYAL;
    if (st && fl) return STRFL;
    if (four()) return FOURK;
    if (full()) return FULL;
    if (fl) return FLUSH;
    if (st) return STR;
    if (three()) return THREEK;
    if (twopair()) return TWOPAIR;
    if (pair()) return PAIR;
    
    return NOTHING;
}

/**
 * Check if hand is a flush
 */
function flush() {
    return shand[0].suit === shand[1].suit && 
           shand[1].suit === shand[2].suit &&
           shand[2].suit === shand[3].suit &&
           shand[3].suit === shand[4].suit;
}

/**
 * Check if hand is a straight
 */
function straight() {
    // Regular straight
    if (shand[1].index === shand[0].index + 1 &&
        shand[2].index === shand[1].index + 1 &&
        shand[3].index === shand[2].index + 1 &&
        shand[4].index === shand[3].index + 1) {
        return true;
    }
    
    // Ace-low straight (A, 2, 3, 4, 5)
    if (shand[4].index === ACE && 
        shand[0].index === TWO &&
        shand[1].index === THREE &&
        shand[2].index === FOUR &&
        shand[3].index === FIVE) {
        return true;
    }
    
    return false;
}

/**
 * Check if hand has four of a kind
 */
function four() {
    // Check if middle three match, and either first or last card matches them
    if ((shand[1].index === shand[2].index &&
         shand[2].index === shand[3].index) &&
        (shand[0].index === shand[2].index ||
         shand[4].index === shand[2].index)) {
        return true;
    }
    
    return false;
}

/**
 * Check if hand is a full house
 */
function full() {
    // Check for pair then triple
    if (shand[0].index === shand[1].index &&
        shand[2].index === shand[3].index &&
        shand[3].index === shand[4].index) {
        return true;
    }
    
    // Check for triple then pair
    if (shand[0].index === shand[1].index &&
        shand[1].index === shand[2].index &&
        shand[3].index === shand[4].index) {
        return true;
    }
    
    return false;
}

/**
 * Check if hand has three of a kind
 */
function three() {
    // First three cards match
    if (shand[0].index === shand[1].index &&
        shand[1].index === shand[2].index) {
        return true;
    }
    
    // Middle three cards match
    if (shand[1].index === shand[2].index &&
        shand[2].index === shand[3].index) {
        return true;
    }
    
    // Last three cards match
    if (shand[2].index === shand[3].index &&
        shand[3].index === shand[4].index) {
        return true;
    }
    
    return false;
}

/**
 * Check if hand has two pair
 */
function twopair() {
    // Check all three possible two-pair combinations
    if ((shand[0].index === shand[1].index && shand[2].index === shand[3].index) ||
        (shand[0].index === shand[1].index && shand[3].index === shand[4].index) ||
        (shand[1].index === shand[2].index && shand[3].index === shand[4].index)) {
        return true;
    }
    
    return false;
}

/**
 * Check if hand has a pair (jacks or better or tens or better depending on game)
 */
function pair() {
    // Set minimum card value for pair (J for jacks or better, 10 for tens or better)
    let min = JACK;
    if (game === TensOrBetter) min = TEN;
    
    // Check each possible pair position
    if (shand[0].index === shand[1].index && shand[0].index >= min) return true;
    if (shand[1].index === shand[2].index && shand[1].index >= min) return true;
    if (shand[2].index === shand[3].index && shand[2].index >= min) return true;
    if (shand[3].index === shand[4].index && shand[3].index >= min) return true;
    
    return false;
}

// Initialize the game when the page loads
initializeDeck();

// Start screen, overlay buttons and keyboard play
document.getElementById('playBtn').addEventListener('click', () => {
    document.getElementById('start-screen').classList.add('hidden');
});
document.getElementById('bust-restart').addEventListener('click', resetGame);
document.getElementById('target-new').addEventListener('click', resetGame);
document.getElementById('target-keep').addEventListener('click', () => {
    document.getElementById('target-screen').classList.add('hidden');
});

document.addEventListener('keydown', (e) => {
    // Any overlay open (start, bust, win): keys stay inactive
    if (document.querySelector('.overlay:not(.hidden)')) return;

    const target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT')) return;
    if (target && target.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) {
        return; // native button activation
    }

    if (e.key >= '1' && e.key <= '5') {
        toggleHold(Number(e.key) - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        dealButton.click();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        increaseBet();
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        decreaseBet();
    }
});

/**
 * Theme toggle functionality
 */
// Get the toggle button element
const themeToggleBtn = document.getElementById('theme-toggle-btn');

// Check for saved theme preference or use default dark theme
function loadThemePreference() {
    const savedTheme = localStorage.getItem('videoPokerTheme');
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-theme');
    }
}

// Toggle between light and dark themes
function toggleTheme() {
    // Toggle the light-theme class on the root element
    document.documentElement.classList.toggle('light-theme');
    
    // Save the preference to localStorage
    const isLightTheme = document.documentElement.classList.contains('light-theme');
    localStorage.setItem('videoPokerTheme', isLightTheme ? 'light' : 'dark');
}

// Add event listener to the theme toggle button
themeToggleBtn.addEventListener('click', toggleTheme);

// Load theme preference when the page loads
loadThemePreference();