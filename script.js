const app = document.getElementById('app');
app.innerHTML = '<h2>Crypto Filter - World Class</h2><p>Loading data...</p>';

const topCoins = 50;
const updateInterval = 60 * 1000;

// --- Helper functions ---
function EMA(values, period) { /* same as before */ }
function SMA(values, period) { /* same as before */ }
function calculateOBV(closes, volumes) { /* same as before */ }
function calculateADX(high, low, close, period = 14) { /* same as before */ }

// --- 4H indicators ---
function calculateMACD(closes) {
    const ema12 = EMA(closes, 12);
    const ema26 = EMA(closes, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = EMA(macdLine, 9);
    return { macdLine, signalLine };
}

function calculateBollinger(closes, period = 20, mult = 2) {
    const sma = SMA(closes, period);
    const stdDev = closes.map((v, i) => {
        if (i < period - 1) return null;
        const slice = closes.slice(i - period + 1, i + 1);
        const mean = sma[i];
        const variance = slice.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / period;
        return Math.sqrt(variance);
    });
    const upper = sma.map((v, i) => v + mult * (stdDev[i] || 0));
    const lower = sma.map((v, i) => v - mult * (stdDev[i] || 0));
    return { middle: sma, upper, lower };
}

// --- Fetch coin data ---
async function fetchTopCoins() { /* same as before */ }
async function fetchOHLC(coinId, days = 90) { /* same as before */ }

// --- Scan function ---
async function scanCoins() {
    app.innerHTML = '<h2>Crypto Filter - World Class</h2><p>Scanning top coins...</p>';
    const coins = await fetchTopCoins();
    let tableHTML = `<table><tr>
        <th>Coin</th><th>Price USD</th><th>Signal</th></tr>`;

    for (let coin of coins) {
        try {
            // --- Daily OHLC for trend ---
            const dailyOHLC = await fetchOHLC(coin.id, 90); // daily
            const dailyCloses = dailyOHLC.map(c => c[4]);
            const dailyHighs = dailyOHLC.map(c => c[2]);
            const dailyLows = dailyOHLC.map(c => c[3]);
            const dailyVolumes = dailyOHLC.map(c => c[5] || 1000);

            const ema50 = EMA(dailyCloses, 50).slice(-1)[0];
            const ema200 = EMA(dailyCloses, 200).slice(-1)[0];
            const adx = calculateADX(dailyHighs, dailyLows, dailyCloses);
            const obv = calculateOBV(dailyCloses, dailyVolumes);
            const obvMA = SMA(obv, 20).slice(-1)[0];

            const trendOk = ema50 > ema200 && adx > 25 && obv.slice(-1)[0] > obvMA;

            // --- 4H OHLC for entry ---
            const ohlc4H = await fetchOHLC(coin.id, 30); // last 30 days for 4H
            const closes4H = ohlc4H.map(c => c[4]);
            const macd = calculateMACD(closes4H);
            const boll = calculateBollinger(closes4H);

            // MACD bullish cross (last candle)
            const macdLine = macd.macdLine.slice(-2);
            const signalLine = macd.signalLine.slice(-2);
            const macdBullishCross = macdLine[1] > signalLine[1] && macdLine[0] < signalLine[0];

            // Price near middle Bollinger band
            const lastPrice = closes4H.slice(-1)[0];
            const middle = boll.middle.slice(-1)[0];
            const nearMiddleBand = Math.abs(lastPrice - middle) / middle < 0.02; // within 2%

            // --- Final decision ---
            if (trendOk && macdBullishCross && nearMiddleBand) {
                tableHTML += `<tr>
                    <td>${coin.name}</td>
                    <td>${coin.current_price.toFixed(2)}</td>
                    <td>✅ Entry Signal</td>
                </tr>`;
            }

        } catch (e) {
            console.log(coin.id, e);
        }
    }

    tableHTML += `</table>`;
    app.innerHTML = `<h2>Crypto Filter - World Class</h2>${tableHTML}`;
}

// Initial scan
scanCoins();

// Refresh every 60 seconds
setInterval(scanCoins, updateInterval);
