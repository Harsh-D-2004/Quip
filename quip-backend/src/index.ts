import express from "express";
import cors from "cors";
import googleBotRouter from "./routes/google_meet_bot";
import botProfileRouter from "./routes/bot_profile";
import summaryrouter from "./routes/summary";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use("/google-bot", googleBotRouter);
app.use("/bot-profile", botProfileRouter);
app.use("/ai", summaryrouter);

app.get("/test", (req, res) => {
    res.send("Hello World!");
});

app.listen(3000, () => {
    console.log("Server started on port 3000");
});