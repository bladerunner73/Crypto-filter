const app = document.getElementById('app');
app.innerHTML = '<h2>Crypto Filter - World Class</h2><p>Loading crypto data...</p>';

const topCoins = 50; // number of coins to scan
const updateInterval = 60 * 1000; // 60 seconds

async function fetchTopCoins() {
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${topCoins}&page=1&sparkline=false`);
    return res.json();
}

// EMA helper
function EMA(values, period) {
    const k = 2 / (period + 1);
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

// Fetch OHLC data for a coin
async function fetchOHLC(coinId, days = 90) {
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`);
    return res.json(); // [[timestamp, open, high, low, close], ...]
}

// Calculate EMA indicators
function calculateIndicators(ohlc) {
    const closes = ohlc.map(c => c[4]);
    const ema50 = EMA(closes, 50).slice(-1)[0];
    const ema200 = EMA(closes, 200).slice(-1)[0];
    return { ema50, ema200 };
}

async function scanCoins() {
    app.innerHTML = '<h2>Crypto Filter - World Class</h2><p>Scanning top coins...</p>';
    const coins = await fetchTopCoins();
    let tableHTML = `<table>
        <tr>
            <th>Coin</th><th>Price USD</th><th>EMA50</th><th>EMA200</th><th>Signal</th>
        </tr>`;

    for (let coin of coins) {
        try {
            const ohlc = await fetchOHLC(coin.id, 90); // last 90 days
            const indicators = calculateIndicators(ohlc);
            const signal = indicators.ema50 > indicators.ema200 ? '✅ Uptrend' : '❌ No';
            tableHTML += `<tr>
                <td>${coin.name}</td>
                <td>${coin.current_price.toFixed(2)}</td>
                <td>${indicators.ema50.toFixed(2)}</td>
                <td>${indicators.ema200.toFixed(2)}</td>
                <td>${signal}</td>
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
