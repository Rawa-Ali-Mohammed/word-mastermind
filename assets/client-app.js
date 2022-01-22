
const app = new Vue({
    el: "#app",

    data: {
        allowedLetters: new Set("QWERTYUIOPASDFGHJKLZXCVBNM"),
        keyboard: [
            [..."QWERTYUIOP"],
            [..."ASDFGHJKL"],
            ["ENTER", ..."ZXCVBNM", "⌫ "],
        ],

        gameState: undefined,
    },


    methods: {

        startGame: async function() {
            const response = await fetch("/game/start");
            const newGameData = await response.json();
            const {id, totalAttempts, wordLength} = newGameData;
            this.gameState = {
                id,
                totalAttempts,
                wordLength,
                currentAttempt: 0,
                board: [],
                wrongKeys: new Set(),
                rightKeys: new Set(),
            }

            for (let i = 0; i < totalAttempts; i++) {
                const row = [];
                this.gameState.board.push(row);
                for (let j = 0; j < wordLength; j++) {
                    row.push({
                        letter: undefined,
                        result: undefined
                    });
                }
            }

            console.log(this.gameState)
        },

        handleNewLetter: async function(key) {
            if (!this.gameState || this.gameState.finished) {
                return;
            }

            if (key === "ENTER") {
                await this.submitWord();
            } else if (key === "⌫ " || key === "BACKSPACE") {
                this.deleteLetter();
            } else {
                this.addLetter(key);
            }
        },

        addLetter: function(letter) {
            letter = (letter || "").toUpperCase();
            if (!this.allowedLetters.has(letter)) {
                return;
            }

            const {board, currentAttempt} = this.gameState;
            const row = board[currentAttempt];
            for (const tile of row) {
                if (tile.letter === undefined) {
                    tile.letter = letter;
                    break;
                }
            }
        },

        deleteLetter: function() {
            const {board, currentAttempt} = this.gameState;
            const row = board[currentAttempt];
            let lastTile;
            for (const tile of row) {
                if (tile.letter !== undefined) {
                    lastTile = tile;
                } else {
                    break;
                }
            }
            if (lastTile) {
                lastTile.letter = undefined;
            }
        },

        submitWord: async function() {
            const {id, board, currentAttempt} = this.gameState;
            const row = board[currentAttempt];
            let guess = "";
            for (const tile of row) {
                if (tile.letter) {
                    guess += tile.letter;
                } else {
                    return;
                }
            }

            const response = await fetch("/game/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: this.gameState.id,
                    guess,
                })
            });

            const data = await response.json();

            if (data.error) {
                console.warn(data.error);
                return;
            }

            const {result} = data;

            if (result) {
                for (let i = 0; i < row.length; i++) {
                    const tile = row[i];
                    const tileResult = result[i];

                    if (tileResult === "2") {
                        tile.result = "correct";
                        this.gameState.rightKeys.add(tile.letter);
                    } else if (tileResult === "1") {
                        tile.result = "present";
                        this.gameState.rightKeys.add(tile.letter);
                    } else {
                        this.gameState.wrongKeys.add(tile.letter);
                    }
                }
            }

            if (data.won) {
                this.gameState.finished = true;
                window.setTimeout(() => {
                    alert("YOU WON");
                    this.startGame();
                }, 100);
                return;
            }

            if (data.finished) {
                this.gameState.revealed = data.word;
                this.gameState.finished = true;
                window.setTimeout(() => {
                    alert("The word was: " + data.word);
                    this.startGame();
                }, 100);
                return;
            }

            this.gameState.currentAttempt++;
        },


        classForKey: function(key) {
            return {
                btn: true,
                key: true,
                right: this.gameState && this.gameState.rightKeys.has(key),
                wrong: this.gameState && this.gameState.wrongKeys.has(key),
            };
        }

    },

    mounted: function() {
        this.startGame();

        document.addEventListener("keyup", async (e) => {
            await this.handleNewLetter(e.key.toUpperCase());
        });
    },
})