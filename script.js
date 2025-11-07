const app = document.getElementById('app');
app.innerHTML = '<h2>Crypto Filter - World Class</h2><p>Loading data...</p>';

const topCoins = 50;
const updateInterval = 60 * 1000;

// Helper functions
function SMA(values, period) {
    let sum = 0;
    let result = [];
    for (let i = 0; i < values.length; i++) {
        sum += values[i];
        if (i >= period - 1) {
            if (i >= period) sum -= values[i - period];
            result.push(sum / period);
        } else {
            result.push(null);
        }
    }
    return result;
}

function EMA(values, period) {
    let k = 2 / (period + 1);
    let emaArray = [];
    values.forEach((price, i) => {
        if (i === 0) {
            emaArray.push(price);
        } else {
            emaArray.push(price * k + emaArray[i - 1] * (1 - k));
        }
    });
    return emaArray;
}

function calculateOBV(closes, volumes) {
    let obv = [0];
    for (let i = 1; i < closes.length; i++) {
        if (closes[i] > closes[i-1]) obv.push(obv[i-1] + volumes[i]);
        else if (closes[i] < closes[i-1]) obv.push(obv[i-1] - volumes[i]);
        else obv.push(obv[i-1]);
    }
    return obv;
}

function calculateADX(high, low, close, period = 14) {
    // Simplified ADX calculation
    let tr = [], plusDM = [], minusDM = [];
    for (let i = 1; i < high.length; i++) {
        let h = high[i], l = low[i], c = close[i-1];
        let currTR = Math.max(h - l, Math.abs(h - c), Math.abs(l - c));
        tr.push(currTR);

        let upMove = h - high[i-1];
        let downMove = low[i-1] - l;
        plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
        minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }
    let atr = SMA(tr, period).slice(-1)[0];
    let plus = SMA(plusDM, period).slice(-1)[0] / atr * 100;
    let minus = SMA(minusDM, period).slice(-1)[0] / atr * 100;
    return Math.abs(plus - minus) / (plus + minus) * 100;
}

async function fetchTopCoins() {
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${topCoins}&page=1&sparkline=false`);
    return res.json();
}

async function fetchOHLC(coinId, days = 90) {
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`);
    return res.json(); // [[timestamp, open, high, low, close], ...]
}

async function scanCoins() {
    app.innerHTML = '<h2>Crypto Filter - World Class</h2><p>Scanning top coins...</p>';
    const coins = await fetchTopCoins();
    let tableHTML = `<table><tr>
        <th>Coin</th><th>Price USD</th><th>Signal</th>
        </tr>`;

    for (let coin of coins) {
        try {
            const ohlc = await fetchOHLC(coin.id, 90);
            const closes = ohlc.map(c => c[4]);
            const highs = ohlc.map(c => c[2]);
            const lows = ohlc.map(c => c[3]);
            const volumes = ohlc.map(c => c[5] || 1000); // fallback if volume missing

            const ema50 = EMA(closes, 50).slice(-1)[0];
            const ema200 = EMA(closes, 200).slice(-1)[0];
            const adx = calculateADX(highs, lows, closes);
            const obv = calculateOBV(closes, volumes);
            const obvMA = SMA(obv, 20).slice(-1)[0];

            // Signal logic
            const trend = ema50 > ema200;
            const trendStrength = adx > 25;
            const volumeConfirm = obv.slice(-1)[0] > obvMA;

            const finalSignal = (trend && trendStrength && volumeConfirm) ? '✅ Strong Uptrend' : '❌ No';

            tableHTML += `<tr>
                <td>${coin.name}</td>
                <td>${coin.current_price.toFixed(2)}</td>
                <td>${finalSignal}</td>
            </tr>`;
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
