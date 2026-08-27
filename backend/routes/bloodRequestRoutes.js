// =====================================================
// LIFE LINE - BLOOD REQUEST ROUTES
// =====================================================

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

        console.log("🩸 Blood request received");
        console.log("User:", req.user);
        console.log("Data:", req.body);

        // Only hospital can create request
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

        // Validation
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

        const units = Number(units_required);

        if (!Number.isInteger(units) || units <= 0) {

            return res.status(400).json({
                success: false,
                message: "Units required must be a valid positive number"
            });

        }

        // Insert request
        const [result] = await db.promise().query(

            `INSERT INTO blood_requests
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
            VALUES (?, ?, ?, ?, ?, ?, ?, 'open')`,

            [
                req.user.id,
                blood_group,
                units,
                urgency || "normal",
                location.trim(),
                required_date || null,
                message || null
            ]

        );

        console.log(
            "✅ Blood request created:",
            result.insertId
        );

        return res.status(201).json({

            success: true,

            message:
                "🩸 Blood request created successfully!",

            requestId:
                result.insertId

        });

    }
    catch (error) {

        console.error(
            "❌ Create Blood Request Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.sqlMessage ||
                error.message ||
                "Server error while creating blood request"

        });

    }

});


// =====================================================
// GET MY BLOOD REQUESTS
// GET /api/requests/my-requests
// =====================================================

router.get(
    "/my-requests",
    verifyToken,
    async (req, res) => {

        try {

            console.log(
                "🏥 Loading hospital requests:",
                req.user
            );

            if (req.user.role !== "hospital") {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only hospitals can view their requests"

                });

            }

            const [requests] =
                await db.promise().query(

                    `SELECT
                        id,
                        hospital_id,
                        blood_group,
                        units_required,
                        urgency,
                        location,
                        required_date,
                        message,
                        status,
                        created_at
                    FROM blood_requests
                    WHERE hospital_id = ?
                    ORDER BY created_at DESC`,

                    [req.user.id]

                );


            console.log(
                "✅ Hospital requests:",
                requests.length
            );


            return res.json({

                success: true,

                requests

            });

        }
        catch (error) {

            console.error(
                "❌ My Requests Error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.sqlMessage ||
                    error.message ||
                    "Unable to load hospital requests"

            });

        }

    }
);


// =====================================================
// GET DONOR PROFILE
// GET /api/requests/donor-profile
// =====================================================

router.get(
    "/donor-profile",
    verifyToken,
    async (req, res) => {

        try {

            if (req.user.role !== "donor") {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only donors can access donor profile"

                });

            }

            const [rows] =
                await db.promise().query(

                    `SELECT
                        id,
                        name,
                        email,
                        blood_group,
                        location,
                        availability
                    FROM donors
                    WHERE id = ?`,

                    [req.user.id]

                );


            if (rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Donor profile not found"

                });

            }


            return res.json({

                success: true,

                donor: rows[0]

            });

        }
        catch (error) {

            console.error(
                "❌ Donor Profile Error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.sqlMessage ||
                    error.message ||
                    "Unable to load donor profile"

            });

        }

    }
);


// =====================================================
// UPDATE DONOR AVAILABILITY
// PUT /api/requests/donor-availability
// =====================================================

router.put(
    "/donor-availability",
    verifyToken,
    async (req, res) => {

        try {

            if (req.user.role !== "donor") {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only donors can change availability"

                });

            }

            const {
                availability
            } = req.body;


            if (
                availability !== "Available" &&
                availability !== "Not Available"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid availability value"

                });

            }


            await db.promise().query(

                `UPDATE donors
                 SET availability = ?
                 WHERE id = ?`,

                [
                    availability,
                    req.user.id
                ]

            );


            return res.json({

                success: true,

                message:
                    "Donor availability updated successfully",

                availability

            });

        }
        catch (error) {

            console.error(
                "❌ Donor Availability Error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.sqlMessage ||
                    error.message ||
                    "Unable to update availability"

            });

        }

    }
);


// =====================================================
// GET OPEN BLOOD REQUESTS
// GET /api/requests/open
// =====================================================

router.get(
    "/open",
    verifyToken,
    async (req, res) => {

        try {

            const [requests] =
                await db.promise().query(

                    `SELECT
                        br.id,
                        br.blood_group,
                        br.units_required,
                        br.urgency,
                        br.location,
                        br.required_date,
                        br.message,
                        br.status,
                        br.created_at,
                        h.name AS hospital_name,
                        h.email AS hospital_email
                    FROM blood_requests br
                    JOIN hospitals h
                        ON br.hospital_id = h.id
                    WHERE br.status = 'open'
                    ORDER BY
                        CASE
                            WHEN br.urgency = 'emergency'
                            THEN 1
                            WHEN br.urgency = 'urgent'
                            THEN 2
                            ELSE 3
                        END,
                        br.created_at DESC`

                );


            return res.json({

                success: true,

                requests

            });

        }
        catch (error) {

            console.error(
                "❌ Get Open Requests Error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.sqlMessage ||
                    error.message ||
                    "Unable to load blood requests"

            });

        }

    }
);


