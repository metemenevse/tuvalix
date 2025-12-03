// Artık frontend'de API_KEY YOK.
// Tüm istekler backend'e gidiyor: /api/resolveVanity ve /api/games

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("username-form");
    const input = document.getElementById("steam-username");
    const statusEl = document.getElementById("status-message");
    const mosaicEl = document.getElementById("mosaic-container");
    const cursorBlurEl = document.querySelector(".cursor-blur");

    // Özel imleç hareketi
    document.addEventListener("mousemove", (e) => {
        const size = 50;
        const x = e.clientX - size / 2;
        const y = e.clientY - size / 2;
        cursorBlurEl.style.transform = `translate(${x}px, ${y}px)`;
    });

    // Form submit
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const username = input.value.trim();

        if (!username) {
            setStatus("Lütfen bir Steam kullanıcı adı girin.", "error");
            return;
        }

        setStatus("Veriler alınıyor, lütfen bekleyin...", "success");
        mosaicEl.innerHTML = "";

        try {
            // 1) Kullanıcı adından SteamID çöz
            const resolveRes = await fetch(
                `/api/resolveVanity?username=${encodeURIComponent(username)}`
            );
            if (!resolveRes.ok) {
                const errData = await safeJson(resolveRes);
                const msg =
                    (errData && errData.error) ||
                    "Kullanıcı adı çözümlenirken hata oluştu.";
                setStatus(msg, "error");
                return;
            }
            const resolveData = await resolveRes.json();
            const steamId = resolveData.steamId;
            if (!steamId) {
                setStatus("Kullanıcı bulunamadı.", "error");
                return;
            }

            // 2) SteamID'den oyunları çek
            const gamesRes = await fetch(
                `/api/games?steamId=${encodeURIComponent(steamId)}`
            );
            if (!gamesRes.ok) {
                const errData = await safeJson(gamesRes);
                const msg =
                    (errData && errData.error) ||
                    "Oyunlar alınırken hata oluştu.";
                setStatus(msg, "error");
                return;
            }
            const gamesData = await gamesRes.json();
            const games = gamesData.games || [];

            if (!games.length) {
                setStatus(
                    "Oyun verisi bulunamadı. Muhtemelen oyun detaylarınız gizli veya hiç oyununuz yok.",
                    "error"
                );
                return;
            }

            renderMosaic(games, mosaicEl);
            setStatus(
                `Toplam ${games.length} oyun bulundu. Oyun saatlerine göre tuval oluşturuldu.`,
                "success"
            );
        } catch (err) {
            console.error(err);
            setStatus("Beklenmeyen bir hata oluştu.", "error");
        }
    });

    function setStatus(message, type) {
        statusEl.textContent = message;
        statusEl.classList.remove("status-message--error", "status-message--success");
        if (type === "error") {
            statusEl.classList.add("status-message--error");
        } else if (type === "success") {
            statusEl.classList.add("status-message--success");
        }
    }
});

async function safeJson(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

// =========================
// Mozaik Oluşturma
// =========================

function renderMosaic(games, containerEl) {
    containerEl.innerHTML = "";

    games.forEach((game) => {
        const sizeClass = getSizeClass(game.hours);
        const card = document.createElement("article");
        card.className = `game-card ${sizeClass}`;

        // Kapak görseli
        const img = document.createElement("img");
        const imgUrl = getGameImageUrl(game.appid, game.img_logo_url);
        img.src = imgUrl;
        img.alt = ""; // isim istemiyoruz

        // Header yoksa placeholder'a düş
        img.onerror = () => {
            img.onerror = null;
            img.src = "https://placehold.co/640x360/111111/ffffff?text=No+Cover";
        };

        // Hover overlay
        const overlay = document.createElement("div");
        overlay.className = "game-card-overlay";

        // SADECE OYUN SÜRESİ
        const playtime = document.createElement("div");
        playtime.className = "playtime-badge";
        const hoursRounded = Math.round(game.hours);
        // İstersen "hrs" yazabilirsin:
        // playtime.textContent = `${hoursRounded} hrs`;
        playtime.textContent = `${hoursRounded} saat`;

        overlay.appendChild(playtime);

        card.appendChild(img);
        card.appendChild(overlay);

        containerEl.appendChild(card);
    });
}


/**
 * Saat aralığına göre kart boyutu sınıfı
 */
function getSizeClass(hours) {
    if (hours >= 1500) return "size-1500";
    if (hours >= 1000) return "size-1000";
    if (hours >= 600) return "size-600";
    if (hours >= 300) return "size-300";
    if (hours >= 100) return "size-100";
    if (hours >= 50) return "size-50";
    return "size-25";
}

/**
 * Oyun kapağı URL'si
 * Burada direkt store header görselini kullanıyoruz.
 */
function getGameImageUrl(appid, imgLogoUrl) {
    if (!appid) {
        return "https://placehold.co/640x360/111111/ffffff?text=No+Cover";
    }

    // Standart Steam header resmi (16:9’a yakın ratio)
    return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
}

