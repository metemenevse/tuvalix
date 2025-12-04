// server.js
require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

const STEAM_API_KEY = process.env.STEAM_API_KEY;
if (!STEAM_API_KEY) {
    console.error("HATA: .env dosyasında STEAM_API_KEY tanımlı değil.");
    process.exit(1);
}

app.use(cors());
app.use(express.json());

// Frontend
app.use(express.static(path.join(__dirname, "public")));


// Vanity
async function resolveVanityUrl(username) {
    const url = new URL(
        "https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/"
    );
    url.searchParams.set("key", STEAM_API_KEY);
    url.searchParams.set("vanityurl", username);

    const res = await fetch(url.toString());
    if (!res.ok) {
        throw new Error("ResolveVanityURL isteği başarısız");
    }
    const data = await res.json();

    if (data.response && data.response.success === 1) {
        return data.response.steamid;
    }

    if (/^\d{17}$/.test(username)) {
        return username;
    }

    return null;
}

async function fetchOwnedGames(steamId) {
    const url = new URL(
        "https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/"
    );
    url.searchParams.set("key", STEAM_API_KEY);
    url.searchParams.set("steamid", steamId);
    url.searchParams.set("include_appinfo", "1");
    url.searchParams.set("include_played_free_games", "1");
    url.searchParams.set("format", "json");

    const res = await fetch(url.toString());
    if (!res.ok) {
        throw new Error("GetOwnedGames isteği başarısız");
    }

    const data = await res.json();
    const games = data.response && data.response.games ? data.response.games : [];

    const played = games
        .filter((g) => g.playtime_forever && g.playtime_forever > 0)
        .map((g) => ({
            appid: g.appid,
            name: g.name,
            minutes: g.playtime_forever,
            hours: g.playtime_forever / 60,
            img_logo_url: g.img_logo_url,
        }));

    played.sort((a, b) => b.hours - a.hours);

    return played;
}

// -------- API ROUTES --------
app.get("/api/resolveVanity", async (req, res) => {
    try {
        const username = (req.query.username || "").trim();
        if (!username) {
            return res.status(400).json({ error: "username parametresi gerekli." });
        }

        const steamId = await resolveVanityUrl(username);
        if (!steamId) {
            return res.status(404).json({ error: "Kullanıcı bulunamadı." });
        }

        res.json({ steamId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "ResolveVanity sırasında hata oluştu." });
    }
});

// SteamID
app.get("/api/games", async (req, res) => {
    try {
        const steamId = (req.query.steamId || "").trim();
        if (!steamId) {
            return res.status(400).json({ error: "steamId parametresi gerekli." });
        }

        const games = await fetchOwnedGames(steamId);
        res.json({ games });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Oyunlar alınırken hata oluştu." });
    }
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`Tuvalix server http://localhost:${PORT} üzerinde çalışıyor`);
});
