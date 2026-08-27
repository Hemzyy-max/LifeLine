const express = require("express");
const db = require("../config/db");
const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

console.log("🔔 Notification routes loaded");


// =====================================================
// GET ALL NOTIFICATIONS
// GET /api/notifications
// =====================================================

router.get(
    "/",
    verifyToken,
    async (req, res) => {

        try {

            console.log(
                "🔔 Loading notifications for:",
                req.user
            );


            const userId =
                req.user.id;

            const userRole =
                req.user.role;


            const [notifications] =
                await db.promise().query(

                    `
                    SELECT

                        id,
                        user_id,
                        user_role,
                        title,
                        message,
                        type,
                        related_id,
                        is_read,
                        created_at

                    FROM notifications

                    WHERE user_id = ?

                    AND user_role = ?

                    ORDER BY created_at DESC
                    `,

                    [
                        userId,
                        userRole
                    ]

                );


            return res.json({

                success: true,

                notifications

            });

        }

        catch (error) {

            console.error(
                "❌ Get Notifications Error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.sqlMessage ||
                    error.message ||
                    "Unable to load notifications"

            });

        }

    }
);


// =====================================================
// GET UNREAD NOTIFICATION COUNT
// GET /api/notifications/unread-count
// =====================================================

router.get(
    "/unread-count",
    verifyToken,
    async (req, res) => {

        try {

            const [result] =
                await db.promise().query(

                    `
                    SELECT
                        COUNT(*) AS unread_count

                    FROM notifications

                    WHERE user_id = ?

                    AND user_role = ?

                    AND is_read = 0
                    `,

                    [
                        req.user.id,
                        req.user.role
                    ]

                );


            return res.json({

                success: true,

                unread_count:
                    Number(
                        result[0].unread_count
                    )

            });

        }

        catch (error) {

            console.error(
                "❌ Unread Count Error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.sqlMessage ||
                    error.message ||
                    "Unable to load unread count"

            });

        }

    }
);


// =====================================================
// MARK ONE NOTIFICATION AS READ
// PUT /api/notifications/:id/read
// =====================================================

router.put(
    "/:id/read",
    verifyToken,
    async (req, res) => {

        try {

            const notificationId =
                Number(
                    req.params.id
                );


            if (!notificationId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid notification ID"

                });

            }


            const [result] =
                await db.promise().query(

                    `
                    UPDATE notifications

                    SET is_read = 1

                    WHERE id = ?

                    AND user_id = ?

                    AND user_role = ?
                    `,

                    [
                        notificationId,
                        req.user.id,
                        req.user.role
                    ]

                );


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Notification not found"

                });

            }


            return res.json({

                success: true,

                message:
                    "Notification marked as read"

            });

        }

        catch (error) {

            console.error(
                "❌ Mark Notification Error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.sqlMessage ||
                    error.message ||
                    "Unable to update notification"

            });

        }

    }
);


// =====================================================
// MARK ALL NOTIFICATIONS AS READ
// PUT /api/notifications/read-all
// =====================================================

router.put(
    "/read-all",
    verifyToken,
    async (req, res) => {

        try {

            const [result] =
                await db.promise().query(

                    `
                    UPDATE notifications

                    SET is_read = 1

                    WHERE user_id = ?

                    AND user_role = ?

                    AND is_read = 0
                    `,

                    [
                        req.user.id,
                        req.user.role
                    ]

                );


            return res.json({

                success: true,

                message:
                    "All notifications marked as read",

                updated:
                    result.affectedRows

            });

        }

        catch (error) {

            console.error(
                "❌ Mark All Notifications Error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.sqlMessage ||
                    error.message ||
                    "Unable to update notifications"

            });

        }

    }
);


// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;