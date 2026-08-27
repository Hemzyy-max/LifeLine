const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

console.log("📤 LifeLine upload routes loaded");

// =====================================================
// UPLOAD DIRECTORY
// =====================================================

const uploadDirectory = path.join(
    __dirname,
    "../uploads"
);

// Create uploads folder automatically
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, {
        recursive: true
    });

    console.log("📁 Uploads folder created");
}


// =====================================================
// MULTER STORAGE
// =====================================================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(null, uploadDirectory);

    },

    filename: function (req, file, cb) {

        const extension =
            path.extname(file.originalname);

        const filename =
            `${Date.now()}-${Math.round(Math.random() * 1E9)}${extension}`;

        cb(null, filename);

    }

});


// =====================================================
// FILE FILTER
// =====================================================

const fileFilter = function (req, file, cb) {

    const allowedTypes = [

        "application/pdf",

        "image/jpeg",
        "image/jpg",
        "image/png",

        "application/msword",

        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    ];


    if (allowedTypes.includes(file.mimetype)) {

        cb(null, true);

    } else {

        cb(
            new Error(
                "Only PDF, JPG, JPEG, PNG and Word documents are allowed."
            ),
            false
        );

    }

};


// =====================================================
// MULTER CONFIGURATION
// =====================================================

const upload = multer({

    storage: storage,

    fileFilter: fileFilter,

    limits: {

        fileSize: 10 * 1024 * 1024

    }

});


// =====================================================
// SINGLE FILE UPLOAD
// POST /api/upload
// =====================================================

router.post(
    "/",
    upload.single("file"),
    async (req, res) => {

        try {

            console.log("📤 File upload request received");


            // -------------------------------------------------
            // CHECK FILE
            // -------------------------------------------------

            if (!req.file) {

                return res.status(400).json({

                    success: false,

                    message:
                        "No file uploaded"

                });

            }


            console.log(
                "✅ File uploaded:",
                req.file.filename
            );


            // -------------------------------------------------
            // RESPONSE
            // -------------------------------------------------

            return res.status(201).json({

                success: true,

                message:
                    "File uploaded successfully",

                file: {

                    originalName:
                        req.file.originalname,

                    filename:
                        req.file.filename,

                    mimetype:
                        req.file.mimetype,

                    size:
                        req.file.size,

                    path:
                        req.file.path

                }

            });


        } catch (error) {

            console.error(
                "❌ Upload Error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "File upload failed"

            });

        }

    }
);


// =====================================================
// UPLOAD ERROR HANDLER
// =====================================================

router.use(
    function (error, req, res, next) {

        console.error(
            "❌ Upload middleware error:",
            error
        );


        if (
            error instanceof multer.MulterError
        ) {

            if (
                error.code === "LIMIT_FILE_SIZE"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "File size must be less than 10 MB"

                });

            }


            return res.status(400).json({

                success: false,

                message:
                    error.message

            });

        }


        return res.status(400).json({

            success: false,

            message:
                error.message ||
                "File upload error"

        });

    }
);


// =====================================================
// TEST ROUTE
// GET /api/upload/test
// =====================================================

router.get(
    "/test",
    (req, res) => {

        res.json({

            success: true,

            message:
                "LifeLine upload route is working"

        });

    }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;