// =====================================================
// RESPOND TO BLOOD REQUEST
// POST /api/requests/respond
// =====================================================

router.post(
    "/respond",
    verifyToken,
    async (req, res) => {

        try {

            if (req.user.role !== "donor") {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only donors can respond to blood requests"

                });

            }


            const requestId =
                Number(req.body.request_id);


            if (
                !requestId ||
                requestId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid blood request ID"

                });

            }


            // Check donor
            const [donors] =
                await db.promise().query(

                    `SELECT
                        id,
                        name,
                        blood_group,
                        availability
                    FROM donors
                    WHERE id = ?`,

                    [req.user.id]

                );


            if (donors.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Donor not found"

                });

            }


            const donor =
                donors[0];


            // Check availability
            if (
                donor.availability &&
                donor.availability !== "Available"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "You are currently marked as unavailable"

                });

            }


            // Get request
            const [requests] =
                await db.promise().query(

                    `SELECT
                        id,
                        hospital_id,
                        blood_group,
                        units_required,
                        status
                    FROM blood_requests
                    WHERE id = ?`,

                    [requestId]

                );


            if (requests.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Blood request not found"

                });

            }


            const request =
                requests[0];


            // Request must be open
            if (
                String(request.status).toLowerCase()
                !== "open"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This blood request is no longer open"

                });

            }


            // Blood group compatibility
            if (
                donor.blood_group &&
                request.blood_group &&
                String(donor.blood_group).toUpperCase()
                !== String(request.blood_group).toUpperCase()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        `Blood group mismatch. Request requires ${request.blood_group}.`

                });

            }


            // Check duplicate
            const [existing] =
                await db.promise().query(

                    `SELECT
                        id,
                        status
                    FROM donation_responses
                    WHERE request_id = ?
                    AND donor_id = ?`,

                    [
                        requestId,
                        req.user.id
                    ]

                );


            if (existing.length > 0) {

                return res.status(409).json({

                    success: false,

                    message:
                        "You have already responded to this request",

                    responseId:
                        existing[0].id,

                    status:
                        existing[0].status

                });

            }


            // Create response
            const [result] =
                await db.promise().query(

                    `INSERT INTO donation_responses
                    (
                        request_id,
                        donor_id,
                        status
                    )
                    VALUES (?, ?, 'pending')`,

                    [
                        requestId,
                        req.user.id
                    ]

                );


            console.log(
                "✅ Donor response created:",
                result.insertId
            );


            // Hospital notification
            try {

                await db.promise().query(

                    `INSERT INTO notifications
                    (
                        user_id,
                        role,
                        title,
                        message,
                        is_read,
                        created_at
                    )
                    VALUES (?, 'hospital', ?, ?, 0, NOW())`,

                    [

                        request.hospital_id,

                        "🩸 New Donor Response",

                        `A donor has responded to blood request #${requestId}.`

                    ]

                );

            }
            catch (notificationError) {

                console.log(
                    "⚠️ Notification failed:",
                    notificationError.message
                );

            }


            return res.status(201).json({

                success: true,

                message:
                    "Your blood donation response has been sent successfully",

                responseId:
                    result.insertId

            });

        }
        catch (error) {

            console.error(
                "❌ Donor Response Error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.sqlMessage ||
                    error.message ||
                    "Unable to respond to blood request"

            });

        }

    }
);


// =====================================================
// GET DONOR RESPONSES
// GET /api/requests/donor-responses
// =====================================================

router.get(
    "/donor-responses",
    verifyToken,
    async (req, res) => {

        try {

            if (req.user.role !== "donor") {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only donors can view donor responses"

                });

            }


            const [responses] =
                await db.promise().query(

                    `SELECT
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

                        h.name AS hospital_name,
                        h.email AS hospital_email

                    FROM donation_responses dr

                    JOIN blood_requests br
                        ON dr.request_id = br.id

                    JOIN hospitals h
                        ON br.hospital_id = h.id

                    WHERE dr.donor_id = ?

                    ORDER BY dr.created_at DESC`,

                    [req.user.id]

                );


            return res.json({

                success: true,

                responses

            });

        }
        catch (error) {

            console.error(
                "❌ Donor Responses Error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.sqlMessage ||
                    error.message ||
                    "Unable to load donor responses"

            });

        }

    }
);


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

                    message:
                        "Only hospitals can view donor responses"

                });

            }


            const [responses] =
                await db.promise().query(

                    `SELECT

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

                        d.name AS donor_name,
                        d.email AS donor_email,
                        d.blood_group AS donor_blood_group,
                        d.location AS donor_location,
                        d.availability AS donor_availability

                    FROM donation_responses dr

                    JOIN blood_requests br
                        ON dr.request_id = br.id

                    JOIN donors d
                        ON dr.donor_id = d.id

                    WHERE br.hospital_id = ?

                    ORDER BY dr.created_at DESC`,

                    [req.user.id]

                );


            return res.json({

                success: true,

                responses

            });

        }
        catch (error) {

            console.error(
                "❌ Hospital Responses Error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.sqlMessage ||
                    error.message ||
                    "Unable to load donor responses"

            });

        }

    }
);


