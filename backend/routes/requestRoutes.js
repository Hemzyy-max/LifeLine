const express = require("express");
const db = require("../config/db");
const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();


// =====================================================
// CREATE BLOOD REQUEST
// POST /api/requests/create
// =====================================================

router.post("/create", verifyToken, async (req, res) => {

    try {

        if (req.user.role !== "hospital") {
            return res.status(403).json({
                success: false,
                message: "Only hospitals can create blood requests"
            });
        }

        const {
            blood_group,
            units_required,
            urgency,
            location,
            required_date,
            message
        } = req.body;

        if (
            !blood_group ||
            !units_required ||
            !location
        ) {
            return res.status(400).json({
                success: false,
                message: "Blood group, units and location are required"
            });
        }

        const [result] = await db.promise().query(`
            INSERT INTO blood_requests
            (
                hospital_id,
                blood_group,
                units_required,
                urgency,
                location,
                required_date,
                message,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'open')
        `, [
            req.user.id,
            blood_group,
            Number(units_required),
            urgency || "normal",
            location,
            required_date || null,
            message || null
        ]);

        return res.status(201).json({
            success: true,
            message: "🩸 Blood request created successfully!",
            requestId: result.insertId
        });

    } catch (error) {

        console.error("Create Request Error:", error);

        return res.status(500).json({
            success: false,
            message:
                error.sqlMessage ||
                error.message ||
                "Server error"
        });
    }
});


// =====================================================
// GET OPEN REQUESTS
// GET /api/requests/open
// =====================================================

