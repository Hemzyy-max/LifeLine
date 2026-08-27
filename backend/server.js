// =====================================================
// LIFE LINE BACKEND SERVER
// =====================================================

const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, ".env"),
    override: true
});

console.log("======================================");
console.log("❤️  LIFELINE BACKEND STARTING");
console.log("======================================");

console.log("📁 Backend folder:", __dirname);
console.log(
    "🔐 DB User:",
    process.env.DB_USER ? "Loaded ✅" : "Missing ❌"
);
console.log(
    "🔑 DB Password:",
    process.env.DB_PASSWORD ? "Loaded ✅" : "Missing ❌"
);
console.log(
    "🗄️ DB Name:",
    process.env.DB_NAME || "Missing ❌"
);
console.log(
    "🌐 PORT:",
    process.env.PORT || "5000"
);


// =====================================================
// EXPRESS
// =====================================================

const express = require("express");
const cors = require("cors");

const app = express();


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// =====================================================
// REQUEST LOGGER
// =====================================================

app.use((req, res, next) => {

    console.log(
        `➡️ ${req.method} ${req.originalUrl}`
    );

    next();

});


// =====================================================
// DATABASE
// =====================================================

const db = require("./config/db");


// =====================================================
// DATABASE TEST
// =====================================================

setTimeout(() => {

    db.promise()
        .query("SELECT 1")

        .then(() => {

            console.log(
                "✅ MySQL Connected Successfully"
            );

        })

        .catch(error => {

            console.error(
                "❌ MySQL Connection Failed:"
            );

            console.error(
                error.message
            );

        });

}, 500);


// =====================================================
// AUTH ROUTES
// =====================================================

try {

    const authRoutes =
        require("./routes/authRoutes");

    app.use(
        "/api/auth",
        authRoutes
    );

    console.log(
        "✅ Authentication routes registered"
    );

}
catch (error) {

    console.error(
        "❌ Authentication routes could not be loaded:"
    );

    console.error(
        error.message
    );

}


// =====================================================
// BLOOD REQUEST ROUTES
// =====================================================

try {

    const requestRoutes =
        require("./routes/requestRoutes");

    app.use(
        "/api/requests",
        requestRoutes
    );

    console.log(
        "✅ Blood request routes registered"
    );

}
catch (error) {

    console.error(
        "❌ Blood request routes could not be loaded:"
    );

    console.error(
        error.message
    );

}
// =====================================================
// DONOR ROUTES
// =====================================================

try {

    const donorRoutes =
        require("./routes/donorRoutes");

    app.use(
        "/api/donors",
        donorRoutes
    );

    console.log(
        "✅ Donor routes registered"
    );

}
catch (error) {

    console.error(
        "❌ Donor routes could not be loaded:"
    );

    console.error(
        error.message
    );

}
// =====================================================
// NOTIFICATION ROUTES
// =====================================================

try {

    const notificationRoutes =
        require("./routes/notificationRoutes");

    app.use(
        "/api/notifications",
        notificationRoutes
    );

    console.log(
        "✅ Notification routes registered"
    );

}
catch (error) {

    console.log(
        "⚠️ Notification routes not loaded:"
    );

    console.log(
        error.message
    );

}


// =====================================================
// UPLOAD ROUTES
// =====================================================

try {

    const uploadRoutes =
        require("./routes/uploadRoutes");

    app.use(
        "/api/upload",
        uploadRoutes
    );

    console.log(
        "✅ Upload routes registered"
    );

}
catch (error) {

    console.log(
        "⚠️ Upload routes not loaded"
    );

}


// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {

    res.json({

        success: true,

        message:
            "❤️ LifeLine Backend Running",

        server:
            "LifeLine",

        version:
            "2026",

        routes: {

    authentication:
        "/api/auth",

    bloodRequests:
        "/api/requests",

    donors:
        "/api/donors",

    notifications:
        "/api/notifications",

    upload:
        "/api/upload"

}

    });

});


// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
    "/api/health",
    async (req, res) => {

        try {

            await db.promise().query(
                "SELECT 1"
            );

            res.json({

                success: true,

                server:
                    "online",

                database:
                    "connected",

                timestamp:
                    new Date()

            });

        }
        catch (error) {

            res.status(500).json({

                success: false,

                server:
                    "online",

                database:
                    "disconnected",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// DATABASE TEST
// =====================================================

app.get(
    "/test-db",
    async (req, res) => {

        try {

            await db.promise().query(
                "SELECT 1"
            );

            res.json({

                success: true,

                message:
                    "Database Connected Successfully ✅"

            });

        }
        catch (error) {

            console.error(
                "Database test error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Database connection failed",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// 404
// =====================================================

app.use((req, res) => {

    console.log(
        `❌ Route not found: ${req.method} ${req.originalUrl}`
    );

    res.status(404).json({

        success: false,

        message:
            `Route not found: ${req.method} ${req.originalUrl}`

    });

});


// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
    (error, req, res, next) => {

        console.error(
            "🔥 GLOBAL SERVER ERROR:"
        );

        console.error(
            error
        );

        res.status(
            error.status || 500
        ).json({

            success: false,

            message:
                error.message ||
                "Internal server error"

        });

    }
);


// =====================================================
// START SERVER
// =====================================================

const PORT =
    Number(process.env.PORT) || 5000;

app.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "======================================"
        );

        console.log(
            "❤️  LIFELINE BACKEND"
        );

        console.log(
            "======================================"
        );

        console.log(
            `🚀 Server running on port ${PORT}`
        );

        console.log(
            `🌐 http://localhost:${PORT}`
        );

        console.log(
            "🩸 Blood Requests: /api/requests"
        );

        console.log(
            "🔐 Authentication: /api/auth"
        );

        console.log(
            "🔔 Notifications: /api/notifications"
        );

        console.log(
            "======================================"
        );

        console.log("");

    }
);