// =====================================================
// ACCEPT DONOR RESPONSE
// PUT /api/requests/response/:responseId/accept
// =====================================================

router.put(
    "/response/:responseId/accept",
    verifyToken,
    async (req, res) => {

        try {

            if (req.user.role !== "hospital") {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only hospitals can accept donor responses"

                });

            }


            const responseId =
                Number(req.params.responseId);


            if (!responseId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid response ID"

                });

            }


            const [check] =
                await db.promise().query(

                    `SELECT

                        dr.id,
                        dr.status,
                        dr.request_id,
                        dr.donor_id,

                        br.hospital_id,
                        br.blood_group,
                        br.units_required,
                        br.status AS request_status

                    FROM donation_responses dr

                    JOIN blood_requests br
                        ON dr.request_id = br.id

                    WHERE dr.id = ?`,

                    [responseId]

                );


            if (check.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Donation response not found"

                });

            }


            const responseData =
                check[0];


            // Ownership check
            if (
                Number(responseData.hospital_id)
                !== Number(req.user.id)
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You cannot modify this donor response"

                });

            }


            // Already accepted
            if (
                responseData.status === "accepted"
            ) {

                return res.json({

                    success: true,

                    message:
                        "Donor is already accepted",

                    responseId

                });

            }


            // Do not accept rejected response
            if (
                responseData.status === "rejected"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "A rejected donor response cannot be accepted"

                });

            }


            // Accept donor
            await db.promise().query(

                `UPDATE donation_responses
                 SET status = 'accepted'
                 WHERE id = ?`,

                [responseId]

            );


            // Notify donor
            try {

                await db.promise().query(

                    `INSERT INTO notifications
                    (
                        user_id,
                        role,
                        title,
                        message,
                        is_read,
                        created_at
                    )
                    VALUES (?, 'donor', ?, ?, 0, NOW())`,

                    [

                        responseData.donor_id,

                        "✅ Donation Response Accepted",

                        `Your response to blood request #${responseData.request_id} has been accepted by the hospital.`

                    ]

                );

            }
            catch (notificationError) {

                console.log(
                    "⚠️ Donor notification failed:",
                    notificationError.message
                );

            }


            console.log(
                "✅ Donor accepted:",
                responseId
            );


            return res.json({

                success: true,

                message:
                    "Donor accepted successfully",

                responseId

            });

        }
        catch (error) {

            console.error(
                "❌ Accept Donor Error:",
                error
            );

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
// REJECT DONOR RESPONSE
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

                    message:
                        "Only hospitals can reject donor responses"

                });

            }


            const responseId =
                Number(req.params.responseId);


            const [check] =
                await db.promise().query(

                    `SELECT

                        dr.id,
                        dr.status,
                        dr.request_id,
                        dr.donor_id,

                        br.hospital_id

                    FROM donation_responses dr

                    JOIN blood_requests br
                        ON dr.request_id = br.id

                    WHERE dr.id = ?`,

                    [responseId]

                );


            if (check.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Donation response not found"

                });

            }


            const responseData =
                check[0];


            if (
                Number(responseData.hospital_id)
                !== Number(req.user.id)
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You cannot modify this donor response"

                });

            }


            if (
                responseData.status === "rejected"
            ) {

                return res.json({

                    success: true,

                    message:
                        "Donor response is already rejected",

                    responseId

                });

            }


            await db.promise().query(

                `UPDATE donation_responses
                 SET status = 'rejected'
                 WHERE id = ?`,

                [responseId]

            );


            // Notify donor
            try {

                await db.promise().query(

                    `INSERT INTO notifications
                    (
                        user_id,
                        role,
                        title,
                        message,
                        is_read,
                        created_at
                    )
                    VALUES (?, 'donor', ?, ?, 0, NOW())`,

                    [

                        responseData.donor_id,

                        "❌ Donation Response Rejected",

                        `Your response to blood request #${responseData.request_id} was not accepted by the hospital.`

                    ]

                );

            }
            catch (notificationError) {

                console.log(
                    "⚠️ Donor notification failed:",
                    notificationError.message
                );

            }


            return res.json({

                success: true,

                message:
                    "Donor response rejected successfully",

                responseId

            });

        }
        catch (error) {

            console.error(
                "❌ Reject Donor Error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.sqlMessage ||
                    error.message ||
                    "Unable to reject donor"

            });

        }

    }
);