router.get("/open", verifyToken, async (req, res) => {

    try {

        const [requests] = await db.promise().query(`
            SELECT
                br.id,
                br.blood_group,
                br.units_required,
                br.urgency,
                br.location,
                br.required_date,
                br.message,
                br.status,
                br.created_at,
                br.hospital_id,
                h.name AS hospital_name
            FROM blood_requests br
            JOIN hospitals h
                ON br.hospital_id = h.id
            WHERE br.status = 'open'
            ORDER BY
                CASE
                    WHEN br.urgency = 'emergency' THEN 1
                    WHEN br.urgency = 'urgent' THEN 2
                    ELSE 3
                END,
                br.created_at DESC
        `);

        return res.json({
            success: true,
            requests
        });

    } catch (error) {

        console.error("Open Requests Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// =====================================================
// GET MY HOSPITAL REQUESTS
// GET /api/requests/my-requests
// =====================================================

router.get("/my-requests", verifyToken, async (req, res) => {

    try {

        if (req.user.role !== "hospital") {
            return res.status(403).json({
                success: false,
                message: "Only hospitals can view their requests"
            });
        }

        const [requests] = await db.promise().query(`
            SELECT
                br.id,
                br.hospital_id,
                br.blood_group,
                br.units_required,
                br.urgency,
                br.location,
                br.required_date,
                br.message,
                br.status,
                br.created_at,

                (
                    SELECT COUNT(*)
                    FROM donation_responses dr
                    WHERE dr.request_id = br.id
                ) AS response_count,

                (
                    SELECT COUNT(*)
                    FROM donation_responses dr
                    WHERE dr.request_id = br.id
                    AND dr.status = 'accepted'
                ) AS accepted_count,

                (
                    SELECT COUNT(*)
                    FROM donation_responses dr
                    WHERE dr.request_id = br.id
                    AND dr.status = 'completed'
                ) AS completed_count

            FROM blood_requests br
            WHERE br.hospital_id = ?
            ORDER BY br.created_at DESC
        `, [req.user.id]);

        return res.json({
            success: true,
            requests
        });

    } catch (error) {

        console.error("My Requests Error:", error);

        return res.status(500).json({
            success: false,
            message:
                error.sqlMessage ||
                error.message
        });
    }
});


// =====================================================
// GET HOSPITAL DONOR RESPONSES
// GET /api/requests/hospital-responses
// =====================================================

router.get(
    "/hospital-responses",
    verifyToken,
    async (req, res) => {

        try {

            if (req.user.role !== "hospital") {
                return res.status(403).json({
                    success: false,
                    message: "Only hospitals can view donor responses"
                });
            }

            const [responses] = await db.promise().query(`
                SELECT

                    dr.id AS response_id,
                    dr.request_id,
                    dr.donor_id,
                    dr.status,
                    dr.created_at,

                    br.blood_group,
                    br.units_required,
                    br.urgency,
                    br.location,
                    br.required_date,
                    br.message,
                    br.status AS request_status,

                    d.name AS donor_name,
                    d.email AS donor_email

                FROM donation_responses dr

                JOIN blood_requests br
                    ON dr.request_id = br.id

                JOIN donors d
                    ON dr.donor_id = d.id

                WHERE br.hospital_id = ?

                ORDER BY dr.created_at DESC
            `, [req.user.id]);

            return res.json({
                success: true,
                responses
            });

        } catch (error) {

            console.error("Hospital Responses Error:", error);

            return res.status(500).json({
                success: false,
                message:
                    error.sqlMessage ||
                    error.message
            });
        }
    }
);


// =====================================================
// DONOR RESPOND TO REQUEST
// POST /api/requests/:requestId/respond
// =====================================================

router.post(
    "/:requestId/respond",
    verifyToken,
    async (req, res) => {

        try {

            if (req.user.role !== "donor") {
                return res.status(403).json({
                    success: false,
                    message: "Only donors can respond"
                });
            }

            const requestId =
                Number(req.params.requestId);

            const [requests] =
                await db.promise().query(`
                    SELECT *
                    FROM blood_requests
                    WHERE id = ?
                `, [requestId]);

            if (requests.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Blood request not found"
                });
            }

            const request = requests[0];

            if (request.status !== "open") {

                return res.status(400).json({
                    success: false,
                    message: "This blood request is no longer open"
                });
            }


            // Check duplicate response

            const [existing] =
                await db.promise().query(`
                    SELECT id
                    FROM donation_responses
                    WHERE request_id = ?
                    AND donor_id = ?
                `, [
                    requestId,
                    req.user.id
                ]);

            if (existing.length > 0) {

                return res.status(400).json({
                    success: false,
                    message: "You have already responded to this request"
                });
            }


            const [result] =
                await db.promise().query(`
                    INSERT INTO donation_responses
                    (
                        request_id,
                        donor_id,
                        status
                    )
                    VALUES (?, ?, 'pending')
                `, [
                    requestId,
                    req.user.id
                ]);


            // Notify hospital

            await createNotification(
                request.hospital_id,
                "hospital",
                "New Donor Response",
                "A donor has responded to your blood request.",
                "donor_response",
                result.insertId
            );


            return res.status(201).json({

                success: true,

                message:
                    "🩸 Your response has been sent to the hospital.",

                responseId:
                    result.insertId
            });

        } catch (error) {

            console.error("Donor Response Error:", error);

            return res.status(500).json({
                success: false,
                message:
                    error.sqlMessage ||
                    error.message
            });
        }
    }
);


// =====================================================
// ACCEPT DONOR
// PUT /api/requests/response/:responseId/accept
// =====================================================

router.put(
    "/response/:responseId/accept",
    verifyToken,
    async (req, res) => {

        const connection = await db.promise().getConnection();

        try {

            if (req.user.role !== "hospital") {

                connection.release();

                return res.status(403).json({
                    success: false,
                    message: "Only hospitals can accept donors"
                });
            }

            const responseId =
                Number(req.params.responseId);

            await connection.beginTransaction();


            const [rows] =
                await connection.query(`
                    SELECT
                        dr.id,
                        dr.status,
                        dr.request_id,
                        dr.donor_id,
                        br.hospital_id,
                        br.status AS request_status
                    FROM donation_responses dr
                    JOIN blood_requests br
                        ON dr.request_id = br.id
                    WHERE dr.id = ?
                    FOR UPDATE
                `, [responseId]);


            if (rows.length === 0) {

                await connection.rollback();
                connection.release();

                return res.status(404).json({
                    success: false,
                    message: "Donation response not found"
                });
            }


            const response = rows[0];


            if (
                Number(response.hospital_id) !==
                Number(req.user.id)
            ) {

                await connection.rollback();
                connection.release();

                return res.status(403).json({
                    success: false,
                    message: "You cannot modify this response"
                });
            }


            if (response.status === "accepted") {

                await connection.rollback();
                connection.release();

                return res.json({
                    success: true,
                    message: "Donor is already accepted"
                });
            }


            if (response.status === "completed") {

                await connection.rollback();
                connection.release();

                return res.status(400).json({
                    success: false,
                    message: "Donation is already completed"
                });
            }


            if (response.request_status !== "open") {

                await connection.rollback();
                connection.release();

                return res.status(400).json({
                    success: false,
                    message:
                        "This blood request is no longer open"
                });
            }


            // Accept selected donor

            await connection.query(`
                UPDATE donation_responses
                SET status = 'accepted'
                WHERE id = ?
            `, [responseId]);


            // Reject other pending donors

            await connection.query(`
                UPDATE donation_responses
                SET status = 'rejected'
                WHERE request_id = ?
                AND id <> ?
                AND status = 'pending'
            `, [
                response.request_id,
                responseId
            ]);


            // Request moves to accepted state

            await connection.query(`
                UPDATE blood_requests
                SET status = 'accepted'
                WHERE id = ?
            `, [response.request_id]);


            await connection.commit();

            connection.release();


            await createNotification(
                response.donor_id,
                "donor",
                "🎉 Donor Accepted",
                "The hospital accepted your blood donation response. Please proceed according to the hospital's instructions.",
                "accepted",
                responseId
            );


            return res.json({
                success: true,
                message: "✅ Donor accepted successfully"
            });

        } catch (error) {

            await connection.rollback();
            connection.release();

            console.error("Accept Donor Error:", error);

            return res.status(500).json({
                success: false,
                message:
                    error.sqlMessage ||
                    error.message ||
                    "Unable to accept donor"
            });
        }
    }
);


// =====================================================
// REJECT DONOR
// PUT /api/requests/response/:responseId/reject
// =====================================================

router.put(
    "/response/:responseId/reject",
    verifyToken,
    async (req, res) => {

        try {

            if (req.user.role !== "hospital") {

                return res.status(403).json({
                    success: false,
                    message: "Only hospitals can reject donors"
                });
            }

            const responseId =
                Number(req.params.responseId);


            const [rows] =
                await db.promise().query(`
                    SELECT
                        dr.id,
                        dr.status,
                        dr.donor_id,
                        br.hospital_id
                    FROM donation_responses dr
                    JOIN blood_requests br
                        ON dr.request_id = br.id
                    WHERE dr.id = ?
                `, [responseId]);


            if (rows.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Donation response not found"
                });
            }


            const response = rows[0];


            if (
                Number(response.hospital_id) !==
                Number(req.user.id)
            ) {

                return res.status(403).json({
                    success: false,
                    message: "You cannot modify this response"
                });
            }


            await db.promise().query(`
                UPDATE donation_responses
                SET status = 'rejected'
                WHERE id = ?
            `, [responseId]);


            await createNotification(
                response.donor_id,
                "donor",
                "Donor Response Update",
                "The hospital did not select your response for this blood request.",
                "rejected",
                responseId
            );


            return res.json({
                success: true,
                message: "Donor response rejected"
            });

        } catch (error) {

            console.error("Reject Donor Error:", error);

            return res.status(500).json({
                success: false,
                message:
                    error.sqlMessage ||
                    error.message
            });
        }
    }
);


