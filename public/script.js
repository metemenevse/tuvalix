// Artık frontend'de API_KEY YOK.
// Tüm istekler backend'e gidiyor: /api/resolveVanity ve /api/games

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("username-form");
    const input = document.getElementById("steam-username");
    const statusEl = document.getElementById("status-message");
    const mosaicEl = document.getElementById("mosaic-container");
    const cursorBlurEl = document.querySelector(".cursor-blur");

    /* =========================
       Özel imleç
       ========================= */
    document.addEventListener("mousemove", (e) => {
        const size = 50;
        const x = e.clientX - size / 2;
        const y = e.clientY - size / 2;
        cursorBlurEl.style.transform = `translate(${x}px, ${y}px)`;
    });

    /* =========================
       Form submit
       ========================= */
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
            // 1) Vanity çöz
            const resolveRes = await fetch(
                `/api/resolveVanity?username=${encodeURIComponent(username)}`
            );

            if (!resolveRes.ok) {
                const errData = await safeJson(resolveRes);
                setStatus(
                    (errData && errData.error) ||
                        "Kullanıcı adı çözümlenirken hata oluştu.",
                    "error"
                );
                return;
            }

            const resolveData = await resolveRes.json();
            const steamId = resolveData.steamId;

            if (!steamId) {
                setStatus("Kullanıcı bulunamadı.", "error");
                return;
            }

            // 2) Oyun listesi
            const gamesRes = await fetch(
                `/api/games?steamId=${encodeURIComponent(steamId)}`
            );

            if (!gamesRes.ok) {
                const errData = await safeJson(gamesRes);
                setStatus(
                    (errData && errData.error) ||
                        "Oyunlar alınırken hata oluştu.",
                    "error"
                );
                return;
            }

            const gamesData = await gamesRes.json();
            const games = gamesData.games || [];

            if (!games.length) {
                setStatus(
                    "Oyun verisi bulunamadı. Oyun detaylarınız gizli olabilir.",
                    "error"
                );
                return;
            }

            renderMosaic(games, mosaicEl);

            /* 🔥 Mozaik oluştuktan sonra 3D Tilt aktif edilir */
            initCardTilt();

            setStatus(
                `Toplam ${games.length} oyun bulundu. Tuval hazır.`,
                "success"
            );
        } catch (err) {
            console.error(err);
            setStatus("Beklenmeyen bir hata oluştu.", "error");
        }
    });

    /* =========================
       Status helper
       ========================= */
    function setStatus(message, type) {
        statusEl.textContent = message;
        statusEl.classList.remove(
            "status-message--error",
            "status-message--success"
        );

        if (type === "error") statusEl.classList.add("status-message--error");
        if (type === "success")
            statusEl.classList.add("status-message--success");
    }
});

/* =========================
   Safe JSON
   ========================= */
async function safeJson(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

/* =========================
   Mozaik Render
   ========================= */
function renderMosaic(games, containerEl) {
    containerEl.innerHTML = "";

    games.forEach((game) => {
        const sizeClass = getSizeClass(game.hours);

        const card = document.createElement("article");
        card.className = `game-card ${sizeClass}`;

        const img = document.createElement("img");
        img.src = getGameImageUrl(game.appid);
        img.alt = "";

        img.onerror = () => {
            img.onerror = null;
            img.src = "https://placehold.co/640x360/111111/ffffff?text=No+Cover";
        };

        const overlay = document.createElement("div");
        overlay.className = "game-card-overlay";

        const badge = document.createElement("div");
        badge.className = "playtime-badge";
        badge.textContent = `${Math.round(game.hours)} saat`;

        overlay.appendChild(badge);
        card.appendChild(img);
        card.appendChild(overlay);

        containerEl.appendChild(card);
    });
}

/* =========================
   Size Helpers
   ========================= */
function getSizeClass(hours) {
    if (hours >= 1500) return "size-1500";
    if (hours >= 1000) return "size-1000";
    if (hours >= 600) return "size-600";
    if (hours >= 300) return "size-300";
    if (hours >= 100) return "size-100";
    if (hours >= 50) return "size-50";
    return "size-25";
}

/* =========================
   Game Cover Resolver
   ========================= */
function getGameImageUrl(appid) {
    if (!appid)
        return "https://placehold.co/640x360/111111/ffffff?text=No+Cover";

    return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
}

/* =========================
   3D TILT – STABLE VERSION
   ========================= */
function initCardTilt() {
    const cards = document.querySelectorAll(".game-card");

    cards.forEach((card) => {
        let bounds = null;

        card.addEventListener("mousemove", (e) => {
            if (!bounds) bounds = card.getBoundingClientRect();

            const x = e.clientX - bounds.left;
            const y = e.clientY - bounds.top;

            const px = (x / bounds.width - 0.5) * 2;
            const py = (y / bounds.height - 0.5) * 2;

            card.style.transform = `
                perspective(900px)
                rotateX(${py * -8}deg)
                rotateY(${px * 8}deg)
                scale(1.04)
            `;

            card.style.setProperty("--x", `${x}px`);
            card.style.setProperty("--y", `${y}px`);
        });

        card.addEventListener("mouseleave", () => {
            card.style.transform = `
                perspective(900px)
                rotateX(0deg)
                rotateY(0deg)
                scale(1)
            `;

            bounds = null;
        });
    });
}
