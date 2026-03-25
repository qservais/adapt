import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import checkinsRouter from "./checkins.js";
import sessionsRouter from "./sessions.js";
import programsRouter from "./programs.js";
import coachRouter from "./coach.js";
import exercisesRouter from "./exercises.js";
import messagesRouter from "./messages.js";
import notificationsRouter from "./notifications.js";
import contentRouter from "./content.js";
import nutritionRouter from "./nutrition.js";
import stepsRouter from "./steps.js";
import challengesRouter from "./challenges.js";
import scheduledNotificationsRouter from "./scheduled-notifications.js";
import appointmentsRouter from "./appointments.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(checkinsRouter);
router.use(sessionsRouter);
router.use(programsRouter);
router.use(coachRouter);
router.use(exercisesRouter);
router.use(messagesRouter);
router.use(notificationsRouter);
router.use(contentRouter);
router.use(nutritionRouter);
router.use(stepsRouter);
router.use(challengesRouter);
router.use(scheduledNotificationsRouter);
router.use(appointmentsRouter);

export default router;
