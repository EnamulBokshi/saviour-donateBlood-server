import multer from "multer";
const storage = multer.memoryStorage();
const fileFilter = (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/") && file.mimetype !== "application/pdf") {
        return cb(new Error("Only image or PDF files are allowed."));
    }
    cb(null, true);
};
export const multerUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});
