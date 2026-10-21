const pdfParse = require("pdf-parse")
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")




/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {
    const { selfDescription, jobDescription } = req.body

    if (!jobDescription?.trim()) {
        return res.status(400).json({ message: "Please provide the target job description." })
    }
    if (!req.file && !selfDescription?.trim()) {
        return res.status(400).json({ message: "Upload a PDF resume or provide a self-description." })
    }
    if (req.file && !req.file.originalname.toLowerCase().endsWith(".pdf")) {
        return res.status(400).json({ message: "Only PDF resumes are supported." })
    }

    let resume = ""
    if (req.file) {
        try {
            const parser = new pdfParse.PDFParse({ data: Uint8Array.from(req.file.buffer) })
            const parsed = await parser.getText()
            resume = parsed.text
            await parser.destroy()
        } catch (error) {
            console.error("Resume PDF parsing failed:", error)
            return res.status(400).json({ message: "The uploaded PDF could not be read. Please try another PDF." })
        }
    }

    try {
        const interViewReportByAi = await generateInterviewReport({
            resume,
            selfDescription,
            jobDescription
        })

        const titleFromDescription = jobDescription
            .trim()
            .split(/[\r\n.!?]/)[0]
            .trim()
            .slice(0, 100)
        const title = interViewReportByAi.title?.trim() || titleFromDescription || "Interview Preparation Plan"

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume,
            selfDescription,
            jobDescription,
            ...interViewReportByAi,
            title
        })

        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        })
    } catch (error) {
        const apiStatus = error.status || error.response?.status
        console.error("Interview report generation failed:", {
            status: apiStatus,
            code: error.code,
            message: error.message
        })

        if (apiStatus === 401 || apiStatus === 403) {
            return res.status(503).json({ message: "Google rejected the AI API key. Check that GOOGLE_GENAI_API_KEY is valid and enabled for the Gemini API." })
        }
        if (apiStatus === 429) {
            return res.status(503).json({ message: "The Gemini API quota or rate limit has been reached. Check your Google AI Studio quota and try again later." })
        }
        if (apiStatus === 400) {
            return res.status(503).json({ message: "Gemini rejected the report request. Check the backend terminal for the API error details." })
        }

        res.status(503).json({ message: "The AI request failed. Check the Backend terminal for the status and error message." })
    }

}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {

    const { interviewId } = req.params

    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    res.status(200).json({
        message: "Interview report fetched successfully.",
        interviewReport
    })
}


/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

    res.status(200).json({
        message: "Interview reports fetched successfully.",
        interviewReports
    })
}


/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
    const { interviewReportId } = req.params

    const interviewReport = await interviewReportModel.findById(interviewReportId)

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const { resume, jobDescription, selfDescription } = interviewReport

    const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
    })

    res.send(pdfBuffer)
}

module.exports = { generateInterViewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController }
