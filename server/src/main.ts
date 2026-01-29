import { createSprintCraftServer } from "./index";

const port = Number(process.env.PORT ?? 2567);
const host = process.env.HOST ?? "0.0.0.0";

createSprintCraftServer()
  .listen(port, host)
  .then(() => {
    console.log(`Sprint Craft server listening on ${host}:${port}`);
  })
  .catch((error) => {
    console.error("Failed to start Sprint Craft server", error);
    process.exit(1);
  });