// =====================================================
// DONATION COMPLETED
// PUT /api/requests/response/:responseId/complete
// =====================================================

router.put(
    "/response/:responseId/complete",
    verifyToken,
    async (req, res) => {

        const connection =
            await db.promise().getConnection();

        try {

            if (req.user.role !== "hospital") {

                connection.release();

                return res.status(403).json({
                    success: false,
                    message:
                        "Only hospitals can complete a donation"
                });
            }


            const responseId =
                Number(req.params.responseId);


            await connection.beginTransaction();


            const [rows] =
                await connection.query(`
                    SELECT
                        dr.id,
                        dr.status,
                        dr.request_id,
                        dr.donor_id,

                        br.hospital_id,
                        br.status AS request_status,
                        br.units_required

                    FROM donation_responses dr

                    JOIN blood_requests br
                        ON dr.request_id = br.id

                    WHERE dr.id = ?

                    FOR UPDATE
                `, [responseId]);


            if (rows.length === 0) {

                await connection.rollback();
                connection.release();

                return res.status(404).json({
                    success: false,
                    message: "Donation response not found"
                });
            }


            const response = rows[0];


            if (
                Number(response.hospital_id) !==
                Number(req.user.id)
            ) {

                await connection.rollback();
                connection.release();

                return res.status(403).json({
                    success: false,
                    message:
                        "You cannot complete this donation"
                });
            }


            if (response.status !== "accepted") {

                await connection.rollback();
                connection.release();

                return res.status(400).json({
                    success: false,
                    message:
                        "Only an accepted donor can be marked completed"
                });
            }


            // Complete donation

            await connection.query(`
                UPDATE donation_responses
                SET status = 'completed'
                WHERE id = ?
            `, [responseId]);


            // Fulfill request

            await connection.query(`
                UPDATE blood_requests
                SET status = 'fulfilled'
                WHERE id = ?
            `, [response.request_id]);


            await connection.commit();

            connection.release();


            // Notify donor

            await createNotification(
                response.donor_id,
                "donor",
                "🏁 Donation Completed",
                "Your blood donation has been recorded as completed. Thank you for helping someone in need.",
                "completed",
                responseId
            );


            return res.json({
                success: true,
                message:
                    "🏁 Donation completed and blood request fulfilled"
            });


        } catch (error) {

            await connection.rollback();
            connection.release();

            console.error(
                "Complete Donation Error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    error.sqlMessage ||
                    error.message ||
                    "Unable to complete donation"
            });
        }
    }
);


