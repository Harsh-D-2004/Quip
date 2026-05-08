import { chromium } from "playwright";

async function runBotServer() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--remote-debugging-port=9223",
      "--use-angle=gl",
      "--use-gl=swiftshader",
      "--enable-webgl",
    ],
  });

  console.log("Chrome running. Connect via CDP at ws://localhost:9223");
  console.log(browser);

  await new Promise(() => {});
}

runBotServer();
