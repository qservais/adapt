import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { getCoachAgenda } from "../services/coach-agenda.service.js";

const router = Router();

router.get("/coach/agenda", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const from = req.query["from"] ? new Date(String(req.query["from"])) : new Date();
    const to = req.query["to"] ? new Date(String(req.query["to"])) : new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);
    const entries = await getCoachAgenda(coachId, from, to);
    res.json(entries);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