// =====================================================
// GET DONOR'S RESPONSES
// GET /api/requests/my-responses
// =====================================================

router.get(
    "/my-responses",
    verifyToken,
    async (req, res) => {

        try {

            if (req.user.role !== "donor") {

                return res.status(403).json({
                    success: false,
                    message:
                        "Only donors can view their responses"
                });
            }


            const [responses] =
                await db.promise().query(`
                    SELECT

                        dr.id AS response_id,
                        dr.status AS response_status,
                        dr.created_at AS response_date,

                        br.id AS request_id,
                        br.blood_group,
                        br.units_required,
                        br.urgency,
                        br.location,
                        br.required_date,
                        br.message,
                        br.status AS request_status,

                        h.name AS hospital_name

                    FROM donation_responses dr

                    JOIN blood_requests br
                        ON dr.request_id = br.id

                    JOIN hospitals h
                        ON br.hospital_id = h.id

                    WHERE dr.donor_id = ?

                    ORDER BY dr.created_at DESC
                `, [req.user.id]);


            return res.json({
                success: true,
                responses
            });


        } catch (error) {

            console.error(
                "Donor Responses Error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    error.sqlMessage ||
                    error.message
            });
        }
    }
);


// =====================================================
// NOTIFICATION HELPER
// =====================================================

async function createNotification(
    userId,
    userRole,
    title,
    message,
    type = "general",
    relatedId = null
) {

    try {

        await db.promise().query(`

            INSERT INTO notifications
            (
                user_id,
                user_role,
                title,
                message,
                type,
                related_id,
                is_read
            )

            VALUES (?, ?, ?, ?, ?, ?, 0)

        `, [

            userId,
            userRole,
            title,
            message,
            type,
            relatedId

        ]);

        console.log(
            "🔔 Notification created for:",
            userId,
            userRole
        );

    } catch (error) {

        console.error(
            "❌ Notification creation error:",
            error.message
        );

    }

}

module.exports = router;