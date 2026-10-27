const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")

const app = express()

app.use(express.json())
app.use(cookieParser())
const allowedOrigins = [
    "http://localhost:5173",
    process.env.FRONTEND_URL
].filter(Boolean)

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin || allowedOrigins.includes(origin) || (process.env.NODE_ENV !== "production" && origin.includes("localhost"))) {
            return callback(null, true)
        }
        // Allow Vercel preview URLs if FRONTEND_URL is set or contains vercel.app
        if (origin.endsWith(".vercel.app")) {
            return callback(null, true)
        }
        return callback(null, true) // permissive for easy deployment
    },
    credentials: true
}))

/* require all the routes here */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")


/* using all the routes here */
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)



module.exports = app