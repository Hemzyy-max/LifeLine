// =====================================================
// LIFE LINE DONOR ROUTES
// =====================================================

const express = require("express");
const verifyToken = require("../middleware/authMiddleware");
const db = require("../config/db");

const router = express.Router();


// =====================================================
// GET DONOR PROFILE
// GET /api/donors/profile
// =====================================================

router.get("/profile", verifyToken, async (req, res) => {

    try {

        if (req.user.role !== "donor") {

            return res.status(403).json({
                success: false,
                message: "Access denied. Donor account required."
            });

        }

        const [donors] = await db.promise().query(
            `
            SELECT
                id,
                name,
                email,
                age,
                blood_group,
                phone,
                location,
                last_donation_date,
                availability,
                latitude,
                longitude
            FROM donors
            WHERE id = ?
            `,
            [req.user.id]
        );


        if (donors.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Donor profile not found."
            });

        }


        res.json({
            success: true,
            donor: donors[0]
        });

    }

    catch (error) {

        console.error(
            "❌ Donor Profile Error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                error.sqlMessage ||
                error.message ||
                "Server error while loading donor profile."
        });

    }

});


// =====================================================
// GET AVAILABLE DONORS FOR MAP
// GET /api/donors/nearby
// =====================================================

router.get("/nearby", verifyToken, async (req, res) => {

    try {

        console.log("🗺️ Loading available donors...");


        const [donors] = await db.promise().query(
            `
            SELECT
                id,
                name,
                email,
                blood_group,
                phone,
                location,
                availability,
                latitude,
                longitude
            FROM donors
            WHERE availability = 'Available'
            AND latitude IS NOT NULL
            AND longitude IS NOT NULL
            ORDER BY id DESC
            `
        );


        console.log(
            `🩸 Found ${donors.length} donors with location`
        );


        res.json({

            success: true,

            count: donors.length,

            donors: donors

        });

    }

    catch (error) {

        console.error(
            "❌ Nearby Donors Error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                error.sqlMessage ||
                error.message ||
                "Unable to load nearby donors"

        });

    }

});


module.exports = router;