// =====================================================
// COMPLETE DONATION
// PUT /api/requests/response/:responseId/complete
// =====================================================

router.put(
    "/response/:responseId/complete",
    verifyToken,
    async (req, res) => {

        try {

            if (req.user.role !== "hospital") {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only hospitals can complete donations"

                });

            }


            const responseId =
                Number(req.params.responseId);


            const [check] =
                await db.promise().query(

                    `SELECT

                        dr.id,
                        dr.donor_id,
                        dr.request_id,
                        dr.status,

                        br.hospital_id

                    FROM donation_responses dr

                    JOIN blood_requests br
                        ON dr.request_id = br.id

                    WHERE dr.id = ?`,

                    [responseId]

                );


            if (check.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Donation response not found"

                });

            }


            const responseData =
                check[0];


            if (
                Number(responseData.hospital_id)
                !== Number(req.user.id)
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You cannot complete this donation"

                });

            }


            if (
                responseData.status !== "accepted"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Only an accepted donor response can be completed"

                });

            }


            await db.promise().query(

                `UPDATE donation_responses
                 SET status = 'completed'
                 WHERE id = ?`,

                [responseId]

            );


            // Notify donor
            try {

                await db.promise().query(

                    `INSERT INTO notifications
                    (
                        user_id,
                        role,
                        title,
                        message,
                        is_read,
                        created_at
                    )
                    VALUES (?, 'donor', ?, ?, 0, NOW())`,

                    [

                        responseData.donor_id,

                        "🎉 Donation Completed",

                        `Your donation for blood request #${responseData.request_id} has been marked as completed. Thank you for helping save a life!`

                    ]

                );

            }
            catch (notificationError) {

                console.log(
                    "⚠️ Completion notification failed:",
                    notificationError.message
                );

            }


            return res.json({

                success: true,

                message:
                    "Donation marked as completed",

                responseId

            });

        }
        catch (error) {

            console.error(
                "❌ Complete Donation Error:",
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
// MARK BLOOD REQUEST AS FULFILLED
// PUT /api/requests/:requestId/fulfill
// =====================================================

router.put(
    "/:requestId/fulfill",
    verifyToken,
    async (req, res) => {

        try {

            if (req.user.role !== "hospital") {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only hospitals can fulfill blood requests"

                });

            }


            const requestId =
                Number(req.params.requestId);


            if (!requestId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid blood request ID"

                });

            }


            // Check request ownership
            const [requests] =
                await db.promise().query(

                    `SELECT
                        id,
                        hospital_id,
                        blood_group,
                        units_required,
                        status
                    FROM blood_requests
                    WHERE id = ?`,

                    [requestId]

                );


            if (requests.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Blood request not found"

                });

            }


            const request =
                requests[0];


            if (
                Number(request.hospital_id)
                !== Number(req.user.id)
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You cannot modify this blood request"

                });

            }


            if (
                String(request.status).toLowerCase()
                === "fulfilled"
            ) {

                return res.json({

                    success: true,

                    message:
                        "Blood request is already fulfilled",

                    requestId

                });

            }


            await db.promise().query(

                `UPDATE blood_requests
                 SET status = 'fulfilled'
                 WHERE id = ?`,

                [requestId]

            );


            // Notify accepted donors
            try {

                const [acceptedDonors] =
                    await db.promise().query(

                        `SELECT donor_id
                         FROM donation_responses
                         WHERE request_id = ?
                         AND status = 'accepted'`,

                        [requestId]

                    );


                for (
                    const donor
                    of acceptedDonors
                ) {

                    await db.promise().query(

                        `INSERT INTO notifications
                        (
                            user_id,
                            role,
                            title,
                            message,
                            is_read,
                            created_at
                        )
                        VALUES (?, 'donor', ?, ?, 0, NOW())`,

                        [

                            donor.donor_id,

                            "🏁 Blood Request Fulfilled",

                            `Blood request #${requestId} has been marked as fulfilled by the hospital.`

                        ]

                    );

                }

            }
            catch (notificationError) {

                console.log(
                    "⚠️ Fulfillment notification failed:",
                    notificationError.message
                );

            }


            console.log(
                "🏁 Request fulfilled:",
                requestId
            );


            return res.json({

                success: true,

                message:
                    "Blood request marked as fulfilled",

                requestId

            });

        }
        catch (error) {

            console.error(
                "❌ Fulfill Request Error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.sqlMessage ||
                    error.message ||
                    "Unable to fulfill blood request"

            });

        }

    }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;