import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import router from "./routes/index.js";
import stripeWebhookRouter from "./routes/webhooks.js";
import { logger } from "./lib/logger.js";
import { localeMiddleware } from "./middleware/locale.js";

const app: Express = express();

app.use(helmet());
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({
  origin: process.env["CLIENT_URL"] || true,
  credentials: true,
}));

// Stripe webhook signature verification needs the untouched raw body, so this
// route is mounted with express.raw() ahead of the global express.json() —
// it must stay above that line, and is deliberately not part of ./routes/index.js.
app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhookRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(localeMiddleware);

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter);
app.use("/api", generalLimiter);
app.use("/api", router);

export default app;
