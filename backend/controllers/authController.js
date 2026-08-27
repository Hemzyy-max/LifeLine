const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");


// =====================================
// REGISTER USER
// =====================================

const register = async (req, res) => {

    try {

        const {
            role,
            name,
            email,
            password,
            age,
            blood_group,
            phone,
            location,
            last_donation_date
        } = req.body;


        // Required fields

        if (!role || !name || !email || !password) {

            return res.status(400).json({

                success: false,

                message:
                    "Role, name, email and password are required"

            });

        }


        // =====================================
        // DONOR REGISTRATION
        // =====================================

        if (role === "donor") {

            if (
                !age ||
                !blood_group ||
                !phone ||
                !location
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please fill all donor details"

                });

            }


            const [existing] =
                await db.promise().query(

                    "SELECT id FROM donors WHERE email = ?",

                    [email]

                );


            if (existing.length > 0) {

                return res.status(409).json({

                    success: false,

                    message:
                        "Donor email already registered"

                });

            }


            const hashedPassword =
                await bcrypt.hash(password, 10);


            const [result] =
                await db.promise().query(

                    `INSERT INTO donors
                    (
                        name,
                        email,
                        password,
                        age,
                        blood_group,
                        phone,
                        location,
                        last_donation_date
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,

                    [
                        name,
                        email,
                        hashedPassword,
                        age,
                        blood_group,
                        phone,
                        location,
                        last_donation_date || null
                    ]

                );


            return res.status(201).json({

                success: true,

                message:
                    "Donor registered successfully",

                userId:
                    result.insertId

            });

        }


        // =====================================
        // HOSPITAL REGISTRATION
        // =====================================

        if (role === "hospital") {

            if (!phone || !location) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please fill all hospital details"

                });

            }


            const [existing] =
                await db.promise().query(

                    "SELECT id FROM hospitals WHERE email = ?",

                    [email]

                );


            if (existing.length > 0) {

                return res.status(409).json({

                    success: false,

                    message:
                        "Hospital email already registered"

                });

            }


            const hashedPassword =
                await bcrypt.hash(password, 10);


            const [result] =
                await db.promise().query(

                    `INSERT INTO hospitals
                    (
                        name,
                        email,
                        password,
                        location,
                        phone
                    )
                    VALUES (?, ?, ?, ?, ?)`,

                    [
                        name,
                        email,
                        hashedPassword,
                        location,
                        phone
                    ]

                );


            return res.status(201).json({

                success: true,

                message:
                    "Hospital registered successfully",

                userId:
                    result.insertId

            });

        }


        return res.status(400).json({

            success: false,

            message:
                "Invalid role. Use donor or hospital"

        });


    } catch (error) {

        console.error(
            "Registration Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Server error during registration"

        });

    }

};



// =====================================
// LOGIN USER
// =====================================

const login = async (req, res) => {

    try {

        const {
            email,
            password,
            role
        } = req.body;


        // =====================================
        // VALIDATION
        // =====================================

        if (!email || !password || !role) {

            return res.status(400).json({

                success: false,

                message:
                    "Email, password and role are required"

            });

        }


        // =====================================
        // SELECT TABLE
        // =====================================

        let table;

        if (role === "donor") {

            table = "donors";

        } else if (role === "hospital") {

            table = "hospitals";

        } else {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid role"

            });

        }


        // =====================================
        // FIND USER
        // =====================================

        const [users] =
            await db.promise().query(

                `SELECT * FROM ${table} WHERE email = ? LIMIT 1`,

                [email]

            );


        if (users.length === 0) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password"

            });

        }


        const user = users[0];


        // =====================================
        // CHECK PASSWORD
        // =====================================

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordMatch) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password"

            });

        }


        // =====================================
        // JWT SECRET
        // =====================================

        if (!process.env.JWT_SECRET) {

            console.error(
                "JWT_SECRET is missing in .env"
            );

            return res.status(500).json({

                success: false,

                message:
                    "Server configuration error"

            });

        }


        // =====================================
        // JWT TOKEN
        // =====================================

        const token =
            jwt.sign(

                {
                    id: user.id,

                    role: role,

                    name: user.name,

                    email: user.email

                },

                process.env.JWT_SECRET,

                {
                    expiresIn: "7d"
                }

            );


        // =====================================
        // RESPONSE USER
        // =====================================

        const userResponse = {

            id: user.id,

            name: user.name,

            email: user.email,

            role: role

        };


        // =====================================
        // LOGIN SUCCESS
        // =====================================

        return res.json({

            success: true,

            message:
                "Login successful",

            token: token,

            user: userResponse

        });


    } catch (error) {

        console.error(
            "Login Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Server error during login"

        });

    }

};


module.exports = {

    register,

    login

};